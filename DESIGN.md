# Design system

The reference for this site's visual language, derived from the shipped code.
Every value below is read out of `css/tokens.css`, `css/main.css`,
`css/hero.css`, `css/home.css`, `js/app.js` and `js/home.js` as they stand. If a value here disagrees with
the code, the code is right and this file is stale.

- **Tokens:** `css/tokens.css` — custom properties only, no selectors beyond
  `:root` and `[data-theme]`.
- **Base, layout and components:** `css/main.css`, 22 numbered sections.
- **Hero:** `css/hero.css` (linked from `index.html` only).
- **Home page below the hero:** `css/home.css` and `js/home.js` (linked from
  `index.html` only). See **The home page** below.

## Direction

**Topography.** Terrain is the organising metaphor. The hero renders a live
contour map — a scalar elevation field sampled on a grid and traced with
marching squares, with the cursor added as a spring-damped Gaussian hill so
the rings bulge around the pointer. The rest of the site inherits the logic:
content sits in layers, a section is an elevation, and the reveal stagger
reads like one surface settling rather than a list of elements arriving.

The palette is **dark-first**, with light as a deliberate second theme rather
than an inversion. Restraint is the point: one accent, one shape system, one
focus ring, one animation curve family. Surfaces that float — the scrolled
nav, the command palette, the lightbox — use a **liquid-glass** material:
backdrop blur plus saturation, a translucent fill, a hairline border and a 1px
inner top highlight that reads as edge refraction. This is a CSS approximation
of a frosted material, not Apple's Liquid Glass, and `tokens.css` says so.

**The home page is a poster layer on top of that system** (after litup.fr):
strict full-width bands that alternate between the theme's own ground and its
inverse, Jost as the display voice, huge outlined words as the one decorative
device, stacked uppercase labels over 2px rules, two-line bold titles and
greyscale photographs that regain colour under the pointer. The terrain,
dial, tilt, stacking and reveal systems all carry over unchanged; the
layer changes layout, heading treatment and image placement only. Every other
page still renders the base system.

## Tokens

### Colour — dark (`:root`, default)

`color-scheme: dark`. Contrast ratios are the ones recorded in the file,
measured against `--bg`.

| Token | Value | Note |
| --- | --- | --- |
| `--bg` | `#060607` | |
| `--bg-elevated` | `#121214` | |
| `--bg-sunken` | `#0a0a0c` | |
| `--surface` | `rgba(255,255,255,0.045)` | |
| `--surface-hover` | `rgba(255,255,255,0.08)` | |
| `--text` | `#f5f5f7` | 18.6:1, AAA |
| `--text-secondary` | `#a1a1a6` | 7.87:1, AAA |
| `--text-tertiary` | `#8a8a92` | 5.91:1, AA |
| `--accent` | `#2997ff` | 6.72:1 — fills, borders, rings, glows |
| `--accent-text` | `#2997ff` | any accent-coloured **text** |
| `--accent-soft` | `rgba(41,151,255,0.14)` | |
| `--accent-2` | `#af52de` | decorative only, never carries text |
| `--border` | `rgba(255,255,255,0.10)` | |
| `--border-strong` | `rgba(255,255,255,0.20)` | |
| `--glass-bg` | `rgba(18,18,20,0.55)` | |
| `--glass-bg-solid` | `rgba(14,14,16,0.72)` | |
| `--glass-border` | `rgba(255,255,255,0.12)` | |
| `--glass-shadow` | `0 8px 32px rgba(0,0,0,0.45)` | |
| `--danger` | `#ff453a` | fill/border |
| `--danger-text` | `#ff6961` | 7.09:1, AAA |
| `--danger-soft` | `rgba(255,69,58,0.12)` | |

The accent is split into a fill colour and a text colour on purpose. In dark
they happen to be equal; in light they are not. Use `--accent-text` for text,
always, so the split survives a theme switch.

### Colour — light (`[data-theme="light"]`)

`color-scheme: light`. Not an inversion: glass gets more body, borders flip to
warm black, and the accent splits into a fill and a darker text colour that
passes AA.

