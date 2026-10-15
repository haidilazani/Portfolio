# 02 — Techniques, patterns and code (researched for the draft redesign)

Read `01-codebase-audit.md` first: several recommendations below exist only because of specific
code in this repo (app.js overlay primitive, hero.js timing, `scroll-behavior: smooth`, the
`--inv-*` bands). Snippets are written against the existing token names; the new palette
primitives are proposed in §0.

---

## 0. Token layer for `css/draft-theme.css` (start here)

DESIGN.md rule 1 says colours live only in the token layer. Make the top of `draft-theme.css` a
token block and have every later rule reference it. Selector choice matters: `app.js` switches
`<html data-theme>` to `light` when the OS is light, and `[data-theme="light"]` in tokens.css has the
same specificity as `:root`, so target all three:

```css
/* ---- 0. Palette primitives + semantic overrides (draft only) ---------- */
:root,
:root[data-theme="dark"],
:root[data-theme="light"] {
  color-scheme: dark;

  /* Primitives: the five brand colours, declared once. */
  --c-pitch:      #050505;   /* background            */
  --c-crimson:    #4A0A05;   /* ambient glow, shadows  — decoration only, never text */
  --c-orange:     #FF4500;   /* highlights, soundwave, focus/selection */
  --c-gold:       #FFB300;   /* CTA buttons, accents   */
  --c-soft-white: #F2F2F2;   /* typography             */

  /* Surfaces */
  --bg:            var(--c-pitch);
  --bg-elevated:   color-mix(in srgb, var(--c-crimson) 22%, var(--c-pitch)); /* ≈ #140605 */
  --bg-sunken:     color-mix(in srgb, #000 50%, var(--c-pitch));
  --surface:       color-mix(in srgb, var(--c-soft-white) 4.5%, transparent);
  --surface-hover: color-mix(in srgb, var(--c-soft-white) 8%, transparent);

  /* Text (ratios vs #050505) */
  --text:           var(--c-soft-white);                                     /* 18.2:1 */
  --text-secondary: color-mix(in srgb, var(--c-soft-white) 68%, var(--c-pitch)); /* ≈#a6a6a6 8.4:1 */
  --text-tertiary:  color-mix(in srgb, var(--c-soft-white) 56%, var(--c-pitch)); /* ≈#8a8a8a 5.9:1 */

  /* Accent: MUST stay plain hex/rgba — hero.js parses --accent/--border for the canvas. */
  --accent:      #FF4500;                  /* = --c-orange, written literally for hero.js */
  --accent-text: #FF4500;                  /* 5.92:1 on pitch: AA body text */
  --accent-soft: rgba(255, 69, 0, 0.16);
  --accent-2:    var(--c-gold);            /* decorative */
  --border:        rgba(242, 242, 242, 0.10);  /* literal for hero.js */
  --border-strong: rgba(242, 242, 242, 0.20);

  /* New CTA pair (gold button, pitch label: 11.36:1 AAA) */
  --cta-bg:    var(--c-gold);
  --cta-text:  var(--c-pitch);
  --cta-glow:  color-mix(in srgb, var(--c-gold) 35%, transparent);

  /* Glows used by the intro + hero vignette */
  --glow-crimson:       color-mix(in srgb, var(--c-crimson) 85%, transparent);
  --glow-crimson-soft:  color-mix(in srgb, var(--c-crimson) 50%, transparent);
  --glow-orange:        color-mix(in srgb, var(--c-orange) 32%, transparent);
  --glow-orange-soft:   color-mix(in srgb, var(--c-orange) 14%, transparent);
  --glow-gold-soft:     color-mix(in srgb, var(--c-gold) 10%, transparent);

  /* Glass + nav island: dark, faintly warm */
  --glass-bg:       color-mix(in srgb, var(--bg-elevated) 60%, transparent);
  --glass-bg-solid: color-mix(in srgb, var(--bg-elevated) 80%, transparent);
  --glass-border:   rgba(242, 242, 242, 0.12);
  --island-bg:      color-mix(in srgb, var(--bg-elevated) 62%, transparent);

  /* Inverse bands: keep them dark (otherwise work/about/contact/footer render as light paper).
     A faint crimson lift keeps the band rhythm without leaving the palette. */
  --inv-scheme: dark;
  --inv-bg:             color-mix(in srgb, var(--c-crimson) 14%, var(--c-pitch));
  --inv-bg-elevated:    var(--bg-elevated);
  --inv-bg-sunken:      var(--bg-sunken);
  --inv-surface:        var(--surface);
  --inv-surface-hover:  var(--surface-hover);
  --inv-text:           var(--text);
  --inv-text-secondary: var(--text-secondary);
  --inv-text-tertiary:  var(--text-tertiary);
  --inv-accent:         var(--accent);
  --inv-accent-text:    var(--accent-text);
  --inv-accent-soft:    var(--accent-soft);
  --inv-border:         var(--border);
  --inv-border-strong:  var(--border-strong);
  /* …and --inv-island-bg/-sheen/-rim/-rim-soft/-shadow = the dark --island-* values */

  --measure-editorial: 62ch;     /* see §6 */
  --intro-fade: 900ms;           /* see §3 */
}

/* Gold CTA: the existing .btn-primary is "inverted solid" (--text bg). Re-point it. */
.btn-primary { background-color: var(--cta-bg); color: var(--cta-text); }
.btn-primary:hover { box-shadow: 0 var(--s-2) var(--s-6) var(--cta-glow); }
```

