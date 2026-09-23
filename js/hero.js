/* ==========================================================================
   hero.js - the hero section's interactive pieces.

   PIECE 1: the topographic terrain (canvas)
   A scalar elevation field is sampled on a grid and drawn as contour lines
   with marching squares. The field is the sum of three contributions:

       field = breathing_noise + text_basin + disturbances

   Everything the visitor does is "just another term in the sum", which is why
   overlapping ripples interfere instead of fighting each other.

   PIECE 2: the odometer dial on the hero keyword
   Each character of the accent word rolls vertically through a short column
   of cycling glyphs and lands on its final letter, staggered left to right.
   The heading is the LCP element, so the real text is in the HTML, the boxes
   are reserved by hidden per-character sizers, and only glyphs move inside
   boxes that were already the right size.

   INPUT MODEL
     move            the cursor leaves a soft wake of ripples, spaced by distance
     click / tap     a shockwave ring expands and decays over ~1.2s
     load            contours sweep in low-to-high; the keyword rolls into place

   INHERITED FROM js/background.js (kept, because it was correct)
     - the value-noise fBm generator (hash / smooth / noise2, 2 octaves)
     - the two-field cross-fade that makes the terrain "breathe"
     - the marching-squares case table (verified against the bit layout)

   REMOVED IN THIS REVISION
     - the spring-damped cursor hill that bulged contours under the pointer
     - the per-cell distance-bucketed accent "focus pool" around that hill
     - the drag-carve trail that dug trenches along a held drag
     - the photographs that the cursor wake used to drop (the wake stays)
   Losing the focus pool also
   removed one sqrt per emitting cell from the contour scan, so the terrain
   is cheaper per frame than it was before.

   ACCESSIBILITY
     prefers-reduced-motion, and the site's own motion toggle
     (documentElement.dataset.motion + the `motionchange` event), both
     collapse the terrain to a single static frame with no loop and no
     pointer reactivity, and leave the
     keyword as plain text. Theme changes are read back off the CSS custom
     properties. Every listener is removed when motion is turned off.
   ========================================================================== */

