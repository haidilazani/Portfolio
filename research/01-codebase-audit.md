# 01 — Codebase audit (read before touching anything)

Audited: `/Users/a1234/Documents/Personal Project/Portfolio` on 2026-09-27, git HEAD `18be48a`
("Turn nav into a floating liquid-glass island"). Every line number below is from that commit.
The site is **vanilla HTML/CSS/JS, zero dependencies, no build step**. Local serve:
`python3 -m http.server 8899` from the project folder (README.md). Do not open via `file://`
(breaks `js/photos.js` paths and the contact `fetch`).

The name on the site is **"Aidil Azani"** (logo `aidil.`), not "Haidil". Keep the site's spelling.

---

## 1. `<head>` / `<script>` inventory per page

All pages share the same head skeleton (lines 1–40):

| Line | What | Notes |
| --- | --- | --- |
| 2 | `<html lang="en" class="no-js" data-theme="dark" data-motion="full">` | |
| 13–21 | **Inline, synchronous** seed script | Replaces `no-js` → `js` on `<html>`; sets `data-theme` from `localStorage.theme` (`'light'` else `'dark'`) and `data-motion` from `localStorage.motion` (`'reduced'` else `'full'`). This is the only render-blocking JS. |
| 23–26 | favicon.svg, site.webmanifest, two `theme-color` metas (`#060607` dark / `#f5f5f7` light) | app.js rewrites the first `theme-color` meta on theme change. |
| 28–31 | Google Fonts preconnect + one stylesheet: **Inter** (opsz 14–32, 100–900), **JetBrains Mono** 400/500, **Jost** 400–700, **Space Grotesk** 300–700, `display=swap` | |
| 33+ | Local CSS (below) | |
| ~40 | `<link rel="canonical">` pointing at the original page | Drafts should keep canonical → original **and** add `<meta name="robots" content="noindex">` (GitHub Pages deploys every file in the repo). |
| ~42–95 | OG/Twitter metas + JSON-LD | Harmless to copy. |

### CSS and JS per page (order matters)

| Page | CSS (in `<head>`, in order) | JS (end of `<body>`, all `defer`, none are modules) |
| --- | --- | --- |
| `index.html` | tokens, main, stack, tilt, hero, home (l.33–38) | app, stack, tilt, hero, home (l.677–681) |
| `about.html` | tokens, main (l.33–34) | app (l.346) |
| `blog.html` | tokens, main, stack, tilt (l.33–36) | app, stack, tilt (l.238–240) |
| `work.html` | tokens, main, stack | app, stack |
| `photography.html` | tokens, main | photos, app (photos.js first: it defines `window.PHOTOS`) |
| `404.html` | `/Portfolio/…` absolute paths | app |

**Draft pages:** link `css/draft-theme.css` **after** every existing stylesheet (so equal-specificity
rules win), and put `js/draft-intro.js` / accordion JS **after** the existing deferred scripts with
`defer` (deferred scripts execute in document order, after parsing, before `DOMContentLoaded`).

`<body>` classes: only `index.html` has `class="page-home"` (l.97). `home.css` scopes lots of rules
to `.page-home` — keep it on `draft-index.html`.

---

## 2. `css/tokens.css` — every custom property

Header rule (l.1–10): *"Every colour, space, size, radius, duration and layer … is declared here and
nowhere else."* Custom properties only, selectors limited to `:root` / `[data-theme]`.

### 2.1 Theme-dependent colour tokens

Declared on `:root` (dark default, l.15–98) and **re-declared** on `[data-theme="light"]` (l.105–171),
plus a print override (l.293–336).

