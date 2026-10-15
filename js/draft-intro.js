/* ==========================================================================
   draft-intro.js - the stage intro on draft-index.html (draft only)
   --------------------------------------------------------------------------
   A full-screen, scroll-locked overlay ("Welcome, you found me. Come closer
   and see what's inside.") that the visitor dismisses by starting to
   scroll. Loaded with `defer`, LAST, after app.js / stack.js / tilt.js /
   home.js, so it runs after them and before DOMContentLoaded.

   STATE (classes on <html>, styled in css/draft-theme.css section 4)
     js-intro       set by the inline <head> gate; overlay visible, page locked
     intro-ready    set here the moment this script runs: "this script owns
                    the overlay and the loading of hero.js". If it is missing
                    at DOMContentLoaded the gate releases the page itself.
     intro-leaving  the fade is running; the hero's CSS entrance plays now
     intro-done     finished; overlay [hidden], page unlocked
   The state machine inside is: locked -> leaving -> guard -> done.

   DISMISS (all user-initiated, nothing on a timer)
     wheel down (non-passive, the page is not allowed to move), a one-finger
     swipe up past SWIPE_PX, ArrowDown / PageDown / Space / End / Enter /
     Escape, or the visible Enter button. Pinch-zoom (ctrl+wheel, two-finger
     touch) is never intercepted.

   GUARD
     A trackpad fling keeps firing wheel events for a second or more, and a
     held arrow key repeats. After the unlock, those are swallowed for at
     least GUARD_MIN_MS and until QUIET_MS of silence (capped at
     GUARD_MAX_MS), so the inertia of the dismissing gesture cannot throw
     the visitor straight past the hero.

   COORDINATION WITH THE REST OF THE SITE (no existing file is modified)
     app.js  - the lock is a CSS class, never inline style (its overlay
               primitive saves/restores html's inline overflow); Cmd/Ctrl+K is
               swallowed in the capture phase while the intro is up, because
               app.js's restoreBackground() would un-inert <main>; each body
               child's previous `inert` value is remembered and restored.
     hero.js - not linked statically on the draft home. It is injected here,
               immediately when there is no intro, or as the intro starts to
               leave, so the terrain's 900ms entrance sweep plays on screen.
               hero.js is an IIFE that queries the DOM when it executes, so a
               late start is safe. Its odometer dial deliberately skips itself
               when it boots more than 1.2s after navigation, leaving the
               keyword as plain text; the CSS entrance still plays.
     hero.css - its hero-rise / hero-fade / marquee animations are paused by
               CSS while html.js-intro is set without .intro-leaving.

   ACCESSIBILITY
     role="dialog" + aria-modal. Focus starts on the dialog itself (so it is
     announced by its label, with no stray focus ring on load); Tab moves to
     the Enter button and stays there; everything else in <body> is inert
     while locked. On finish
     the overlay is [hidden] (out of the a11y tree) and focus moves to the
     hero <h1> (tabindex -1, removed again on blur). Reduced motion (OS or
     the site toggle) keeps the intro but drops its motion; main.css's kill
     switch collapses the fade to 1ms and the timeout below is the backstop.
   ========================================================================== */

