# Research — draft redesign (Apple × The Neighbourhood)

Shared research folder for every sub-agent (Developer, Code-reviewer, Debugger, Test-runner,
Docs-writer). Written 2026-09-27 against git HEAD `18be48a`. Nothing in the existing site was
modified; these files are the only additions.

| File | What it contains |
| --- | --- |
| [`01-codebase-audit.md`](01-codebase-audit.md) | Script/stylesheet inventory per page, every token in `css/tokens.css` and which components consume it, all scroll/overlay/animation code the intro must coordinate with, full current content of `index.html` (hero + 3 projects), `about.html` and `blog.html`, JS selector hooks not to break, DESIGN.md rules, risks. |
| [`02-techniques.md`](02-techniques.md) | Token override block for `css/draft-theme.css`; scroll-lock, input detection, fade/unlock sequence with a tested reference `draft-intro.js`; stage-light vignette; soundwave bars; editorial/poetry typography; APG accordion with a tested reference script; About pill grid + TL;DR; computed WCAG contrast table; The Neighbourhood × Apple CSS guidance. Every section cites its sources. |

The two reference scripts in `02-techniques.md` (§3.4 intro, §7 accordion) were syntax-checked with
Node 22 and exercised in jsdom (wheel threshold, inertia swallowing + release, swipe threshold,
ArrowDown/Escape/Tab, ⌘K blocked, inert restore, focus to `#hero-title`, deep-link open,
single-open toggling). All CSS snippets parse cleanly (css-tree). They still need a real-browser
pass (Debugger/Playwright).

## Developer quick-start (the 15 things that matter)

1. **Writing/Poetry page = `blog.html`** (nav label "Writing"). It holds six `article.post.post--planned`
   essays, all unpublished. **There are no poems anywhere in the repo or its git history.** Do not
   invent any: build the index + accordion from the six real entries (blurb as the revealed text)
   with a marked slot for poem text, and get the actual poems from the user.
2. **Override tokens, not components.** Put the palette in a token block at the top of
   `css/draft-theme.css` using `:root, :root[data-theme="dark"], :root[data-theme="light"]` — app.js
   flips `<html data-theme>` to `light` when the OS is in light mode (02 §0).
3. Tokens to override: `--bg`, `--bg-elevated`, `--bg-sunken`, `--surface(-hover)`, `--text`,
   `--text-secondary`, `--text-tertiary`, `--accent`, `--accent-text`, `--accent-soft`, `--accent-2`,
   `--border(-strong)`, `--glass-*`, `--island-*`, and **every `--inv-*` + `--inv-island-*`**
   (otherwise the Work/About/Contact bands and the home footer stay light grey).
4. **`--accent` and `--border` must be plain hex/rgba** — `js/hero.js` reads them from `<html>` to
   colour the terrain canvas (`--accent: #FF4500` makes the contour peaks orange).
5. **Gold CTA:** `.btn-primary` currently paints `--text` on `--bg`; re-point it to gold `#FFB300`
   with a `#050505` label (11.36:1). Never white text on orange (3.07:1) or on gold (1.60:1);
   crimson `#4A0A05` is decoration only (1.30:1 on black).
6. **No smooth-scroll library exists** (no Lenis/GSAP; no `window.lenis`). The only scroll
   interference is `html { scroll-behavior: smooth }` (main.css l.96–100): reset to top with
   `scroll-behavior` temporarily `auto`.
7. **Lock scroll with a class on `<html>`**, not inline `style.overflow` — app.js's cmdk/lightbox
   overlay saves and restores the inline value and its `restoreBackground()` sets `inert=false` on
   every body child. Swallow ⌘/Ctrl+K in a capture-phase `window` keydown while the intro is up.
8. **Intro must never trap:** inline head script adds `html.intro-pending` (skip when `location.hash`
   exists, e.g. `draft-index.html#contact`); a `DOMContentLoaded` fail-safe removes it if
   `draft-intro.js` didn't add `intro-ready`. No JS → no overlay (02 §3.1).
9. Detect intent with `wheel` (`{passive:false}`, `deltaY > 4`, ignore `ctrlKey`), single-finger
   swipe-up > 36 px (`touchmove` `{passive:false}`), keys ArrowDown/PageDown/Space/End (+Escape),
   and a focused "Come closer" `<button>`. Keep swallowing input for 260 ms of silence after the fade
   so trackpad inertia doesn't overshoot the Hero.
10. Overlay: `z-index: var(--z-overlay)` (900; nav is 200, cmdk 1000). Inert the rest of `<body>`,
    restore each element's previous `inert`, then focus `#hero-title` (`tabindex="-1"`).
11. Pause the Hero's CSS entrance under the overlay with
    `html.intro-pending:not(.intro-leaving) .hero * { animation-play-state: paused !important }` so it
    plays as the intro fades. The dial (`[data-dial]`) won't replay (hero.js `LATE_BOOT_MS 1200`).
12. **Selectors not to break:** `.site-nav`, `.nav-inner`, `.nav-links`, `.nav-indicator`,
    `[data-theme-toggle]`, `[data-motion-toggle]`, `[data-cmdk]`/`[data-cmdk-open]`, `[data-reveal]`
    + `--reveal-i`, `[data-hero]`, `[data-hero-canvas]`, `.hero-inner` with `.hero-eyebrow/.hero-title/
    .hero-lede/.hero-actions` (hero.js carves the terrain around them), `[data-dial]`, `.band--invert`,
    `.contact-form` fields, `[data-copy]`. Keep `class="page-home"` on the draft home `<body>`.
13. **Don't reuse `.stack`** for "The Stack" (main.css utility; `stack-card*`/`data-stack*` belong to
    stack.js) — use `.skills` / `.pill-list`. Don't put `data-stack-item`/`data-tilt` on accordion rows.
14. Flagship work = the only three real projects: **GeoTour** (repo only, no outcome claimed),
    **This portfolio** (live + repo), **Buttermax WebGL study** (live + repo); titles, one-liners,
    tags, images and links are tabled in 01 §4.1. About content (bio, timeline, 4 tool groups,
    Now, photography subjects) is transcribed in 01 §5 — restructure it, don't add facts.
15. DESIGN.md rules still apply to drafts: tokens only, z-index only from the six layer tokens, no
    `href="#"`, one `<h1>`, `.accent-word` only in `.hero-title`/`.section-title`, every animation gated
    by both `@media (prefers-reduced-motion: reduce)` and `:root[data-motion="reduced"]`, hover +
    active + focus-visible on everything interactive. No serif font (DESIGN.md), even for poems.

Draft hygiene: link `css/draft-theme.css` after all existing CSS and the new JS after the existing
deferred scripts; add `<meta name="robots" content="noindex">`; point draft nav/footer/cmdk links and
in-page CTAs (`index.html#contact`) at the draft pages; serve with `python3 -m http.server 8899`.

## Open questions for the user (main agent to ask)

- Real poem texts (titles, dates, full text) for the Writing page — none exist yet.
- Intro copy is used verbatim ("come closer and see what inside") — keep, or "what's inside"?
- Show the intro on every load, or once per tab session (`sessionStorage` flag ready in 02 §3.1)?
- "Off-Screen": the site only documents photography (concerts, architecture, mountains, campus life).
  The owner has mentioned curating Spotify playlists elsewhere — include music only if he confirms.
