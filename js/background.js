/* ==========================================================================
   Interactive background — topographic contour map (landonorris.com-style).
   A noise field is rendered as elevation contour lines via marching
   squares. The terrain slowly breathes, and the cursor acts as a hill:
   contour rings bulge and flow around the pointer as it moves.
   Canvas only, no libraries. Touch devices and reduced-motion users get
   a single static render instead of the animation.
   ========================================================================== */

(function () {
    'use strict';

    /* ----- Tuning ----------------------------------------------------------- */
    const CELL = 18;            // px per grid cell (smaller = smoother, costlier)
    const LEVELS = 9;           // number of contour lines
    const NOISE_SCALE = 0.0024; // terrain feature size (smaller = larger hills)
    const BREATHE_SPEED = 0.00012; // how fast the terrain morphs
    const BUMP_AMP = 0.42;      // cursor hill height (terrain is 0..1)
    const BUMP_SIGMA = 150;     // cursor hill radius (px)
    const FOLLOW = 0.08;        // hill trailing speed

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    const isStatic = reduceMotion || isTouch;

    /* ----- Canvas setup ------------------------------------------------------ */
    const canvas = document.createElement('canvas');
    canvas.className = 'cursor-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let dpr = 1;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let noiseA = null;          // two precomputed fields, cross-faded over
    let noiseB = null;          // time for a seamless breathing morph
    let field = null;           // combined per-frame elevation values

    function palette() {
        const light = document.documentElement.getAttribute('data-theme') === 'light';
        return light
            ? { line: 'rgba(29, 29, 31, 0.10)', lineNear: 'rgba(0, 113, 227, 0.22)' }
            : { line: 'rgba(245, 245, 247, 0.07)', lineNear: 'rgba(41, 151, 255, 0.30)' };
    }

    /* ----- Value noise (fBm, 2 octaves) ---------------------------------------- */
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

    function buildFields() {
        const n = (cols + 1) * (rows + 1);
        noiseA = new Float32Array(n);
        noiseB = new Float32Array(n);
        field = new Float32Array(n);
        const fnA = makeNoise(7);
        const fnB = makeNoise(91);
        let i = 0;
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++, i++) {
                const nx = c * CELL * NOISE_SCALE;
                const ny = r * CELL * NOISE_SCALE;
                noiseA[i] = fnA(nx, ny);
                noiseB[i] = fnB(nx, ny);
            }
        }
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(width / CELL);
        rows = Math.ceil(height / CELL);
        buildFields();
        if (isStatic) render(0);
    }

    /* ----- Pointer state ------------------------------------------------------- */
    const mouse = { x: -9999, y: -9999, active: false };
    const hill = { x: -9999, y: -9999 };

    if (!isStatic) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            if (!mouse.active) {
                hill.x = mouse.x;
                hill.y = mouse.y;
                mouse.active = true;
            }
        });
        document.addEventListener('mouseleave', () => { mouse.active = false; });
    }

    /* ----- Render --------------------------------------------------------------- */
    // Linear interpolation of a contour crossing between two corner values
    function lerpT(v0, v1, level) {
        const d = v1 - v0;
        return d === 0 ? 0.5 : (level - v0) / d;
    }

    function render(time) {
        const pal = palette();
        ctx.clearRect(0, 0, width, height);

        /* 1. Combine: breathing terrain + cursor hill */
        const ca = 0.5 + 0.5 * Math.cos(time * BREATHE_SPEED);
        const sa = 1 - ca;
        const hillOn = mouse.active;
        const twoSigma2 = 2 * BUMP_SIGMA * BUMP_SIGMA;

        let i = 0;
        for (let r = 0; r <= rows; r++) {
            const y = r * CELL;
            const dy = y - hill.y;
            for (let c = 0; c <= cols; c++, i++) {
                let v = noiseA[i] * ca + noiseB[i] * sa;
                if (hillOn) {
                    const dx = c * CELL - hill.x;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < twoSigma2 * 4.5) {
                        v += BUMP_AMP * Math.exp(-d2 / twoSigma2);
                    }
                }
                field[i] = v;
            }
        }

        /* 2. Marching squares per contour level */
        const stride = cols + 1;
        for (let l = 1; l <= LEVELS; l++) {
            const level = l / (LEVELS + 1) * 1.15;   // spread levels across terrain range
            ctx.beginPath();

            for (let r = 0; r < rows; r++) {
                const y0 = r * CELL;
                const y1 = y0 + CELL;
                for (let c = 0; c < cols; c++) {
                    const i0 = r * stride + c;
                    const tl = field[i0], tr = field[i0 + 1];
                    const bl = field[i0 + stride], br = field[i0 + stride + 1];

                    let caseId = 0;
                    if (tl > level) caseId |= 8;
                    if (tr > level) caseId |= 4;
                    if (br > level) caseId |= 2;
                    if (bl > level) caseId |= 1;
                    if (caseId === 0 || caseId === 15) continue;

                    const x0 = c * CELL;
                    const x1 = x0 + CELL;
                    // Edge crossing points (only computed when used)
                    const top = () => x0 + lerpT(tl, tr, level) * CELL;
                    const bottom = () => x0 + lerpT(bl, br, level) * CELL;
                    const left = () => y0 + lerpT(tl, bl, level) * CELL;
                    const right = () => y0 + lerpT(tr, br, level) * CELL;

                    switch (caseId) {
                        case 1: case 14: ctx.moveTo(x0, left()); ctx.lineTo(bottom(), y1); break;
                        case 2: case 13: ctx.moveTo(bottom(), y1); ctx.lineTo(x1, right()); break;
                        case 3: case 12: ctx.moveTo(x0, left()); ctx.lineTo(x1, right()); break;
                        case 4: case 11: ctx.moveTo(top(), y0); ctx.lineTo(x1, right()); break;
                        case 5: ctx.moveTo(x0, left()); ctx.lineTo(top(), y0); ctx.moveTo(bottom(), y1); ctx.lineTo(x1, right()); break;
                        case 6: case 9: ctx.moveTo(top(), y0); ctx.lineTo(bottom(), y1); break;
                        case 7: case 8: ctx.moveTo(x0, left()); ctx.lineTo(top(), y0); break;
                        case 10: ctx.moveTo(top(), y0); ctx.lineTo(x1, right()); ctx.moveTo(x0, left()); ctx.lineTo(bottom(), y1); break;
                    }
                }
            }

            ctx.strokeStyle = pal.line;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        /* 3. Accent ring: re-stroke contours near the cursor in accent color,
              clipped to a circle around the hill */
        if (hillOn) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(hill.x, hill.y, BUMP_SIGMA * 1.15, 0, Math.PI * 2);
            ctx.clip();

            for (let l = 1; l <= LEVELS; l++) {
                const level = l / (LEVELS + 1) * 1.15;
                ctx.beginPath();
                const rMin = Math.max(0, Math.floor((hill.y - BUMP_SIGMA * 1.2) / CELL));
                const rMax = Math.min(rows - 1, Math.ceil((hill.y + BUMP_SIGMA * 1.2) / CELL));
                const cMin = Math.max(0, Math.floor((hill.x - BUMP_SIGMA * 1.2) / CELL));
                const cMax = Math.min(cols - 1, Math.ceil((hill.x + BUMP_SIGMA * 1.2) / CELL));

                for (let r = rMin; r <= rMax; r++) {
                    const y0 = r * CELL;
                    const y1 = y0 + CELL;
                    for (let c = cMin; c <= cMax; c++) {
                        const i0 = r * stride + c;
                        const tl = field[i0], tr = field[i0 + 1];
                        const bl = field[i0 + stride], br = field[i0 + stride + 1];

                        let caseId = 0;
                        if (tl > level) caseId |= 8;
                        if (tr > level) caseId |= 4;
                        if (br > level) caseId |= 2;
                        if (bl > level) caseId |= 1;
                        if (caseId === 0 || caseId === 15) continue;

                        const x0 = c * CELL;
                        const x1 = x0 + CELL;
                        const top = () => x0 + lerpT(tl, tr, level) * CELL;
                        const bottom = () => x0 + lerpT(bl, br, level) * CELL;
                        const left = () => y0 + lerpT(tl, bl, level) * CELL;
                        const right = () => y0 + lerpT(tr, br, level) * CELL;

                        switch (caseId) {
                            case 1: case 14: ctx.moveTo(x0, left()); ctx.lineTo(bottom(), y1); break;
                            case 2: case 13: ctx.moveTo(bottom(), y1); ctx.lineTo(x1, right()); break;
                            case 3: case 12: ctx.moveTo(x0, left()); ctx.lineTo(x1, right()); break;
                            case 4: case 11: ctx.moveTo(top(), y0); ctx.lineTo(x1, right()); break;
                            case 5: ctx.moveTo(x0, left()); ctx.lineTo(top(), y0); ctx.moveTo(bottom(), y1); ctx.lineTo(x1, right()); break;
                            case 6: case 9: ctx.moveTo(top(), y0); ctx.lineTo(bottom(), y1); break;
                            case 7: case 8: ctx.moveTo(x0, left()); ctx.lineTo(top(), y0); break;
                            case 10: ctx.moveTo(top(), y0); ctx.lineTo(x1, right()); ctx.moveTo(x0, left()); ctx.lineTo(bottom(), y1); break;
                        }
                    }
                }

                ctx.strokeStyle = pal.lineNear;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    /* ----- Loop -------------------------------------------------------------------- */
    function frame(time) {
        if (mouse.active) {
            hill.x += (mouse.x - hill.x) * FOLLOW;
            hill.y += (mouse.y - hill.y) * FOLLOW;
        }
        render(time);
        requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);

    if (!isStatic) {
        requestAnimationFrame(frame);
    }
})();