(function () {
    'use strict';

    var root = document.documentElement;
    var HERO_SRC = 'js/hero.js';

    /* Load hero.js exactly once, whoever asks first (this script or the
       inline gate's fail-safe). */
    function loadHero() {
        if (!document.body) return;
        if (document.querySelector('script[src="' + HERO_SRC + '"]')) return;
        var s = document.createElement('script');
        s.src = HERO_SRC;
        document.body.appendChild(s);
    }

    /* Claim the page first, so the gate's fail-safe stands down. */
    root.classList.add('intro-ready');

    var intro = document.querySelector('[data-intro]');

    /* No intro this time (deep link, ?intro=0, or the gate already released
       the page): make sure the overlay is gone and boot the hero now. */
    if (!intro || !root.classList.contains('js-intro')) {
        if (intro) intro.hidden = true;
        loadHero();
        return;
    }

    /* ---- Tuning ---------------------------------------------------------- */
    var FADE_MS = 900;          /* = --intro-fade in css/draft-theme.css */
    var FADE_SLACK_MS = 200;    /* transitionend backstop                 */
    var WHEEL_MIN = 4;          /* px of downward wheel that counts       */
    var SWIPE_PX = 40;          /* px of upward finger travel that counts */
    var QUIET_MS = 260;         /* silence that ends the guard            */
    var GUARD_MIN_MS = 700;     /* always swallow this long after unlock  */
    var GUARD_MAX_MS = 1600;    /* never swallow longer than this         */

    var FORWARD_KEYS = ['ArrowDown', 'PageDown', ' ', 'Spacebar', 'End'];
    var SCROLL_KEYS = FORWARD_KEYS.concat(['ArrowUp', 'PageUp', 'Home']);

    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function isReduced() {
        return root.getAttribute('data-motion') === 'reduced' || !!(mq && mq.matches);
    }

    var enter = intro.querySelector('[data-intro-enter]');
    var state = 'locked';
    var background = [];
    var touchY = null;
    var quietTimer = 0;
    var unlockAt = 0;

    /* ---- Lock ------------------------------------------------------------ */

    function jumpToTop() {
        /* html has scroll-behavior: smooth (main.css); a plain scrollTo would
           animate. Turn it off for this one jump, then restore. */
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        root.style.scrollBehavior = prev;
    }

    function inertBackground() {
        /* If app.js's palette was opened in the gap before this script ran,
           its inert is temporary (it clears every body child on close), so it
           is not a state to restore; remembering it would leave <main> inert
           for good once the intro finishes. */
        var overlayOpen = !!document.querySelector('[data-cmdk].is-open');
        Array.prototype.forEach.call(document.body.children, function (el) {
            if (el === intro || el.tagName === 'SCRIPT') return;
            background.push({ el: el, was: overlayOpen ? false : !!el.inert });
            el.inert = true;
        });
    }

    function restoreBackground() {
        background.forEach(function (rec) { rec.el.inert = rec.was; });
        background = [];
    }

    /* Emergency exit and normal exit share the same release. */
    function release() {
        restoreBackground();
        root.classList.remove('js-intro', 'intro-leaving');
        root.classList.add('intro-done');
        intro.hidden = true;
    }

    /* ---- Input ----------------------------------------------------------- */

    /* While leaving or guarding: should this scroll input be swallowed? */
    function swallowing() {
        if (state === 'leaving') return true;
        if (state !== 'guard') return false;
        if (performance.now() - unlockAt >= GUARD_MAX_MS) { detach(); return false; }
        return true;
    }

    function onWheel(e) {
        if (e.ctrlKey) return;                          /* pinch-zoom: leave it */
        if (state === 'locked') {
            if (e.cancelable) e.preventDefault();
            var unit = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? window.innerHeight : 1);
            if (e.deltaY * unit > WHEEL_MIN) dismiss();
            return;
        }
        if (swallowing()) {
            if (e.cancelable) e.preventDefault();
            armQuiet();
        }
    }

    function onTouchStart(e) {
        touchY = (e.touches && e.touches.length === 1) ? e.touches[0].clientY : null;
    }

    function onTouchMove(e) {
        if (touchY === null || !e.touches || e.touches.length !== 1) return; /* pinch */
        if (state === 'locked') {
            if (e.cancelable) e.preventDefault();
            if (touchY - e.touches[0].clientY > SWIPE_PX) dismiss();
            return;
        }
        if (swallowing()) {
            if (e.cancelable) e.preventDefault();
            armQuiet();
        }
    }

    function onTouchEnd() {
        touchY = null;
    }

    function isControl(el) {
        return !!(el && el.closest && el.closest('a[href], button, input, textarea, select, summary, [contenteditable]'));
    }

    function onKeyDown(e) {
        /* Keep the command palette shut while the intro is up (capture phase
           on window runs before app.js's listener on document). */
        if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {  /* = app.js's test */
            if (state === 'locked' || state === 'leaving') {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        if (state === 'locked') {
            if (e.key === 'Tab') {                      /* the button is the only stop */
                e.preventDefault();
                if (enter) enter.focus();
                return;
            }
            if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && e.target === enter) {
                return;                                 /* native button click */
            }
            if (e.key === 'Escape' || e.key === 'Esc' || e.key === 'Enter') {
                e.preventDefault();
                dismiss();
                return;
            }
            if (SCROLL_KEYS.indexOf(e.key) !== -1) {
                e.preventDefault();
                if (FORWARD_KEYS.indexOf(e.key) !== -1) dismiss();
            }
            return;
        }

        if (state === 'leaving' && e.key === 'Tab') {
            e.preventDefault();
            return;
        }

        /* Guard: swallow held / repeated scroll keys, but never a key aimed at
           a control the visitor has already reached (Space on a button). */
        if (SCROLL_KEYS.indexOf(e.key) !== -1 && !isControl(e.target) && swallowing()) {
            e.preventDefault();
            armQuiet();
        }
    }

    /* ---- Dismiss / finish -------------------------------------------------- */

    function dismiss() {
        if (state !== 'locked') return;
        state = 'leaving';
        loadHero();                                     /* terrain sweeps in under the fade */
        root.classList.add('intro-leaving');
        afterTransition(intro, 'opacity', (isReduced() ? 0 : FADE_MS) + FADE_SLACK_MS, finish);
    }

    function finish() {
        if (state !== 'leaving') return;
        release();
        jumpToTop();

        /* Focus lands on the revealed headline, not back on <body>. */
        var h1 = document.getElementById('hero-title');
        if (h1) {
            if (!h1.hasAttribute('tabindex')) {
                h1.setAttribute('tabindex', '-1');
                h1.addEventListener('blur', function onBlur() {
                    h1.removeAttribute('tabindex');
                    h1.removeEventListener('blur', onBlur);
                });
            }
            try { h1.focus({ preventScroll: true }); } catch (err) { h1.focus(); }
        }

        state = 'guard';
        unlockAt = performance.now();
        armQuiet();
        try { window.dispatchEvent(new CustomEvent('introend')); } catch (err) { /* old browsers */ }
    }

    function armQuiet() {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(tryEndGuard, QUIET_MS);
    }

    function tryEndGuard() {
        if (state !== 'guard') return;                  /* still leaving: the next event re-arms */
        var since = performance.now() - unlockAt;
        if (since < GUARD_MIN_MS) {
            quietTimer = setTimeout(tryEndGuard, GUARD_MIN_MS - since);
            return;
        }
        detach();
    }

    function detach() {
        state = 'done';
        clearTimeout(quietTimer);
        window.removeEventListener('wheel', onWheel, { passive: false });
        window.removeEventListener('touchstart', onTouchStart, { passive: true });
        window.removeEventListener('touchmove', onTouchMove, { passive: false });
        window.removeEventListener('touchend', onTouchEnd, { passive: true });
        window.removeEventListener('touchcancel', onTouchEnd, { passive: true });
        window.removeEventListener('keydown', onKeyDown, true);
    }

    /* transitionend for one property on one element, with a timeout backstop
       (reduced motion, a background tab, or no transition at all). */
    function afterTransition(el, prop, timeout, cb) {
        var fired = false;
        var timer = 0;
        function done(e) {
            if (e && (e.target !== el || e.propertyName !== prop)) return;
            if (fired) return;
            fired = true;
            el.removeEventListener('transitionend', done);
            clearTimeout(timer);
            cb();
        }
        el.addEventListener('transitionend', done);
        timer = setTimeout(done, timeout);
    }

    /* ---- Boot -------------------------------------------------------------- */

    try {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        jumpToTop();
        inertBackground();

        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });
        window.addEventListener('keydown', onKeyDown, true);

        if (enter) enter.addEventListener('click', dismiss);
        if (!intro.hasAttribute('tabindex')) intro.setAttribute('tabindex', '-1');
        try { intro.focus({ preventScroll: true }); } catch (err) { intro.focus(); }
    } catch (err) {
        /* Never trap: if anything above failed, hand the page back. */
        detach();
        release();
        loadHero();
        if (window.console) console.error('[draft-intro] failed, page released:', err);
    }
})();
