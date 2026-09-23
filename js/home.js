/* ==========================================================================
   home.js - the home page's scroll-linked pieces (index.html only)

   Four behaviours, each independent and each a silent no-op when its markup
   is missing:

     1. MARQUEE   pauses each hero row while it is off screen.
     2. ROLLER    steps the "what I do" word roller every few seconds, only
                  while it is on screen, with a seamless loop seam.
     3. SCROLL    one rAF-throttled, passive scroll handler drives both the
                  sliding project words (--slide on each [data-slide]) and
                  the about paragraph's word-by-word highlight. Only figures
                  and the paragraph currently near the viewport are measured.
     4. ECHO      mirrors each counting number (js/app.js [data-count]) into
                  its outlined echo, so the reflection counts with it.

   MOTION
   Resolved exactly as hero.js resolves it: the site toggle
   (html[data-motion]) wins when set, the OS preference decides otherwise,
   and both the `motionchange` event and the attribute itself are watched,
   so a live toggle switches everything here in either direction. Reduced
   motion means: rows still (CSS), roller parked on its first word, words at
   their resting --slide, paragraph fully lit, and no scroll listener at all.

   PROPERTY CONTRACT
   Writes only --roll on [data-roller], --slide on [data-slide], and class
   names (is-paused, is-snapping, is-sliding, is-scrubbing, is-lit). Never
   touches transform, rotate or translate on any element the tilt, stack or
   reveal modules own.
   ========================================================================== */