(function () {
    'use strict';

    /* ======================================================================
       SHARED: motion preference
       The site's own toggle wins when it has been set, in both directions:
       a visitor whose OS asks for reduced motion but who explicitly turns
       motion on here gets the full hero. With no toggle set, the OS decides.
       ====================================================================== */

    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resolveReduced() {
        const m = document.documentElement.getAttribute('data-motion');
        if (m === 'reduced') return true;
        if (m === 'full') return false;
        return mqReduce.matches;
    }

    /* Register a callback for "the motion preference may have changed". Three
       independent sources can move it, so they are funnelled into one place. */
    const motionListeners = [];
    function onMotionChange(fn) { motionListeners.push(fn); }
    function fireMotionChange() {
        for (let i = 0; i < motionListeners.length; i++) motionListeners[i]();
    }

    window.addEventListener('motionchange', fireMotionChange);
    if (mqReduce.addEventListener) {
        mqReduce.addEventListener('change', fireMotionChange);
    } else if (mqReduce.addListener) {
        mqReduce.addListener(fireMotionChange);
    }

    /* data-theme and data-motion both live on <html>; one observer covers
       both and dispatches to whichever piece cares. */
    const themeListeners = [];
    function onThemeChange(fn) { themeListeners.push(fn); }

    new MutationObserver(function (records) {
        let theme = false, motion = false;
        for (let i = 0; i < records.length; i++) {
            if (records[i].attributeName === 'data-theme') theme = true;
            else if (records[i].attributeName === 'data-motion') motion = true;
        }
        if (theme) for (let i = 0; i < themeListeners.length; i++) themeListeners[i]();
        if (motion) fireMotionChange();
    }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-motion']
    });


    /* ======================================================================
       THE ODOMETER DIAL
       Built first, and deliberately independent of the canvas: a browser
       without Path2D still gets the keyword, and a page with a dial but no
       terrain still works.
       ====================================================================== */

    (function initDial() {
        const el = document.querySelector('[data-dial]');
        if (!el) return;

        /* The true string, captured before anything is rearranged. This is
           what screen readers and the clipboard get, always. */
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;

        /* How many decoy glyphs sit above the final one. Varying it per
           character is what stops the roll reading as a single mechanical
           shutter coming down across the word. */
        const ROLL_MIN = 4;
        const ROLL_MAX = 7;

        /* Total runtime budget. The stagger step is derived from it so a
           longer keyword compresses rather than overrunning. */
        const ROLL_MS = 620;
        const STAGGER_TOTAL = 520;
        const STAGGER_MAX = 66;

        /* If this script executes long after first paint (slow network, a
           late-loading bundle) the visitor has already read the heading, and
           scrambling it now would be worse than not animating at all. */
        const LATE_BOOT_MS = 1200;

        const LOWER = 'abcdefghijklmnopqrstuvwxyz';
        const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const DIGIT = '0123456789';

        /* Cycle within the final glyph's own family so the roll reads like an
           odometer wheel rather than random noise falling past a window. */
        function poolFor(ch) {
            if (ch >= 'a' && ch <= 'z') return LOWER;
            if (ch >= 'A' && ch <= 'Z') return UPPER;
            if (ch >= '0' && ch <= '9') return DIGIT;
            return LOWER;
        }

        function rolls(ch) {
            return ch !== ' ' && (
                (ch >= 'a' && ch <= 'z') ||
                (ch >= 'A' && ch <= 'Z') ||
                (ch >= '0' && ch <= '9')
            );
        }

        let built = false;
        let done = false;
        let settle = 0;

        /* Back to a plain <em> containing the plain string.

           Collapsing after the roll matters for more than tidiness. While the
           columns exist, h1.textContent is the real string *plus* forty-odd
           decoy glyphs. Assistive tech never sees them (they are aria-hidden)
           and the clipboard never gets them (user-select: none), but anything
           reading textContent - a crawler, a share-card scraper, find-in-page
           - would. One second in, the heading is an ordinary <em> again.

           This is visually a no-op: the columns are already resting on their
           final glyphs, and the collapsed text measures the same because
           .accent-word disables kerning for both forms (see hero.css). */
        function collapse() {
            if (settle) { clearTimeout(settle); settle = 0; }
            if (!built) return;
            built = false;
            el.classList.remove('is-dialling');
            el.textContent = text;
        }

        /* The roll ran to completion. Never build again, whatever happens to
           the motion preference afterwards: re-scrambling a heading the
           visitor has already read is worse than not animating it. */
        function finish() {
            done = true;
            collapse();
        }

        function build() {
            if (built || done) return;

            /* Count the rolling characters first: the stagger step depends on
               how many there are, not on the string length. */
            let rollCount = 0;
            for (let i = 0; i < text.length; i++) if (rolls(text.charAt(i))) rollCount++;
            if (!rollCount) return;

            const step = Math.min(STAGGER_MAX, STAGGER_TOTAL / rollCount);

            const frag = document.createDocumentFragment();

            /* The real string, first in DOM order, visually hidden but read
               by assistive tech and copied by the clipboard. Everything after
               it is aria-hidden decoration with user-select disabled, so the
               heading announces and copies as "A remembrance of who I was." */
            const sr = document.createElement('span');
            sr.className = 'dial-sr';
            sr.textContent = text;
            frag.appendChild(sr);

            const vis = document.createElement('span');
            vis.className = 'dial-vis';
            vis.setAttribute('aria-hidden', 'true');

            let index = 0;
            let lastCol = null;
            for (let i = 0; i < text.length; i++) {
                const ch = text.charAt(i);

                /* A real space, as a text node: it keeps its natural word
                   width and stays a legal line-break opportunity. */
                if (ch === ' ') {
                    vis.appendChild(document.createTextNode(' '));
                    continue;
                }

                /* Punctuation renders immediately at its natural width. It
                   still gets a cell so its box metrics match its neighbours. */
                if (!rolls(ch)) {
                    const still = document.createElement('span');
                    still.className = 'dial-ch is-still';
                    still.textContent = ch;
                    vis.appendChild(still);
                    continue;
                }

                const cell = document.createElement('span');
                cell.className = 'dial-ch';

                /* In-flow, visibility:hidden copy of the FINAL glyph. This is
                   what gives the cell its width, so the word occupies exactly
                   the box it would have occupied as plain text and no decoy
                   glyph can widen it. The rolling column is taken out of flow
                   on top of it. */
                const sizer = document.createElement('span');
                sizer.className = 'dial-sizer';
                sizer.textContent = ch;
                cell.appendChild(sizer);

                const col = document.createElement('span');
                col.className = 'dial-col';

                const pool = poolFor(ch);
                const n = ROLL_MIN + ((Math.random() * (ROLL_MAX - ROLL_MIN + 1)) | 0);
                for (let k = 0; k < n; k++) {
                    const decoy = document.createElement('span');
                    decoy.textContent = pool.charAt((Math.random() * pool.length) | 0);
                    col.appendChild(decoy);
                }
                const finalGlyph = document.createElement('span');
                finalGlyph.textContent = ch;
                col.appendChild(finalGlyph);

                /* --dial-n drives the resting transform in CSS, so with the
                   animation absent (or finished) the column already sits on
                   its final glyph. The keyframes only animate up to it. */
                col.style.setProperty('--dial-n', String(n));
                col.style.animationDelay = Math.round(index * step) + 'ms';
                col.style.animationDuration = ROLL_MS + 'ms';

                cell.appendChild(col);
                vis.appendChild(cell);
                lastCol = col;      // latest delay, therefore the last to land
                index++;
            }

            frag.appendChild(vis);

            el.textContent = '';
            el.appendChild(frag);
            el.classList.add('is-dialling');
            built = true;

            /* The column with the latest delay is the last to land.
               animationend is the accurate signal; the timer is the fallback
               for when the animation never ran at all (keyframes unsupported,
               or the tab backgrounded for the whole roll). */
            const total = Math.round((index - 1) * step) + ROLL_MS;
            if (lastCol) lastCol.addEventListener('animationend', finish, { once: true });
            settle = setTimeout(finish, total + 260);
        }

        function apply() {
            /* Reduced motion collapses whatever exists back to plain text but
               does not close the door: a visitor who flips the site toggle to
               "full" while the heading is still fresh gets the roll. */
            if (resolveReduced()) { collapse(); return; }
            if (done || built) return;
            /* Never roll a heading that has been on screen long enough to
               have been read: a late-executing script must not scramble it. */
            if (performance.now() > LATE_BOOT_MS) { done = true; return; }
            build();
        }

        onMotionChange(apply);
        apply();
    })();


    /* ======================================================================
       THE TERRAIN
       ====================================================================== */

    (function initTerrain() {

        /* Pages without a hero must no-op silently rather than throw. Path2D
           is the one API we cannot polyfill cheaply, so bail out if it is
           missing (the hero still reads fine, and the dial above already ran). */
        const hero = document.querySelector('[data-hero]');
        if (!hero) return;
        const canvas = hero.querySelector('[data-hero-canvas]');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        if (typeof Path2D !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const innerEl = hero.querySelector('.hero-inner');

        /* ---- 1. Tuning ---------------------------------------------------
           Field values live roughly in -0.16..1.15. Contour level L
           (0-indexed) sits at (L + 1) * LEVEL_SPREAD / (levels + 1), so the
           top one or two levels are normally *above* the terrain and only
           appear where a disturbance pushes elevation up. That is deliberate:
           the highest rings are reserved for the ripple, and they are the
           ones stroked in --accent. */
        const NOISE_SCALE   = 0.0024;   // terrain feature size (smaller = wider hills)
        const LEVEL_SPREAD  = 1.08;     // elevation range the contour levels span
        const BREATHE_SPEED = 0.00009;  // rad/ms: one full breath is ~70s
        const BREATH_EPS    = 0.0022;   // below this per-tick delta, skip the redraw

        /* Disturbances. One ring buffer serves both kinds, because a cursor
           wake and a click are the same physics at different intensities.
           A click is wide, strong and slow; a wake drop is tight, soft and
           quick. The buffer is split rather than shared: a fast sweep drops
           every 76px and would otherwise evict a click's shockwave halfway
           through its life, so clicks own the top four slots. */
        const RIPPLE_SLOTS  = 16;
        const CLICK_SLOTS   = 4;
        const DROP_SLOTS    = RIPPLE_SLOTS - CLICK_SLOTS;

        const CLICK_MS      = 1200;     // shockwave lifetime
        const CLICK_AMP     = 0.60;     // crest height at birth
        const DROP_MS       = 640;      // one wake drop's press into the terrain
        const DROP_AMP      = 0.17;     // soft enough to read as a wake, not a hit
        const DROP_RADIUS   = 132;
        const DROP_DIST     = 76;       // px of pointer travel between drops

        const BASIN_AMP     = -0.16;    // depression carved behind the hero TEXT
        const BASIN_PAD_X   = 34;       // how far the basin overhangs the text box
        const BASIN_PAD_Y   = 22;
        const BASIN_FALLOFF = 120;      // soft wall width of the basin (px)

        const ENTRANCE_MS   = 900;      // low-to-high contour draw-in
        const AMBIENT_MS    = 34;       // ~30fps ceiling for idle breathing

        /* Opt-in instrumentation. Set window.__HERO_DEBUG__ = true before this
           script runs to collect per-frame timings via window.__heroStats(). */
        const DEBUG = !!window.__HERO_DEBUG__;

        /* ---- 2. State ----------------------------------------------------- */
        let dpr = 1, width = 0, height = 0;
        let cell = 18, levels = 9, cols = 0, rows = 0, stride = 0;
        let sized = false;

        let noiseA = null;  // two independent noise fields ...
        let noiseB = null;  // ... cross-faded over time to make the terrain "breathe"
        let basin  = null;  // static depression behind the headline
        let stat   = null;  // breathing noise + basin (changes at most ~30x/s)
        let field  = null;  // stat + all interactive terms (what we contour)

        let statDirty = true;
        let lastBreath = -1;

        /* Dirty rectangles in node coordinates. `p*` is what the previous frame
           touched and therefore what must be restored from `stat` before this
           frame adds its own contributions. */
        let dC0 = 0, dR0 = 0, dC1 = -1, dR1 = -1;
        let pC0 = 0, pR0 = 0, pC1 = -1, pR1 = -1;

        const rect = { left: 0, top: 0, width: 0, height: 0 };
        let rectStale = true;

        const ptr = { x: 0, y: 0, inside: false, down: false, touch: false, moved: 0 };

        const ripX = new Float32Array(RIPPLE_SLOTS);
        const ripY = new Float32Array(RIPPLE_SLOTS);
        const ripT = new Float64Array(RIPPLE_SLOTS);
        const ripR = new Float32Array(RIPPLE_SLOTS);   // final radius
        const ripA = new Float32Array(RIPPLE_SLOTS);   // amplitude at birth
        const ripL = new Float32Array(RIPPLE_SLOTS);   // lifetime, ms
        const ripLive = new Uint8Array(RIPPLE_SLOTS);
        let dropNext = 0, clickNext = 0, liveRipples = 0;
        let dropX = 0, dropY = 0;

        const levelAlpha = new Float32Array(16);
        let entranceDone = false;
        let entranceStart = 0;

        const paths = [];                        // one Path2D per level
        const levelStroke = new Array(16);       // rgba() strings, rebuilt on theme change
        const levelWidth = new Float32Array(16);

        let colAccent = [41, 151, 255, 1];
        let colBorder = [255, 255, 255, 0.10];

        let raf = 0, timer = 0, resizeTimer = 0;
        let mode = 'off';
        let prevT = 0;
        let visible = true;
        let firstPaint = false;

        /* ---- 3. Colour ---------------------------------------------------- */

        /* Let the canvas do the CSS colour parsing: assigning any valid colour to
           fillStyle and reading it back yields either '#rrggbb' or 'rgba(...)'.
           A sentinel detects values the browser rejected. */
        function parseColor(str, fallback) {
            if (!str) return fallback;
            const value = String(str).trim();
            if (!value) return fallback;
            const prev = ctx.fillStyle;
            let out = fallback;
            ctx.fillStyle = '#010203';
            ctx.fillStyle = value;
            const norm = ctx.fillStyle;
            if (norm !== '#010203' || value.toLowerCase() === '#010203') {
                if (norm.charAt(0) === '#') {
                    out = [
                        parseInt(norm.slice(1, 3), 16),
                        parseInt(norm.slice(3, 5), 16),
                        parseInt(norm.slice(5, 7), 16),
                        1
                    ];
                } else {
                    const m = norm.match(/[\d.]+/g);
                    if (m && m.length >= 3) {
                        out = [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1];
                    }
                }
            }
            ctx.fillStyle = prev;
            return out;
        }

        function readColors() {
            const cs = getComputedStyle(document.documentElement);
            colAccent = parseColor(cs.getPropertyValue('--accent'), [41, 151, 255, 1]);
            colBorder = parseColor(cs.getPropertyValue('--border'), [255, 255, 255, 0.10]);
            buildLevelStyles();
        }

        /* Colour is chosen per LEVEL, not per cell. The bottom levels are the
           resting terrain and take --border; the top two ramp to --accent and
           get a slightly heavier line. Because those top levels only exist
           where something has pushed the elevation up, a click blooms an
           accent-coloured ring out of a neutral field for free: no distance
           test, no sqrt, no extra Path2D. That is what replaced the old
           per-cell focus pool around the cursor. */
        function buildLevelStyles() {
            const base = Math.min(0.30, Math.max(0.12, (colBorder[3] || 0.1) * 2.0));
            const peak = 0.60;
            for (let l = 0; l < levels; l++) {
                /* Ramp across the top three levels: 0 at levels-3, 1 at levels-1. */
                let t = (l - (levels - 3)) / 2;
                if (t < 0) t = 0; else if (t > 1) t = 1;
                const r = Math.round(colBorder[0] + (colAccent[0] - colBorder[0]) * t);
                const g = Math.round(colBorder[1] + (colAccent[1] - colBorder[1]) * t);
                const b = Math.round(colBorder[2] + (colAccent[2] - colBorder[2]) * t);
                const a = base + (peak - base) * t;
                levelStroke[l] = 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
                levelWidth[l] = 1 + 0.35 * t;
            }
        }

        /* ---- 4. Value noise (kept verbatim in spirit from background.js) --- */
        function makeNoise(seed) {
            function hash(ix, iy) {
                let h = ix * 374761393 + iy * 668265263 + seed * 1442695041;
                h = (h ^ (h >> 13)) * 1274126177;
                return ((h ^ (h >> 16)) >>> 0) / 4294967295;
            }
            function smooth(t) { return t * t * (3 - 2 * t); }
            function noise2(x, y) {
                const ix = Math.floor(x), iy = Math.floor(y);
                const fx = smooth(x - ix), fy = smooth(y - iy);
                const a = hash(ix, iy), b = hash(ix + 1, iy);
                const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
                return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
            }
            return function (x, y) {
                return 0.65 * noise2(x, y) + 0.35 * noise2(x * 2.7 + 31.4, y * 2.7 + 47.2);
            };
        }

        /* ---- 5. Sizing and field construction ----------------------------- */

        /* Grid resolution scales with viewport area and DPR: a phone gets fewer,
           coarser lines; a retina desktop backs off slightly because every stroked
           hairline costs 2x the device pixels. */
        function pickResolution(w, h) {
            const minSide = Math.min(w, h);
            let c = Math.sqrt(w * h) / 63;
            c *= 1 + (Math.min(dpr, 2) - 1) * 0.15;
            if (minSide < 620) c *= 1.2;
            cell = Math.max(15, Math.min(30, Math.round(c)));
            levels = Math.max(5, Math.min(9, Math.round(minSide / 100)));
        }

        function buildFields() {
            const n = (cols + 1) * (rows + 1);
            noiseA = new Float32Array(n);
            noiseB = new Float32Array(n);
            basin = new Float32Array(n);
            stat = new Float32Array(n);
            field = new Float32Array(n);
            const fnA = makeNoise(7);
            const fnB = makeNoise(91);
            let i = 0;
            for (let r = 0; r <= rows; r++) {
                const ny = r * cell * NOISE_SCALE;
                for (let c = 0; c <= cols; c++, i++) {
                    const nx = c * cell * NOISE_SCALE;
                    noiseA[i] = fnA(nx, ny);
                    noiseB[i] = fnB(nx, ny);
                }
            }
            normalise(noiseA);
            normalise(noiseB);
        }

        /* Stretch a field to fill 0..1.
           Value noise is an average of hashed corners, so it regresses to the mean:
           the raw output sits around 0.25..0.75, never near the 0..1 the contour
           levels are spread across. Without this, most levels sit above the terrain
           and the canvas renders almost empty. */
        function normalise(a) {
            let lo = Infinity, hi = -Infinity;
            for (let k = 0; k < a.length; k++) {
                const v = a[k];
                if (v < lo) lo = v;
                if (v > hi) hi = v;
            }
            const span = hi - lo;
            if (!(span > 1e-6)) return;
            const inv = 1 / span;
            for (let k = 0; k < a.length; k++) a[k] = (a[k] - lo) * inv;
        }

        /* Union of the hero's actual text boxes. The basin must follow the words,
           not .hero-inner - that element is the full container (1200x804 in a
           1440x964 canvas), so a basin anchored to it covers the whole canvas and
           flattens every contour. Anchoring to the text also leaves the open side
           of the hero as live terrain. */
        const TEXT_SEL = '.hero-eyebrow, .hero-title, .hero-lede, .hero-actions, .proof-bar';

        function textBounds() {
            const nodes = innerEl ? innerEl.querySelectorAll(TEXT_SEL) : null;
            if (!nodes || !nodes.length) return null;
            let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
            for (let i = 0; i < nodes.length; i++) {
                const q = nodes[i].getBoundingClientRect();
                if (!q.width || !q.height) continue;
                if (q.left < l) l = q.left;
                if (q.top < t) t = q.top;
                if (q.right > r) r = q.right;
                if (q.bottom > b) b = q.bottom;
            }
            if (l === Infinity) return null;
            return { left: l, top: t, width: r - l, height: b - t };
        }

        /* The headline sits IN the terrain: a flat-bottomed, soft-walled basin is
           subtracted under the hero text so contours part around the words instead
           of running through them. Rounded-box distance = distance to the box,
           clamped to zero inside it, so the floor is genuinely flat. */
        function computeBasin() {
            if (!basin) return;
            basin.fill(0);
            if (!innerEl) return;
            const ir = textBounds();
            if (!ir || !ir.width || !ir.height) return;
            const cx = ir.left - rect.left + ir.width / 2;
            const cy = ir.top - rect.top + ir.height / 2;
            const hx = ir.width / 2 + BASIN_PAD_X;
            const hy = ir.height / 2 + BASIN_PAD_Y;
            const c0 = Math.max(0, Math.floor((cx - hx - BASIN_FALLOFF) / cell));
            const c1 = Math.min(cols, Math.ceil((cx + hx + BASIN_FALLOFF) / cell));
            const r0 = Math.max(0, Math.floor((cy - hy - BASIN_FALLOFF) / cell));
            const r1 = Math.min(rows, Math.ceil((cy + hy + BASIN_FALLOFF) / cell));
            for (let r = r0; r <= r1; r++) {
                const dy = Math.max(Math.abs(r * cell - cy) - hy, 0);
                const dy2 = dy * dy;
                let i = r * stride + c0;
                for (let c = c0; c <= c1; c++, i++) {
                    const dx = Math.max(Math.abs(c * cell - cx) - hx, 0);
                    const d = Math.sqrt(dx * dx + dy2);
                    if (d >= BASIN_FALLOFF) continue;
                    const t = 1 - d / BASIN_FALLOFF;
                    basin[i] = BASIN_AMP * t * t * (3 - 2 * t);
                }
            }
        }

        function resetPaths() {
            paths.length = levels;
            for (let i = 0; i < paths.length; i++) paths[i] = null;
        }

        function measureRect() {
            const r = canvas.getBoundingClientRect();
            rect.left = r.left; rect.top = r.top;
            rect.width = r.width; rect.height = r.height;
            rectStale = false;
        }

        function applyLayout() {
            resizeTimer = 0;
            measureRect();
            const w = Math.round(rect.width);
            const h = Math.round(rect.height);
            if (w < 2 || h < 2) return;
            const d = Math.min(window.devicePixelRatio || 1, 2);

            /* A mobile URL-bar twitch changes height by a few px and must not
               rebuild the noise. Only the basin and the cached rect move. */
            if (sized && w === width && Math.abs(h - height) < 90 && d === dpr) {
                computeBasin();
                statDirty = true;
                forceDraw();
                return;
            }

            dpr = d; width = w; height = h;
            pickResolution(w, h);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cols = Math.ceil(w / cell);
            rows = Math.ceil(h / cell);
            stride = cols + 1;
            buildFields();
            computeBasin();
            resetPaths();
            buildLevelStyles();     // `levels` may have changed
            sized = true;
            statDirty = true;
            lastBreath = -1;
            if (!entranceDone && !reduced) {
                for (let l = 0; l < levels; l++) levelAlpha[l] = 0;
            } else {
                for (let l = 0; l < levels; l++) levelAlpha[l] = 1;
            }
            forceDraw();
            sync();
        }

        /* ---- 6. Field composition ----------------------------------------- */

        /* stat = breathing noise + basin. Recomputed only when the breath has
           moved enough to be visible, or when the layout changed. */
        function composeStat(phase) {
            const a = 0.5 + 0.5 * Math.cos(phase);
            const b = 1 - a;
            const n = stat.length;
            for (let i = 0; i < n; i++) stat[i] = noiseA[i] * a + noiseB[i] * b + basin[i];
            field.set(stat);
            pC0 = 0; pR0 = 0; pC1 = -1; pR1 = -1;   // field is clean everywhere
        }

        /* Undo the previous frame's interactive contributions without touching the
           rest of the grid. This is the "only recompute the affected radius" path. */
        function restorePrev() {
            if (pC1 < pC0 || pR1 < pR0) return;
            for (let r = pR0; r <= pR1; r++) {
                const base = r * stride;
                for (let c = pC0; c <= pC1; c++) field[base + c] = stat[base + c];
            }
        }

        function markDirty(c0, r0, c1, r1) {
            if (c0 < dC0) dC0 = c0;
            if (r0 < dR0) dR0 = r0;
            if (c1 > dC1) dC1 = c1;
            if (r1 > dR1) dR1 = r1;
        }

        /* One row of an expanding shockwave. Declared at module scope so the ring
           scan allocates nothing. u is the signed distance from the wave crest in
           units of the wave width; the cos term puts a crest on the ring with
           shallow troughs either side, which is what reads as "a wave" rather
           than "a growing blob". */
        function ringRow(r, xFrom, xTo, px, dy2, radius, invW, amp) {
            let c = Math.max(0, Math.floor(xFrom / cell));
            const cEnd = Math.min(cols, Math.ceil(xTo / cell));
            let i = r * stride + c;
            for (; c <= cEnd; c++, i++) {
                const dx = c * cell - px;
                const u = (Math.sqrt(dx * dx + dy2) - radius) * invW;
                if (u < -2.5 || u > 2.5) continue;
                field[i] += amp * Math.exp(-u * u * 0.9) * Math.cos(u * 1.9);
            }
        }

        /* Expanding ring. Scans only the annulus (two column spans per row), not
           the whole disc, which matters once the radius passes ~300px. */
        function addRing(px, py, radius, amp, w) {
            if (!amp) return;
            const reach = w * 2.5;
            const outer = radius + reach;
            const inner = radius - reach;
            const outer2 = outer * outer;
            const inner2 = inner > 0 ? inner * inner : -1;
            const c0 = Math.max(0, Math.floor((px - outer) / cell));
            const c1 = Math.min(cols, Math.ceil((px + outer) / cell));
            const r0 = Math.max(0, Math.floor((py - outer) / cell));
            const r1 = Math.min(rows, Math.ceil((py + outer) / cell));
            if (c1 < c0 || r1 < r0) return;
            const invW = 1 / w;
            for (let r = r0; r <= r1; r++) {
                const dy = r * cell - py;
                const dy2 = dy * dy;
                if (dy2 >= outer2) continue;
                const spanOut = Math.sqrt(outer2 - dy2);
                if (inner2 > 0 && dy2 < inner2) {
                    const spanIn = Math.sqrt(inner2 - dy2);
                    ringRow(r, px - spanOut, px - spanIn, px, dy2, radius, invW, amp);
                    ringRow(r, px + spanIn, px + spanOut, px, dy2, radius, invW, amp);
                } else {
                    ringRow(r, px - spanOut, px + spanOut, px, dy2, radius, invW, amp);
                }
            }
            markDirty(c0, r0, c1, r1);
        }

        /* Shockwaves. Radius eases outward (fast launch, slow settle), the wave
           broadens as it travels in proportion to its own final radius, and the
           amplitude decays to exactly zero at the end of the slot's life so
           there is never a popping cut-off. All of them are summed into the
           same field, so overlapping ripples interfere. */
        function applyDynamic(now) {
            dC0 = cols + 1; dR0 = rows + 1; dC1 = -1; dR1 = -1;

            liveRipples = 0;
            for (let k = 0; k < RIPPLE_SLOTS; k++) {
                if (!ripLive[k]) continue;
                const age = now - ripT[k];
                if (age >= ripL[k]) { ripLive[k] = 0; continue; }
                liveRipples++;
                const p = age / ripL[k];
                const inv = 1 - p;
                const radius = ripR[k];
                addRing(
                    ripX[k], ripY[k],
                    radius * (1 - inv * inv * Math.pow(inv, 0.4)),
                    ripA[k] * Math.pow(inv, 1.7),
                    radius * 0.06 + radius * 0.17 * p
                );
            }

            pC0 = dC0; pR0 = dR0; pC1 = dC1; pR1 = dR1;
        }

        /* ---- 7. Contouring ------------------------------------------------- */

        /* Where along an edge the contour crosses, linearly interpolated. */
        function edgeT(v0, v1, level) {
            const d = v1 - v0;
            return d === 0 ? 0.5 : (level - v0) / d;
        }

        function drawContours() {
            ctx.clearRect(0, 0, width, height);

            const step = LEVEL_SPREAD / (levels + 1);
            const invStep = 1 / step;
            const hiCut = levels * step;

            for (let k = 0; k < levels; k++) paths[k] = null;

            /* Cell-major scan. The old code ran the whole grid once per level;
               here each cell is visited once and only the levels that can possibly
               cross it are tested. Nothing inside this loop allocates, and with
               the focus pool gone there is no longer a sqrt per emitting cell. */
            for (let r = 0; r < rows; r++) {
                const y0 = r * cell;
                const y1 = y0 + cell;
                const rowBase = r * stride;
                for (let c = 0; c < cols; c++) {
                    const i0 = rowBase + c;
                    const tl = field[i0];
                    const tr = field[i0 + 1];
                    const bl = field[i0 + stride];
                    const br = field[i0 + stride + 1];

                    let lo = tl, hi = tl;
                    if (tr < lo) lo = tr; else if (tr > hi) hi = tr;
                    if (br < lo) lo = br; else if (br > hi) hi = br;
                    if (bl < lo) lo = bl; else if (bl > hi) hi = bl;
                    if (hi < step || lo >= hiCut) continue;   // flat / out of range

                    let lStart = Math.floor(lo * invStep) - 1;
                    if (lStart < 0) lStart = 0;
                    let lEnd = Math.ceil(hi * invStep);
                    if (lEnd > levels - 1) lEnd = levels - 1;
                    if (lEnd < lStart) continue;

                    const x0 = c * cell;
                    const x1 = x0 + cell;

                    for (let l = lStart; l <= lEnd; l++) {
                        const level = (l + 1) * step;

                        /* Marching-squares case: one bit per corner,
                           tl=8 tr=4 br=2 bl=1. */
                        let id = 0;
                        if (tl > level) id |= 8;
                        if (tr > level) id |= 4;
                        if (br > level) id |= 2;
                        if (bl > level) id |= 1;
                        if (id === 0 || id === 15) continue;

                        let p = paths[l];
                        if (p === null) { p = new Path2D(); paths[l] = p; }

                        switch (id) {
                            case 1: case 14:
                                p.moveTo(x0, y0 + edgeT(tl, bl, level) * cell);
                                p.lineTo(x0 + edgeT(bl, br, level) * cell, y1);
                                break;
                            case 2: case 13:
                                p.moveTo(x0 + edgeT(bl, br, level) * cell, y1);
                                p.lineTo(x1, y0 + edgeT(tr, br, level) * cell);
                                break;
                            case 3: case 12:
                                p.moveTo(x0, y0 + edgeT(tl, bl, level) * cell);
                                p.lineTo(x1, y0 + edgeT(tr, br, level) * cell);
                                break;
                            case 4: case 11:
                                p.moveTo(x0 + edgeT(tl, tr, level) * cell, y0);
                                p.lineTo(x1, y0 + edgeT(tr, br, level) * cell);
                                break;
                            case 5:   // saddle
                                p.moveTo(x0, y0 + edgeT(tl, bl, level) * cell);
                                p.lineTo(x0 + edgeT(tl, tr, level) * cell, y0);
                                p.moveTo(x0 + edgeT(bl, br, level) * cell, y1);
                                p.lineTo(x1, y0 + edgeT(tr, br, level) * cell);
                                break;
                            case 6: case 9:
                                p.moveTo(x0 + edgeT(tl, tr, level) * cell, y0);
                                p.lineTo(x0 + edgeT(bl, br, level) * cell, y1);
                                break;
                            case 7: case 8:
                                p.moveTo(x0, y0 + edgeT(tl, bl, level) * cell);
                                p.lineTo(x0 + edgeT(tl, tr, level) * cell, y0);
                                break;
                            case 10:  // saddle
                                p.moveTo(x0 + edgeT(tl, tr, level) * cell, y0);
                                p.lineTo(x1, y0 + edgeT(tr, br, level) * cell);
                                p.moveTo(x0, y0 + edgeT(tl, bl, level) * cell);
                                p.lineTo(x0 + edgeT(bl, br, level) * cell, y1);
                                break;
                        }
                    }
                }
            }

            /* One stroke per non-empty level: at most 9, typically 6 or 7.
               globalAlpha carries the entrance fade so no per-frame colour
               strings are built. */
            for (let l = 0; l < levels; l++) {
                const la = levelAlpha[l];
                if (la <= 0.002) continue;
                const p = paths[l];
                if (p === null) continue;
                ctx.globalAlpha = la;
                ctx.strokeStyle = levelStroke[l];
                ctx.lineWidth = levelWidth[l];
                ctx.stroke(p);
            }
            ctx.globalAlpha = 1;

            if (!firstPaint) {
                firstPaint = true;
                canvas.setAttribute('data-ready', '');
            }
        }

        /* ---- 8. Simulation step -------------------------------------------- */

        function updateEntrance(now) {
            if (entranceDone) return;
            let p = (now - entranceStart) / ENTRANCE_MS;
            if (p >= 1) {
                p = 1;
                entranceDone = true;
            }
            const e = 1 - Math.pow(1 - p, 3);
            const front = e * (levels + 1.6);   // sweeps from the lowest contour up
            for (let l = 0; l < levels; l++) {
                const a = front - l;
                levelAlpha[l] = a <= 0 ? 0 : (a >= 1 ? 1 : a);
            }
        }

        function tick(now) {
            if (!sized) return;
            if (rectStale) measureRect();

            updateEntrance(now);

            const phase = now * BREATHE_SPEED;
            const breath = 0.5 + 0.5 * Math.cos(phase);
            if (statDirty || Math.abs(breath - lastBreath) >= BREATH_EPS) {
                composeStat(phase);
                lastBreath = breath;
                statDirty = false;
            } else {
                restorePrev();
            }

            applyDynamic(now);
            drawContours();
        }

        /* Render exactly one frame with no interaction and the breath frozen
           mid-cycle. This is the whole of reduced-motion mode. */
        function renderStatic() {
            if (!sized) return;
            for (let l = 0; l < levels; l++) levelAlpha[l] = 1;
            composeStat(Math.PI / 2);
            dC0 = cols + 1; dR0 = rows + 1; dC1 = -1; dR1 = -1;
            pC0 = 0; pR0 = 0; pC1 = -1; pR1 = -1;
            statDirty = false;
            lastBreath = 0.5;
            drawContours();
        }

        /* ---- 9. Driver: off / ambient / live -------------------------------- */

        function busy() {
            return !entranceDone || liveRipples > 0;
        }

        function desiredMode() {
            if (!sized || reduced) return 'off';
            if (!visible || document.hidden) return 'off';
            return busy() ? 'live' : 'ambient';
        }

        function frame(now) {
            raf = 0;
            if (DEBUG) {
                const t0 = performance.now();
                tick(now);
                sample(performance.now() - t0);
            } else {
                tick(now);
            }
            if (desiredMode() === 'live') {
                raf = requestAnimationFrame(frame);
            } else {
                mode = '';
                sync();
            }
        }

        /* Idle breathing runs on a ~30fps timer, not rAF, and skips the redraw
           entirely while the cross-fade has not moved a visible amount. In
           practice that halves the idle redraws again on top of the fps cap. */
        function ambientTick() {
            timer = 0;
            if (mode !== 'ambient') return;
            const now = performance.now();
            const breath = 0.5 + 0.5 * Math.cos(now * BREATHE_SPEED);
            if (statDirty || Math.abs(breath - lastBreath) >= BREATH_EPS) {
                prevT = now - 16;
                tick(now);
            }
            timer = setTimeout(ambientTick, AMBIENT_MS);
        }

        function setMode(next) {
            if (mode === next) return;
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            if (timer) { clearTimeout(timer); timer = 0; }
            mode = next;
            if (next === 'live') {
                prevT = performance.now();
                raf = requestAnimationFrame(frame);
            } else if (next === 'ambient') {
                timer = setTimeout(ambientTick, AMBIENT_MS);
            }
        }

        function sync() { setMode(desiredMode()); }

        function wake() {
            if (!reduced && mode !== 'live') setMode('live');
        }

        /* Repaint once, now, outside the loop. Used by theme and layout changes. */
        function forceDraw() {
            if (!sized) return;
            statDirty = true;
            if (reduced) { renderStatic(); return; }
            if (mode !== 'live' && visible && !document.hidden) {
                prevT = performance.now() - 16;
                tick(performance.now());
            }
        }

        /* ---- 11. Interaction ------------------------------------------------ */

        function toLocal(e) {
            if (rectStale) measureRect();
            ptr.x = e.clientX - rect.left;
            ptr.y = e.clientY - rect.top;
        }

        function spawnDisturbance(k, x, y, amp, radius, life) {
            ripX[k] = x; ripY[k] = y;
            ripT[k] = performance.now();
            ripA[k] = amp;
            ripR[k] = radius;
            ripL[k] = life;
            ripLive[k] = 1;
            liveRipples++;
            wake();
        }

        function spawnDrop(x, y) {
            spawnDisturbance(dropNext++ % DROP_SLOTS, x, y, DROP_AMP, DROP_RADIUS, DROP_MS);
        }

        function spawnClick(x, y) {
            spawnDisturbance(
                DROP_SLOTS + (clickNext++ % CLICK_SLOTS),
                x, y, CLICK_AMP,
                Math.max(220, Math.min(560, Math.min(width, height) * 0.7)),
                CLICK_MS
            );
        }

        /* The cursor leaves a soft wake in the terrain. Distance gate, not a
           time gate: drops are evenly spaced whether the pointer crawls or
           sprints, and a pointer sitting still generates nothing at all. */
        function onPointerMove(e) {
            if (e.pointerType === 'touch') return;   // no wake without hover
            toLocal(e);

            if (!ptr.inside) {
                ptr.inside = true;
                dropX = ptr.x; dropY = ptr.y;
                return;                              // never drop on entry
            }

            const dx = ptr.x - dropX;
            const dy = ptr.y - dropY;
            if (dx * dx + dy * dy < DROP_DIST * DROP_DIST) return;
            dropX = ptr.x; dropY = ptr.y;

            if (!visible || document.hidden) return;
            spawnDrop(ptr.x, ptr.y);
        }

        function onPointerDown(e) {
            toLocal(e);
            ptr.down = true;
            ptr.moved = 0;
            ptr.touch = e.pointerType === 'touch';
            if (!ptr.touch) {
                /* Mouse and pen get the shockwave on press: the feedback has to
                   be instant or repeated clicking stops feeling like impact. */
                ptr.inside = true;
                dropX = ptr.x; dropY = ptr.y;
                spawnClick(ptr.x, ptr.y);
            }
            wake();
        }

        function onPointerUp() {
            /* Touch fires on release, and only for a tap, so a scroll gesture
               that starts inside the hero does not throw ripples. */
            if (ptr.down && ptr.touch && ptr.moved < 16) spawnClick(ptr.x, ptr.y);
            ptr.down = false;
            ptr.touch = false;
        }

        function onPointerLeave() {
            ptr.inside = false;
            ptr.down = false;
        }

        /* Touch pointers never reach onPointerMove, so their travel is tracked
           here to tell a tap from the start of a scroll. */
        function onTouchTrack(e) {
            if (e.pointerType !== 'touch') return;
            if (!ptr.down) return;
            const px = ptr.x, py = ptr.y;
            toLocal(e);
            ptr.moved += Math.abs(ptr.x - px) + Math.abs(ptr.y - py);
        }

        let interactive = false;
        function enableInteraction() {
            if (interactive) return;
            interactive = true;
            hero.addEventListener('pointermove', onPointerMove, { passive: true });
            hero.addEventListener('pointermove', onTouchTrack, { passive: true });
            hero.addEventListener('pointerdown', onPointerDown, { passive: true });
            hero.addEventListener('pointerup', onPointerUp, { passive: true });
            hero.addEventListener('pointercancel', onPointerUp, { passive: true });
            hero.addEventListener('pointerleave', onPointerLeave, { passive: true });
        }
        function disableInteraction() {
            if (!interactive) return;
            interactive = false;
            hero.removeEventListener('pointermove', onPointerMove);
            hero.removeEventListener('pointermove', onTouchTrack);
            hero.removeEventListener('pointerdown', onPointerDown);
            hero.removeEventListener('pointerup', onPointerUp);
            hero.removeEventListener('pointercancel', onPointerUp);
            hero.removeEventListener('pointerleave', onPointerLeave);
        }

        /* ---- 12. Motion preference, theme, visibility ------------------------ */

        let reduced = resolveReduced();

        function applyMotionMode(initial) {
            const next = resolveReduced();
            if (!initial && next === reduced) return;
            reduced = next;
            if (reduced) {
                disableInteraction();
                ptr.inside = false; ptr.down = false;
                ripLive.fill(0);
                liveRipples = 0;
                entranceDone = true;
                setMode('off');
                renderStatic();
            } else {
                enableInteraction();
                if (!entranceDone) entranceStart = performance.now();
                sync();
                if (mode !== 'live') forceDraw();
            }
        }

        onThemeChange(function () { readColors(); forceDraw(); });
        onMotionChange(function () { applyMotionMode(false); });

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { rectStale = true; prevT = performance.now(); }
            if (reduced) return;
            sync();
        });

        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(function (entries) {
                for (let i = 0; i < entries.length; i++) visible = entries[i].isIntersecting;
                if (visible) { rectStale = true; prevT = performance.now(); }
                if (!reduced) sync();
            }, { threshold: 0 });
            io.observe(hero);
        }

        window.addEventListener('scroll', function () { rectStale = true; }, { passive: true });

        window.addEventListener('resize', function () {
            rectStale = true;
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(applyLayout, 160);
        }, { passive: true });

        /* The headline's own size settles after web fonts load, so the basin has
           to follow it rather than be measured once. */
        if (innerEl && 'ResizeObserver' in window) {
            let seeded = false;
            const ro = new ResizeObserver(function () {
                if (!seeded) { seeded = true; return; }   // ignore the initial call
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(applyLayout, 160);
            });
            ro.observe(innerEl);
        }

        /* ---- 13. Optional instrumentation ------------------------------------ */
        let samples = null, sampleAt = 0;
        function sample(ms) {
            if (!samples) samples = new Float32Array(600);
            samples[sampleAt++ % 600] = ms;
        }
        if (DEBUG) {
            window.__heroStats = function () {
                if (!samples) return null;
                const n = Math.min(sampleAt, 600);
                const arr = Array.prototype.slice.call(samples.subarray(0, n)).sort(function (a, b) { return a - b; });
                let sum = 0;
                for (let i = 0; i < n; i++) sum += arr[i];
                return {
                    frames: n,
                    mean: +(sum / n).toFixed(3),
                    p50: +arr[(n * 0.5) | 0].toFixed(3),
                    p95: +arr[(n * 0.95) | 0].toFixed(3),
                    max: +arr[n - 1].toFixed(3),
                    grid: cols + 'x' + rows,
                    cell: cell,
                    levels: levels,
                    dpr: dpr,
                    mode: mode,
                    ripples: liveRipples
                };
            };
            window.__heroReset = function () { sampleAt = 0; samples = null; };
        }

        /* ---- 14. Boot --------------------------------------------------------- */

        readColors();
        entranceStart = performance.now();
        applyLayout();
        applyMotionMode(true);

    })();
})();