| Token | Dark (`:root`) | Light (`[data-theme="light"]`) |
| --- | --- | --- |
| `color-scheme` | `dark` | `light` |
| `--bg` | `#060607` | `#f5f5f7` |
| `--bg-elevated` | `#121214` | `#ffffff` |
| `--bg-sunken` | `#0a0a0c` | `#ececf0` |
| `--surface` | `rgba(255,255,255,.045)` | `rgba(255,255,255,.72)` |
| `--surface-hover` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.95)` |
| `--text` | `#f5f5f7` | `#1d1d1f` |
| `--text-secondary` | `#a1a1a6` | `#51515a` |
| `--text-tertiary` | `#8a8a92` | `#6e6e73` |
| `--accent` (fills, borders, rings, glows) | `#2997ff` | `#0071e3` |
| `--accent-text` (accent-coloured TEXT only) | `#2997ff` | `#0066cc` |
| `--accent-soft` | `rgba(41,151,255,.14)` | `rgba(0,113,227,.10)` |
| `--accent-2` (decorative) | `#af52de` | `#9536c4` |
| `--border` | `rgba(255,255,255,.10)` | `rgba(0,0,0,.10)` |
| `--border-strong` | `rgba(255,255,255,.20)` | `rgba(0,0,0,.20)` |
| `--glass-bg` | `rgba(18,18,20,.55)` | `rgba(255,255,255,.55)` |
| `--glass-bg-solid` | `rgba(14,14,16,.72)` | `rgba(255,255,255,.78)` |
| `--glass-border` | `rgba(255,255,255,.12)` | `rgba(255,255,255,.65)` |
| `--glass-shadow` | `0 8px 32px rgba(0,0,0,.45)` | `0 8px 32px rgba(0,0,0,.10)` |
| `--island-bg` / `-sheen` / `-rim` / `-rim-soft` / `-shadow` | dark glass values (l.57–61) | light glass values (l.137–141) |
| `--inv-island-*` (5 tokens) | light glass values (l.62–66) | dark glass values (l.142–146) |
| `--danger` / `--danger-text` / `--danger-soft` | `#ff453a` / `#ff6961` / `rgba(255,69,58,.12)` | `#d70015` / `#d70015` / `rgba(215,0,21,.08)` |

**Inverse-band set** (`--inv-*`, l.81–97 dark, l.154–170 light) always holds the *other* theme:
`--inv-scheme`, `--inv-bg`, `--inv-bg-elevated`, `--inv-bg-sunken`, `--inv-surface`,
`--inv-surface-hover`, `--inv-text`, `--inv-text-secondary`, `--inv-text-tertiary`, `--inv-accent`,
`--inv-accent-text`, `--inv-accent-soft`, `--inv-border`, `--inv-border-strong`, `--inv-danger`,
`--inv-danger-text`, `--inv-danger-soft`. **In the dark theme these are LIGHT paper values
(`--inv-bg: #f5f5f7`, `--inv-text: #1d1d1f`).**

### 2.2 Theme-independent tokens (`:root`, l.177–285)

- `--paper: #f5f5f7` (sliding project word, `mix-blend-mode: difference`)
- Space: `--s-1` .25rem, `--s-2` .5rem, `--s-3` .75rem, `--s-4` 1rem, `--s-5` 1.5rem, `--s-6` 2rem,
  `--s-7` 3rem, `--s-8` 4rem, `--s-9` 6rem, `--s-10` 8rem, `--s-11` 12rem
- Rhythm: `--section-y: clamp(4rem,10vw,8rem)`, `--gutter: clamp(1.25rem,5vw,2.5rem)`,
  `--container: 1200px`, `--measure: 68ch`
- Type: `--fs-mono` .75rem, `--fs-xs` .8125rem, `--fs-sm` .9375rem, `--fs-base` 1.0625rem,
  `--fs-lg clamp(1.125rem,1.6vw,1.375rem)`, `--fs-xl clamp(1.5rem,2.4vw,2rem)`,
  `--fs-2xl clamp(2rem,4vw,3rem)`, `--fs-3xl clamp(2.5rem,6vw,4.5rem)`,
  `--fs-display clamp(3rem,9vw,7.5rem)`; poster scale `--fs-kicker` .75rem,
  `--fs-title clamp(1.75rem,2.6vw,2.5rem)`, `--fs-hero clamp(2.5rem,5.6vw,5.5rem)`,
  `--fs-roller`, `--fs-prose-xl clamp(1.625rem,3.4vw,3.25rem)`, `--fs-mega`,
  `--fs-poster clamp(5.5rem,13.5vw,13rem)`, `--fs-wordmark clamp(6rem,24vw,22rem)`
- Fonts: `--font-sans` Inter…, `--font-display` Space Grotesk…, `--font-mono` JetBrains Mono…,
  `--font-poster` Jost/Futura… (home.css l.42–45 points `--font-display` at Jost inside
  `.page-home main` and `.page-home .site-footer`)
- Line heights: `--lh-display 1.02`, `--lh-tight 1.12`, `--lh-snug 1.3`, `--lh-body 1.65`
- Letter spacing: `--ls-display -0.035em`, `--ls-tight -0.02em`, `--ls-normal 0em`, `--ls-mono 0.08em`
- Radii: `--r-sm 10px`, `--r-md 16px`, `--r-lg 24px`, `--r-xl 32px`, `--r-pill 999px`
- Motion: `--ease-spring cubic-bezier(.32,.72,0,1)`, `--ease-out cubic-bezier(.22,1,.36,1)`,
  `--ease-expo cubic-bezier(.19,1,.22,1)`, `--ease-island cubic-bezier(.34,1.32,.64,1)`,
  `--dur-fast 160ms`, `--dur-base 280ms`, `--dur-slow 600ms`, `--dur-morph 520ms`,
  `--dur-reveal 700ms`, `--dur-roll 900ms`
