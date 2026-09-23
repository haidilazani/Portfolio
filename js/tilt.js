/* ==========================================================================
   tilt.js — spring-driven 3D tilt for [data-tilt] cards
   --------------------------------------------------------------------------
   Pairs with css/tilt.css. Zero dependencies, no globals, no build step.

   PROPERTY-LEVEL CONTRACT
   Writes only these, and only as custom properties, never as style.transform:
       on [data-tilt]        --tilt-rot  --tilt-mx  --tilt-my  --tilt-amp
       on the container      --tilt-ox   --tilt-oy
   Never touches transform, scale, position, filter or opacity. The scroll
   stacking module owns those on the same elements. css/tilt.css turns the
   custom properties into `rotate` and `translate`, which compose with the
   stacking module's `transform` instead of replacing it.

   HOW IT MOVES
   Pointer position inside a card normalises to nx, ny in [-1, 1]. Three
   springs per card carry nx, ny and an engagement amplitude. Rotation, glare
   position, child depth and the hover lift are all read off those same three
   springs, so the light never leads or lags the surface it is sitting on.

   The springs are integrated semi-implicitly at a fixed 1/240 s substep with
   a real-time accumulator, so a 144 Hz display and a 60 Hz display resolve
   the identical curve. k = 300, c = 28, m = 1: critical damping would be
   2*sqrt(300) = 34.6, so 28 is underdamped and the card overshoots slightly
   and settles, which is the point.

   ONE loop for every card on the page. A card joins the active list when the
   pointer moves it and leaves the list the frame its springs reach rest; when
   the list empties the loop stops rather than idling, including while the
   pointer is still resting motionless on a card.
   ========================================================================== */