Keep `meta[name="theme-color"]` at `#050505` in the drafts (app.js rewrites it to `#060607`/`#f5f5f7`
on theme change; hide `[data-theme-toggle]` in drafts or accept that it no longer changes colours).
`color-mix()` is Baseline 2023; fine for CSS, **not** for `--accent`/`--border` (canvas parse).

---

## 1. Robust scroll lock for the intro

**Recommendation:** because the intro only ever appears at scroll position 0 on page load, use a
**class on `<html>`** that sets `overflow: hidden` on `html` and `body`, plus `overscroll-behavior:
none`, plus non-passive `wheel`/`touchmove` listeners that `preventDefault()` (§2). Do **not** use the
`position: fixed; top: -scrollY` body trick: its purpose is preserving an arbitrary scroll offset on
old iOS, and fixing `<body>` would break `position: sticky`, stack.js geometry and the
`scroll(root)` timelines this site uses. Do **not** write inline `html.style.overflow`, because
app.js's overlay primitive saves/restores that inline value (01 §3).

- iOS Safari historically ignored `overflow: hidden` on body; WebKit bug 153852 was marked fixed in
  2019 but reports of it still scrolling in some cases (collapsed toolbar, standalone apps) continued —
  hence the belt-and-braces `touchmove` `preventDefault()`.
- `scrollbar-gutter: stable` keeps a classic (Windows/Linux) scrollbar's gutter reserved while
  `overflow: hidden`, so there is no 15 px layout jump at unlock. It has **no effect with overlay
  scrollbars** (macOS/iOS default). Scope it to the intro only: app.js's cmdk measures
  `innerWidth - clientWidth` and pads the body, which would double up with a permanent gutter.
- `overscroll-behavior: none` stops rubber-band / pull-to-refresh; MDN lists it as limited
  availability, so treat it as enhancement.
- `history.scrollRestoration = 'manual'` stops the browser restoring a mid-page offset on reload.
- `html { scroll-behavior: smooth }` is set in main.css, so reset to top with smooth temporarily off.

```css
/* Only while the intro owns the page. Class is set by the inline head script (§3). */
html.intro-pending {
  overflow: hidden;
  scrollbar-gutter: stable;
  overscroll-behavior: none;
}
html.intro-pending body { overflow: hidden; }
```

```js
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const prev = root.style.scrollBehavior;
root.style.scrollBehavior = 'auto';        // defeat main.css `scroll-behavior: smooth`
window.scrollTo(0, 0);
root.style.scrollBehavior = prev;
```

No smooth-scroll library exists in this repo, so there is nothing to pause/resume. (If one is
added later: Lenis exposes `lenis.stop()` / `lenis.start()`; call them in lock/unlock.)