- Layers (the ONLY allowed z-indexes): `--z-canvas 0`, `--z-base 1`, `--z-sticky 100`,
  `--z-nav 200`, `--z-overlay 900`, `--z-modal 1000`

### 2.3 Derived channels in `css/main.css` (l.45–78)

`--hairline: 1px`, `--tap` (44px), `--island-top/-compact`, `--island-pad/-compact`,
`--island-gap/-compact`, `--nav-h` (≈4rem), `--nav-h-compact` (≈3.5rem), `--col-min` (16rem),
`--panel-w` (36rem), `--dot`, `--blur: 20px`.

### 2.4 Light/dark handling — THIS IS THE #1 PALETTE RISK

- No `prefers-color-scheme` media query in CSS. Theme is the `data-theme` attribute only.
- The head script defaults to `dark`, **but `js/app.js` `seedTheme()` (l.284–292) switches to
  `light` when nothing is stored and the OS prefers light**, and listens for OS changes.
  On a Mac in light mode the drafts would render in the LIGHT token set unless the draft theme
  overrides both themes.
- `[data-theme="light"]` has specificity (0,1,0) — same as `:root`. Because `draft-theme.css` loads
  later, use `:root, :root[data-theme="light"], :root[data-theme="dark"] { … }` (0,2,0 on the
  attribute variants) so the new palette wins in both themes.
- **Inverse bands:** on the home page `.band--invert` (home.css l.61–86) re-points `--bg`, `--text`,
  `--accent`, `--border`, `--island-*` etc. at `--inv-*`. In dark theme that is light paper, so the
  Work, About, Contact bands and the footer (`<footer class="site-footer band band--invert">`, l.639)
  would stay **light grey** unless the draft also overrides every `--inv-*` token (and
  `--inv-island-*`) with dark values. `.site-nav.is-inverted` uses the same set (app.js toggles it
  while the island floats over an inverse band, l.341–373).
- Recommendation: either hide the theme toggle (`[data-theme-toggle]`) in the drafts or make the
  light theme identical to the dark palette. Do not delete the button from `app.js` logic.

### 2.5 Which tokens the components actually consume (override map)

Counts are `var()` uses per file (main/home/hero/stack/tilt).

| Visual role | Tokens consumed | Where |
| --- | --- | --- |
| Page background | `--bg` | `body` (main.css l.102–121), `.band` (home.css l.50–57), `.hero::after` fade gradient (hero.css l.91–100), stack cards |
| Body text | `--text` (26/29/3/…), `--text-secondary` (22), `--text-tertiary` (21) | everywhere |
| Accent fills / rings / glows | `--accent` (11), `--accent-soft` (8) | focus ring `:focus-visible` (l.202–207, `outline: 2px solid var(--accent)`), `::selection` bg (l.217–222, text = `--bg`), `.btn-outline:hover`, `.pill-link--live`, tilt glare, **hero terrain canvas** |
| Accent text | `--accent-text` (13) | `.nav-logo span`, `.footer-brand span`, `.practice-logo > span`, `.prose a`, `.social-link:hover`, `a.post:hover` title |
| Primary button | `.btn-primary { background: var(--text); color: var(--bg) }` (l.863–871) | hover shadow `--accent-soft`. **Must be restyled to gold** in the draft. |
| Ghost / outline buttons | `--surface-hover`, `--border`, `--border-strong`, `--accent`, `--accent-soft`, `--accent-text` | l.873–893 |
| Cards / surfaces | `--surface`, `--surface-hover`, `--bg-elevated`, `--glass-*` | `.post`, `.post-status`, `kbd`, cmdk panel, glass fallback |
| Borders | `--border` (27), `--border-strong` (12), `--hairline` (34) | |
| Tags | `.tag` (l.899–912): `--border`, `--text-secondary`, `--font-mono`, `--r-sm` (home: radius 0) | |
| Nav island | `--island-bg/-sheen/-rim/-rim-soft/-shadow` | main.css l.589–740 |
| Hero outline marquee | `--marquee-stroke: color-mix(in srgb, var(--text) 58%, transparent)` | hero.css l.51 |
| Hero terrain canvas | **`--accent` and `--border` read from `<html>` computed style** by `hero.js readColors()` (l.452–457) and parsed through `ctx.fillStyle` | Keep these two as plain hex / rgba on `:root` (no `color-mix()`, which canvas may not parse → falls back to blue `#2997ff`). Setting `--accent: #FF4500` turns the contour peaks/ripples orange. |