(function () {
    'use strict';

    /* ======================================================================
       0 · Constants
       ====================================================================== */

    const STIFFNESS = 300;      /* k, matches the reference library's springs */
    const DAMPING   = 28;       /* c, underdamped against 2*sqrt(k) = 34.64   */
    const MASS      = 1;        /* m                                          */

    const STEP      = 1 / 240;  /* fixed integration substep, seconds         */
    const MAX_FRAME = 0.064;    /* clamp after a tab switch: 16 substeps max  */
    const MAX_SUB   = 64;       /* hard ceiling, belt to the clamp's braces   */

    const EPS_POS   = 0.0008;   /* rest window, normalised units (~0.009 deg) */
    const EPS_VEL   = 0.004;    /* rest window, normalised units per second   */

    const MAX_TILT  = 11;       /* fallback if --tilt-max is missing          */
    const DEG       = Math.PI / 180;
    const PASSIVE   = { passive: true };

    const root = document.documentElement;

    /* ======================================================================
       1 · Environment queries
       ====================================================================== */

    const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const rmQuery   = window.matchMedia('(prefers-reduced-motion: reduce)');

    function onMediaChange(mq, handler) {
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
        else if (typeof mq.addListener === 'function') mq.addListener(handler);
    }

    /* The same two switches css/tilt.css reads, in the same order.
       app.js calls data-motion the single source of truth, so an explicit
       "full" outranks the OS preference; an explicit "reduced" always wins;
       with no attribute at all (app.js absent or not yet booted) the OS
       preference decides. */
    function motionAllowed() {
        if (!fineQuery.matches) return false;
        const mode = root.dataset.motion;
        if (mode === 'reduced') return false;
        if (mode === 'full') return true;
        return !rmQuery.matches;
    }

    /* ======================================================================
       2 · Springs
       ====================================================================== */

    function spring() {
        return { x: 0, v: 0, t: 0 };
    }

    /* Semi-implicit (symplectic) Euler. Velocity is updated first and the
       new velocity integrates position, which stays stable at this substep
       where an explicit Euler would slowly gain energy. */
    function integrate(s) {
        const a = (-STIFFNESS * (s.x - s.t) - DAMPING * s.v) / MASS;
        s.v += a * STEP;
        s.x += s.v * STEP;
    }

    function settle(s) {
        if (Math.abs(s.x - s.t) < EPS_POS && Math.abs(s.v) < EPS_VEL) {
            s.x = s.t;
            s.v = 0;
            return true;
        }
        return false;
    }

    function zero(s) {
        s.x = 0;
        s.v = 0;
        s.t = 0;
    }

    function clamp1(n) {
        return n < -1 ? -1 : (n > 1 ? 1 : n);
    }

    /* ======================================================================
       3 · Rotation maths

       The `rotate` property takes a single axis-angle, so rotateX(a) and
       rotateY(b) have to be composed before they are written. Doing it as a
       quaternion product is exact, and it is also what produces the faint
       roll around z that makes dragging toward a corner feel like a corner
       rather than like two independent sliders.

           qx = (cos a/2, sin a/2, 0, 0)
           qy = (cos b/2, 0, sin b/2, 0)
           q  = qx * qy = (cA*cB, sA*cB, cA*sB, sA*sB)

       q is unit by construction: cB^2(cA^2+sA^2) + sB^2(cA^2+sA^2) = 1.
       The axis is the vector part over sin(angle/2) = sqrt(1 - w^2).
       ====================================================================== */

    function axisAngle(ax, ay) {
        const ha = ax * DEG * 0.5;
        const hb = ay * DEG * 0.5;
        const cA = Math.cos(ha), sA = Math.sin(ha);
        const cB = Math.cos(hb), sB = Math.sin(hb);

        let w = cA * cB;
        const x = sA * cB;
        const y = cA * sB;
        const z = sA * sB;

        if (w > 1) w = 1; else if (w < -1) w = -1;

        const s = Math.sqrt(1 - w * w);
        /* Degenerate at rest: any axis, zero angle. */
        if (s < 1e-6) return '0 0 1 0deg';

        const angle = (2 * Math.acos(w)) / DEG;
        return (x / s).toFixed(5) + ' ' +
               (y / s).toFixed(5) + ' ' +
               (z / s).toFixed(5) + ' ' +
               angle.toFixed(4) + 'deg';
    }

    /* ======================================================================
       4 · Card + container registry
       ====================================================================== */

    const nodes = document.querySelectorAll('[data-tilt]');
    if (!nodes.length) return;           /* silently no-op on other pages */

    const groups = [];
    const byContainer = new Map();

    Array.prototype.forEach.call(nodes, function (el) {
        const parent = el.parentElement;
        if (!parent) return;

        let g = byContainer.get(parent);
        if (!g) {
            g = {
                el: parent,
                cards: [],
                map: new Map(),
                current: null,
                onMove: null,
                onLeave: null
            };
            byContainer.set(parent, g);
            groups.push(g);
        }

        const card = {
            el: el,
            group: g,
            nx: spring(),
            ny: spring(),
            amp: spring(),
            max: MAX_TILT,
            awake: false
        };
        g.cards.push(card);
        g.map.set(el, card);
    });

    if (!groups.length) return;

    /* The rotation ceiling is authored in CSS (--tilt-max on [data-tilt]),
       read once per container so the tuning surface stays in one file. */
    groups.forEach(function (g) {
        const raw = parseFloat(
            window.getComputedStyle(g.cards[0].el).getPropertyValue('--tilt-max')
        );
        const max = (isFinite(raw) && raw > 0) ? raw : MAX_TILT;
        g.cards.forEach(function (c) { c.max = max; });
    });

    /* ======================================================================
       5 · The single shared loop
       ====================================================================== */

    const active = [];
    let running  = false;
    let rafId    = 0;
    let lastTime = 0;
    let accum    = 0;

    function write(card) {
        const nx  = card.nx.x;
        const ny  = card.ny.x;
        /* The amplitude spring undershoots below zero on release. Clamping
           here keeps the glare's colour-mix percentage and the lift's sign
           valid without damping the overshoot on the way in. */
        const amp = card.amp.x < 0 ? 0 : card.amp.x;

        const st = card.el.style;
        /* Pointer right tips the right edge away: +rotateY.
           Pointer down tips the bottom edge toward the viewer: -rotateX. */
        st.setProperty('--tilt-rot', axisAngle(-ny * card.max, nx * card.max));
        st.setProperty('--tilt-mx', (50 + nx * 50).toFixed(2) + '%');
        st.setProperty('--tilt-my', (50 + ny * 50).toFixed(2) + '%');
        st.setProperty('--tilt-amp', amp.toFixed(4));
    }

    function clear(card) {
        const st = card.el.style;
        st.removeProperty('--tilt-rot');
        st.removeProperty('--tilt-mx');
        st.removeProperty('--tilt-my');
        st.removeProperty('--tilt-amp');
        card.el.classList.remove('is-tilting');
    }

    function tick(now) {
        rafId = 0;

        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (!(dt > 0)) dt = STEP;
        if (dt > MAX_FRAME) dt = MAX_FRAME;

        /* Fixed-substep accumulator: the curve is identical at 60 Hz and
           144 Hz, only the sampling of it differs. */
        accum += dt;
        let sub = 0;
        while (accum >= STEP && sub < MAX_SUB) {
            for (let i = 0; i < active.length; i++) {
                const c = active[i];
                integrate(c.nx);
                integrate(c.ny);
                integrate(c.amp);
            }
            accum -= STEP;
            sub++;
        }
        if (accum >= STEP) accum = 0;

        for (let i = active.length - 1; i >= 0; i--) {
            const c = active[i];
            const a = settle(c.nx);
            const b = settle(c.ny);
            const d = settle(c.amp);
            write(c);                       /* post-snap, so rest is exact */
            if (a && b && d) {
                c.awake = false;
                c.el.classList.remove('is-tilting');
                active.splice(i, 1);
            }
        }

        if (active.length) {
            rafId = requestAnimationFrame(tick);
        } else {
            running = false;
            accum = 0;                      /* nothing to carry into the next wake */
        }
    }

    function wake(card) {
        if (!card.awake) {
            card.awake = true;
            active.push(card);
            card.el.classList.add('is-tilting');
        }
        if (!running) {
            running = true;
            lastTime = performance.now();
            accum = 0;
            rafId = requestAnimationFrame(tick);
        }
    }

    function stopLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        running = false;
        accum = 0;
        while (active.length) {
            const c = active.pop();
            c.awake = false;
            c.el.classList.remove('is-tilting');
        }
    }

    /* ======================================================================
       6 · Pointer handling

       One delegated pointermove per container, not one per card. Passive
       throughout: nothing here calls preventDefault, so text selection,
       wheel scrolling and touch panning are untouched. The cards are
       non-interactive <article> elements with no focusable content, so there
       is no focus or keyboard path to interfere with either.
       ====================================================================== */

    function release(card) {
        card.nx.t = 0;
        card.ny.t = 0;
        card.amp.t = 0;
        wake(card);
    }

    function releaseCurrent(g) {
        if (!g.current) return;
        release(g.current);
        g.current = null;
    }

    function bind(g) {
        g.onMove = function (e) {
            /* Hybrid laptops match (hover: hover) but can still be touched. */
            if (e.pointerType === 'touch') return;

            const target = e.target;
            const el = (target && target.closest) ? target.closest('[data-tilt]') : null;
            const card = el ? g.map.get(el) : null;

            /* Gaps between cards count as leaving. */
            if (!card) { releaseCurrent(g); return; }

            /* One layout read per event, taken here in the input phase so it
               never lands after the frame's style writes. The rect is read
               fresh rather than cached because the stacking module moves
               these cards during scroll. */
            const r = card.el.getBoundingClientRect();
            if (!r.width || !r.height) return;

            if (g.current !== card) {
                if (g.current) release(g.current);
                g.current = card;
                /* Park the shared projection on this card's centre so a card
                   low in a long list is not projected off-axis. */
                const cr = g.el.getBoundingClientRect();
                g.el.style.setProperty('--tilt-ox', (r.left - cr.left + r.width * 0.5).toFixed(1) + 'px');
                g.el.style.setProperty('--tilt-oy', (r.top - cr.top + r.height * 0.5).toFixed(1) + 'px');
            }

            card.nx.t = clamp1(((e.clientX - r.left) / r.width) * 2 - 1);
            card.ny.t = clamp1(((e.clientY - r.top) / r.height) * 2 - 1);
            card.amp.t = 1;
            wake(card);
        };

        g.onLeave = function () {
            releaseCurrent(g);
        };
    }

    groups.forEach(bind);

    /* ======================================================================
       7 · Enable / disable, live in both directions
       ====================================================================== */

    let enabled = false;

    function enable() {
        if (enabled) return;
        enabled = true;
        groups.forEach(function (g) {
            g.el.classList.add('tilt-on');
            g.el.addEventListener('pointermove', g.onMove, PASSIVE);
            g.el.addEventListener('pointerleave', g.onLeave, PASSIVE);
            g.el.addEventListener('pointercancel', g.onLeave, PASSIVE);
        });
    }

    function disable() {
        if (!enabled) return;
        enabled = false;
        stopLoop();
        groups.forEach(function (g) {
            g.el.removeEventListener('pointermove', g.onMove, PASSIVE);
            g.el.removeEventListener('pointerleave', g.onLeave, PASSIVE);
            g.el.removeEventListener('pointercancel', g.onLeave, PASSIVE);
            g.el.classList.remove('tilt-on');
            g.el.style.removeProperty('--tilt-ox');
            g.el.style.removeProperty('--tilt-oy');
            g.current = null;
            g.cards.forEach(function (c) {
                zero(c.nx);
                zero(c.ny);
                zero(c.amp);
                clear(c);
            });
        });
    }

    function sync() {
        if (motionAllowed()) enable();
        else disable();
    }

    /* app.js flips data-motion on <html> and fires this on window. */
    window.addEventListener('motionchange', sync);
    onMediaChange(fineQuery, sync);
    onMediaChange(rmQuery, sync);

    /* Leaving the tab mid-hover would otherwise strand a card mid-tilt,
       because no pointerleave fires on the way out. */
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) groups.forEach(releaseCurrent);
    });

    sync();

}());
