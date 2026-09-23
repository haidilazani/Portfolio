#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * images/optimized/build.mjs — responsive image pipeline for the photography
 * set. Run from anywhere:  node images/optimized/build.mjs
 *
 * What it does
 *   1. reads the true display size of each original (EXIF orientation applied)
 *   2. resamples with /usr/bin/sips into lossless PNG intermediates at
 *      400 / 800 / 1600 px wide, never above the source's native width
 *   3. encodes WebP (~q80) and a JPEG fallback (~q82) for each width, stepping
 *      quality down per file until the output clears the 400 KB budget
 *   4. emits a ~20px blurred WebP data URI per photo (blur-up placeholder)
 *   5. writes js/photos.js
 *
 * Why Chrome: this machine has no cwebp / avifenc / magick / ffmpeg, and macOS
 * `sips` can read but NOT write WebP. Headless Chrome ships libwebp and encodes
 * through OffscreenCanvas.convertToBlob, driven here over the DevTools
 * protocol. Nothing is installed; canvas output also carries no EXIF, so every
 * derivative is metadata-free by construction.
 *
 * Originals in images/ are read-only inputs and are never modified.
 * ------------------------------------------------------------------------- */

import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const SRC = path.join(ROOT, 'images');
const OUT = path.join(ROOT, 'images/optimized');
const PHOTOS_JS = path.join(ROOT, 'js/photos.js');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEVTOOLS_PORT = 9333;
const BUDGET = 400 * 1024;      // hard per-image ceiling
const HEADROOM = 0.95;          // aim 5% under it
const WIDTHS = [400, 800, 1600];
const Q_WEBP = [0.80, 0.70, 0.62, 0.54, 0.46];
const Q_JPEG = [0.82, 0.72, 0.64, 0.56, 0.48];

/* Order below is the order photos appear in window.PHOTOS.
 * alt/caption are written by hand after looking at each photograph. Do not
 * auto-generate them, and do not state anything the frame does not show.
 * Titles/years come from the original js/memory.js data. */
const PHOTOS = [
  {
    file: '1 (5).JPEG', slug: 'petronas-towers',
    alt: 'The Petronas Twin Towers at night, photographed from street level so the two towers lean toward each other and meet at the lit sky bridge.',
    caption: 'Kuala Lumpur, 2025. Straight up from the base of the towers.',
  },
  {
    file: 'IMG_9854.JPG', slug: 'merdeka-118',
    alt: 'Merdeka 118 rising into a grey, clouded sky behind the older shophouses of downtown Kuala Lumpur, with a 7-Eleven sign and a guesthouse facade in the foreground.',
    caption: 'Merdeka 118, 2024. Seen over the shophouses below it.',
  },
  {
    file: '1 (4).JPEG', slug: 'above-the-clouds',
    alt: 'A person in a dark jacket sitting alone on a flat rock at first light, looking out over a valley filled with low cloud, a pine branch framing the left of the frame.',
    caption: 'Sunrise above the cloud line, 2024.',
  },
  {
    file: '1 (3).JPEG', slug: 'mount-jerai-sky',
    alt: 'A night sky dense with stars above Mount Jerai, faint cloud drifting through the middle of the frame and tree canopies silhouetted in two corners.',
    caption: 'Mount Jerai, 2024. Far enough from the city to see this.',
  },
  {
    file: '1 (1).JPEG', slug: 'feast-concert',
    alt: 'Four frames from a .Feast concert arranged in a grid: the bassist and vocalist side by side, the vocalist alone at the mic, and the guitarist mid-solo, all under deep red stage light.',
    caption: '.Feast, 2023. Four frames from the same red-lit set.',
  },
  {
    file: 'IMG_9436.JPG', slug: 'baskara-on-the-mic',
    alt: 'Baskara Putra singing into a handheld microphone with his head tipped back, lit through green and amber haze, a keyboardist and the silhouetted crowd around him.',
    caption: 'Baskara on the mic, 2023.',
  },
  {
    file: 'IMG_9332.JPG', slug: 'diki-renada-solo',
    alt: 'A guitarist leaning back mid-solo with a cream electric guitar raised, red stage lights burning through the smoke behind him and a bassist playing to his right.',
    caption: "Diki Renada's solo, 2023.",
  },
  {
    file: '1 (2).JPEG', slug: 'tapir-crossing',
    alt: 'A life-size Malayan tapir model standing beside a yellow diamond road sign reading AWAS TAPIR MELINTAS, at the entrance to the Pasar Besar market hall.',
    caption: 'Pasar Besar, 2024. The warning and its subject, in one frame.',
  },
  {
    file: 'DSC04911.JPG', slug: 'post-presentation',
    alt: 'Six students in shirts and ties collapsed across outdoor steps immediately after a presentation, one leaning back with his eyes closed, another still holding his tie.',
    caption: 'The minute the presentation ended, 2026.',
  },
  {
    file: 'DSC04903.JPG', slug: 'convocation-steps',
    alt: 'A dozen students in black suits sprawled down a campus staircase in the afternoon light, one of them giving a thumbs-up to the camera.',
    caption: 'Twelve suits, one staircase, 2026.',
  },
  {
    file: 'DSC04938.JPG', slug: 'amers-smile',
    alt: 'A student in a white shirt and black tie grinning at the camera on a campus staircase, a bag strap over one shoulder and classmates out of focus behind him.',
    caption: 'Amer, 2026.',
  },
  {
    file: 'about.JPEG', slug: 'about',
    alt: 'Portrait of Aidil Azani in a black suit and open-collar shirt against a deep red backdrop, lit from the left.',
    caption: 'Portrait, 2026.',
  },
];