| Token | Value | Note |
| --- | --- | --- |
| `--bg` | `#f5f5f7` | |
| `--bg-elevated` | `#ffffff` | |
| `--bg-sunken` | `#ececf0` | |
| `--surface` | `rgba(255,255,255,0.72)` | |
| `--surface-hover` | `rgba(255,255,255,0.95)` | |
| `--text` | `#1d1d1f` | |
| `--text-secondary` | `#51515a` | |
| `--text-tertiary` | `#6e6e73` | 4.72:1, AA |
| `--accent` | `#0071e3` | fills only |
| `--accent-text` | `#0066cc` | 5.11:1, AA — all accent-coloured text |
| `--accent-soft` | `rgba(0,113,227,0.10)` | |
| `--accent-2` | `#9536c4` | |
| `--border` | `rgba(0,0,0,0.10)` | |
| `--border-strong` | `rgba(0,0,0,0.20)` | |
| `--glass-bg` | `rgba(255,255,255,0.55)` | |
| `--glass-bg-solid` | `rgba(255,255,255,0.78)` | |
| `--glass-border` | `rgba(255,255,255,0.65)` | |
| `--glass-shadow` | `0 8px 32px rgba(0,0,0,0.10)` | |
| `--danger` | `#d70015` | |
| `--danger-text` | `#d70015` | 4.86:1, AA |
| `--danger-soft` | `rgba(215,0,21,0.08)` | |

### Colour — inverse band (`--inv-*`)

Declared in both theme blocks, always holding the *other* theme's values: in
dark they are the light values above (with a darker `--inv-surface`,
`rgba(0,0,0,0.035)`, so fields read on paper), in light they are the dark
values. `.band--invert` in `css/home.css` re-points `--bg`, `--bg-elevated`,
`--bg-sunken`, `--surface`, `--surface-hover`, `--text`, `--text-secondary`,
`--text-tertiary`, `--accent`, `--accent-text`, `--accent-soft`, `--border`,
`--border-strong` and the three `--danger` tokens at their `--inv-*` twins
and sets `color-scheme: var(--inv-scheme)`. Every component inside the band
(buttons, fields, tags, stack cards, focus ring, selection) flips with no
per-component rule, and the alternation holds in both themes. The print
block resets the inverse set to paper too.

`--paper` (`#f5f5f7`) is the one theme-independent colour: the sliding
project word is painted in it with `mix-blend-mode: difference`.

A third set is declared under `@media print`, reapplying the light values with
a white page, black text, transparent surfaces and no glass — so a dark page
printed as-is is never white ink on white stock.

### Space

Theme-independent, declared once on `:root`.

| Token | Value | | Token | Value |
| --- | --- | --- | --- | --- |
| `--s-1` | `0.25rem` | | `--s-7` | `3rem` |
| `--s-2` | `0.5rem` | | `--s-8` | `4rem` |
| `--s-3` | `0.75rem` | | `--s-9` | `6rem` |
| `--s-4` | `1rem` | | `--s-10` | `8rem` |
| `--s-5` | `1.5rem` | | `--s-11` | `12rem` |
| `--s-6` | `2rem` | | | |

### Rhythm and measure

| Token | Value | Meaning |
| --- | --- | --- |
| `--section-y` | `clamp(4rem, 10vw, 8rem)` | vertical beat between sections |
| `--gutter` | `clamp(1.25rem, 5vw, 2.5rem)` | page side inset |
| `--container` | `1200px` | max content width |
| `--measure` | `68ch` | max line length for prose |

Each `.section` carries half the beat as padding, so the gap between two
adjacent sections is exactly `--section-y`.

### Type scale

Fluid above `--fs-base`; everything larger is `clamp()`-driven.

| Token | Value |
| --- | --- |
| `--fs-mono` | `0.75rem` |
| `--fs-xs` | `0.8125rem` |
| `--fs-sm` | `0.9375rem` |
| `--fs-base` | `1.0625rem` |
| `--fs-lg` | `clamp(1.125rem, 1.6vw, 1.375rem)` |
| `--fs-xl` | `clamp(1.5rem, 2.4vw, 2rem)` |
| `--fs-2xl` | `clamp(2rem, 4vw, 3rem)` |
| `--fs-3xl` | `clamp(2.5rem, 6vw, 4.5rem)` |
| `--fs-display` | `clamp(3rem, 9vw, 7.5rem)` |

Poster scale (home page; the marquee, sliding word and footer wordmark are
decorative or plain links, so they may exceed the display cap):