Hard-coded colours outside tokens: only `#000` in a mask (main.css l.650–651, not visible),
`rgb(0 0 0 / …)` stack shadow (stack.css l.209) and the `color-mix` above. The system is almost
fully tokenised, so a token override does ~90% of the recolour.

---

## 3. Scroll handling, overlays, anything that can fight a scroll-locked intro

**There is NO smooth-scroll library** (no Lenis, Locomotive, GSAP/ScrollTrigger). No
`window.lenis`, no `history.scrollRestoration`, no `wheel`/`touch*` listeners anywhere.
All scripts are IIFEs; **no globals** except `window.PHOTOS` (photos.js) and opt-in hero debug
hooks (`window.__HERO_DEBUG__`, `__heroStats`, `__heroReset`). The intro cannot call into app.js.

| Thing | Where | Impact on intro |
| --- | --- | --- |
| `html { scroll-behavior: smooth }` (gated on no-preference) | main.css l.96–100 | `window.scrollTo(0,0)` would animate. Use `scrollTo({top:0,left:0,behavior:'instant'})`. |
| `body { overflow-x: clip; min-height: 100dvh }` | main.css l.102–121 | Don't set `overflow: hidden` on body inline — use a class; leaving `overflow-x: clip` intact matters for sticky. |
| `[id] { scroll-margin-block-start: calc(var(--nav-h) + var(--s-5)) }` | main.css l.123 | fine |
| **Overlay primitive** `createOverlay()` (cmdk + lightbox) | app.js l.857–1003 | Locks scroll with **inline** `root.style.overflow = 'hidden'` and restores the previous inline value; pads body/nav by scrollbar width and sets `--scrollbar-gap`. **inertBackground() sets `inert=true` on every `body` child except the overlay, and restoreBackground() sets `inert=false` on all of them unconditionally** (it does not remember a previous `inert`). If ⌘K is opened while the intro is up and then closed, it will **un-inert `main`**. → The intro must swallow ⌘/Ctrl+K while locked (capture-phase keydown on `window` + `stopPropagation()`), and should lock via a **class** on `<html>`, not the inline `style.overflow` that app.js saves/restores. |
| Command palette keydown (⌘/Ctrl+K) | app.js l.1291–1297 (listener on `document`, bubble) | see above |
| Nav scrolled / inverted state | app.js l.341–373 (passive `scroll` + `resize`, rAF-coalesced) | harmless |
| Scroll reveal `[data-reveal]` → `.is-revealed` | app.js l.461–485, IO threshold .12, rootMargin `0px 0px -8% 0px`; CSS main.css l.541–570 (`opacity:0` until revealed, `.no-js` shows all) | IO ignores occlusion, so nothing below the fold reveals early; fine. |
| Count-up `[data-count]` | app.js l.487–567, IO threshold .6 | fine |
| Page transitions | app.js l.570–700: same-origin link clicks add `body.page-exit` and navigate after 260 ms (skipped for reduced motion / modifier clicks / `data-no-transition`); same-document hash links are scrolled with `scrollIntoView` | Draft links are same-origin → work fine. |
| Magnetic buttons `[data-magnetic]` | app.js l.700+ (document pointermove, rAF) | harmless |
| **Hero terrain** | hero.js: IO on `[data-hero]` keeps it "visible" under an overlay → ambient ~30 fps redraw (`AMBIENT_MS 34`) keeps running; pointer listeners are on `.hero` so the overlay blocks ripples; entrance sweep `ENTRANCE_MS 900` runs at boot | Runs invisibly under the intro. Acceptable; no API to pause it. |
| **Hero dial** `[data-dial]` | hero.js l.108–310: builds only if `performance.now() <= LATE_BOOT_MS (1200)`; settles by timer `total+260ms` and then collapses to plain text | Rolls (unseen) under the intro. Won't replay after dismissal. |
| **Hero CSS entrance** | hero.css l.413–462: `hero-rise`/`hero-fade` on `.hero-eyebrow, .hero-title, .hero-lede, .hero-actions, .hero-hint, .hero-down`, delays 120–880 ms, `animation-fill-mode: both`; switched on by `html[data-motion="full"] .hero` | Finishes under the overlay. To replay the entrance on reveal: `html.intro-pending .hero * { animation-play-state: paused !important }` (see 02 §3). |
| Marquee rows | home.js l.83–95 pause via IO (`.is-paused`) — still "intersecting" under the overlay | CPU only. The pause rule above also freezes them. |
| home.js scroll handler (`--slide`, about paragraph highlight) | home.js l.186–300, passive scroll + resize, IO-gated | harmless |
| stack.js (sticky card stacking) | Needs ≥2 `[data-stack-item]`; uses CSS scroll-driven `animation-timeline: scroll(root block)` when supported, else a passive scroll listener; measures `docTop` at init and on resize (ResizeObserver) | **Accordion rows must NOT carry `data-stack-item`/`data-tilt`** (sticky + height changes = broken stack). On the draft writing page either drop those attributes or don't load stack.js/tilt.js. |
| tilt.js | `[data-tilt]` pointer springs; writes only `--tilt-*` | harmless; uses `transform-style: preserve-3d` (opacity/filter on the card flattens it) |
| Reduced-motion kill switch | main.css l.1970–2024: under `@media (prefers-reduced-motion: reduce)` **and** `:root[data-motion="reduced"]`: `animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; delays 0; scroll-behavior: auto` | The soundwave stops after 1 ms (good); the intro fade takes 1 ms and `transitionend` still fires (by design). Keep a timeout fallback anyway. |
| Motion preference source of truth | `html[data-motion]` (`full`/`reduced`); head script defaults to `full`; app.js `seedMotion()` (l.233–240) corrects to `reduced` from the OS unless the user stored a choice; fires `window` `motionchange` event | Intro JS: `reduced = root.dataset.motion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches`. |

