/* ==========================================================================
   loader.js - the home page entrance
   --------------------------------------------------------------------------
   A full-screen field of ASCII terrain that fills in as the page boots, then
   a ring of glyphs that clears it from the centre outward and hands over to
   the hero. It is the hero's own landscape (one character per grid node,
   picked from a density ramp by elevation, the densest ones in the accent,
   pre-tinted on an atlas and blitted with drawImage), so what loads is what
   you land on.

   THE FIELD
     Elevation is two octaves of value noise, drifting slowly. A waterline
     drops as progress rises: at 0% only the highest peaks show, at 100% most
     of the land is up. Nothing rotates, nothing is pulled towards a point.

   TIMELINE (the page is never held longer than it has to be)
     run     progress eases 0 -> 100 over MIN_MS, but is held at WAIT_CAP
             until the web font and the window load event are really in
             (or MAX_MS passes). The boot log lines are tied to progress and
             the font line to the font actually loading.
     breach  a ragged ring of glyphs races out from the centre and
             everything behind it is cleared. At LEAVE_AT of the way the
             page is released (ld-leaving, inert and scroll lock lifted,
             `ld:leave` fired) so the hero's own entrance plays into the hole.
     done    overlay removed from the layout.

   SKIP     Esc / Enter / Space, click anywhere, or the button: jumps
            straight to the breach, shorter.
   SAFETY   Not shown for reduced motion, #hash links, back/forward or
            ?intro=0 (the gate in index.html decides). Any error, and a hard
            timer, release the page; the overlay can never trap anyone.
   ========================================================================== */