| Token | Value | Used by |
| --- | --- | --- |
| `--fs-kicker` | `0.75rem` | stacked uppercase labels |
| `--fs-title` | `clamp(1.75rem, 2.6vw, 2.5rem)` | project titles in the work rails |
| `--fs-hero` | `clamp(2.5rem, 5.6vw, 5.5rem)` | the home `<h1>` |
| `--fs-roller` | `clamp(3rem, 7vw, 6.5rem)` | the keyword roller |
| `--fs-prose-xl` | `clamp(1.625rem, 3.4vw, 3.25rem)` | the about paragraph |
| `--fs-mega` | `clamp(4.5rem, 11vw, 10.5rem)` | outlined numbers |
| `--fs-poster` | `clamp(5.5rem, 13.5vw, 13rem)` | marquee rows, sliding word |
| `--fs-wordmark` | `clamp(6rem, 24vw, 22rem)` | footer wordmark |

Line heights: `--lh-display: 1.02`, `--lh-tight: 1.12`, `--lh-snug: 1.3`,
`--lh-body: 1.65`.

Letter spacing: `--ls-display: -0.035em`, `--ls-tight: -0.02em`,
`--ls-normal: 0em`, `--ls-mono: 0.08em` (for uppercase mono runs).

### Radii

One shape system. Surfaces step by size; interactive pills are fully rounded.

| Token | Value |
| --- | --- |
| `--r-sm` | `10px` |
| `--r-md` | `16px` |
| `--r-lg` | `24px` |
| `--r-xl` | `32px` |
| `--r-pill` | `999px` |

### Motion