Init order (all `defer`, document order): app.js (seeds motion + theme immediately, then
`init()` on DOMContentLoaded or immediately if parsed) → stack.js → tilt.js → hero.js → home.js →
**draft-intro.js (put it last)**. All run before `DOMContentLoaded`, before `load`.

---

## 4. `index.html` structure (home)

- l.99 `<a class="skip-link" href="#main">` (z-index `--z-modal`)
- l.101–131 **Nav**: `<header class="site-nav" data-nav>` → `<nav class="nav-inner" aria-label="Primary">`
  → `.nav-logo` (`aidil<span>.</span>`, `aria-current="page"` on home) → `<ul class="nav-links">`
  with `<li class="nav-indicator" aria-hidden="true">` + Work/About/Writing/Photography links
  (`work.html`, `about.html`, `blog.html`, `photography.html`) → `.nav-actions`:
  `.cmdk-trigger[data-cmdk-open]` (Search ⌘K), `.icon-btn[data-motion-toggle]`,
  `.icon-btn[data-theme-toggle]`. app.js sets `aria-current` itself by URL match, so draft nav links
  pointing to draft files get the active state automatically.
- l.133 `<main id="main">`
- l.141–182 **Hero** `<section class="hero band" data-hero aria-labelledby="hero-title">`:
  `canvas.hero-canvas[data-hero-canvas]`; `.hero-stage` with two `.marquee[data-marquee]` rows
  ("aidil azani." ×6 each) and `a.round-btn.hero-down[href="#practice"][data-magnetic]`;
  `.hero-inner.container` → `.hero-heading` → `p.hero-eyebrow` "Frontend developer · CS @ UiTM Shah
  Alam · Open to internships" + `h1.hero-title#hero-title` "A remembrance of<br><em class="accent-word"
  data-dial>who I was.</em>"; `.hero-aside` → `p.hero-lede` "I was lost in the vast space, in search of my
  soul, and somewhere along the way I started building for the web: by hand, with no framework and no
  build step." → `.hero-actions`: `a.btn.btn-primary[href="work.html"][data-magnetic]` "View my work",
  `a.btn.btn-ghost[href="#contact"]` "Get in touch" → `.hero-hint` (move / click kbd).
  hero.js measures `.hero-eyebrow, .hero-title, .hero-lede, .hero-actions, .proof-bar` inside
  `.hero-inner` to carve the terrain basin — keep those class names on the new headline/teaser.
  `.hero` already uses `::after` (bg fade, z-index 1); **`.hero::before` is free** for the ambient glow.
- l.187–227 **Practice** `.band.practice#practice`: keyword roller (Frontend. / Canvas 2D. /
  Photography. / Writing.), `.dash-grid`, `a.round-btn[href="#work"]`.
- l.235–447 **Work** `.band.band--invert.work#work`: `header.work-intro` (`h2.kicker#work-title`
  "Selected work.", sub "Three things I built and can still explain line by line…"), then three
  `article.work-item` (sticky rail + photo + case grid + sliding outlined word).
- l.450–493 **Stats** `.band.stats` (2023 / 1,155 / 1,390 / 0 with `data-count`).
- l.496–528 **About teaser** `.band.band--invert.about#about` (`p.about-lead[data-highlight]`).
- l.531–565 **Writing teaser** `.band.writing#writing` (2 planned posts, `data-stack-item data-tilt`).
- l.570–635 **Contact** `.band.band--invert.contact#contact`: `form.contact-form` (Formspree
  placeholder `YOUR_FORM_ID`; app.js falls back to mailto), `aside.contact-aside` with
  `[data-copy="haidilazani@gmail.com"]` and social links.
