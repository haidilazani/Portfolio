/* ==========================================================================
   app.js — site-wide interaction layer
   Loaded (deferred) on every page. Zero dependencies, no globals.

   Every DOM lookup is guarded: a page that lacks a feature's markup is a
   silent no-op, never a throw. Every animation respects the resolved motion
   preference (OS default, overridable by the user via [data-motion-toggle]).

   Sections
     0   Shared utilities        — storage, debounce, rAF scheduler, focus trap
     1   Motion preference       — data-motion + `motionchange` event
     2   Theme                   — data-theme + persistence + OS sync
     3   Navigation              — active link, liquid indicator, scrolled state
     4   Scroll reveal & count-up
     5   Page transitions        — View Transitions, else manual fade
     6   Magnetic buttons
     7   Overlay primitive       — scroll lock, inert background, focus trap
     8   Command palette (Cmd/Ctrl + K)
     9   Photo lightbox
     10  Copy to clipboard
     11  Contact form
     12  Bootstrap
   ========================================================================== */

(function () {
    'use strict';

    const root = document.documentElement;

    /* ======================================================================
       0 · Shared utilities
       ====================================================================== */

    /* localStorage throws in Safari Private Browsing and when storage is
       disabled by policy. Every access goes through here. */
    const store = {
        get(key) {
            try { return window.localStorage.getItem(key); } catch (err) { return null; }
        },
        set(key, value) {
            try { window.localStorage.setItem(key, value); } catch (err) { /* no-op */ }
        }
    };

    /* Safari < 14 only has the deprecated MediaQueryList.addListener. */
    function onMediaChange(mq, handler) {
        if (!mq) return;
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
        else if (typeof mq.addListener === 'function') mq.addListener(handler);
    }

    function debounce(fn, wait) {
        let timer = 0;
        return function debounced() {
            const args = arguments;
            const ctx = this;
            window.clearTimeout(timer);
            timer = window.setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    /* Collapse a burst of events (scroll, pointermove) into one frame. */
    function coalesce(fn) {
        let queued = false;
        return function () {
            if (queued) return;
            queued = true;
            window.requestAnimationFrame(function () {
                queued = false;
                fn();
            });
        };
    }

    /* One rAF loop for the whole site. A task returning `false` unregisters
       itself; when no tasks remain the loop stops entirely. */
    const scheduler = (function () {
        const tasks = new Set();
        let ticking = false;

        function tick(now) {
            ticking = false;
            tasks.forEach(function (task) {
                let keep;
                try { keep = task(now); } catch (err) { keep = false; }
                if (keep === false) tasks.delete(task);
            });
            if (tasks.size) start();
        }

        function start() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(tick);
        }

        return {
            add(task) { tasks.add(task); start(); },
            remove(task) { tasks.delete(task); }
        };
    })();

    function clamp(value, min, max) {
        return value < min ? min : (value > max ? max : value);
    }

    let uid = 0;
    function ensureId(el, prefix) {
        if (!el.id) el.id = prefix + '-' + (++uid);
        return el.id;
    }

    /* Polite announcements for state changes that have no visible text. */
    let liveRegion = null;
    let announceTimer = 0;
    function announce(message) {
        if (!document.body) return;
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.dataset.appLive = '';
            liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;' +
                'padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);' +
                'white-space:nowrap;border:0;';
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = '';
        window.clearTimeout(announceTimer);
        announceTimer = window.setTimeout(function () {
            liveRegion.textContent = message;
        }, 60);
    }

    const FOCUSABLE = [
        'a[href]', 'area[href]', 'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
        'textarea:not([disabled])', 'summary', 'audio[controls]', 'video[controls]',
        '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function visibleFocusables(container) {
        return Array.prototype.filter.call(
            container.querySelectorAll(FOCUSABLE),
            function (el) {
                if (el.disabled || el.hidden) return false;
                return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            }
        );
    }

    /* One focus trap, shared by the command palette and the lightbox. */
    function createFocusTrap(container) {
        let restoreTo = null;

        function onKeydown(e) {
            if (e.key !== 'Tab') return;
            const items = visibleFocusables(container);
            if (!items.length) {
                e.preventDefault();
                container.focus({ preventScroll: true });
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            const inside = container.contains(active);
            if (e.shiftKey) {
                if (!inside || active === first) { e.preventDefault(); last.focus({ preventScroll: true }); }
            } else if (!inside || active === last) {
                e.preventDefault();
                first.focus({ preventScroll: true });
            }
        }

        return {
            activate(initial, restore) {
                restoreTo = restore || document.activeElement;
                document.addEventListener('keydown', onKeydown, true);
                const target = initial || visibleFocusables(container)[0] || container;
                if (target === container && !container.hasAttribute('tabindex')) {
                    container.setAttribute('tabindex', '-1');
                }
                if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
            },
            release() {
                document.removeEventListener('keydown', onKeydown, true);
                const target = restoreTo;
                restoreTo = null;
                if (target && typeof target.focus === 'function' && document.contains(target)) {
                    target.focus({ preventScroll: true });
                }
            }
        };
    }

    /* ======================================================================
       1 · Motion preference
       `data-motion` on <html> is the single source of truth. The user can
       override the OS in either direction; the choice is persisted.
       A `motionchange` CustomEvent fires on window on every flip — hero.js
       listens for it.
       ====================================================================== */

    const MOTION_KEY = 'motion';
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function isReduced() {
        return root.dataset.motion === 'reduced';
    }

    function storedMotion() {
        const saved = store.get(MOTION_KEY);
        return (saved === 'full' || saved === 'reduced') ? saved : null;
    }

    function applyMotion(mode, persist, speak) {
        const next = mode === 'reduced' ? 'reduced' : 'full';
        const changed = root.dataset.motion !== next;
        root.dataset.motion = next;
        if (persist) store.set(MOTION_KEY, next);
        syncMotionToggles();
        if (changed) {
            window.dispatchEvent(new CustomEvent('motionchange', {
                detail: { motion: next, reduced: next === 'reduced' }
            }));
        }
        if (speak) {
            announce(next === 'reduced' ? 'Animation turned off.' : 'Animation turned on.');
        }
    }

    function seedMotion() {
        applyMotion(storedMotion() || (motionQuery.matches ? 'reduced' : 'full'), false, false);
        onMediaChange(motionQuery, function (e) {
            /* An explicit user choice outranks the OS. */
            if (storedMotion()) return;
            applyMotion(e.matches ? 'reduced' : 'full', false, false);
        });
    }

    function syncMotionToggles() {
        const pressed = isReduced() ? 'true' : 'false';
        Array.prototype.forEach.call(document.querySelectorAll('[data-motion-toggle]'), function (btn) {
            btn.setAttribute('aria-pressed', pressed);
        });
    }

    function toggleMotion() {
        applyMotion(isReduced() ? 'full' : 'reduced', true, true);
    }

    function onMotionChange(handler) {
        window.addEventListener('motionchange', handler);
    }

    /* ======================================================================
       2 · Theme
       ====================================================================== */

    const THEME_KEY = 'theme';
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
    const THEME_COLOR = { dark: '#060607', light: '#f5f5f7' };

    function storedTheme() {
        const saved = store.get(THEME_KEY);
        return (saved === 'light' || saved === 'dark') ? saved : null;
    }

    function currentTheme() {
        return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }

    function applyTheme(theme, persist, speak) {
        const next = theme === 'light' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        if (persist) store.set(THEME_KEY, next);
        syncThemeToggles();
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', THEME_COLOR[next]);
        if (speak) announce(next === 'light' ? 'Light theme on.' : 'Dark theme on.');
    }

    function seedTheme() {
        /* The inline <head> script already set an anti-flash value; only
           correct it when nothing is stored and the OS prefers light. */
        applyTheme(storedTheme() || (lightQuery.matches ? 'light' : 'dark'), false, false);
        onMediaChange(lightQuery, function (e) {
            if (storedTheme()) return;
            applyTheme(e.matches ? 'light' : 'dark', false, false);
        });
    }

    function syncThemeToggles() {
        const pressed = currentTheme() === 'light' ? 'true' : 'false';
        Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (btn) {
            btn.setAttribute('aria-pressed', pressed);
        });
    }

    function toggleTheme() {
        const next = currentTheme() === 'light' ? 'dark' : 'light';
        /* Same-document View Transition gives the swap a free cross-fade. */
        if (!isReduced() && typeof document.startViewTransition === 'function') {
            document.startViewTransition(function () { applyTheme(next, true, true); });
        } else {
            applyTheme(next, true, true);
        }
    }

    function initPreferenceToggles() {
        syncThemeToggles();
        syncMotionToggles();
        Array.prototype.forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (btn) {
            btn.addEventListener('click', toggleTheme);
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-motion-toggle]'), function (btn) {
            btn.addEventListener('click', toggleMotion);
        });
    }

    /* ======================================================================
       3 · Navigation — active link, liquid indicator, scrolled state
       ====================================================================== */

    /* `/` and `/index.html` are the same document; compare normalised paths. */
    function normalizePath(pathname) {
        return pathname.replace(/\/index\.html?$/i, '/');
    }

    function resolveUrl(href) {
        try { return new URL(href, location.href); } catch (err) { return null; }
    }

    function isSameDocument(url) {
        return url.origin === location.origin &&
            normalizePath(url.pathname) === normalizePath(location.pathname) &&
            url.search === location.search;
    }

    function initNavState() {
        const nav = document.querySelector('.site-nav');
        if (!nav) return;
        const island = nav.querySelector('.nav-inner');
        /* Liquid glass takes its tone from what sits beneath it: while the
           island floats over an inverse band it wears that band's palette. */
        const bands = Array.prototype.slice.call(document.querySelectorAll('.band--invert'));
        let scrolled = false;
        let inverted = false;
        const update = coalesce(function () {
            const y = window.scrollY || window.pageYOffset || 0;
            let over = false;
            if (island && bands.length) {
                const box = island.getBoundingClientRect();
                const probe = box.top + box.height / 2;
                over = bands.some(function (band) {
                    const r = band.getBoundingClientRect();
                    return r.top <= probe && r.bottom > probe;
                });
            }
            if (over !== inverted) {
                inverted = over;
                nav.classList.toggle('is-inverted', inverted);
            }
            /* Hysteresis so the compact state cannot flicker on a hairline. */
            const next = scrolled ? y > 8 : y > 24;
            if (next === scrolled) return;
            scrolled = next;
            nav.classList.toggle('is-scrolled', scrolled);
        });
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    function initNavLinks() {
        const navList = document.querySelector('.nav-links');
        if (!navList) return;
        const links = Array.prototype.slice.call(navList.querySelectorAll('a[href]'));
        if (!links.length) return;

        let activeLink = null;
        links.forEach(function (link) {
            const url = resolveUrl(link.getAttribute('href'));
            if (!url || url.origin !== location.origin) return;
            if (normalizePath(url.pathname) !== normalizePath(location.pathname)) return;
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'page');
            if (!activeLink) activeLink = link;
        });

        const indicator = navList.querySelector('.nav-indicator');
        if (!indicator) return;

        const supportsTranslate = typeof indicator.style.translate === 'string';

        function place(link, instant) {
            if (!link) return;
            const listRect = navList.getBoundingClientRect();
            const rect = link.getBoundingClientRect();
            if (!rect.width) return;
            const x = rect.left - listRect.left;
            if (instant) indicator.style.transition = 'none';
            if (supportsTranslate) indicator.style.translate = x + 'px 0';
            else indicator.style.transform = 'translate3d(' + x + 'px,-50%,0)';
            indicator.style.width = rect.width + 'px';
            indicator.classList.add('is-visible');
            if (instant) {
                void indicator.offsetWidth; /* flush so the next move animates */
                indicator.style.transition = '';
            }
        }

        function rest() {
            if (activeLink) place(activeLink, isReduced());
            else indicator.classList.remove('is-visible');
        }

        links.forEach(function (link) {
            link.addEventListener('mouseenter', function () { place(link, isReduced()); });
            link.addEventListener('focus', function () { place(link, isReduced()); });
        });
        navList.addEventListener('mouseleave', rest);
        navList.addEventListener('focusout', function (e) {
            if (!navList.contains(e.relatedTarget)) rest();
        });

        /* Measure after webfonts land — Inter/Space Grotesk/JetBrains Mono
           all change link widths when they swap in. */
        place(activeLink, true);
        if (document.fonts && typeof document.fonts.ready === 'object') {
            document.fonts.ready.then(function () { place(activeLink, true); }).catch(function () { });
        } else {
            window.addEventListener('load', function () { place(activeLink, true); }, { once: true });
        }

        const remeasure = debounce(function () { place(activeLink, true); }, 120);
        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(remeasure);
            ro.observe(navList);
        } else {
            window.addEventListener('resize', remeasure, { passive: true });
        }
    }

    /* ======================================================================
       4 · Scroll reveal & count-up
       Agent A owns the [data-reveal] / .is-revealed transition and reads the
       inline `--reveal-i` stagger index that Agent D sets. Under reduced
       motion everything is revealed at once with the index zeroed, so no
       staggered delay survives.
       ====================================================================== */

    function revealAll(els) {
        els.forEach(function (el) {
            el.style.setProperty('--reveal-i', '0');
            el.classList.add('is-revealed');
        });
    }

    function initReveal() {
        const els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
        if (!els.length) return;

        if (isReduced() || !('IntersectionObserver' in window)) {
            revealAll(els);
            return;
        }

        const observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-revealed');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        els.forEach(function (el) { observer.observe(el); });

        onMotionChange(function () {
            if (!isReduced()) return;
            observer.disconnect();
            revealAll(els.filter(function (el) { return !el.classList.contains('is-revealed'); }));
        });
    }

    const COUNT_MS = 1100;

    function parseCount(el) {
        const raw = (el.dataset.count || '').trim();
        const text = (el.textContent || '').trim();
        const source = raw || text;
        const match = source.match(/^([^\d+-]*)([+-]?[\d.,]+)(.*)$/);
        if (!match) return null;
        const value = parseFloat(match[2].replace(/,/g, ''));
        if (!isFinite(value)) return null;
        const decimals = (match[2].split('.')[1] || '').length;
        return {
            value: value,
            decimals: decimals,
            grouped: match[2].indexOf(',') !== -1,
            prefix: raw ? (el.dataset.countPrefix || '') : match[1],
            suffix: raw ? (el.dataset.countSuffix || '') : match[3]
        };
    }

    /* Keep the separators the author wrote: "1,200" counts up as "1,200". */
    function formatCount(spec, value) {
        const body = spec.grouped
            ? value.toLocaleString(undefined, {
                minimumFractionDigits: spec.decimals,
                maximumFractionDigits: spec.decimals
            })
            : value.toFixed(spec.decimals);
        return spec.prefix + body + spec.suffix;
    }

    function runCount(el, spec) {
        const start = performance.now();
        scheduler.add(function (now) {
            const t = clamp((now - start) / COUNT_MS, 0, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = formatCount(spec, spec.value * eased);
            if (t < 1) return true;
            el.textContent = formatCount(spec, spec.value);
            return false;
        });
    }

    function initCounters() {
        const els = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
        if (!els.length) return;

        const specs = new Map();
        els.forEach(function (el) {
            const spec = parseCount(el);
            if (spec) specs.set(el, spec);
        });
        if (!specs.size) return;

        function settle(el) {
            const spec = specs.get(el);
            if (spec) el.textContent = formatCount(spec, spec.value);
        }

        if (isReduced() || !('IntersectionObserver' in window)) {
            specs.forEach(function (spec, el) { settle(el); });
            return;
        }

        const observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                obs.unobserve(entry.target);
                const spec = specs.get(entry.target);
                if (!spec) return;
                if (isReduced()) settle(entry.target);
                else runCount(entry.target, spec);
            });
        }, { threshold: 0.6 });

        specs.forEach(function (spec, el) { observer.observe(el); });
        onMotionChange(function () {
            if (!isReduced()) return;
            observer.disconnect();
            specs.forEach(function (spec, el) { settle(el); });
        });
    }

    /* ======================================================================
       5 · Page transitions
       Order of preference:
         1. Native cross-document View Transitions — when the stylesheet opts
            in with `@view-transition { navigation: auto }` the browser owns
            the animation and we must NOT intercept the click at all.
         2. Manual fade: add .page-exit, navigate after the fade.
         3. Reduced motion / anything unusual: plain navigation, untouched.
       ====================================================================== */

    const EXIT_MS = 260;
    let navigationStarted = false;
    let viewTransitionOptIn = null;

    function hasViewTransitionOptIn() {
        if (viewTransitionOptIn !== null) return viewTransitionOptIn;
        viewTransitionOptIn = false;
        if (typeof document.startViewTransition !== 'function' || !('CSSViewTransitionRule' in window)) {
            return viewTransitionOptIn;
        }
        try {
            Array.prototype.forEach.call(document.styleSheets, function (sheet) {
                let rules;
                try { rules = sheet.cssRules; } catch (err) { return; } /* cross-origin sheet */
                if (!rules) return;
                Array.prototype.forEach.call(rules, function (rule) {
                    if (rule instanceof window.CSSViewTransitionRule) viewTransitionOptIn = true;
                });
            });
        } catch (err) { /* keep false */ }
        return viewTransitionOptIn;
    }

    function scrollToTarget(target) {
        target.scrollIntoView({
            behavior: isReduced() ? 'auto' : 'smooth',
            block: 'start'
        });
        /* Send the keyboard there too, without a second scroll. */
        if (!target.hasAttribute('tabindex')) {
            target.setAttribute('tabindex', '-1');
            target.addEventListener('blur', function onBlur() {
                target.removeAttribute('tabindex');
                target.removeEventListener('blur', onBlur);
            });
        }
        if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    }

    function findHashTarget(hash) {
        if (!hash || hash.length < 2) return null;
        const id = decodeURIComponent(hash.slice(1));
        return document.getElementById(id) ||
            document.querySelector('[name="' + id.replace(/"/g, '\\"') + '"]');
    }

    function startNavigation(href) {
        if (isReduced() || !document.body) {
            location.assign(href);
            return;
        }
        document.body.classList.add('page-exit');
        let fired = false;
        const go = function () {
            if (fired) return;
            fired = true;
            location.assign(href);
        };
        window.setTimeout(go, EXIT_MS);
        /* Safety net: if the navigation never happens (blocked, offline,
           a beforeunload prompt) the page must not be left invisible. */
        window.setTimeout(function () {
            if (!navigationStarted && document.body) document.body.classList.remove('page-exit');
        }, EXIT_MS + 1600);
    }

    function onDocumentClick(e) {
        if (e.defaultPrevented) return;
        /* Modifier and middle clicks belong to the browser: new tab, new
           window, download, background tab. Never hijack them. */
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const target = e.target;
        if (!target || typeof target.closest !== 'function') return;
        const link = target.closest('a[href]');
        if (!link || !(link instanceof HTMLAnchorElement)) return;
        if (link.hasAttribute('download')) return;
        if (link.target && link.target !== '' && link.target !== '_self') return;
        if ((link.getAttribute('rel') || '').split(/\s+/).indexOf('external') !== -1) return;
        if (link.hasAttribute('data-no-transition')) return;

        const raw = link.getAttribute('href');
        if (!raw) return;

        const url = resolveUrl(raw);
        if (!url) return;
        /* Covers mailto:, tel:, sms:, javascript:, blob:, data: … */
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
        /* Covers absolute externals and protocol-relative "//host/path". */
        if (url.origin !== location.origin) return;

        /* Same document + hash → this is a scroll, not a navigation.
           (The old code compared against a bare filename, so "index.html#contact"
           on index.html faded the page out and then never navigated.) */
        if (isSameDocument(url)) {
            if (!url.hash) return; /* reload of the current page: leave it alone */
            const dest = findHashTarget(url.hash);
            if (!dest) return;
            e.preventDefault();
            scrollToTarget(dest);
            if (location.hash !== url.hash) {
                try { history.pushState(null, '', url.hash); } catch (err) { location.hash = url.hash; }
            }
            return;
        }

        if (hasViewTransitionOptIn()) return; /* the browser animates it */
        if (isReduced()) return;

        e.preventDefault();
        startNavigation(url.href);
    }

    function initPageTransitions() {
        document.addEventListener('click', onDocumentClick);
        window.addEventListener('pagehide', function () { navigationStarted = true; });
        window.addEventListener('pageshow', function (e) {
            navigationStarted = false;
            if (document.body) document.body.classList.remove('page-exit');
            if (e.persisted) {
                /* bfcache restore: re-sync anything that could have drifted. */
                syncThemeToggles();
                syncMotionToggles();
            }
        });
    }

    /* ======================================================================
       6 · Magnetic buttons
       One shared rAF task for every [data-magnetic] element, one passive
       pointermove listener on the document. Element geometry is cached in
       document coordinates and only re-read on resize / font load, so the
       per-frame work is pure arithmetic — no layout reads, no thrash.
       ====================================================================== */

    const MAG_MAX = 8;       /* px — deliberately subtle */
    const MAG_PAD = 36;      /* px of pull radius beyond the element box */
    const MAG_EASE = 0.18;

    function initMagnetic() {
        const els = Array.prototype.slice.call(document.querySelectorAll('[data-magnetic]'));
        if (!els.length) return;

        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
        const supportsTranslate = typeof els[0].style.translate === 'string';
        const items = els.map(function (el) {
            return { el: el, box: null, x: 0, y: 0, tx: 0, ty: 0 };
        });

        let pointerX = 0;
        let pointerY = 0;
        let pointerInside = false;
        let running = false;

        function measure() {
            const sx = window.scrollX || window.pageXOffset || 0;
            const sy = window.scrollY || window.pageYOffset || 0;
            items.forEach(function (item) {
                const rect = item.el.getBoundingClientRect();
                item.box = rect.width || rect.height
                    ? { cx: rect.left + sx + rect.width / 2, cy: rect.top + sy + rect.height / 2,
                        radius: Math.max(rect.width, rect.height) / 2 + MAG_PAD }
                    : null;
            });
        }

        function write(item) {
            const x = Math.round(item.x * 100) / 100;
            const y = Math.round(item.y * 100) / 100;
            if (!x && !y) {
                if (supportsTranslate) item.el.style.translate = '';
                else item.el.style.transform = '';
                item.el.style.willChange = '';
                return;
            }
            if (supportsTranslate) item.el.style.translate = x + 'px ' + y + 'px';
            else item.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        }

        function reset() {
            items.forEach(function (item) {
                item.x = item.y = item.tx = item.ty = 0;
                write(item);
            });
        }

        function frame() {
            const sx = window.scrollX || window.pageXOffset || 0;
            const sy = window.scrollY || window.pageYOffset || 0;
            let busy = false;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const box = item.box;
                if (box && pointerInside) {
                    const dx = pointerX + sx - box.cx;
                    const dy = pointerY + sy - box.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < box.radius) {
                        const pull = 1 - dist / box.radius;
                        item.tx = clamp(dx * 0.35, -MAG_MAX, MAG_MAX) * pull;
                        item.ty = clamp(dy * 0.35, -MAG_MAX, MAG_MAX) * pull;
                        if (!item.el.style.willChange) item.el.style.willChange = 'transform';
                    } else {
                        item.tx = item.ty = 0;
                    }
                } else {
                    item.tx = item.ty = 0;
                }

                item.x += (item.tx - item.x) * MAG_EASE;
                item.y += (item.ty - item.y) * MAG_EASE;
                if (Math.abs(item.x) < 0.05 && Math.abs(item.y) < 0.05) {
                    item.x = item.y = 0;
                } else {
                    busy = true;
                }
                write(item);
            }

            if (!busy) running = false;
            return busy;
        }

        function wake() {
            if (running) return;
            running = true;
            scheduler.add(frame);
        }

        const onPointerMove = function (e) {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            pointerX = e.clientX;
            pointerY = e.clientY;
            pointerInside = true;
            wake();
        };

        function enable() {
            document.addEventListener('pointermove', onPointerMove, { passive: true });
            document.addEventListener('pointerleave', onPointerOut);
            window.addEventListener('blur', onPointerOut);
            measure();
        }

        function disable() {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerleave', onPointerOut);
            window.removeEventListener('blur', onPointerOut);
            pointerInside = false;
            scheduler.remove(frame);
            running = false;
            reset();
        }

        function onPointerOut() {
            pointerInside = false;
            wake();
        }

        function sync() {
            if (finePointer.matches && !isReduced() && 'PointerEvent' in window) enable();
            else disable();
        }

        const remeasure = debounce(measure, 150);
        window.addEventListener('resize', remeasure, { passive: true });
        window.addEventListener('scroll', debounce(measure, 200), { passive: true });
        if (document.fonts && typeof document.fonts.ready === 'object') {
            document.fonts.ready.then(measure).catch(function () { });
        }
        onMediaChange(finePointer, sync);
        onMotionChange(sync);
        sync();
    }

    /* ======================================================================
       7 · Overlay primitive
       Scroll lock, inert background, focus trap, focus restore, Escape.
       Shared by the command palette and the lightbox — written once.
       ====================================================================== */

    const OVERLAY_EXIT_MS = 240;
    const supportsInert = 'inert' in HTMLElement.prototype;

    function createOverlay(el, options) {
        const opts = options || {};
        const trap = createFocusTrap(el);
        let open = false;
        let hideTimer = 0;
        let inerted = [];
        let prevOverflow = '';
        let prevPadding = '';
        let prevNavPadding = '';

        if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && opts.label) {
            el.setAttribute('aria-label', opts.label);
        }
        if (!el.hasAttribute('hidden')) el.hidden = true;
        el.setAttribute('aria-hidden', 'true');

        const nav = document.querySelector('.site-nav');

        function lockScroll() {
            const gap = window.innerWidth - root.clientWidth;
            prevOverflow = root.style.overflow;
            prevPadding = document.body.style.paddingRight;
            root.style.overflow = 'hidden';
            if (gap > 0) {
                root.style.setProperty('--scrollbar-gap', gap + 'px');
                document.body.style.paddingRight = gap + 'px';
                if (nav) {
                    prevNavPadding = nav.style.paddingRight;
                    nav.style.paddingRight = gap + 'px';
                }
            }
        }

        function unlockScroll() {
            root.style.overflow = prevOverflow;
            document.body.style.paddingRight = prevPadding;
            root.style.removeProperty('--scrollbar-gap');
            if (nav) nav.style.paddingRight = prevNavPadding;
        }

        function inertBackground() {
            inerted = [];
            Array.prototype.forEach.call(document.body.children, function (child) {
                if (child === el || child === liveRegion || child.contains(el)) return;
                const record = { el: child, hadAria: child.getAttribute('aria-hidden') };
                if (supportsInert) child.inert = true;
                else child.setAttribute('aria-hidden', 'true');
                inerted.push(record);
            });
        }

        function restoreBackground() {
            inerted.forEach(function (record) {
                if (supportsInert) record.el.inert = false;
                if (record.hadAria === null) record.el.removeAttribute('aria-hidden');
                else record.el.setAttribute('aria-hidden', record.hadAria);
            });
            inerted = [];
        }

        function onKeydown(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                api.close();
                return;
            }
            if (opts.onKeydown) opts.onKeydown(e);
        }

        /* Click-outside, done properly: the press and the release must both
           land outside the panel, and a drag (a swipe, a text selection)
           never dismisses. */
        let pressedOutside = false;
        let pressX = 0;
        let pressY = 0;

        function outside(node) {
            if (!opts.dismissSelector) return false;
            return !(node && node.closest && node.closest(opts.dismissSelector));
        }

        function onPointerDown(e) {
            if (!opts.dismissSelector) return;
            pressedOutside = outside(e.target);
            pressX = e.clientX;
            pressY = e.clientY;
        }

        function onPointerUp(e) {
            if (!pressedOutside) return;
            pressedOutside = false;
            if (Math.abs(e.clientX - pressX) > 12 || Math.abs(e.clientY - pressY) > 12) return;
            if (outside(e.target)) api.close();
        }

        const api = {
            el: el,
            isOpen: function () { return open; },
            open: function (openOptions) {
                if (open) return;
                const o = openOptions || {};
                open = true;
                window.clearTimeout(hideTimer);
                el.hidden = false;
                el.setAttribute('aria-hidden', 'false');
                lockScroll();
                inertBackground();
                void el.offsetWidth; /* flush so the enter transition runs */
                el.classList.add('is-open');
                document.addEventListener('keydown', onKeydown);
                el.addEventListener('pointerdown', onPointerDown);
                el.addEventListener('pointerup', onPointerUp);
                trap.activate(o.initialFocus, o.restoreFocus);
                if (opts.onOpen) opts.onOpen(o);
            },
            close: function () {
                if (!open) return;
                open = false;
                el.classList.remove('is-open');
                document.removeEventListener('keydown', onKeydown);
                el.removeEventListener('pointerdown', onPointerDown);
                el.removeEventListener('pointerup', onPointerUp);
                pressedOutside = false;
                restoreBackground();
                unlockScroll();
                trap.release();
                el.setAttribute('aria-hidden', 'true');
                hideTimer = window.setTimeout(function () {
                    if (!open) el.hidden = true;
                }, isReduced() ? 0 : OVERLAY_EXIT_MS);
                if (opts.onClose) opts.onClose();
            }
        };

        return api;
    }

    /* ======================================================================
       8 · Command palette — Cmd/Ctrl + K
       Destinations are read out of the page's own navigation and footer, so
       the palette can never offer a link the site does not actually have.
       Two executable actions are appended: theme and motion.
       ====================================================================== */

    const isMac = (function () {
        try {
            const platform = (navigator.userAgentData && navigator.userAgentData.platform) ||
                navigator.platform || '';
            return /mac|iphone|ipad|ipod/i.test(platform);
        } catch (err) { return false; }
    })();

    function fuzzyMatch(query, text) {
        const q = query.toLowerCase();
        const t = text.toLowerCase();
        if (!q) return { score: 0, ranges: [] };
        const ranges = [];
        let qi = 0;
        let score = 0;
        let streak = 0;
        for (let ti = 0; ti < t.length && qi < q.length; ti++) {
            if (t.charAt(ti) !== q.charAt(qi)) { streak = 0; continue; }
            const boundary = ti === 0 || /[\s\-_/.,:·]/.test(t.charAt(ti - 1));
            score += 1 + streak * 2 + (boundary ? 3 : 0);
            streak++;
            const last = ranges[ranges.length - 1];
            if (last && last[1] === ti) last[1] = ti + 1;
            else ranges.push([ti, ti + 1]);
            qi++;
        }
        if (qi < q.length) return null;
        score -= Math.max(0, t.length - q.length) * 0.08;
        return { score: score, ranges: ranges };
    }

    function paintLabel(container, text, ranges) {
        container.textContent = '';
        let pos = 0;
        (ranges || []).forEach(function (range) {
            if (range[0] > pos) container.appendChild(document.createTextNode(text.slice(pos, range[0])));
            const mark = document.createElement('mark');
            mark.className = 'cmdk-mark';
            mark.textContent = text.slice(range[0], range[1]);
            container.appendChild(mark);
            pos = range[1];
        });
        if (pos < text.length) container.appendChild(document.createTextNode(text.slice(pos)));
    }

    function initCommandPalette() {
        const el = document.querySelector('[data-cmdk]');
        if (!el) return;
        const panel = el.querySelector('.cmdk-panel') || el.firstElementChild;
        const input = el.querySelector('.cmdk-input');
        const list = el.querySelector('.cmdk-list');
        if (!panel || !input || !list) return;

        let empty = el.querySelector('.cmdk-empty');
        if (!empty) {
            empty = document.createElement('p');
            empty.className = 'cmdk-empty';
            list.parentNode.insertBefore(empty, list.nextSibling);
        }
        if (!empty.textContent.trim()) empty.textContent = 'No matches. Try “work”, “photo” or “email”.';
        empty.hidden = true;

        const listId = ensureId(list, 'cmdk-list');
        list.setAttribute('role', 'listbox');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'true');
        input.setAttribute('aria-controls', listId);
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('spellcheck', 'false');
        if (!input.getAttribute('placeholder')) input.setAttribute('placeholder', 'Search pages and actions…');

        const listIsList = list.tagName === 'UL' || list.tagName === 'OL';
        let items = [];
        let results = [];
        let cursor = 0;

        function labelFor(link) {
            const explicit = link.getAttribute('data-cmdk-label');
            if (explicit) return explicit;
            const text = (link.textContent || '').replace(/\s+/g, ' ').trim();
            return text || link.getAttribute('aria-label') || link.getAttribute('title') || '';
        }

        function collect() {
            const collected = [];
            const seen = Object.create(null);
            /* [data-cmdk-item] is the explicit opt-in; the rest pick up the
               contact, social and project links that exist on a given page so
               the palette can reach them, not just the five nav destinations. */
            const selectors = '.nav-logo, .nav-links a[href], .site-footer a[href], ' +
                '.contact-aside a[href], .project-links a[href], .case a[href], ' +
                '.cmdk-list a[href], [data-cmdk-item]';
            Array.prototype.forEach.call(document.querySelectorAll(selectors), function (link) {
                if (!(link instanceof HTMLAnchorElement)) return;
                const raw = link.getAttribute('href');
                if (!raw || raw === '#') return;
                const url = resolveUrl(raw);
                if (!url) return;
                const label = labelFor(link);
                if (!label) return;
                const key = url.href + '|' + label.toLowerCase();
                if (seen[key]) return;
                seen[key] = true;

                let kind;
                if (url.protocol === 'mailto:') kind = 'Email';
                else if (url.protocol === 'tel:') kind = 'Call';
                else if (url.origin !== location.origin) kind = url.hostname.replace(/^www\./, '');
                else kind = 'Page';

                collected.push({
                    label: label,
                    kind: link.getAttribute('data-cmdk-kind') || kind,
                    keywords: (link.getAttribute('data-cmdk-keywords') || '') + ' ' + url.href,
                    href: url.href,
                    external: url.origin !== location.origin && /^https?:$/.test(url.protocol),
                    protocol: url.protocol
                });
            });

            collected.push({
                label: currentTheme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
                kind: 'Action',
                keywords: 'theme dark light appearance colour color mode',
                run: toggleTheme
            });
            collected.push({
                label: isReduced() ? 'Turn animation on' : 'Turn animation off',
                kind: 'Action',
                keywords: 'motion animation reduce accessibility',
                run: toggleMotion
            });
            return collected;
        }

        function activate(item) {
            if (!item) return;
            const run = item.run;
            const href = item.href;
            const external = item.external;
            const protocol = item.protocol;
            overlay.close();
            /* Navigate after the overlay has released inert + focus. */
            window.setTimeout(function () {
                if (run) { run(); return; }
                if (!href) return;
                if (external) {
                    const win = window.open(href, '_blank', 'noopener,noreferrer');
                    if (win) win.opener = null;
                    return;
                }
                if (protocol !== 'http:' && protocol !== 'https:') {
                    location.href = href;
                    return;
                }
                const url = resolveUrl(href);
                if (url && isSameDocument(url) && url.hash) {
                    const dest = findHashTarget(url.hash);
                    if (dest) {
                        scrollToTarget(dest);
                        try { history.pushState(null, '', url.hash); } catch (err) { location.hash = url.hash; }
                        return;
                    }
                }
                startNavigation(href);
            }, 0);
        }

        function setCursor(next) {
            if (!results.length) return;
            cursor = (next + results.length) % results.length;
            results.forEach(function (result, i) {
                const active = i === cursor;
                result.node.classList.toggle('is-active', active);
                result.node.setAttribute('aria-selected', active ? 'true' : 'false');
                if (active) {
                    input.setAttribute('aria-activedescendant', result.node.id);
                    if (typeof result.node.scrollIntoView === 'function') {
                        result.node.scrollIntoView({ block: 'nearest' });
                    }
                }
            });
        }

        function render(query) {
            list.textContent = '';
            results = [];
            const matches = [];
            items.forEach(function (item) {
                let match = fuzzyMatch(query, item.label);
                let ranges = match ? match.ranges : null;
                if (!match) {
                    const alt = fuzzyMatch(query, item.label + ' ' + (item.kind || '') + ' ' + (item.keywords || ''));
                    if (!alt) return;
                    match = { score: alt.score - 4 };
                    ranges = null;
                }
                matches.push({ item: item, score: match.score, ranges: ranges });
            });
            matches.sort(function (a, b) { return b.score - a.score; });

            matches.forEach(function (match, i) {
                const node = document.createElement('button');
                node.type = 'button';
                node.className = 'cmdk-item';
                node.setAttribute('role', 'option');
                node.id = 'cmdk-item-' + i;
                node.setAttribute('aria-selected', 'false');

                const label = document.createElement('span');
                label.className = 'cmdk-item-label';
                paintLabel(label, match.item.label, match.ranges);
                node.appendChild(label);

                if (match.item.kind) {
                    const kind = document.createElement('span');
                    kind.className = 'cmdk-item-kind';
                    kind.textContent = match.item.kind;
                    node.appendChild(kind);
                }

                node.addEventListener('click', function () { activate(match.item); });
                node.addEventListener('mousemove', function () { setCursor(i); });

                if (listIsList) {
                    const li = document.createElement('li');
                    li.setAttribute('role', 'presentation');
                    li.appendChild(node);
                    list.appendChild(li);
                } else {
                    list.appendChild(node);
                }
                results.push({ item: match.item, node: node });
            });

            empty.hidden = results.length > 0;
            list.hidden = results.length === 0;
            if (results.length) setCursor(0);
            else input.removeAttribute('aria-activedescendant');
        }

        const overlay = createOverlay(el, {
            label: 'Command palette',
            dismissSelector: '.cmdk-panel',
            onOpen: function () {
                items = collect();
                input.value = '';
                render('');
            },
            onClose: function () {
                input.value = '';
            },
            onKeydown: function (e) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(cursor + 1); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(cursor - 1); }
                else if (e.key === 'Home' && results.length) { e.preventDefault(); setCursor(0); }
                else if (e.key === 'End' && results.length) { e.preventDefault(); setCursor(results.length - 1); }
                else if (e.key === 'Enter') {
                    if (!results.length) return;
                    e.preventDefault();
                    activate(results[cursor].item);
                }
            }
        });

        input.addEventListener('input', function () { render(input.value.trim()); });

        Array.prototype.forEach.call(document.querySelectorAll('[data-cmdk-open]'), function (trigger) {
            trigger.addEventListener('click', function () {
                overlay.open({ initialFocus: input, restoreFocus: trigger });
            });
            /* Show the shortcut the visitor's keyboard actually has. */
            const hint = trigger.querySelector('kbd');
            if (hint && !isMac && /⌘/.test(hint.textContent)) {
                hint.textContent = hint.textContent.replace('⌘', 'Ctrl ').trim();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'k' && e.key !== 'K') return;
            if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
            e.preventDefault();
            if (overlay.isOpen()) overlay.close();
            else overlay.open({ initialFocus: input, restoreFocus: document.activeElement });
        });
    }

    /* ======================================================================
       9 · Photo lightbox
       ====================================================================== */

    /* ---------------------------------------------------------------------
       Photo grid
       js/photos.js publishes window.PHOTOS; this builds the cards the
       lightbox then wires up, so it must run before initLightbox().
       Each card is a <figure> holding a real <button>, because the lightbox
       listens for clicks on the figure and a bare figure is not reachable
       by keyboard.
       --------------------------------------------------------------------- */
    function initPhotoGrid() {
        const grid = document.querySelector('[data-photo-grid]');
        if (!grid) return;
        const photos = Array.isArray(window.PHOTOS) ? window.PHOTOS : null;
        if (!photos || !photos.length) return;   // <noscript> fallback stands

        const frag = document.createDocumentFragment();

        photos.forEach(function (ph, i) {
            if (!ph || !ph.src) return;
            if (ph.slug === 'about') return;   // portrait, used on the About page only

            const fig = document.createElement('figure');
            fig.className = 'photo-card';
            // Largest rendition the lightbox should load.
            fig.setAttribute('data-full', (ph.srcset && largest(ph.srcset)) || ph.src);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'photo-open';
            btn.setAttribute('aria-label', 'Open full frame: ' + (ph.alt || ph.caption || 'photograph'));

            const img = document.createElement('img');
            img.src = ph.src;
            if (ph.srcset) img.srcset = ph.srcset;
            img.sizes = '(min-width: 1100px) 32vw, (min-width: 700px) 46vw, 92vw';
            img.alt = ph.alt || '';
            if (ph.width) img.width = ph.width;
            if (ph.height) img.height = ph.height;
            img.loading = i < 2 ? 'eager' : 'lazy';
            img.decoding = 'async';
            if (ph.lqip) {
                // Blur-up placeholder: dropped once the real frame paints.
                img.style.backgroundImage = 'url("' + ph.lqip + '")';
                img.style.backgroundSize = 'cover';
                img.style.backgroundPosition = 'center';
                img.addEventListener('load', function () { img.style.backgroundImage = ''; }, { once: true });
            }

            btn.appendChild(img);
            fig.appendChild(btn);

            if (ph.caption) {
                const cap = document.createElement('figcaption');
                cap.className = 'photo-caption';
                cap.textContent = ph.caption;
                fig.appendChild(cap);
            }

            frag.appendChild(fig);
        });

        grid.appendChild(frag);
    }

    /* Last URL in a "url 400w, url 800w, url 1600w" srcset. */
    function largest(srcset) {
        const parts = String(srcset).split(',');
        const last = parts[parts.length - 1].trim().split(/\s+/)[0];
        return last || '';
    }

    function initLightbox() {
        const el = document.querySelector('[data-lightbox]');
        if (!el) return;
        const img = el.querySelector('.lightbox-img');
        if (!img) return;
        const meta = el.querySelector('.lightbox-meta');
        const closeBtn = el.querySelector('.lightbox-close');
        const prevBtn = el.querySelector('.lightbox-prev');
        const nextBtn = el.querySelector('.lightbox-next');
        const cards = Array.prototype.slice.call(document.querySelectorAll('.photo-card'));
        if (!cards.length) return;

        const slides = cards.map(function (card) {
            const thumb = card.querySelector('img');
            const captionEl = card.querySelector('.photo-caption');
            const anchor = card instanceof HTMLAnchorElement ? card : card.querySelector('a[href]');
            const src = card.getAttribute('data-full') ||
                (thumb && thumb.getAttribute('data-full')) ||
                (anchor && anchor.getAttribute('href')) ||
                (thumb && (thumb.currentSrc || thumb.src)) || '';
            return {
                card: card,
                src: src,
                alt: (thumb && thumb.getAttribute('alt')) || '',
                caption: captionEl ? captionEl.textContent.trim() : ''
            };
        }).filter(function (slide) { return !!slide.src; });
        if (!slides.length) return;

        let index = 0;

        function preload(i) {
            const slide = slides[(i + slides.length) % slides.length];
            if (!slide) return;
            const pre = new Image();
            pre.decoding = 'async';
            pre.src = slide.src;
        }

        function show(i) {
            index = (i + slides.length) % slides.length;
            const slide = slides[index];
            el.classList.add('is-loading');
            img.setAttribute('alt', slide.alt);
            img.src = slide.src;
            if (meta) meta.textContent = slide.caption;
            el.setAttribute('aria-label', 'Photo ' + (index + 1) + ' of ' + slides.length +
                (slide.alt ? ': ' + slide.alt : ''));
            const done = function () { el.classList.remove('is-loading'); };
            if (img.complete) done();
            else {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
            }
            preload(index + 1);
            preload(index - 1);
        }

        const overlay = createOverlay(el, {
            label: 'Photo viewer',
            dismissSelector: '.lightbox-img, .lightbox-close, .lightbox-prev, .lightbox-next, .lightbox-meta, .lightbox-panel',
            onKeydown: function (e) {
                if (slides.length < 2) return;
                if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', function () { overlay.close(); });
        if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); });
        if (slides.length < 2) {
            if (prevBtn) prevBtn.hidden = true;
            if (nextBtn) nextBtn.hidden = true;
        }

        /* Swipe. Pointer Events cover touch and pen without a second path. */
        let swipeX = 0;
        let swipeY = 0;
        let swiping = false;
        img.draggable = false;
        el.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse') return;
            swiping = true;
            swipeX = e.clientX;
            swipeY = e.clientY;
        }, { passive: true });
        el.addEventListener('pointerup', function (e) {
            if (!swiping) return;
            swiping = false;
            const dx = e.clientX - swipeX;
            const dy = e.clientY - swipeY;
            if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
            show(dx < 0 ? index + 1 : index - 1);
        }, { passive: true });
        el.addEventListener('pointercancel', function () { swiping = false; });

        slides.forEach(function (slide, i) {
            slide.card.addEventListener('click', function (e) {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                show(i);
                overlay.open({
                    initialFocus: closeBtn || null,
                    restoreFocus: slide.card.querySelector('.photo-open') || slide.card
                });
            });
        });
    }

    /* ======================================================================
       10 · Copy to clipboard
       ====================================================================== */

    const COPIED_MS = 1800;

    function writeClipboard(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            const helper = document.createElement('textarea');
            helper.value = text;
            helper.setAttribute('readonly', '');
            helper.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
            document.body.appendChild(helper);
            helper.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
            document.body.removeChild(helper);
            ok ? resolve() : reject(new Error('copy-unsupported'));
        });
    }

    function initCopy() {
        const els = Array.prototype.slice.call(document.querySelectorAll('[data-copy]'));
        if (!els.length) return;
        els.forEach(function (el) {
            let timer = 0;
            el.addEventListener('click', function () {
                const value = el.getAttribute('data-copy') || (el.textContent || '').trim();
                if (!value) return;
                writeClipboard(value).then(function () {
                    el.classList.add('is-copied');
                    el.setAttribute('data-copy-state', 'copied');
                    announce('Copied ' + value + ' to the clipboard.');
                    window.clearTimeout(timer);
                    timer = window.setTimeout(function () {
                        el.classList.remove('is-copied');
                        el.removeAttribute('data-copy-state');
                    }, COPIED_MS);
                }).catch(function () {
                    el.setAttribute('data-copy-state', 'failed');
                    announce('Copy failed. The value is ' + value + '.');
                    window.clearTimeout(timer);
                    timer = window.setTimeout(function () {
                        el.removeAttribute('data-copy-state');
                    }, COPIED_MS);
                });
            });
        });
    }

    /* ======================================================================
       11 · Contact form
       The markup carries a real action/method so a JS failure degrades to a
       POST. Here we validate inline, POST with fetch when a real endpoint is
       configured, and fall back to a pre-filled mail draft when it is not.
       The visitor is never left without a status message.
       ====================================================================== */

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const FALLBACK_EMAIL = 'haidilazani@gmail.com';
    const PLACEHOLDER_ACTION = /(your[-_]?form|yourid|xxx+|example\.com|placeholder|todo|replace[-_]?me|\{\{)/i;

    function fieldLabel(input) {
        const wrap = input.closest('.field');
        let text = '';
        const labelled = wrap && wrap.querySelector('.field-label');
        if (labelled) text = labelled.textContent;
        else if (input.id) {
            const label = document.querySelector('label[for="' + input.id.replace(/"/g, '\\"') + '"]');
            if (label) text = label.textContent;
        }
        text = (text || input.getAttribute('aria-label') || input.name || 'This field')
            .replace(/[\s*:]+$/, '').replace(/\s+/g, ' ').trim();
        return text || 'This field';
    }

    function validateField(input) {
        const value = (input.value || '').trim();
        const label = fieldLabel(input);
        if ((input.required || input.getAttribute('aria-required') === 'true') && !value) {
            return label + ' is required.';
        }
        if (!value) return '';
        if (input.type === 'email' && !EMAIL_RE.test(value)) {
            return 'Enter an email address like name@example.com so I can reply.';
        }
        const min = parseInt(input.getAttribute('minlength'), 10);
        if (min && value.length < min) {
            return label + ' needs at least ' + min + ' characters.';
        }
        const max = parseInt(input.getAttribute('maxlength'), 10);
        if (max && value.length > max) {
            return label + ' must be ' + max + ' characters or fewer.';
        }
        return '';
    }

    function endpointIsConfigured(form) {
        if (form.getAttribute('data-endpoint') === 'mailto') return false;
        const action = (form.getAttribute('action') || '').trim();
        if (!action || action === '#') return false;
        if (PLACEHOLDER_ACTION.test(action)) return false;
        const url = resolveUrl(action);
        if (!url) return false;
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        /* A same-origin action on GitHub Pages cannot accept a POST. */
        if (url.origin === location.origin) return false;
        return true;
    }

    function initContactForm() {
        const form = document.querySelector('.contact-form');
        if (!form) return;
        const inputs = Array.prototype.slice.call(form.querySelectorAll('.field-input'));
        if (!inputs.length) return;

        const status = form.querySelector('.form-status') ||
            document.querySelector('.form-status');
        const submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button');
        const mailTo = form.getAttribute('data-mailto') || FALLBACK_EMAIL;
        let submitted = false;
        let busy = false;

        /* Our inline errors replace the native bubbles — but only now that
           JS is running; the markup keeps native validation without it. */
        form.setAttribute('novalidate', '');

        function errorNodeFor(input) {
            const wrap = input.closest('.field') || form;
            let node = wrap.querySelector('.field-error');
            if (!node) {
                node = document.createElement('p');
                node.className = 'field-error';
                (input.parentNode || wrap).appendChild(node);
            }
            return node;
        }

        function setStatus(message, state) {
            if (!status) return;
            status.textContent = '';
            status.setAttribute('data-state', state || '');
            if (!message) return;
            status.appendChild(document.createTextNode(message));
        }

        function setStatusWithMail(message, state) {
            if (!status) return;
            setStatus(message + ' ', state);
            const link = document.createElement('a');
            link.href = 'mailto:' + mailTo;
            link.textContent = mailTo;
            status.appendChild(link);
            status.appendChild(document.createTextNode('.'));
        }

        function showError(input, message) {
            const node = errorNodeFor(input);
            const id = ensureId(node, 'field-error');
            if (message) {
                node.textContent = message;
                node.hidden = false;
                input.setAttribute('aria-invalid', 'true');
                const described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
                if (described.indexOf(id) === -1) {
                    described.push(id);
                    input.setAttribute('aria-describedby', described.join(' '));
                }
                const wrap = input.closest('.field');
                if (wrap) wrap.classList.add('has-error');
            } else {
                node.textContent = '';
                node.hidden = true;
                input.removeAttribute('aria-invalid');
                const described = (input.getAttribute('aria-describedby') || '')
                    .split(/\s+/).filter(function (token) { return token && token !== id; });
                if (described.length) input.setAttribute('aria-describedby', described.join(' '));
                else input.removeAttribute('aria-describedby');
                const wrap = input.closest('.field');
                if (wrap) wrap.classList.remove('has-error');
            }
        }

        function validateAll() {
            let firstInvalid = null;
            inputs.forEach(function (input) {
                const message = validateField(input);
                showError(input, message);
                if (message && !firstInvalid) firstInvalid = input;
            });
            return firstInvalid;
        }

        inputs.forEach(function (input) {
            showError(input, '');
            input.addEventListener('blur', function () {
                if (!submitted && !input.value.trim()) return;
                showError(input, validateField(input));
            });
            input.addEventListener('input', function () {
                if (!submitted && input.getAttribute('aria-invalid') !== 'true') return;
                showError(input, validateField(input));
            });
        });

        function setBusy(on) {
            busy = on;
            form.classList.toggle('is-loading', on);
            form.setAttribute('data-state', on ? 'sending' : '');
            if (submitBtn) {
                submitBtn.disabled = on;
                submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
            }
        }

        function valueOf(name) {
            const input = form.querySelector('[name="' + name + '"]');
            return input ? (input.value || '').trim() : '';
        }

        function mailtoFallback(reason) {
            const name = valueOf('name');
            const email = valueOf('email');
            const subject = valueOf('subject') || (name ? 'Hello from ' + name : 'Hello from your site');
            const message = valueOf('message');
            const signature = (name || email)
                ? '\n\n' + [name, email].filter(Boolean).join(' · ')
                : '';
            const href = 'mailto:' + mailTo +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(message + signature);
            setStatusWithMail(reason + ' Your mail app should open with the message ready to send. ' +
                'If nothing opens, write to', 'info');
            window.location.href = href;
        }

        form.addEventListener('submit', function (e) {
            /* Stop the native submit before anything that could throw, so a
               script failure can never turn this into a GET with the whole
               message in the query string. */
            e.preventDefault();
            if (busy) return;

            try {
                const firstInvalid = validateAll();
                if (firstInvalid) {
                    setStatus('Please check the highlighted fields.', 'error');
                    firstInvalid.focus();
                    return;
                }

                if (!endpointIsConfigured(form)) {
                    mailtoFallback('No form service is connected yet, so this goes by email.');
                    return;
                }

                setBusy(true);
                setStatus('Sending…', 'pending');

                const action = resolveUrl(form.getAttribute('action')).href;
                const method = (form.getAttribute('method') || 'POST').toUpperCase();

                window.fetch(action, {
                    method: method === 'GET' ? 'POST' : method,
                    body: new FormData(form),
                    headers: { Accept: 'application/json' }
                }).then(function (response) {
                    setBusy(false);
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    form.reset();
                    inputs.forEach(function (input) { showError(input, ''); });
                    submitted = false;
                    setStatus('Thank you — your message is on its way. I usually reply within a couple of days.', 'success');
                    if (submitBtn) submitBtn.focus();
                }).catch(function () {
                    setBusy(false);
                    setStatusWithMail('That did not go through. You can try again, or email me at', 'error');
                });
            } catch (err) {
                setBusy(false);
                mailtoFallback('Something went wrong sending that.');
            } finally {
                submitted = true;
            }
        });
    }

    /* ======================================================================
       12 · Bootstrap
       Preferences are seeded immediately (they only touch <html>); everything
       else waits for the DOM. Each feature is isolated so one failure cannot
       take the rest of the page down with it.
       ====================================================================== */

    seedMotion();
    seedTheme();

    function init() {
        [
            initPreferenceToggles,
            initNavState,
            initNavLinks,
            initReveal,
            initCounters,
            initPageTransitions,
            initMagnetic,
            initCommandPalette,
            initPhotoGrid,
            initLightbox,
            initCopy,
            initContactForm
        ].forEach(function (fn) {
            try { fn(); } catch (err) {
                if (window.console && console.error) console.error('[app] ' + fn.name + ' failed:', err);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
