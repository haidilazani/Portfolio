# Portfolio — Aidil Azani

Personal portfolio site. Six pages of hand-written HTML, CSS and JavaScript:
no framework, no bundler, no dependencies, no build step. Deployed from this
repository on GitHub Pages at
<https://haidilazani.github.io/Portfolio/>.

Measured payload across the 16 HTML + CSS + JS files: **393 KB uncompressed,
103 KB gzipped, 9,950 lines**. The largest single file is `js/hero.js` at 1,390
lines — the interactive topographic terrain and odometer headline
behind the home page.

The design system (tokens, components, accessibility rules) is documented
separately in [DESIGN.md](DESIGN.md).

## Run it locally

There is nothing to install and nothing to compile. Serve the folder over HTTP:

```sh
cd "Personal Project/Portfolio"
python3 -m http.server 8899
```

Then open <http://localhost:8899/>.

Use a server rather than opening `index.html` from the filesystem. `file://`
breaks the relative asset paths in `js/photos.js`, the `fetch` in the contact
form, and the canonical/manifest links.

Node is only needed for the image pipeline (see below), never to view the site.

## File map

| Path | What it is |
| --- | --- |
| `index.html` | Home: hero + featured case studies + about teaser + writing teaser + contact |
| `work.html` | Full case studies (`.case`) and the experience timeline |
| `about.html` | Longer bio, timeline, toolbox, contact CTA |
| `blog.html` | Writing index — every entry is currently `planned` |
| `photography.html` | Photo grid, rendered from `window.PHOTOS` |
| `404.html` | GitHub Pages not-found page |
| `css/tokens.css` | The entire design token layer: colour for both themes, space scale, fluid type scale, radii, motion, z-layers. Custom properties only |
| `css/main.css` | Base, layout and every component |
| `css/hero.css` | Hero-only layout, type and canvas surface. Linked from `index.html` only |
| `js/app.js` | Site-wide behaviour (see below). Loaded on every page |
| `js/hero.js` | The interactive topographic terrain canvas. Loaded on `index.html` only |
| `js/photos.js` | **Generated.** `window.PHOTOS` — responsive sources, dimensions, alt text, captions, blur-up placeholders |
| `images/` | Untouched original photographs. Inputs to the build script only |
| `images/optimized/` | WebP + JPEG derivatives at 400/800/1600 widths, plus `build.mjs` |
| `favicon.svg`, `site.webmanifest`, `robots.txt`, `sitemap.xml` | Site metadata |

What `js/app.js` does, in the order its sections are numbered: motion
preference, theme, navigation (active link, liquid indicator, scrolled state),
scroll reveal and count-up, page transitions, magnetic buttons, a shared
overlay primitive (scroll lock, inert background, focus trap), the ⌘K command
palette, the photo lightbox, copy-to-clipboard, and the contact form. Every
feature is looked up defensively: a page without the markup is a silent no-op,
and each initialiser runs inside its own `try`, so one failure cannot take the
rest of the page down.

Theme and motion are seeded by a small inline script in each page's `<head>`
before first paint, so neither flashes on load. Both persist in `localStorage`
under `theme` and `motion`.

## Common tasks

### Add or change a project

Projects are plain markup — there is no data file.

- **Full case study** (`work.html`, and the featured ones on `index.html`):
  copy an existing `<article class="case">`. It holds `.case-label`,
  `.case-title`, `.case-lede`, a `.case-grid` of `.case-block` elements whose
  heading comes from the `data-label` attribute (`Problem`, `Approach`,
  `Outcome`), a `.project-stack` list of `.tag` items, and a `.project-links`
  row.
- **Compact card** (`index.html`): copy the `<article class="project-card">`.

Only claim the blocks you can back up. The GeoTour case study deliberately
stops at `Approach` because there is no measured outcome to state.

Link rows use `.pill-link` with one variant: `--live` for a hosted demo,
`--repo` for source. Never ship `href="#"` — if there is no URL, use the
`--private` variant, which renders as a `<span>`. See DESIGN.md.