- l.639–651 **Footer** `<footer class="site-footer band band--invert">` (links + `.footer-brand`).
- l.655–676 `div.cmdk[data-cmdk][hidden]` — static `.cmdk-list` links point at the **original**
  pages; app.js also harvests `.nav-links a`, `.site-footer a`, `.project-links a` etc. into the
  palette. In drafts, update these hrefs to the draft pages.

### 4.1 Flagship project content (all three are real; do not invent more)

| # | Title | Label | One-liner (site copy) | Tags | Image (webp/jpg, `images/optimized/`) | Links |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | GeoTour, a semantic tourism recommendation system | 2026 · Final-year project, Flask + NLP | A travel search engine that understands "quiet mountain ruins" instead of matching keywords: BERT embeddings over a 1,155-site UNESCO World Heritage dataset, plus an ontology graph you can explore. | Python, Flask, SQLAlchemy, sentence-transformers, NetworkX, pandas | `petronas-towers-800/1600` (800×1066), alt "The Petronas Twin Towers at night…", caption "Kuala Lumpur, 2025. Photograph by Aidil." | Repo only: https://github.com/haidilazani/FYP-1 ("Read the source"). No Outcome claimed on purpose. |
| 02 | This portfolio | 2026 · Personal site, vanilla web | Six pages, 9,950 lines, 103 KB gzipped of hand-written HTML, CSS and JavaScript: no framework, no bundler, no dependencies, including a topographic contour background drawn with marching squares. | HTML, CSS custom properties, JavaScript (ES6), Canvas 2D, GitHub Pages | `mount-jerai-sky-400/800` (800×1066), caption "Mount Jerai, 2024." | Live https://haidilazani.github.io/Portfolio/ + repo https://github.com/haidilazani/Portfolio |
| 03 | Buttermax, a WebGL design study | 2026 · Front-end study, raw WebGL | A four-page, dependency-free reinterpretation of an Awwwards-winning studio site, including a hand-written fragment shader with fbm domain warping and a Lenis-style inertia scroller, built to learn how that class of site is made. | JavaScript, WebGL / GLSL, HTML, CSS | `baskara-on-the-mic-800/1600` (800×1366), caption "Baskara on the mic, 2023." | Live https://haidilazani.github.io/Assignment/ + repo https://github.com/haidilazani/Assignment |

External links use `target="_blank" rel="noopener"` and class `pill-link pill-link--live|--repo`.
`work.html` has the same three as full `.case` articles (with `data-stack-item`).

---

## 5. `about.html` — full current content (restructure, don't invent)