const ENCODER_PAGE = `<!doctype html><meta charset="utf-8"><title>encoder</title>
<script>
async function bitmapFrom(url) {
  var res = await fetch(url);
  return createImageBitmap(await res.blob());
}
window.measure = async function (url) {
  var b = await bitmapFrom(url);
  var d = { width: b.width, height: b.height };
  b.close();
  return d;
};
window.encode = async function (url, type, quality, blur) {
  var bmp = await bitmapFrom(url);
  var canvas = new OffscreenCanvas(bmp.width, bmp.height);
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (blur) {
    ctx.filter = 'blur(' + blur + 'px)';
    ctx.drawImage(bmp, -1, -1, bmp.width + 2, bmp.height + 2);  // overscan so the blur keeps the edges opaque
  } else {
    ctx.drawImage(bmp, 0, 0);
  }
  bmp.close();
  var out = await canvas.convertToBlob({ type: type, quality: quality });
  var bytes = new Uint8Array(await out.arrayBuffer());
  var s = '', CH = 0x8000;
  for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
};
window.__ready = true;
</scr` + `ipt>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sips = (args) => execFileSync('/usr/bin/sips', args, { encoding: 'utf8' });
const dims = (file) => {
  const o = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  return { width: +/pixelWidth: (\d+)/.exec(o)[1], height: +/pixelHeight: (\d+)/.exec(o)[1] };
};
const kb = (b) => (b / 1024).toFixed(0) + ' KB';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-build-'));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(tmp, 'encoder.html'), ENCODER_PAGE);

/* static server: the intermediates plus read-only access to the originals */
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url.startsWith('/orig/') ? path.join(SRC, url.slice(6)) : path.join(tmp, url);
  if (!(file.startsWith(tmp) || file.startsWith(SRC)) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const chrome = spawn(CHROME, [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', `--user-data-dir=${path.join(tmp, 'profile')}`,
  `--remote-debugging-port=${DEVTOOLS_PORT}`, `http://127.0.0.1:${port}/encoder.html`,
], { stdio: 'ignore' });