Set the reveal index on each new block: `data-reveal style="--reveal-i: N"`,
where `N` is 0 for the section head and rises with visual hierarchy, not with
source order.

### Add a blog entry

Entries live directly in `blog.html` (and the two teasers on `index.html`).

- **Planned** — `<article class="post post--planned">` with a
  `<p class="post-status">Planned</p>` and a `.post-title` / `.post-blurb`.
  It is an `<article>`, not a link, on purpose.
- **Published** — `<a class="post" href="…">`. Only the anchor form gets the
  hover fill; the styles key off `a.post`.

When the first post ships, also update the `.section-sub` on `blog.html`,
which currently says none of them is a link.

### Add or change a photograph

1. Drop the original into `images/`. Do not edit or move the originals —
   the build script only reads them.
2. Add an entry to the hand-written `PHOTOS` table at the top of
   `images/optimized/build.mjs`: `file`, `slug`, `alt`, `caption`. The array
   order is the order photos appear on the page. Write the alt text and
   caption yourself after looking at the frame; do not describe anything the
   photograph does not show.
3. Regenerate (below).

Never hand-edit `js/photos.js`. It is overwritten on every run.

### Regenerate the optimized images

```sh
node images/optimized/build.mjs
```

Run it from anywhere; the script resolves paths relative to itself. It:

1. reads each original's true display size with `sips`, applying EXIF rotation;
2. resamples to 400/800/1600 px wide, never above the source's native width;
3. encodes WebP (~q80) and a JPEG fallback (~q82) per width, stepping quality
   down per file until the output clears the 400 KB budget;
4. emits a ~20 px blurred WebP data URI per photo as a blur-up placeholder;
5. writes `js/photos.js`.

Requirements: Node with `WebSocket` (Node 22+), macOS `/usr/bin/sips`, and
Google Chrome at `/Applications/Google Chrome.app`. Chrome is driven headless
over the DevTools protocol purely as a WebP encoder, because `sips` can read
WebP but cannot write it. Nothing is installed. Canvas output carries no EXIF,
so every derivative is metadata-free by construction.

The script prints per-photo sizes and flags anything over budget.

### Activate the contact form

The form on `index.html` posts to Formspree, but the endpoint is still a
placeholder:

```html
<form class="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

Until `YOUR_FORM_ID` is replaced, `js/app.js` recognises the placeholder and
falls back to a pre-filled `mailto:haidilazani@gmail.com` draft, telling the
visitor exactly what it is doing. Nothing is silently dropped.

To switch it on:

1. Create a form at [formspree.io](https://formspree.io) and copy the ID out of
   the endpoint URL it gives you.
2. Replace `YOUR_FORM_ID` in `index.html` with that ID.

`endpointIsConfigured()` in `js/app.js` treats an action as real only when it
is an absolute `http(s)` URL, is cross-origin (a same-origin action on GitHub
Pages cannot accept a POST), is not `#`, and does not match the placeholder
pattern `/(your[-_]?form|yourid|xxx+|example\.com|placeholder|todo|replace[-_]?me|\{\{)/i`.
Setting `data-endpoint="mailto"` on the form forces the mail fallback
regardless.

The fallback address comes from `data-mailto` on the form, defaulting to the
`FALLBACK_EMAIL` constant in `js/app.js`.

### Deploy

Push to `main`. GitHub Pages serves the repository root as-is; there is no
build to run and no artifact to commit beyond the files themselves.

If you add a page, add it to `sitemap.xml` too. `404.html` is intentionally
absent from the sitemap.

## Conventions

- Every colour, space, font-size, radius, duration and z-index comes from
  `css/tokens.css`. The only literals allowed in `css/main.css` are the
  hairline width and the blur radius, both declared once under "Derived
  channels".
- No dead links. A missing URL is a designed absence, not `href="#"`.
- Every animation is gated on reduced motion, in CSS and in JS.
- One `<h1>` per page.

DESIGN.md has the full rules and the reasoning behind them.