- l.109–145 Bio: `figure.about-figure` → `images/optimized/about-800.webp` (800×800,
  `fetchpriority="high"`, alt "Aidil Azani, photographed close up against a plain background").
  `h1.section-title` "The longer <em class="accent-word">version.</em>". Three `.prose` paragraphs:
  1. "I'm Aidil, a computer science student at UiTM Shah Alam. I chose this path not knowing it would
     burn my brain and soul, yet I'm still standing here, and somewhere along the way it became mine."
  2. 2022 small freelance jobs as a junior developer; 2023 joined **JustSimple Sdn. Bhd.** as a frontend
     developer (WordPress + Elementor client sites, custom CSS); now finishing the degree (data
     science, machine learning, software engineering coursework); FYP = tourism recommendation system in
     Flask searching UNESCO World Heritage sites by meaning using BERT sentence embeddings over an
     ontology of place categories.
  3. Cares about calm, intentional interfaces: clean type, honest spacing, motion that earns its
     place; likes knowing what every line does, hence no framework/bundler/dependencies; contour map is
     ~1,390 lines of marching squares + value noise; "When I'm not coding I'm behind a camera" → link
     to Photography.
  (Note: paragraph 3 says "The contour map breathing behind this text" but about.html loads no hero
  canvas — stale copy; don't repeat that sentence on the draft About.)
- l.149–167 `#facts` `ul.proof-bar`: **0** npm packages/bundlers/frameworks · **103 KB** gzipped over
  the wire · **1,390** lines of vanilla JS behind the contour terrain.
- l.171–205 `#experience` `ol.timeline`: Present — UiTM Shah Alam, Computer Science student (FYP:
  GeoTour) · 2023–2024 — JustSimple Sdn. Bhd., Frontend Developer · 2022–2023 — Freelance, Junior
  Developer (business sites, landing pages).
- l.210–275 `#toolbox` "What I reach for." — four `.toolbox-group` with `ul.project-stack > li.tag`:
  - **Languages:** JavaScript (ES6), HTML, CSS, Python, SQL, GLSL
  - **Frontend:** Vanilla JS & DOM, Canvas 2D, WebGL shaders, Responsive CSS / custom properties,
    CSS animation & scroll-driven motion, Accessibility basics (prefers-reduced-motion, ARIA labels),
    WordPress, Elementor, Figma
  - **Tooling:** Git & GitHub, GitHub Pages, Vercel, VS Code, pip / virtualenv
  - **Other:** Flask, SQLAlchemy, SQLite & PostgreSQL, sentence-transformers / BERT embeddings, pandas,
    NumPy, NetworkX, Jinja templating, Photography
- l.278–290 `#now`: finishing the CS degree at UiTM Shah Alam, building GeoTour, rebuilding this site
  by hand again, "Behind a camera whenever the light is right."
- l.295–304 CTA: "Open to internships and freelance." / "Malaysia or remote. I am based in Shah Alam,
  Selangor." / `a.btn.btn-primary[href="index.html#contact"][data-magnetic]` "Get in touch".
- Footer l.308–320 (plain `.site-footer`, brand first), cmdk l.323–343, `js/app.js` only.

**Material for "Off-Screen"** (all already public on the site):
- Photography, 2023–2026: "Concerts, architecture, and the people I happened to be standing next
  to" (photography.html `section-sub`). Concert frames: .Feast (2023, "deep red stage light"),
  Baskara Putra (2023), Diki Renada's solo (2023, "red stage lights burning through the smoke"),
  architecture (Petronas Towers 2025, Merdeka 118 2024), mountains (Mount Jerai night sky 2024,
  sunrise above the cloud line 2024), campus life (post-presentation, convocation steps, Amer — 2026),
  Pasar Besar tapir sign (2024). Image slugs in `js/photos.js` / `images/optimized/`.
  The `about-800` portrait alt in photos.js: "Portrait of Aidil Azani in a black suit … against a deep
  red backdrop" — it already matches the crimson palette.
- Writing (the six planned posts), and the phrase "Photographer when the light is right."
- The owner has also said elsewhere that he curates Spotify playlists (music curation). This is **not
  on the site yet** — only use it if the user confirms.

---

## 6. The Writing / Poetry page = `blog.html` (confirmed)

- Title "Writing - Aidil Azani"; nav label "Writing" → `blog.html` on every page.
- l.113–179: `h1.section-title` "What I'm <em class="accent-word">writing.</em>" + sub "Six posts in
  the queue and none of them published yet, so none of them is a link…". `div.post-list` with **six
  `article.post.post--planned[data-stack-item][data-tilt][data-reveal]`**, each `p.post-status`
  "Planned" + `h2.post-title` + `p.post-blurb`:
  1. Drawing an interactive topographic map in vanilla JS
  2. Building this portfolio with only HTML, CSS & JS
  3. Teaching a search box what "quiet mountain ruins" means
  4. What a year of client work taught a CS student
  5. Photography made me a better designer
  6. A remembrance of who I was — "The story behind the words on my home page. Still being written,
     like its author."
- l.183–196 CTA "Want one of these sooner?" with `btn-primary` → `index.html#contact` and
  `btn-outline` → GitHub.
- Loads app.js, stack.js, tilt.js.

**There are NO poems anywhere** — not in blog.html, not in any JS/data file, and not in git history
(searched all 5 commits for poem/poetry/stanza/verse/puisi/sajak; the first commit's blog had four dated
essay stubs, no poem text). The only poetic copy on the site is the hero headline "A remembrance of
who I was.", the hero lede, the About opener, and the photography title "Through eyes we see, through
mind we remember." **Developer must not invent poems** (DESIGN.md "Honest-absence states"). Build the
index + accordion with real entries (the six planned pieces, revealing their existing blurb) and a
clearly marked slot for poem text, and ask the user for the actual poems.

---

## 7. Nav, footer, selectors the drafts must not break

- Every page: same nav markup; footer `.site-footer` (home adds `band band--invert` and puts the brand
  last). Footer links: work, about, blog, photography, `mailto:haidilazani@gmail.com`.
- Draft cross-links: logo + nav + footer + cmdk list + in-page CTAs (`index.html#contact` →
  `draft-index.html#contact`, `work.html` stays original unless a draft-work exists).
- JS hooks (keep exact spelling): `.site-nav`, `.nav-inner`, `.nav-links`, `.nav-indicator`,
  `[data-theme-toggle]`, `[data-motion-toggle]`, `[data-cmdk]`, `[data-cmdk-open]`, `.cmdk-panel`,
  `.cmdk-input`, `.cmdk-list`, `.cmdk-empty`, `[data-reveal]` + `--reveal-i`, `[data-count]`,
  `[data-magnetic]`, `[data-copy]`, `.contact-form` + `.field-input/-label/-error` + `.form-status`,
  `.band--invert` (nav inversion probe), `[data-hero]`, `[data-hero-canvas]`, `.hero-inner` (+ the
  TEXT_SEL classes), `[data-dial]`, `[data-marquee]`, `[data-roller]` + `.roller-col`, `[data-slide]`,
  `[data-highlight]`, `.stat-num`/`.stat-echo`, `[data-stack-item]`, `[data-tilt]`,
  `[data-photo-grid]`, `[data-lightbox]`. Every lookup is null-guarded, so removing a section is safe;
  renaming a hook silently kills its feature.
- The ⌘K palette dedupes by URL and harvests `.nav-links a`, `.site-footer a`, `.contact-aside a`,
  `.project-links a`, `.case a`, `.cmdk-list a`, `[data-cmdk-item]`.

---

## 8. DESIGN.md essentials the Developer must respect

1. **Tokens only.** No hard-coded colour/spacing/font-size outside `tokens.css`; only `--hairline` and
   `--blur` are literal in main.css; no raw rem in component rules; z-index only from the six layer
   tokens. → Structure `draft-theme.css` as a *token layer* (palette primitives declared once at the
   top, e.g. `--c-pitch`, `--c-crimson`, `--c-orange`, `--c-gold`, `--c-soft-white`) and have every
   component rule reference tokens.
2. **No dead links** (`href="#"` forbidden). Planned things are `<article>`, private links are
   `<span class="pill-link pill-link--private">`. Never claim an outcome you can't back up.
3. **Every animation gated twice:** `@media (prefers-reduced-motion: reduce)` AND
   `:root[data-motion="reduced"]` in CSS; `isReduced()` + `motionchange` in JS.
4. `--accent-text` for accent-coloured text, `--accent` for fills. White on accent is banned.
5. Everything interactive has hover, active and `:focus-visible`, eased on `--ease-spring`.
6. Guard every DOM lookup; a page without the markup is a silent no-op.
7. One `<h1>` per page; `.accent-word` only inside `.hero-title` / `.section-title` (one per heading).
8. Reveal contract: `data-reveal` + `style="--reveal-i: N"` where N = hierarchy (0 = section head),
   not source order; `data-reveal="fade"` for media.
9. Motion vocabulary: `--ease-spring` for physical state changes, `--ease-out` for opacity/atmosphere,
   `--ease-expo` for the long home-page settle; durations from the `--dur-*` tokens.
10. Home-page shape rule: things you press are round (`.btn`, `.pill-link`, `.round-btn`), surfaces
    are square (photos, `.post`, `.tag`, `.post-status`). Photos are greyscale at rest, colour on hover.
11. Glass fallbacks are mandatory (`@supports not (backdrop-filter…)` and
    `prefers-reduced-transparency`).
12. Property-ownership contract: stack owns `position/scale/filter/opacity`, tilt owns
    `rotate/translate/background-image` on the same card — never write `transform` on `[data-tilt]`
    / `[data-stack-item]` elements.

---

## 9. Broken or risky things noticed

1. **OS light mode flips the drafts to the light palette** (app.js seedTheme). Override both themes
   and the `--inv-*` set, or the home bands stay light.
2. **⌘K + intro inert conflict** (app.js restoreBackground un-inerts all body children).
3. **Deep links** such as `draft-index.html#contact` (the About/Writing "Get in touch" CTAs) would be
   locked at the top by a naive intro → skip the intro when `location.hash` is present.
4. `html { scroll-behavior: smooth }` makes a plain `scrollTo(0,0)` animate.
5. Hero entrance + dial + terrain sweep all finish under the overlay unless paused.
6. `blog.html` rows are sticky stacking cards; an accordion inside them will fight stack.js.
7. about.html copy "The contour map breathing behind this text" is stale (no canvas on that page).
8. Contact form action is still `https://formspree.io/f/YOUR_FORM_ID` (mailto fallback in app.js).
9. `data-motion="full"` is the head-script default even for OS reduced-motion users until app.js
   runs; CSS still protects them through the `@media` kill switch, but JS in the intro must check
   both the attribute and `matchMedia`.
10. `hero.css` `--marquee-stroke` uses `color-mix()` — fine in CSS, but never feed `color-mix()` into
    `--accent`/`--border` because hero.js parses those for canvas.
11. `404.html` uses absolute `/Portfolio/…` paths (GitHub Pages sub-path) — local server at root
    shows it unstyled; not a draft concern.