| Token | Value |
| --- | --- |
| `--ease-spring` | `cubic-bezier(0.32, 0.72, 0, 1)` |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--dur-fast` | `160ms` |
| `--dur-base` | `280ms` |
| `--dur-slow` | `600ms` |
| `--ease-expo` | `cubic-bezier(0.19, 1, 0.22, 1)` |
| `--dur-reveal` | `700ms` |
| `--dur-roll` | `900ms` |

`--ease-spring` carries state changes that should feel physical (press, hover
lift, nav indicator); `--ease-out` carries opacity and atmosphere;
`--ease-expo` is the home page's long confident settle (hero entrance, roller,
round-button chevron).

### Layers

Six slots. Nothing in the project writes a `z-index` outside this list.

| Token | Value |
| --- | --- |
| `--z-canvas` | `0` |
| `--z-base` | `1` |
| `--z-sticky` | `100` |
| `--z-nav` | `200` |
| `--z-overlay` | `900` |
| `--z-modal` | `1000` |

### Derived channels

`css/main.css` composes a small second layer from the token scale so component
rules stay literal-free:

| Property | Value | Meaning |
| --- | --- | --- |
| `--hairline` | `1px` | the one honest px literal — a 1px rule must stay 1px |
| `--tap` | `calc(--s-6 + --s-3)` = 44px | minimum touch target |
| `--nav-h` | `calc(--s-7 + --s-3)` = 3.75rem | nav height |
| `--nav-h-compact` | `--s-7` = 3rem | nav height when `.is-scrolled` |
| `--col-min` | `calc(--s-11 + --s-8)` = 16rem | grid column floor |
| `--panel-w` | `calc(--s-11 * 3)` = 36rem | overlay panel width |
| `--dot` | `calc(--s-2 - --hairline)` | timeline node diameter |
| `--blur` | `20px` | backdrop blur radius for glass |

## Typography

Three families, loaded from Google Fonts with `display=swap`.

| Family | Token | Role |
| --- | --- | --- |
| **Space Grotesk** | `--font-display` | All headings, and the accent phrase |
| **Inter** | `--font-sans` | Body copy, UI, form fields |
| **JetBrains Mono** | `--font-mono` | Eyebrows, metadata, tags, proof bar, keyboard hints |
| **Jost** | `--font-poster` | Home page only: every heading, label, marquee, number and decorative word. The free geometric stand-in for Futura. `css/home.css` points `--font-display` at it inside `main` and the footer, so the shared nav keeps Space Grotesk |

### The accent phrase

`.accent-word` is the one editorial flourish, and it is rationed: **one accent
phrase per heading**, scoped in CSS to exactly two parents.

There is deliberately **no serif on this site**. The accent is set in the same
display sans as the heading it sits in, and is distinguished by *weight and
colour* only — a lighter weight dropped to `--text-secondary` against the
heading's 600. A typeface switch mid-heading read as decorative rather than
considered, so it was removed.

```css
.hero-title .accent-word,
.section-title .accent-word {
  font-family: inherit;          /* stays on --font-display */
  font-style: normal;
  font-weight: 300;              /* against the heading's 600 */
  letter-spacing: var(--ls-tight);
  line-height: var(--lh-tight);
  color: var(--text-secondary);
}
```

`.accent-word` anywhere other than inside `.hero-title` or `.section-title`
is a bug.

On the home page the accent follows the poster layer: inside `.home-title`
(which always carries `.section-title` too) it is drawn as an **outline**
(`-webkit-text-stroke`, transparent fill) from 48em up and falls back to
`--text-secondary` below that or where strokes are unsupported. In the hero
`<h1>` it stays solid, same weight, in `--text-secondary`, because the dial
and the headline must read first.

In markup it is an `<em>`:

```html
<h1 class="section-title">The <em class="accent-word">evidence.</em></h1>
```

On the home page only, the hero's accent also carries `data-dial`, which
`js/hero.js` uses to run an odometer reveal over it on load. See **Motion
modules** below.

### Mono runs

`.eyebrow` sets the pattern: `--font-mono`, `--fs-mono`, weight 500,
`--ls-mono`, uppercase, `--text-tertiary`. The same treatment reappears on
`.tag`, `.proof-bar`, `.post-status`, `.pill-link--private`, `.timeline-when`
and `kbd`.

Numeric runs get `font-variant-numeric: tabular-nums` via `.tabular`, applied
to `.timeline-when`, `.proof-bar`, `.post time`, `.project-meta` and
`.lightbox-meta`, so columns of numbers align.

Prose is capped at `--measure` (68ch) by `.prose` and `.section-sub`.

## Component inventory

| Class | Element | What it is |
| --- | --- | --- |
| `.glass` | any | The liquid-glass material: `--glass-bg`, hairline `--glass-border`, `--glass-shadow` plus an inset top highlight, `backdrop-filter: blur(--blur) saturate(180%)` |
| `.project-card` | `<article>` | Compact project: `.project-media`, `.project-body`, `.project-meta`, `.project-title`, `.project-desc`, `.project-stack`, `.project-links`. Links sit on the card baseline regardless of description length |
| `.case` | `<article>` | Full case study: `.case-label`, `.case-title`, `.case-lede`, `.case-grid` of `.case-block[data-label]` (the label is rendered by `::before`), then `.project-stack` and `.project-links` |
| `.timeline` | `<ol>` | `.timeline-item` rows with `.timeline-when` / `.timeline-org` / `.timeline-role` / `.timeline-detail`. The spine is a `::before` that fades at both ends so it reads as a continuing line, not a box edge |
| `.post` | `<a>` or `<article>` | A writing row. No dividers — the hover fill does the separating. Hover styles key off `a.post` only |
| `.post--planned` | `<article>` | A stated intention. Dashed spine instead of a hover fill, `.post-status` pill, same visual weight as a published row |
| `.pill-link` | `<a>` or `<span>` | Project link. `--live` (accent-soft fill), `--repo` (outline), `--private` (rectangular, hatched). 44px tap target under `(pointer: coarse)` or below 44em |
| `.photo-card` | `<figure>` | A photograph plus `.photo-caption`, wrapping a real `<button>` so it is keyboard-reachable. Laid out with CSS columns so frames keep their own aspect ratio instead of being cropped |
| `.cmdk` | `<div data-cmdk hidden>` | The ⌘K palette: `.cmdk-panel[role="dialog"][aria-modal]`, `.cmdk-input`, `.cmdk-list`, `.cmdk-item`, `.cmdk-empty` |
| `.contact-form` | `<form>` | `.field` / `.field-label` / `.field-input` / `.field-error`, plus a `.form-status[role="status"]` region with `data-state` of `pending`, `success` or `error` |
| `.proof-bar` | `<ul>` | A spec strip, not a stat wall: mono, tabular, hairline-separated `<li>` items with `.proof-value` / `.proof-label` |

Supporting classes: `.btn` with `-primary` / `-ghost` / `-outline`, `.tag`,
`.container`, `.section` with `--sunken` / `--flush-top`, `.section-head`,
`.section-title`, `.section-sub`, `.section-foot`, `.grid` with `--auto` /
`--2` / `--3`, `.stack`, `.prose`, `.visually-hidden`, `.skip-link`,
`.lightbox` and its controls, `.about-grid`, `.about-figure`, `.toolbox`,
`.contact-grid`, `.contact-aside`, `.social-links`, `.site-footer`.

### Glass in practice

Glass is applied through the component rules rather than by adding `.glass` in
markup: `.site-nav.is-scrolled`, `.cmdk`, `.cmdk-panel` and `.lightbox` each
declare the material directly. The nav is transparent at the top of the page
so the hero reads full-bleed; the glass only materialises once there is
content to sit above it.

Two mandatory fallbacks:

- `@supports not (backdrop-filter: blur(1px))` turns every glass surface
  opaque (`--bg-elevated`). A translucent fill without blur reads as mud.
- `@media (prefers-reduced-transparency: reduce)` does the same. Transparency
  is a separate preference from motion.

## The home page

Band order, top to bottom: hero (base), practice (base), work (inverse),
stats (base), about (inverse), writing (base), contact and footer (inverse).
Each band pads `--section-y` top and bottom.

| Class | What it is |
| --- | --- |
| `.band` / `.band--invert` | Full-width band. Base paints the theme; inverse re-points the colour tokens at `--inv-*` |
| `.marquee` + `.marquee-track` | Hero rows: the owner's name at `--fs-poster`, 1px outline in `--text` at 58%, six spans looping over half their width in 42s, the second row reversed and offset -22% so the still state is staggered. `overflow: clip` per row, never on the page |
| `.round-btn` | 44px circle, 1.5px `currentColor` ring, chevron. Always a real link to the next anchor. Hover inverts, chevron drops 2px |
| `.kicker` | Stacked 12px/700 uppercase Jost label. **Only valid as the heading itself** (the work section's `<h2>`), never as a label above another heading |
| `.roller` | Two masks of one cell (`--cell: 1.14em`): the solid word, then an outlined echo cut to its upper 0.56em and faded. `--roll` steps both columns, the echo 80ms behind |
| `.dash-grid` | Eleven 2px dashes on a 7x7 grid from one element's background layers |
| `.work-item` | Per project: `.work-rail` (2px rule, `.work-title` + `.work-count`, label, `.work-lede` with `<strong>` key phrases, stack, links, round button), sticky from 64em, beside `.work-media` (3:2 `.work-frame` photograph, right-aligned caption, `.case-grid`) |
| `.slide-word` | The project word at `--fs-poster`, twice: `--line` outline over the row, `--fill` inside the frame in `--paper` with `mix-blend-mode: difference`, so it turns solid exactly where it crosses the image. Driven by `--slide` |
| `.stat` | Sizer, `.stat-num` (outlined, `[data-count]`) and `.stat-echo` share one grid cell; the echo drops 0.7em and fades. Right column offset one `--s-10` step |
| `.about-lead` | `--fs-prose-xl` paragraph; `<strong>` phrases in ink, other words at 0.24 opacity until lit |
| `.footer-brand` (home) | The wordmark at `--fs-wordmark`, outlined, foot cut by the band edge, accent dot outlined in `--accent` |

**Shape on the home page:** things you press are round (`.btn`, `.pill-link`,
`.round-btn`); everything else is square (photographs, `.post`, `.tag`,
`.post-status`, and fields, which become single-rule underlines).

**Rules** are 2px `--text`, drawn inside the gutters, above every rail, aside
and the footer. Hairlines stay `--border`.

**Photographs** are `filter: grayscale(1)` at rest and ease back to colour on
hover over `--dur-slow`. They come from `images/optimized/` with the webp
`srcset` plus jpg fallback pattern. Project frames use the owner's
photographs, not screenshots, and their captions say so.

## Honest-absence states

**The site never ships a dead `href="#"`.** Not on a button that isn't wired
yet, not on a post that isn't written. This is a design rule, not a
housekeeping habit, and it is enforced by changing the *element*, not by
disabling a link.

**`.pill-link--private` renders a `<span>`, not an anchor.** A project with no
public URL gets a rectangular, mono-uppercase, faintly hatched chip in
tertiary text. It is deliberately not pill-shaped, has `transition: none` and
no hover state at all — on this site, things that move are things you can do.
It must not read as a disabled button, because it is not broken and it is not
waiting on the user. `user-select: text` stays on so a visitor can copy the
ask.

**`.post--planned` renders an `<article>`, not a link.** A planned post gets a
dashed spine instead of the hover fill: the line is drawn but not yet solid.
Nothing is greyed out, nothing is disabled, and it sits at the same weight as
a published row, because a stated intention is real content, not a
placeholder. When a post ships, the element becomes `<a class="post">` and the
hover fill appears, because the hover rule is scoped to `a.post`.

The same honesty shows up in the content: the GeoTour case study ends at
`Approach` rather than inventing an `Outcome`, and the experience timeline
exists precisely because that client work has no public link to point at.

## Accessibility

The system enforces these, not the author's memory:

- **One global focus ring.** `:focus-visible` gets `outline: 2px solid
  var(--accent)` at `outline-offset: 3px` with `border-radius: inherit`.
  Nothing removes an outline without replacing it with something at least as
  visible. Over glass, where a 2px ring can get lost in the blur, controls
  inside `.glass`, `.site-nav`, `.cmdk-panel` and `.lightbox` also get a soft
  `--accent-soft` halo behind the ring.
- **One `<h1>` per page.** All six pages have exactly one. On `index.html` it
  is `.hero-title`; elsewhere it is the first `.section-title`. Every
  subsequent heading is `<h2>`/`<h3>`.
- **`aria-pressed` on toggles.** Both `[data-theme-toggle]` and
  `[data-motion-toggle]` are real `<button>`s with `aria-pressed`, kept in
  sync by `syncThemeToggles()` / `syncMotionToggles()` — including after a
  bfcache restore.
- **Reduced motion honored twice, in CSS and in JS.** There are two switches
  with identical effect: `@media (prefers-reduced-motion: reduce)` and
  `:root[data-motion="reduced"]`, set by the in-page toggle. Both collapse all
  durations and delays to `1ms` (not `0`, so `transitionend` listeners still
  fire), force `scroll-behavior: auto`, reveal everything immediately, and
  strip hover lifts and scales. In JS, `isReduced()` gates the reveal observer,
  the nav indicator animation, magnetic buttons, page transitions and the hero
  terrain, which collapses to a single static frame with no loop and no
  pointer reactivity. The `motionchange` event propagates a live toggle to
  everything already running.
- **Real buttons and anchors for everything interactive.** Photo cards wrap a
  `<button>` because a bare `<figure>` is not keyboard-reachable. Palette
  results are `<button role="option">`. The palette is a `role="dialog"
  aria-modal="true"` with a focus trap, scroll lock and an inert background.
  The skip link is moved off-screen by transform, never `display: none`, so it
  stays focusable.
- **Announcements for invisible state.** A polite live region announces copy
  success and failure; the contact form's `.form-status` is
  `role="status" aria-live="polite"`.
- **Graceful degradation.** The contact form keeps a real `action`/`method` so
  a script failure degrades to a POST, and `novalidate` is only added once JS
  is confirmed running. `photography.html` carries a `<noscript>` grid.
  `@media (prefers-contrast: more)` strengthens borders.

## The reveal contract

Three parts, and they are a contract between the markup and the script:

1. **`[data-reveal]`** on the element. This sets the pre-reveal state:
   `opacity: 0` and a `translate3d` of `--reveal-shift`. `data-reveal="fade"`
   opts out of the translate — rising rectangles look cheap on large media.
2. **`style="--reveal-i: N"`** — the stagger index.
3. **`.is-revealed`**, toggled by an `IntersectionObserver` in `js/app.js`
   (threshold `0.12`, `rootMargin: 0px 0px -8% 0px`), unobserving each element
   once it fires.

The stagger is not a uniform fade-up. Two things decay as `N` rises:

```css
--reveal-shift: max(6px, calc(22px - var(--reveal-i) * 4px));
--reveal-delay: calc(var(--reveal-i) * 55ms);
--reveal-dur:   max(340ms, calc(var(--dur-slow) - var(--reveal-i) * 45ms));
```

The primary element makes the big gesture (22px, slow and deliberate);
supporting elements barely move (floor 6px) and catch up quickly (floor
340ms), so the group *resolves* rather than trickles.

**`--reveal-i` encodes hierarchy, not source order.** It is not a counter.
`0` is the section head; `1` is the lead element of the section; siblings of
equal importance share an index. `blog.html` has two separate elements at
`--reveal-i: 1`, two at `2` and two at `3`, because those posts pair up by
weight — not because they are first, second and third in the DOM. A uniform
0.6s fade-up on every node in source order is the loudest template tell there
is; this shape reads as one considered movement with a lead voice.

Under reduced motion, `js/app.js` zeroes `--reveal-i` on every element before
adding `.is-revealed`, so no staggered delay survives, and the CSS kill switch
forces `opacity: 1` regardless.

## Rules

1. **No hardcoded colours, spacing or font-sizes outside `css/tokens.css`.**
   If a value is needed and it is not in that file, it belongs in that file.
   The only literals permitted in `css/main.css` are `--hairline` and
   `--blur`, both declared once under "Derived channels". No raw `rem` in a
   component rule; no `z-index` outside the six layer tokens.
2. **No dead links, ever.** No `href="#"`. A link with no destination is not a
   link: use `.pill-link--private` (`<span>`) or `.post--planned`
   (`<article>`). Never claim an outcome you cannot back up.
3. **Every animation is gated on reduced motion.** In CSS, it must fall under
   both the `prefers-reduced-motion` media query and the
   `:root[data-motion="reduced"]` selector. In JS, it must check `isReduced()`
   and subscribe to `motionchange`. No exceptions.
4. **Use `--accent-text` for accent-coloured text, `--accent` for fills.**
   They diverge in light theme. White-on-accent fails AA in dark and is never
   used.
5. **Everything interactive has hover, active and focus-visible states**, all
   eased on `--ease-spring`.
6. **A page that lacks a feature's markup is a silent no-op.** Guard every DOM
   lookup; never throw.

---

## Motion modules

Four effects live in their own files rather than in `main.css` / `app.js`,
because each is independently removable.

| Module | Files | Hook | What it does |
| --- | --- | --- | --- |
| **Card stacking** | `css/stack.css`, `js/stack.js` | `[data-stack-item]` | Cards stick below the nav and recede as the next one buries them |
| **Tilt cards** | `css/tilt.css`, `js/tilt.js` | `[data-tilt]` | Spring-smoothed 3D tilt with a pointer-tracked glare |
| **Hero** | `css/hero.css`, `js/hero.js` | `[data-hero-canvas]`, `[data-dial]` | Contour terrain, cursor wake, click ripple, odometer headline |
| **Home** | `css/home.css`, `js/home.js` | `[data-marquee]`, `[data-roller]`, `[data-slide]`, `[data-highlight]`, `.stat-num` | Pauses off-screen marquee rows; steps the roller while visible with a cloned-first-word loop seam; one rAF-throttled passive scroll handler writes `--slide` on figures near the viewport and lights the about paragraph word by word; mirrors each counting number into its echo |

### The property-ownership contract

Writing cards carry **both** stacking and tilt. Both effects would normally
write to `transform`, so whichever ran last would silently wipe the other.
Instead each module owns disjoint CSS properties, using the *individual*
transform properties, which compose independently:

| Module | Owns | Must never write |
| --- | --- | --- |
| `stack` | `position: sticky`, `scale`, `filter`, `opacity`, `::after` scrim, `background-color` | `transform`, `rotate`, `translate` |
| `tilt` | `rotate`, `translate`, `background-image` glare, `--tilt-*` | `transform`, `scale`, `filter`, `opacity`, `position` |

Two consequences worth knowing before editing either file:

- **`background-image` is shared.** `stack.css` exposes its hover tint as
  `--stack-tint-layer` and `tilt.css` composes its glare *over* it as a second
  background layer. A bare `background-image` declaration on these cards from
  either side replaces the other's layer with no error.
- **`transform-style: preserve-3d`** on `[data-tilt]` is what gives the card's
  children their depth. Any `opacity != 1`, `filter`, `clip-path` or `mask` on
  that element flattens it and the depth silently disappears.

### Reduced motion

All four modules honour `prefers-reduced-motion` **and** the site's own
toggle. `js/app.js` maintains `document.documentElement.dataset.motion`
(`"full"` | `"reduced"`) and dispatches a `motionchange` CustomEvent on
`window`; each module listens and switches live in both directions. Under
reduced motion: no stacking (cards flow normally), no tilt, no
odometer roll, and the terrain renders a single static frame. On the home
page it also means: marquee rows still and offset, the roller parked on its
first word, sliding words at their resting `--slide: 0.5`, the about
paragraph fully lit, counts at their final values, and no scroll listener
attached at all.