function shutdown() { try { chrome.kill(); } catch {} server.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
process.on('exit', shutdown);

let wsUrl = null;
for (let i = 0; i < 120 && !wsUrl; i++) {
  await sleep(150);
  try {
    const list = await (await fetch(`http://127.0.0.1:${DEVTOOLS_PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page' && t.url.includes('encoder.html'));
    if (page) wsUrl = page.webSocketDebuggerUrl;
  } catch { /* Chrome not listening yet */ }
}
if (!wsUrl) throw new Error('headless Chrome never exposed a DevTools endpoint');

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function evaluate(expression) {
  const id = ++msgId;
  return new Promise((res, rej) => {
    pending.set(id, (m) => {
      if (m.result.exceptionDetails) rej(new Error(m.result.exceptionDetails.exception?.description || 'eval failed'));
      else res(m.result.result.value);
    });
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}
for (let i = 0; i < 120; i++) { if (await evaluate('window.__ready === true')) break; await sleep(150); }

const call = (fn, args) => evaluate(`window.${fn}(${args.map((a) => JSON.stringify(a)).join(', ')})`);
const encode = async (url, type, quality, blur) =>
  Buffer.from(await call('encode', [url, type, quality, blur || 0]), 'base64');

/* 1. true display dimensions ---------------------------------------------- */
for (const p of PHOTOS) {
  const stored = dims(path.join(SRC, p.file));
  const shown = await call('measure', [`/orig/${p.file}`]);
  p.native = shown;
  // JPEGs straight off a camera/phone are often stored rotated with an EXIF
  // orientation flag; sips resamples the stored axes, so pick the axis that
  // becomes the display width.
  p.rotated = shown.width === stored.height && shown.height === stored.width && stored.width !== stored.height;
  p.widths = WIDTHS.filter((w) => w <= shown.width);
  if (!p.widths.length) p.widths = [shown.width];
}

/* 2 + 3. resample, encode, keep under budget ------------------------------- */
const rows = [];
for (const p of PHOTOS) {
  const source = path.join(SRC, p.file);
  const axis = p.rotated ? '--resampleHeight' : '--resampleWidth';
  const outs = [];
  for (const w of p.widths) {
    const png = path.join(tmp, `${p.slug}-${w}.png`);
    sips(['-s', 'format', 'png', axis, String(w), source, '--out', png]);
    for (const [type, ext, ladder] of [['image/webp', 'webp', Q_WEBP], ['image/jpeg', 'jpg', Q_JPEG]]) {
      let buf, q;
      for (const candidate of ladder) {
        buf = await encode(`/${path.basename(png)}`, type, candidate);
        q = candidate;
        if (buf.length <= BUDGET * HEADROOM) break;
      }
      const dest = path.join(OUT, `${p.slug}-${w}.${ext}`);
      fs.writeFileSync(dest, buf);
      const d = dims(dest);
      if (d.width !== w) throw new Error(`${path.basename(dest)}: expected ${w}px wide, got ${d.width}`);
      if (Math.abs(d.height - Math.round((p.native.height * w) / p.native.width)) > 1) {
        throw new Error(`${path.basename(dest)}: aspect ratio drifted`);
      }
      outs.push({ w, ext, bytes: buf.length, quality: q, ...d });
    }
  }
  const lqipPng = path.join(tmp, `${p.slug}-lqip.png`);
  sips(['-s', 'format', 'png', axis, '20', source, '--out', lqipPng]);
  let lq = await encode(`/${path.basename(lqipPng)}`, 'image/webp', 0.62, 0.8);
  if (lq.length > 1400) lq = await encode(`/${path.basename(lqipPng)}`, 'image/webp', 0.45, 0.8);
  p.lqip = `data:image/webp;base64,${lq.toString('base64')}`;
  p.outputs = outs;
  p.primary = p.widths.indexOf(800) !== -1 ? 800 : p.widths[p.widths.length - 1];
  const primaryDims = outs.find((o) => o.w === p.primary && o.ext === 'webp');
  p.width = primaryDims.width;
  p.height = primaryDims.height;
  rows.push(...outs.map((o) => ({ slug: p.slug, ...o })));
  console.log(`${p.slug.padEnd(20)} ${p.native.width}x${p.native.height}${p.rotated ? ' (exif-rotated)' : ''}  ` +
    outs.map((o) => `${o.w}.${o.ext} ${kb(o.bytes)}`).join('  ') + `  lqip ${lq.length} B`);
}

/* 4. js/photos.js ----------------------------------------------------------- */
const q = (v) => JSON.stringify(v);
const rel = (p, w, ext) => `images/optimized/${p.slug}-${w}.${ext}`;
const entries = PHOTOS.map((p) => [
  '    {',
  `      slug: ${q(p.slug)},`,
  `      alt: ${q(p.alt)},`,
  `      caption: ${q(p.caption)},`,
  `      width: ${p.width},`,
  `      height: ${p.height},`,
  `      aspect: ${+(p.width / p.height).toFixed(4)},`,
  `      src: ${q(rel(p, p.primary, 'webp'))},`,
  `      srcset: ${q(p.widths.map((w) => `${rel(p, w, 'webp')} ${w}w`).join(', '))},`,
  `      srcsetJpg: ${q(p.widths.map((w) => `${rel(p, w, 'jpg')} ${w}w`).join(', '))},`,
  `      fallback: ${q(rel(p, p.primary, 'jpg'))},`,
  `      lqip: ${q(p.lqip)}`,
  '    }',
].join('\n')).join(',\n');

const sourceMap = PHOTOS
  .map((p) => ` *   ${p.slug.padEnd(19)} <- images/${p.file.padEnd(14)} ${p.native.width}x${p.native.height}`)
  .join('\n');

fs.writeFileSync(PHOTOS_JS, `/* ---------------------------------------------------------------------------
 * js/photos.js — GENERATED FILE, do not hand-edit.
 *
 * window.PHOTOS: one entry per photograph, each with a responsive WebP set, a
 * JPEG fallback set, real pixel dimensions and an inline blur-up placeholder.
 * Paths are relative to the site root.
 *
 *   { slug, alt, caption, width, height, aspect,
 *     src,        // ${'800w'} WebP (or the largest available width below that)
 *     srcset,     // "url 400w, url 800w, url 1600w" — WebP
 *     srcsetJpg,  // the same widths as JPEG, for browsers without WebP
 *     fallback,   // the src width as JPEG
 *     lqip }      // ~20px blurred WebP data URI, under 1 KB
 *
 * Derivatives live in images/optimized/. Widths 400 / 800 / 1600, never above
 * the source's native width. WebP ~q80 and JPEG ~q82, stepped down per file
 * only where needed to stay under the 400 KB budget. All EXIF stripped.
 *
 * Sources (originals in images/ are inputs only and are never modified):
${sourceMap}
 *
 * Regenerate with:  node images/optimized/build.mjs
 * Alt text and captions are hand-written in the PHOTOS table at the top of
 * that script — edit them there, not here.
 * ------------------------------------------------------------------------- */

(function (root) {
  'use strict';

  root.PHOTOS = [
${entries}
  ];
}(window));
`);

const total = (f) => rows.filter(f).reduce((a, b) => a + b.bytes, 0);
console.log(`\njs/photos.js  ${kb(fs.statSync(PHOTOS_JS).size)}  (${PHOTOS.length} photos)`);
console.log(`800w WebP set ${kb(total((r) => r.w === 800 && r.ext === 'webp'))} · all WebP ${kb(total((r) => r.ext === 'webp'))} · all JPEG ${kb(total((r) => r.ext === 'jpg'))}`);
const over = rows.filter((r) => r.bytes > BUDGET);
console.log(over.length ? `OVER BUDGET: ${over.map((r) => `${r.slug}-${r.w}.${r.ext}`).join(', ')}` : `largest single output ${kb(Math.max(...rows.map((r) => r.bytes)))} — all under the 400 KB budget`);

ws.close();