(function () {
    'use strict';

    const root = document.documentElement;
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hasIO = 'IntersectionObserver' in window;

    function isReduced() {
        const m = root.getAttribute('data-motion');
        if (m === 'reduced') return true;
        if (m === 'full') return false;
        return mqReduce.matches;
    }

    /* Several sources can move the preference; funnel them into one call and
       only notify when the resolved value actually changed. */
    const motionListeners = [];
    let lastReduced = isReduced();

    function onMotionChange(fn) { motionListeners.push(fn); }

    function checkMotion() {
        const now = isReduced();
        if (now === lastReduced) return;
        lastReduced = now;
        for (let i = 0; i < motionListeners.length; i++) motionListeners[i](now);
    }

    window.addEventListener('motionchange', checkMotion);
    if (mqReduce.addEventListener) mqReduce.addEventListener('change', checkMotion);
    else if (mqReduce.addListener) mqReduce.addListener(checkMotion);
    new MutationObserver(checkMotion).observe(root, {
        attributes: true,
        attributeFilter: ['data-motion']
    });

    function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

    function cssMs(name, fallback) {
        const raw = getComputedStyle(root).getPropertyValue(name).trim();
        const n = parseFloat(raw);
        if (!isFinite(n)) return fallback;
        return /ms$/.test(raw) ? n : n * 1000;
    }


    /* ======================================================================
       1. MARQUEE: pause off-screen rows
       ====================================================================== */

    (function initMarquee() {
        const rows = document.querySelectorAll('[data-marquee]');
        if (!rows.length || !hasIO) return;

        const io = new IntersectionObserver(function (entries) {
            for (let i = 0; i < entries.length; i++) {
                entries[i].target.classList.toggle('is-paused', !entries[i].isIntersecting);
            }
        });
        for (let i = 0; i < rows.length; i++) io.observe(rows[i]);
    })();


    /* ======================================================================
       2. ROLLER
       Each column gets a clone of its first word appended. The roller steps
       --roll up to that clone, and once the roll has landed it jumps back to
       0 with transitions off: the clone and the first word are identical, so
       the jump is invisible and the loop never runs backwards.
       ====================================================================== */

    (function initRoller() {
        const el = document.querySelector('[data-roller]');
        if (!el) return;
        const cols = el.querySelectorAll('.roller-col');
        if (!cols.length || !cols[0].children.length) return;

        const count = cols[0].children.length;
        if (count < 2) return;

        for (let i = 0; i < cols.length; i++) {
            const first = cols[i].firstElementChild;
            if (first) cols[i].appendChild(first.cloneNode(true));
        }

        const HOLD_MS = 2400;
        /* The roll plus the echo's 80ms lag, with a little headroom. */
        const SETTLE_MS = cssMs('--dur-roll', 900) + 160;

        let index = 0;
        let timer = 0;
        let visible = !hasIO;

        function write() { el.style.setProperty('--roll', String(index)); }

        function snapHome() {
            el.classList.add('is-snapping');
            index = 0;
            write();
            void el.offsetHeight;               // commit the jump before re-enabling
            el.classList.remove('is-snapping');
        }

        function running() { return visible && !document.hidden && !isReduced(); }

        function schedule() {
            clearTimeout(timer);
            timer = 0;
            if (running()) timer = setTimeout(step, HOLD_MS);
        }

        function step() {
            timer = 0;
            if (!running()) return;
            index += 1;
            write();
            if (index >= count) {
                timer = setTimeout(function () {
                    snapHome();
                    schedule();
                }, SETTLE_MS);
                return;
            }
            schedule();
        }

        function park() {
            clearTimeout(timer);
            timer = 0;
            snapHome();
        }

        if (hasIO) {
            new IntersectionObserver(function (entries) {
                visible = entries[entries.length - 1].isIntersecting;
                if (visible) schedule();
                else { clearTimeout(timer); timer = 0; }
            }, { threshold: 0.25 }).observe(el);
        }

        document.addEventListener('visibilitychange', schedule);
        onMotionChange(function (reduced) {
            if (reduced) park();
            else schedule();
        });

        if (isReduced()) park();
        else schedule();
    })();


    /* ======================================================================
       3. SCROLL: sliding words + paragraph highlight
       ====================================================================== */

    (function initScroll() {
        const figures = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
        const para = document.querySelector('[data-highlight]');
        if (!figures.length && !para) return;

        /* ---- Split the paragraph into words, once. Whitespace stays as real
           text nodes, so wrapping, copy/paste and screen readers see the
           same sentence. Words inside <strong> are the key phrases and are
           ink from the start; only the rest take part in the scrub. */
        let words = [];
        if (para) {
            const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(function (node) {
                const parts = node.nodeValue.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                parts.forEach(function (part) {
                    if (!part) return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                    } else {
                        const span = document.createElement('span');
                        span.className = 'hl-w';
                        span.textContent = part;
                        frag.appendChild(span);
                    }
                });
                node.parentNode.replaceChild(frag, node);
            });
            words = Array.prototype.slice.call(para.querySelectorAll('.hl-w')).filter(function (w) {
                return !w.closest('strong');
            });
        }

        const near = new Set();
        let paraNear = !hasIO;
        let lit = -1;
        let ticking = false;
        let attached = false;
        let io = null;

        if (hasIO) {
            io = new IntersectionObserver(function (entries) {
                for (let i = 0; i < entries.length; i++) {
                    const t = entries[i].target;
                    if (t === para) {
                        paraNear = entries[i].isIntersecting;
                    } else if (entries[i].isIntersecting) {
                        near.add(t);
                        t.classList.add('is-sliding');
                    } else {
                        near.delete(t);
                        t.classList.remove('is-sliding');
                    }
                }
                request();
            }, { rootMargin: '15% 0px 15% 0px' });
            figures.forEach(function (f) { io.observe(f); });
            if (para) io.observe(para);
        } else {
            figures.forEach(function (f) { near.add(f); });
        }

        function setLit(n) {
            if (n === lit) return;
            const from = Math.min(Math.max(lit, 0), n);
            const to = Math.max(lit, n);
            for (let i = from; i < to && i < words.length; i++) {
                words[i].classList.toggle('is-lit', i < n);
            }
            lit = n;
        }

        function update() {
            ticking = false;
            if (!attached) return;
            const vh = window.innerHeight || root.clientHeight;

            near.forEach(function (fig) {
                const r = fig.getBoundingClientRect();
                /* 0 as the figure's top enters at the bottom edge, 1 as its
                   bottom leaves at the top edge. */
                const p = clamp01((vh - r.top) / (vh + r.height));
                fig.style.setProperty('--slide', p.toFixed(4));
            });

            if (para && paraNear && words.length) {
                const r = para.getBoundingClientRect();
                /* Starts when the paragraph's top is 85% down the viewport,
                   complete when its bottom has risen to 55%. */
                const p = clamp01((vh * 0.85 - r.top) / (r.height + vh * 0.3));
                setLit(Math.round(p * words.length));
            }
        }

        function request() {
            if (ticking || !attached) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }

        function attach() {
            if (attached) return;
            attached = true;
            if (para) para.classList.add('is-scrubbing');
            window.addEventListener('scroll', request, { passive: true });
            window.addEventListener('resize', request, { passive: true });
            request();
        }

        function detach() {
            attached = false;
            window.removeEventListener('scroll', request);
            window.removeEventListener('resize', request);
            figures.forEach(function (f) { f.style.removeProperty('--slide'); });
            if (para) para.classList.remove('is-scrubbing');
            setLit(words.length);
        }

        onMotionChange(function (reduced) {
            if (reduced) detach();
            else attach();
        });

        if (isReduced()) detach();
        else attach();
    })();


    /* ======================================================================
       4. ECHO: the outlined reflection counts with its number
       ====================================================================== */

    (function initEcho() {
        const nums = document.querySelectorAll('.stat-num');
        if (!nums.length || typeof MutationObserver === 'undefined') return;

        Array.prototype.forEach.call(nums, function (num) {
            const echo = num.parentNode && num.parentNode.querySelector('.stat-echo');
            if (!echo) return;
            new MutationObserver(function () {
                echo.textContent = num.textContent;
            }).observe(num, { childList: true, characterData: true, subtree: true });
        });
    })();
})();