Sources: [Jay Freestone — Locking body scroll for modals on iOS](https://www.jayfreestone.com/writing/locking-body-scroll-ios/),
[Markus Oberlehner — Prevent body scrolling on iOS](https://markus.oberlehner.net/blog/simple-solution-to-prevent-body-scrolling-on-ios),
[WebKit bug 153852](https://bugs.webkit.org/show_bug.cgi?id=153852),
[MDN scrollbar-gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter),
[MDN overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior),
[MDN History.scrollRestoration](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration).

---

## 2. Detecting "the user started to scroll" while locked

A locked page emits no `scroll` events, so listen to the **inputs** that would have scrolled:

| Input | Event | Rule |
| --- | --- | --- |
| Mouse wheel / trackpad | `wheel` on `window`, **`{ passive: false }`** | Chrome ≥73 makes wheel listeners on window/document/body passive by default; without `passive:false`, `preventDefault()` is ignored. Dismiss on `deltaY > 4` (ignore tiny jitter). Ignore `e.ctrlKey` (trackpad pinch-zoom arrives as ctrl+wheel; let the browser zoom). |
| Touch swipe | `touchstart` (passive) + `touchmove` **`{ passive: false }`** | Single finger only (let two-finger pinch through for zoom, WCAG 1.4.4). Dismiss when the finger has travelled up > 36 px (`startY - currentY`). Check `e.cancelable` before `preventDefault()`. Don't use `touch-action: none` on the overlay — MDN warns it disables zoom. |
| Keyboard | `keydown` on `window` in **capture** phase | Forward keys dismiss: `ArrowDown`, `PageDown`, `' '` (Space), `End`. Backward keys (`ArrowUp`, `PageUp`, `Home`) are swallowed. `Escape` dismisses (dialog convention). Let Space/Enter through when the target is the Enter button (native click). Swallow `⌘/Ctrl+K` (+`stopPropagation`) so app.js's palette can't open over the intro (01 §3). |
| Explicit control | a real `<button>` in the overlay | Visible label, e.g. "Come closer" with a down chevron and a hint "Scroll, swipe or press ↓". Focused on load (APG dialog: move focus into the dialog). This is the path for keyboard, switch and screen-reader users. |

**Inertia / key-repeat guard.** A trackpad fling keeps firing `wheel` for ~1 s; held ArrowDown repeats.
If the lock is released the instant the overlay disappears, that tail scrolls the page straight past
the Hero. Keep the same listeners alive after dismissal in a "cooldown" mode that
`preventDefault()`s every wheel/touchmove/scroll-key event and only detaches after **260 ms of
silence** (each event re-arms the timer). Because the first wheel event of the gesture was already
cancelled, Chrome keeps the rest of that gesture cancelable (MDN: "In some browsers, only the first
wheel event in a sequence is cancelable").

Sources: [MDN wheel event](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event),
[Chrome — Making wheel scrolling fast by default](https://developer.chrome.com/blog/scrolling-intervention-2/),
[MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action),
[W3C APG — Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

---

## 3. Fade-out + unlock sequence, a11y, reduced motion, no-JS fallback

### 3.1 Never trap a visitor (progressive enhancement)

The overlay is `display: none` unless `<html>` carries `intro-pending`, which is added by a tiny
**inline** head script (so the Hero never flashes before the overlay paints) — and released
automatically if `js/draft-intro.js` never claims it. No JS at all → no class → no overlay.

```html
<!-- draft-index.html <head>, directly after the existing theme/motion seed script -->
<script>
  (function () {
    var d = document.documentElement, show = true;
    try {
      if (location.hash.length > 1) show = false;             // deep link (e.g. #contact): skip
      if (/[?&]intro=0\b/.test(location.search)) show = false; // dev bypass
      /* optional, once per tab session:
         if (sessionStorage.getItem('intro-seen') === '1') show = false; */
    } catch (e) {}
    if (!show) return;
    d.classList.add('intro-pending');
    /* Deferred scripts run before DOMContentLoaded. If draft-intro.js 404s or throws before it
       adds .intro-ready, release the page instead of leaving an undismissable overlay. */
    document.addEventListener('DOMContentLoaded', function () {
      if (!d.classList.contains('intro-ready')) d.classList.remove('intro-pending');
    });
  })();
</script>
```

### 3.2 Markup (first child of `<body>`, before the skip link)

```html
<div class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title" data-intro>
  <div class="intro-stage">
    <p class="intro-title" id="intro-title">Welcome, you found me. come closer and see what inside.</p>
    <div class="soundwave" aria-hidden="true"><!-- 24–32 <span> bars, see §5 --></div>
    <button class="intro-enter" type="button" data-intro-enter>
      Come closer
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"
           fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 10l5 5 5-5"/></svg>
    </button>
    <p class="intro-hint" aria-hidden="true">scroll · swipe · ↓</p>
  </div>
</div>
```
(Copy is the user's verbatim sentence, including lowercase "come" and "see what inside" — confirm
with the user whether "what's inside" was intended before shipping.)

### 3.3 CSS

```css
.intro { display: none; }
html.intro-pending .intro {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);          /* 900: above nav (200), below cmdk (1000) */
  display: grid;
  place-items: center;
  padding: var(--gutter);
  text-align: center;
  background-color: var(--c-pitch);
  color: var(--c-soft-white);
  opacity: 1;
  visibility: visible;
  transition:
    opacity var(--intro-fade) var(--ease-out),
    visibility 0s linear var(--intro-fade);
}
html.intro-leaving .intro { opacity: 0; visibility: hidden; }

/* "come closer": the stage drifts toward the viewer as it fades (motion-gated) */
@media (prefers-reduced-motion: no-preference) {
  html:not([data-motion="reduced"]) .intro-stage { transition: transform var(--intro-fade) var(--ease-expo); }
  html:not([data-motion="reduced"]).intro-leaving .intro-stage { transform: scale(1.08); }
}

/* Hold the Hero's CSS entrance (hero.css hero-rise/hero-fade, marquee) until the intro leaves,
   so the Hero animates in as the overlay fades instead of finishing unseen underneath. */
html.intro-pending:not(.intro-leaving) .hero *,
html.intro-pending:not(.intro-leaving) .hero *::before,
html.intro-pending:not(.intro-leaving) .hero *::after {
  animation-play-state: paused !important;
}
```
Caveats: hero.js's odometer dial settles by timer (~1.4 s) and collapses to plain text anyway, so
it will not replay; the terrain canvas keeps its ~30 fps ambient loop under the overlay (no API to
pause it; acceptable).

### 3.4 JS reference (`js/draft-intro.js`, `defer`, loaded last)

```js
(function () {
  'use strict';
  var root = document.documentElement;
  var intro = document.querySelector('[data-intro]');
  if (!intro || !root.classList.contains('intro-pending')) return; // silent no-op
  root.classList.add('intro-ready');                               // claim it (see §3.1)

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function isReduced() { return root.getAttribute('data-motion') === 'reduced' || mq.matches; }

  var FADE_MS = 900, QUIET_MS = 260, SWIPE_PX = 36, WHEEL_MIN = 4;
  var FORWARD = ['ArrowDown', 'PageDown', ' ', 'Spacebar', 'End'];
  var SCROLL_KEYS = FORWARD.concat(['ArrowUp', 'PageUp', 'Home']);
  var enter = intro.querySelector('[data-intro-enter]');
  var state = 'locked';            // locked → leaving → done
  var quietTimer = 0, touchY = null;
  var background = [];

  function release() {             // emergency + normal exit share this
    background.forEach(function (r) { r.el.inert = r.was; });
    root.classList.remove('intro-pending', 'intro-leaving');
    intro.hidden = true;
  }

  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var sb = root.style.scrollBehavior; root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0); root.style.scrollBehavior = sb;

    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === intro || el.tagName === 'SCRIPT') return;
      background.push({ el: el, was: el.inert });
      el.inert = true;             // main, nav, footer, skip link, cmdk…
    });

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);
    if (enter) {
      enter.addEventListener('click', dismiss);
      enter.focus({ preventScroll: true });
    }
  } catch (err) {
    release();
    if (window.console) console.error('[intro] failed, page released:', err);
    return;
  }

  function onWheel(e) {
    if (e.ctrlKey) return;                         // pinch-zoom
    if (e.cancelable) e.preventDefault();
    if (state === 'locked') { if (e.deltaY > WHEEL_MIN) dismiss(); }
    else armQuiet();                               // swallow the inertia tail
  }
  function onTouchStart(e) { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; }
  function onTouchMove(e) {
    if (touchY === null || e.touches.length !== 1) return;
    if (e.cancelable) e.preventDefault();
    if (state === 'locked') { if (touchY - e.touches[0].clientY > SWIPE_PX) dismiss(); }
    else armQuiet();
  }
  function onTouchEnd() { touchY = null; }
  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); e.stopPropagation(); return;       // keep ⌘K shut while locked
    }
    if (state === 'locked') {
      if (e.key === 'Tab') { e.preventDefault(); if (enter) enter.focus(); return; }
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); return; }
      if (e.target === enter && (e.key === ' ' || e.key === 'Enter')) return; // native click
    }
    if (SCROLL_KEYS.indexOf(e.key) === -1) return;
    e.preventDefault();
    if (state === 'locked') { if (FORWARD.indexOf(e.key) !== -1) dismiss(); }
    else armQuiet();
  }

  function dismiss() {
    if (state !== 'locked') return;
    state = 'leaving';
    armQuiet();
    root.classList.add('intro-leaving');
    afterTransition(intro, 'opacity', (isReduced() ? 0 : FADE_MS) + 150, finish);
  }

  function finish() {
    release();
    root.classList.add('intro-done');
    var h1 = document.getElementById('hero-title');         // move focus to the revealed content
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    try { sessionStorage.setItem('intro-seen', '1'); } catch (e) {}
    window.dispatchEvent(new CustomEvent('introend'));
    armQuiet();
  }

  function armQuiet() {
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function () {
      if (state === 'locked' || !intro.hidden) return;       // not finished yet; next event re-arms
      state = 'done';
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown, true);
    }, QUIET_MS);
  }

  function afterTransition(el, prop, timeout, cb) {
    var fired = false, t = 0;
    function end(e) {
      if (e && (e.target !== el || e.propertyName !== prop)) return;
      if (fired) return; fired = true;
      el.removeEventListener('transitionend', end);
      clearTimeout(t); cb();
    }
    el.addEventListener('transitionend', end);
    t = setTimeout(end, timeout);                  // fallback: no transition, reduced motion, hidden tab
  }
})();
```

Notes:
- `finish()` calls `armQuiet()` last, so the listeners detach QUIET_MS after the final event even if
  the user stopped scrolling before the fade ended.
- `inert` (Baseline since April 2023) removes the background from focus, clicks, find-in-page and the
  a11y tree. Restoring the *previous* `inert` value (not `false`) avoids the app.js bug pattern.
- `aria-modal="true"` is valid here because the script really blocks the rest of the page (APG).
  `hidden` on the overlay after the fade removes it from the a11y tree.
- Reduced motion: keep the intro (it's content), drop the scale/soundwave motion; main.css's kill
  switch already forces transitions to 1 ms so `transitionend` fires near-instantly; the timeout is
  the backstop.
- bfcache: a restored page keeps `intro-done`; nothing to do. Reload shows the intro again (unless
  the optional session flag is enabled).

Sources: [MDN inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert),
[W3C APG Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
[web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion),
[MDN History.scrollRestoration](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration).

---

## 4. Stage-lighting vignette (crimson + orange edges, dark centre)

Build the light from **layered radial gradients** (cheap, static) plus an **inset box-shadow** for the
hard edge falloff, on a pseudo-element. Animate only **opacity** of a second pseudo-element for the
"breathing" — box-shadow animation repaints every frame (Tobias Ahlin; web.dev animations guide).

```css
html.intro-pending .intro { isolation: isolate; }
.intro::before,
.intro::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
/* Static rig: dark centre, crimson walls, an orange floor wash, two faint top spots. */
.intro::before {
  background:
    radial-gradient(ellipse 70% 60% at 50% 50%, transparent 35%, var(--glow-crimson-soft) 75%, var(--glow-crimson) 100%),
    radial-gradient(ellipse 60% 40% at 50% 115%, var(--glow-orange), transparent 70%),
    radial-gradient(ellipse 40% 35% at 8% -5%, var(--glow-orange-soft), transparent 70%),
    radial-gradient(ellipse 40% 35% at 92% -5%, var(--glow-gold-soft), transparent 70%);
  box-shadow:
    inset 0 0 14vmax 3vmax var(--glow-crimson),
    inset 0 0 5vmax var(--glow-orange-soft);
}
/* Breathing layer: same idea, hotter, only its opacity moves. */
.intro::after {
  box-shadow: inset 0 0 20vmax 4vmax var(--glow-orange);
  opacity: 0.35;
}
@media (prefers-reduced-motion: no-preference) {
  html:not([data-motion="reduced"]) .intro::after {
    animation: intro-breathe 5.5s var(--ease-out) infinite alternate;
  }
}
@keyframes intro-breathe { to { opacity: 0.8; } }

/* Hero: the same rig at ~40 % strength. .hero::after is taken (bg fade), ::before is free. */
.hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: var(--z-base);
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 55% at 50% 110%, var(--glow-orange-soft), transparent 70%),
    radial-gradient(ellipse 55% 45% at 0% 0%, var(--glow-crimson-soft), transparent 70%),
    radial-gradient(ellipse 55% 45% at 100% 0%, var(--glow-crimson-soft), transparent 70%);
  box-shadow: inset 0 0 10vmax var(--glow-crimson-soft);
}
```
- `vmax` keeps the edge proportional on phones and ultrawides; test at 375 px.
- `will-change: opacity` only if DevTools shows jank; the web.dev guide recommends it sparingly.
- Keep glows out of text areas: body copy should sit on near-pure `#050505` so contrast stays ≥ 17:1.

Sources: [Tobias Ahlin — animate box-shadow with silky smooth performance](https://tobiasahlin.com/blog/how-to-animate-box-shadow/),
[web.dev — high-performance CSS animations](https://web.dev/articles/animations-guide).

---

## 5. Soundwave / equalizer bars

Animate **`transform: scaleY`** (compositor-only) rather than `height`; stagger with **negative
`animation-delay`** so every bar is mid-cycle on the first frame; vary amplitude per bar with a custom
property; colour ramps orange → gold → orange across the row.

```html
<div class="soundwave" aria-hidden="true">
  <span style="--i:0;--amp:.35"></span><span style="--i:1;--amp:.6"></span>
  <span style="--i:2;--amp:.9"></span><!-- … 24–32 bars; or generate them in draft-intro.js -->
</div>
```

```css
.soundwave {
  --bars: 28;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-1);
  height: var(--s-8);                           /* 4rem stage */
  margin-block: var(--s-6);
}
.soundwave > span {
  flex: none;
  width: 3px;
  height: 100%;
  border-radius: var(--r-pill);
  /* horizontal ramp: centre bars gold, edge bars orange */
  background-color: color-mix(in srgb, var(--c-gold)
      calc(100% - (max(var(--i), var(--bars) - 1 - var(--i)) - (var(--bars) - 1) / 2) / ((var(--bars) - 1) / 2) * 100%),
      var(--c-orange));
  transform: scaleY(var(--amp, 0.5));           /* resting shape = the reduced-motion state */
  transform-origin: center;
  box-shadow: 0 0 var(--s-3) var(--glow-orange-soft);
}
@media (prefers-reduced-motion: no-preference) {
  html:not([data-motion="reduced"]) .soundwave > span {
    animation: wave 1.2s var(--ease-out) infinite alternate;
    animation-delay: calc(var(--i) * -173ms);   /* negative: already mid-cycle */
  }
}
@keyframes wave {
  0%   { transform: scaleY(0.12); }
  60%  { transform: scaleY(var(--amp, 0.8)); }
  100% { transform: scaleY(calc(var(--amp, 0.8) * 0.45)); }
}
```
If the `color-mix()` percentage maths feels too clever, a simpler equivalent is
`background-image: linear-gradient(to top, var(--c-orange), var(--c-gold))` on every bar.
- Always `aria-hidden="true"` (pure decoration; the sentence carries the meaning).
- Pause it when the overlay is gone: it is inside `.intro[hidden]`, so it stops rendering.
- No real audio; never autoplay sound.

Sources: [Samuel Kraft — Animated music bars with CSS](https://samuelkraft.com/blog/animated-music-bars),
[web.dev animations guide](https://web.dev/articles/animations-guide).

---

## 6. Editorial reading layout (Writing/Poetry page)

- **Measure:** 50–75 characters per line is the long-standing readability band (Baymard);
  WCAG 1.4.8 (AAA) caps lines at 80 characters and asks for ≥ 1.5 line spacing, paragraph spacing
  ≥ 1.5× line spacing, and no justified text. The site already has `--measure: 68ch`; for an
  editorial page use ~60–64ch for prose and let poems be narrower (≈ 42–48ch) and left-aligned.
- **Type:** keep the site's families — **DESIGN.md forbids a serif** ("There is deliberately no serif
  on this site"). Use Inter for body at `--fs-lg` (≈ 18–22 px) with `line-height: 1.7`, Space Grotesk /
  Jost for titles, JetBrains Mono for numbers/dates in the index. `text-wrap: pretty` for prose,
  `text-wrap: balance` for titles (both already used in main.css).
- **Whitespace:** generous vertical rhythm — section padding `calc(var(--section-y) * 1.25)`,
  `margin-block: var(--s-7)` between index rows when open, nothing else competing on the page.
- **Poetry line breaks:** `white-space: pre-line` preserves newlines but collapses spaces (so HTML
  source indentation doesn't leak in); `pre-wrap` also preserves every leading space from the source
  file — a common gotcha. The most robust markup is one `<p class="stanza">` per stanza with `<br>`
  between lines. For wrapped long lines use a hanging indent so the continuation is visibly not a new
  line.

```css
.editorial { max-width: var(--measure-editorial); margin-inline: auto; }
.editorial p { font-size: var(--fs-lg); line-height: 1.7; color: var(--text-secondary); text-wrap: pretty; }
.editorial p + p { margin-block-start: 1.5em; }

.poem { max-width: 46ch; font-size: var(--fs-lg); line-height: 1.75; color: var(--text); }
.poem .stanza + .stanza { margin-block-start: 1.6em; }        /* stanza gap > line gap */
.poem .line { display: block; padding-inline-start: 1.5em; text-indent: -1.5em; } /* hanging indent */
/* or, if the text is authored with raw newlines: */
.poem--raw { white-space: pre-line; }
```

Sources: [Baymard — Readability: the optimal line length](https://baymard.com/blog/line-length-readability),
[W3C — Understanding SC 1.4.8 Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html),
[MDN white-space](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space).

---

## 7. Accessible accordion (poem index → inline reveal)

**Pattern (W3C APG Accordion):** each header is a `<button>` that is the **only** child of a heading
(`<h2>`/`<h3>`); the button has `aria-expanded` (true/false) and `aria-controls` → panel id; the panel
may be `role="region"` with `aria-labelledby` → button id, **but avoid `region` when more than ~6
panels can be open at once** (landmark proliferation). Enter/Space toggles; Tab moves normally;
Up/Down/Home/End between headers are optional. → Use **single-open** (opening one closes the
others): it reads like turning to a page, and it keeps `role="region"` legitimate for 6+ items.

**Height animation:** the `grid-template-rows: 0fr → 1fr` trick (Nelson Menezes, popularised by
CSS-Tricks / Keith J. Grant) animates to auto height in every modern browser. The inner wrapper needs
`min-height: 0; overflow: hidden` and **no padding** (put padding on a third element). Collapsed
content is still in the DOM, so also hide it from AT and tab order with `visibility: hidden`
(transitioned discretely) — no extra `inert` needed.

Alternatives: `<details>/<summary>` + `interpolate-size: allow-keywords` (Chrome/Edge 129+) and
`::details-content` (Baseline 2025) animate natively, but Safari/Firefox coverage for the height
animation is still partial; fine as progressive enhancement, not as the only path. A distraction-free
modal (`<dialog>` + `showModal()`) is the other option; the inline accordion is simpler with this
codebase (no second overlay competing with app.js's cmdk).

```html
<ol class="poem-index" data-accordion>
  <li class="poem-item">
    <h2 class="poem-heading">
      <button class="poem-trigger" type="button" id="poem-remembrance-btn"
              aria-expanded="true" aria-controls="poem-remembrance">
        <span class="poem-no">06</span>
        <span class="poem-title">A remembrance of who I was</span>
        <span class="poem-meta">Planned</span>
        <svg class="poem-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5"/></svg>
      </button>
    </h2>
    <div class="poem-panel" id="poem-remembrance" role="region" aria-labelledby="poem-remembrance-btn">
      <div class="poem-panel-inner">
        <div class="poem"><!-- real text only; see 01 §6 --></div>
      </div>
    </div>
  </li>
</ol>
```
(HTML ships **expanded** with `aria-expanded="true"` so no-JS readers see everything; the script
collapses on init.)

```css
.poem-trigger {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: baseline;
  gap: var(--s-4);
  width: 100%;
  min-height: var(--tap);
  padding-block: var(--s-5);
  border-block-end: var(--hairline) solid var(--border);
  text-align: start;
  color: var(--text);
  transition: color var(--dur-base) var(--ease-spring);
}
.poem-trigger:hover,
.poem-trigger[aria-expanded="true"] { color: var(--accent-text); }
.poem-chevron { width: var(--s-4); height: var(--s-4); transition: rotate var(--dur-base) var(--ease-spring); }
.poem-trigger[aria-expanded="true"] .poem-chevron { rotate: 180deg; }

[data-accordion].is-ready .poem-panel {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows var(--dur-slow) var(--ease-spring),
    visibility 0s linear var(--dur-slow);
}
[data-accordion].is-ready .poem-panel.is-open {
  grid-template-rows: 1fr;
  visibility: visible;
  transition-delay: 0s;
}
.poem-panel-inner { min-height: 0; overflow: hidden; }
.poem-panel-inner > .poem { padding-block: var(--s-6) var(--s-8); }
/* reduced motion: main.css kill switch already collapses the duration to 1 ms */
```

```js
(function () {
  'use strict';
  var list = document.querySelector('[data-accordion]');
  if (!list) return;
  var triggers = Array.prototype.slice.call(list.querySelectorAll('.poem-trigger[aria-controls]'));
  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
  function set(btn, open) {
    var panel = panelOf(btn);
    if (!panel) return;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.classList.toggle('is-open', open);
  }
  triggers.forEach(function (btn) {
    set(btn, false);
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      triggers.forEach(function (b) { if (b !== btn) set(b, false); });   // single-open
      set(btn, open);
      try { history.replaceState(null, '', open ? '#' + panelOf(btn).id : location.pathname + location.search); } catch (e) {}
    });
  });
  list.classList.add('is-ready');            // CSS collapses only after JS is alive
  // Deep link: blog.html#poem-remembrance opens that entry.
  var id = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
  var deep = id && triggers.filter(function (b) { return b.getAttribute('aria-controls') === id; })[0];
  if (deep) { set(deep, true); deep.scrollIntoView({ block: 'start' }); deep.focus({ preventScroll: true }); }
})();
```
- Flash of expanded content: deferred JS may run after first paint, so the list can render open and
  then snap shut. If that is visible, reuse the §3.1 trick: the head script adds
  `accordion-pending` to `<html>`, CSS collapses under `html.accordion-pending [data-accordion]
  .poem-panel` as well as `.is-ready`, and a `DOMContentLoaded` fail-safe removes
  `accordion-pending` if the accordion script never added `.is-ready` (so a broken script can never
  leave poems locked shut).
- Use `replaceState`, not `location.hash =` (which would jump-scroll; app.js only intercepts `<a>`).
- Do **not** put `data-stack-item` / `data-tilt` on these rows (01 §3).
- Optional: `hidden="until-found"` makes collapsed text findable with Ctrl/⌘+F (fires `beforematch`);
  support is uneven, so only as an enhancement.

Sources: [W3C APG Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/),
[APG accordion example](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/examples/accordion/),
[Keith J. Grant — Transitioning to height auto](https://keithjgrant.com/posts/2023/04/transitioning-to-height-auto/),
[CSS-Tricks — CSS Grid can do auto height transitions](https://css-tricks.com/css-grid-can-do-auto-height-transitions/),
[Chrome — animate to height: auto (interpolate-size)](https://developer.chrome.com/docs/css-ui/animate-to-height-auto),
[MDN ::details-content](https://developer.mozilla.org/en-US/docs/Web/CSS/::details-content),
[MDN hidden="until-found"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden).

---

## 8. About page: TL;DR block, "The Stack" pill grid, "Off-Screen"

**Naming collision:** `.stack` is already a layout utility in main.css (l.473) and `stack-card*`,
`data-stack*`, `data-stack-mode` belong to stack.js. Use `.skills`, `.skill-group`, `.pill-list`
for "The Stack".

```html
<section class="section about-tldr" aria-labelledby="tldr-title">
  <div class="container">
    <p class="eyebrow">01</p>
    <h2 class="section-title" id="tldr-title">The <em class="accent-word">TL;DR.</em></h2>
    <p class="tldr"><!-- ≤ 50 words, facts from about.html only --></p>
  </div>
</section>
```

```css
.tldr {
  max-width: 34ch;                 /* ~50 words ≈ 4–6 lines at this size */
  font-size: var(--fs-xl);
  line-height: var(--lh-snug);
  letter-spacing: var(--ls-tight);
  color: var(--text);
  text-wrap: pretty;
}
.skills {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: var(--s-7) var(--s-6);
}
.pill-list { display: flex; flex-wrap: wrap; gap: var(--s-2); margin: 0; padding: 0; list-style: none; }
.pill-list > li {
  padding: var(--s-1) var(--s-3);
  border: var(--hairline) solid var(--border-strong);
  border-radius: var(--r-pill);
  font-family: var(--font-mono);
  font-size: var(--fs-mono);
  letter-spacing: var(--ls-mono);
  text-transform: uppercase;
  color: var(--text-secondary);
  white-space: nowrap;
}
```
- Pills are not interactive → no hover lift (DESIGN.md: things that move are things you can do).
  If you want one highlight colour, give the group title a gold 2 px rule, not the pills.
- `minmax(min(100%, 16rem), 1fr)` prevents overflow at 320 px.
- A 50-word TL;DR at `--fs-xl` in ≤ 34ch lands around 6 lines on desktop; count words in review.
- Long tag "Accessibility basics (prefers-reduced-motion, ARIA labels)" is wider than 320 px with
  `nowrap` — allow wrapping on that pill or shorten the label.

---

## 9. Palette contrast (WCAG 2.x relative luminance, computed for this research)

| Foreground | Background | Ratio | Verdict |
| --- | --- | --- | --- |
| Soft White `#F2F2F2` | Pitch `#050505` | **18.21:1** | AAA any text |
| Warm Gold `#FFB300` | Pitch | **11.36:1** | AAA any text; great for accents/links |
| Pitch `#050505` | Warm Gold (gold button) | **11.36:1** | AAA → gold CTA with pitch label ✔ |
| Vibrant Orange `#FF4500` | Pitch | **5.92:1** | AA normal text (≥ 4.5), AAA only large (≥ 7 needed for normal) |
| Pitch | Orange (orange button) | 5.92:1 | AA — use dark text on orange |
| Soft White | Orange | **3.07:1** | ✘ fails for normal text; large text only (≥ 3) — never white on orange |
| Soft White | Gold | 1.60:1 | ✘ never |
| Orange | Gold | 1.92:1 | ✘ decoration only |
| Deep Crimson `#4A0A05` | Pitch | **1.30:1** | ✘ decoration only (glow/shadow), never text or a meaningful border |
| Soft White | Crimson | 14.03:1 | AAA (text on a crimson panel is fine) |
| Gold | Crimson | 8.75:1 | AAA |
| Orange | Crimson | 4.57:1 | AA borderline — avoid |
| Soft White / Gold / Orange | crimson-tinted `--bg-elevated` ≈ `#140605` | 17.7 / 11.1 / 5.8 | same verdicts as on pitch |
| `color-mix(soft-white 68%, pitch)` ≈ `#a6a6a6` | Pitch | 8.37:1 | AAA secondary text |
| `color-mix(soft-white 56%, pitch)` ≈ `#8a8a8a` | Pitch | 5.90:1 | AA tertiary text |

Non-text contrast (WCAG 1.4.11, ≥ 3:1): orange (5.92) and gold (11.36) both work as focus rings /
UI borders on pitch; crimson (1.30) does not. `::selection` in main.css is `--accent` background +
`--bg` text → orange + pitch = 5.92:1 ✔.

---

## 10. The Neighbourhood × Apple → concrete CSS guidance

**The Neighbourhood (the band's visual identity).** Since 2011 the band has insisted on black-and-white
everywhere (photos, videos, even refusing colour TV) — frontman Jesse Rutherford called it "our DNA"
(LA Weekly). Their covers lean on grain, blur, crushed blacks, high contrast, silhouettes, and a
found-in-a-shoebox film grit; the inverted-house logo is the recurring mark. Recent releases were
described as "cinematic and brooding… just shadows, silhouettes, and heartbreak."

**Apple product pages.** Huge, tightly-tracked headlines; one idea per viewport; lots of black space
around a single hero object; 17 px body copy; restrained, purposeful motion; pill CTAs.

Translate into this site:
1. **Monochrome first, colour as light.** Everything is pitch + soft-white; orange/gold appear only
   as *light sources* (glow, soundwave, CTA, focus). Crimson is only atmosphere (vignette, shadow).
2. **Photographs:** push the existing greyscale further for the noir look —
   `filter: grayscale(1) contrast(1.2) brightness(0.85)` at rest, colour back on hover (home.css
   already does the hover swap). The red-lit concert frames (.Feast, Diki Renada) and the red-backdrop
   portrait fit the palette when colour returns.
3. **Grain:** one fixed, static noise layer (SVG `feTurbulence` data URI, `type='fractalNoise'
   baseFrequency≈0.8 numOctaves=3 stitchTiles='stitch'`) at `opacity: .05–.08`,
   `mix-blend-mode: overlay`, `pointer-events: none`, hidden in `@media print`. Keep it static (an
   animated grain costs paint every frame; if animated, step a `transform: translate` with
   `steps()` and gate on reduced motion). Its z-index must be a token (e.g. `var(--z-overlay)`).
4. **Type scale:** Apple-like hero headline at `--fs-display` / `--fs-hero`, `--ls-display`
   (-0.035em), weight 500–600, `--lh-display`; body stays `--fs-base` (17 px). Eyebrows in mono
   uppercase (`.eyebrow`). One accent phrase per heading (`.accent-word`, DESIGN.md).
5. **Whitespace & rhythm:** one message per band; bump band padding (`calc(var(--section-y) * 1.25)`)
   on the drafts; keep content ≤ `--container` (1200px) and prose ≤ `--measure`.
6. **Motion:** one big moment (the intro), then quiet: reveals on `--ease-expo`, glows breathe slowly
   (5–6 s), nothing bounces. All gated twice for reduced motion.
7. **CTA:** gold pill (`--cta-bg`), pitch label, soft gold glow on hover; secondary actions are
   soft-white outline/ghost pills. Never more than one gold button per view.

Sources: [LA Weekly — The Neighbourhood are a black and white band](https://www.laweekly.com/the-neighbourhood-are-a-black-and-white-band-dammit/),
[Buzz Music — return to black & white with "ultraSOUND"](https://www.buzz-music.com/post/the-neighbourhood-ultrasound-three-part-release),
[Pixelation — why The Neighbourhood album covers look like that](https://pixelation.org/why-the-neighbourhood-album-covers-always-look-like-that-1mal),
[CSS-Tricks — Grainy gradients](https://css-tricks.com/grainy-gradients/),
[CSS-Tricks — Apple-style scrolling animations](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/).