(function () {
    'use strict';

    var root = document.documentElement;
    var ld = document.querySelector('[data-loader]');
    if (!ld || !root.classList.contains('ld')) return;
    root.classList.add('ld-ready');

    /* ---- Tuning ------------------------------------------------------------ */

    var MIN_MS         = 3400;    // the load, at the soonest
    var WAIT_CAP       = 0.92;    // progress is held here until the page is really loaded
    var MAX_MS         = 9000;    // stop waiting for a slow network
    var BREACH_MS      = 1500;
    var SKIP_BREACH_MS = 950;
    var LEAVE_AT       = 0.2;     // fraction of the breach before the page is released
    var HARD_CAP_MS    = 16000;

    var LP             = 64;      // noise lattice period (x wraps)
    var LEVEL_HI       = 0.7;     // waterline at 0%
    var LEVEL_LO       = 0.4;     // waterline at 100%
    var STEP           = 0.058;   // elevation per glyph step
    var ACCENT_FROM    = 8;       // first glyph index tinted towards --accent

    var TAU_INV = 1 / (Math.PI * 2);

    /* ---- Elements ---------------------------------------------------------- */

    var canvas = ld.querySelector('.ld-canvas');
    var ctx = canvas && canvas.getContext && canvas.getContext('2d');
    var elN = ld.querySelector('[data-ld-n]');
    var elLog = ld.querySelector('[data-ld-log]');
    var elBar = ld.querySelector('[data-ld-bar]');
    var elSkip = ld.querySelector('[data-ld-skip]');

    var state = 'run';            // run | breach | done
    var raf = 0, hardTimer = 0;
    var inerted = [];
    var themeObs = null;
    var leaving = false;

    if (!ctx || !elN || !elLog || !elBar) { release(true); return; }

    /* ---- Glyphs ------------------------------------------------------------ */

    var RAMP = ' .:-=+*#%@';
    var RAMP_N = RAMP.length;
    var NT = 8, NA = 2, NTIER = NT + NA;      // ink tiers, accent tiers

    /* ---- Noise lattice (x wraps) ------------------------------------------- */

    var LAT = new Float32Array(LP * 256);
    (function seed() {
        var s = 0x9e3779b9;
        for (var i = 0; i < LAT.length; i++) {
            s = (s + 0x6d2b79f5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            LAT[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296);
        }
    })();

    function noise(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        xf = xf * xf * (3 - 2 * xf);
        yf = yf * yf * (3 - 2 * yf);
        var x0 = ((xi % LP) + LP) % LP, x1 = x0 + 1 === LP ? 0 : x0 + 1;
        var y0 = yi & 255, y1 = (yi + 1) & 255;
        var a = LAT[x0 * 256 + y0], b = LAT[x1 * 256 + y0];
        var c = LAT[x0 * 256 + y1], d = LAT[x1 * 256 + y1];
        return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    }

    /* A closed, smoothed random ring: the ragged edge of the breach. */
    var JN = 256;
    var jag = new Float32Array(JN);
    (function ring() {
        var raw = new Float32Array(JN), i, j;
        for (i = 0; i < JN; i++) raw[i] = LAT[(i * 37) % LAT.length];
        for (i = 0; i < JN; i++) {
            var sum = 0;
            for (j = -6; j <= 6; j++) sum += raw[(i + j + JN) % JN];
            jag[i] = sum / 13;
        }
        var lo = 1, hi = 0;
        for (i = 0; i < JN; i++) { if (jag[i] < lo) lo = jag[i]; if (jag[i] > hi) hi = jag[i]; }
        for (i = 0; i < JN; i++) jag[i] = (jag[i] - lo) / (hi - lo) - 0.5;   // -0.5..0.5
    })();

    /* ---- Colours ----------------------------------------------------------- */

    var probe = document.createElement('canvas').getContext('2d');
    function parse(str) {
        probe.fillStyle = '#000';
        probe.fillStyle = (str || '').trim() || '#000';
        var s = probe.fillStyle;
        if (s.charAt(0) === '#') {
            return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
        }
        var m = s.match(/[\d.]+/g) || [0, 0, 0];
        return [+m[0], +m[1], +m[2]];
    }

    var C = { bgCss: '#0b0c0a', ink: [220, 223, 210], acc: [139, 240, 138], font: 'monospace' };
    function readColors() {
        var cs = getComputedStyle(root);
        C.bgCss = cs.getPropertyValue('--bg').trim() || C.bgCss;
        C.ink = parse(cs.getPropertyValue('--text'));
        C.acc = parse(cs.getPropertyValue('--accent'));
        C.font = cs.getPropertyValue('--font-mono').trim() || C.font;
    }

    /* ---- Grid, atlas, masks ------------------------------------------------ */

    var W = 0, H = 0, dpr = 1, fontPx = 12, cellW = 7.2, cellH = 14.4;
    var cols = 0, rows = 0, gw = 1, gh = 1;
    var atlas = document.createElement('canvas');
    var mask = new Float32Array(1);
    var barCols = 40;
    var lastBar = -1;

    function buildAtlas() {
        gw = Math.ceil(cellW * dpr);
        gh = Math.ceil(cellH * dpr);
        atlas.width = RAMP_N * gw;
        atlas.height = NTIER * gh;
        var a = atlas.getContext('2d');
        a.clearRect(0, 0, atlas.width, atlas.height);
        a.font = '600 ' + Math.round(fontPx * dpr) + 'px ' + C.font;
        a.textAlign = 'center';
        a.textBaseline = 'middle';
        for (var t = 0; t < NTIER; t++) {
            var rgb, al;
            if (t < NT) {
                rgb = C.ink;
                al = 0.1 + 0.5 * Math.pow(t / (NT - 1), 1.2);
            } else {
                rgb = C.acc;
                al = 0.55 + 0.4 * ((t - NT) / (NA - 1));
            }
            a.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + al.toFixed(3) + ')';
            for (var g = 1; g < RAMP_N; g++) {
                a.fillText(RAMP.charAt(g), g * gw + gw / 2, t * gh + gh / 2);
            }
        }
    }

    /* Cells under the HUD text are veiled so the type stays crisp. */
    function measureMasks() {
        mask = new Float32Array(cols * rows);
        mask.fill(1);
        var els = ld.querySelectorAll('[data-ld-mask]');
        for (var n = 0; n < els.length; n++) {
            var r = els[n].getBoundingClientRect();
            if (!r.width || !r.height) continue;
            var x0 = Math.max(0, Math.floor(r.left / cellW) - 1);
            var x1 = Math.min(cols - 1, Math.ceil(r.right / cellW) + 1);
            var y0 = Math.max(0, Math.floor(r.top / cellH));
            var y1 = Math.min(rows - 1, Math.ceil(r.bottom / cellH));
            for (var j = y0; j <= y1; j++) {
                for (var i = x0; i <= x1; i++) mask[j * cols + i] = 0.12;
            }
        }
        var probeCh = document.createElement('span');
        probeCh.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;letter-spacing:0';
        probeCh.textContent = new Array(101).join('0');
        elBar.appendChild(probeCh);
        var cw = probeCh.getBoundingClientRect().width / 100;
        elBar.removeChild(probeCh);
        var avail = elBar.getBoundingClientRect().width;
        barCols = Math.max(12, Math.floor(avail / (cw || fontPx * 0.6)) - 2);
        lastBar = -1;
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        fontPx = Math.max(9, Math.min(15, Math.round(W / 118)));
        cellW = fontPx * 0.6;
        cellH = fontPx * 1.2;
        cols = Math.ceil(W / cellW);
        rows = Math.ceil(H / cellH);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ld.style.setProperty('--ld-fs', fontPx + 'px');
        buildAtlas();
        measureMasks();
    }

    /* app.js settles the theme just after this script starts; follow it so the
       canvas and the HUD never disagree. */
    themeObs = new MutationObserver(function () {
        if (state === 'done') return;
        readColors();
        buildAtlas();
    });
    themeObs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    /* ---- Readiness --------------------------------------------------------- */

    var fontsReady = false, loaded = document.readyState === 'complete';
    if (!loaded) window.addEventListener('load', function () { loaded = true; });

    function loadFonts() {
        if (!document.fonts || !document.fonts.load) { fontsReady = true; return; }
        var f = C.font;
        Promise.all([
            document.fonts.load('400 1em ' + f),
            document.fonts.load('600 1em ' + f),
            document.fonts.load('800 1em ' + f)
        ]).then(function () { return document.fonts.ready; }).then(function () {
            fontsReady = true;
            buildAtlas();
            measureMasks();
        }, function () { fontsReady = true; });
    }

    /* ---- Boot log ---------------------------------------------------------- */

    var DOTS = new Array(60).join('. ');
    var LOG = [
        { at: 0.04, k: 'mount', t: 'terrain field', v: function () { return cols + 'x' + rows; } },
        { at: 0.20, k: 'load',  t: 'JetBrains Mono', v: function () { return 'ok'; }, needFonts: true },
        { at: 0.38, k: 'seed',  t: 'value noise',    v: function () { return '2 oct'; } },
        { at: 0.56, k: 'bake',  t: 'glyph atlas',    v: function () { return RAMP_N + 'x' + NTIER; } },
        { at: 0.74, k: 'arm',   t: 'shockwave',      v: function () { return 'ok'; } },
        { at: 0.95, k: 'open',  t: 'portfolio',      v: function () { return 'ready'; }, needReady: true }
    ];
    var logNext = 0;
    var pending = [];

    function pushLog(entry, now) {
        var li = document.createElement('li');
        var k = document.createElement('span'); k.className = 'ld-k'; k.textContent = entry.k;
        var t = document.createElement('span'); t.textContent = entry.t;
        var d = document.createElement('span'); d.className = 'ld-d'; d.textContent = DOTS; d.setAttribute('aria-hidden', 'true');
        var v = document.createElement('span'); v.className = 'ld-v'; v.textContent = '...';
        li.appendChild(k); li.appendChild(t); li.appendChild(d); li.appendChild(v);
        elLog.appendChild(li);
        pending.push({ el: v, entry: entry, at: now + 240 });
    }

    function settleLog(now, ready) {
        for (var i = pending.length - 1; i >= 0; i--) {
            var p = pending[i];
            if (now < p.at) continue;
            if (p.entry.needFonts && !fontsReady) continue;
            if (p.entry.needReady && !ready) continue;
            p.el.textContent = p.entry.v();
            p.el.classList.add('is-ok');
            pending.splice(i, 1);
        }
    }

    /* ---- Pointer parallax (a gentle lean, nothing more) -------------------- */

    var ptrX = 0, ptrY = 0, offX = 0, offY = 0;
    function onPointerMove(e) {
        ptrX = (e.clientX / W - 0.5) * 2;
        ptrY = (e.clientY / H - 0.5) * 2;
    }

    /* ---- Page lock --------------------------------------------------------- */

    function lockPage() {
        var kids = document.body.children;
        for (var i = 0; i < kids.length; i++) {
            var c = kids[i];
            if (c === ld || c.tagName === 'SCRIPT') continue;
            inerted.push([c, c.inert]);
            c.inert = true;
        }
        try { window.scrollTo(0, 0); } catch (e) { /* no-op */ }
    }

    function unlockPage() {
        for (var i = 0; i < inerted.length; i++) inerted[i][0].inert = inerted[i][1];
        inerted = [];
    }

    /* ---- Run state --------------------------------------------------------- */

    var t0 = 0, last = 0;
    var prog = 0, drift = 0;
    var tb0 = 0, breachMs = BREACH_MS;
    var lastN = -1;

    function targetProgress(t) {
        var x = Math.min(1, t / MIN_MS);
        return x < 0.5 ? 0.5 * Math.pow(2 * x, 1.7) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.7);
    }

    function beginBreach(short, now) {
        if (state !== 'run') return;
        state = 'breach';
        tb0 = now;
        breachMs = short ? SKIP_BREACH_MS : BREACH_MS;
        prog = 1;
        ld.classList.add('is-breach');
        showCount(1);
        showBar(1);
        while (logNext < LOG.length) pushLog(LOG[logNext++], now);
        settleLog(1e12, true);
    }

    function skip() {
        if (state === 'run') beginBreach(true, performance.now());
    }

    function leave() {
        if (leaving) return;
        leaving = true;
        root.classList.add('ld-leaving');
        unlockPage();
        try { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; } catch (e) { /* no-op */ }
        window.dispatchEvent(new Event('ld:leave'));
    }

    function release(bail) {
        if (state === 'done' && !bail) return;
        state = 'done';
        if (raf) cancelAnimationFrame(raf);
        clearTimeout(hardTimer);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', onResize);
        if (themeObs) themeObs.disconnect();
        if (!leaving) leave();
        root.classList.remove('ld', 'ld-leaving');
        root.classList.add('ld-done');
        ld.hidden = true;
        if (canvas) { canvas.width = 1; canvas.height = 1; }
        window.dispatchEvent(new Event('ld:done'));
    }

    function onKey(e) {
        if (state === 'done') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            e.stopPropagation();
            skip();
        }
    }

    var resizeTimer = 0;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { if (state !== 'done') resize(); }, 120);
    }

    /* ---- HUD text ---------------------------------------------------------- */

    function showCount(p) {
        var n = Math.round(p * 100);
        if (n === lastN) return;
        lastN = n;
        var s = String(n);
        var pad = 3 - s.length;
        elN.innerHTML = (pad > 0 ? '<s>' + new Array(pad + 1).join('0') + '</s>' : '') + s;
    }

    function showBar(p) {
        var f = Math.round(p * barCols);
        if (f === lastBar) return;
        lastBar = f;
        var head = f > 0 && f < barCols ? '>' : '';
        elBar.innerHTML = '[<b>' + new Array(Math.max(0, f - head.length) + 1).join('=') + head + '</b><span>' +
            new Array(Math.max(0, barCols - f) + 1).join('-') + '</span>]';
    }

    /* ---- Render ------------------------------------------------------------ */

    function draw(now) {
        var w = canvas.width, h = canvas.height;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = C.bgCss;
        ctx.fillRect(0, 0, w, h);

        var cx = W * 0.5, cy = H * 0.5;
        var breach = state === 'breach';
        var Rf = 0, TR = 0;
        if (breach) {
            var bx = Math.min(1, (now - tb0) / breachMs);
            var maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
            TR = Math.hypot(W, H) * 0.07;
            Rf = (1 - Math.pow(1 - bx, 2.1)) * (maxR * 1.18 + TR * 1.25);
        }

        /* the waterline falls as progress rises */
        var level = LEVEL_HI - (LEVEL_HI - LEVEL_LO) * prog;
        var ox = offX * 0.5, oy = drift;

        for (var j = 0; j < rows; j++) {
            var y = (j + 0.5) * cellH - cy;
            var dy = Math.round(j * cellH * dpr);
            var py = j * 0.1 + oy;
            for (var i = 0; i < cols; i++) {
                var dx = Math.round(i * cellW * dpr);
                var g, tier;

                /* -- the breach ring ----------------------------------- */
                if (breach) {
                    var x = (i + 0.5) * cellW - cx;
                    var d = Math.sqrt(x * x + y * y);
                    var acn = Math.atan2(y, x) * TAU_INV + 0.5;
                    var dj = d / (1 + 0.2 * jag[(acn * JN) & (JN - 1)]);
                    if (dj < Rf - TR) {
                        ctx.clearRect(dx, dy, gw, gh);
                        continue;
                    }
                    if (dj < Rf) {
                        var rt = (Rf - dj) / TR;                      // 0 at the front, 1 inside
                        if (rt < 0.1) {
                            g = 9; tier = NT - 1;                     // the bright front
                        } else {
                            g = Math.max(1, 9 - ((rt * 10) | 0));
                            tier = NT + Math.max(0, Math.min(NA - 1, ((1 - rt) * NA) | 0));
                        }
                        ctx.drawImage(atlas, g * gw, tier * gh, gw, gh, dx, dy, gw, gh);
                        continue;
                    }
                }

                /* -- the terrain --------------------------------------- */
                var px = i * 0.05 + ox;
                var e = 0.58 * noise(px, py) + 0.3 * noise(px * 2.3 + 7, py * 2.3 + 3) + 0.12 * noise(px * 5 + 13, py * 5 + 9);
                var k = ((e - level) / STEP) | 0;
                if (e < level || k < 1) continue;
                if (k > 9) k = 9;

                var m = mask[j * cols + i];
                if (m < 1) { k = (k * m) | 0; if (k < 1) continue; }

                if (k >= ACCENT_FROM) tier = NT + (k - ACCENT_FROM);
                else tier = Math.min(NT - 1, ((k * NT) / ACCENT_FROM) | 0);

                ctx.drawImage(atlas, k * gw, tier * gh, gw, gh, dx, dy, gw, gh);
            }
        }
    }

    /* ---- Frame ------------------------------------------------------------- */

    function frame(now) {
        raf = requestAnimationFrame(frame);
        if (state === 'done') return;
        if (!t0) { t0 = now; last = now; }
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        var t = now - t0;

        var ready = (fontsReady && loaded) || t > MAX_MS;

        if (state === 'run') {
            var cap = ready ? 1 : WAIT_CAP;
            prog = Math.min(targetProgress(t), cap);
            if (prog >= 1 && t >= MIN_MS) beginBreach(false, now);
        }

        drift += dt * 0.05;
        offX += (ptrX - offX) * Math.min(1, dt * 2);

        if (state === 'run') {
            while (logNext < LOG.length && prog >= LOG[logNext].at) pushLog(LOG[logNext++], now);
            settleLog(now, ready && prog > 0.97);
            showCount(prog);
            showBar(prog);
        }

        draw(now);

        if (state === 'breach') {
            var b = (now - tb0) / breachMs;
            if (!leaving && b >= LEAVE_AT) leave();
            if (b >= 1.05) release(false);
        }
    }

    /* ---- Boot -------------------------------------------------------------- */

    function boot() {
        readColors();
        resize();
        loadFonts();
        lockPage();
        try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* no-op */ }

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', onResize, { passive: true });
        ld.addEventListener('click', skip);
        if (elSkip) elSkip.addEventListener('click', function (e) { e.stopPropagation(); skip(); });
        ld.tabIndex = -1;
        try { ld.focus({ preventScroll: true }); } catch (e) { /* no-op */ }

        hardTimer = setTimeout(function () { release(false); }, HARD_CAP_MS);
        raf = requestAnimationFrame(frame);
    }

    try {
        boot();
    } catch (err) {
        if (window.console && console.error) console.error('loader:', err);
        release(true);
    }
})();
