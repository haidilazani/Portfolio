/* ==========================================================================
   stack.js — scroll-driven card stacking
   --------------------------------------------------------------------------
   Pairs with css/stack.css. This file measures geometry and publishes
   progress; css/stack.css decides what progress looks like.

   PROPERTY CONTRACT (shared with js/tilt.js — do not break it)
   --------------------------------------------------------------------------
   Writes to [data-stack-item], and nothing else:
       --stack-depth, --stack-cover, --stack-lift   (custom properties)
       animation-name, animation-range              (CSS scroll-driven path)
       class names, in the stack-card--* family
   Never writes transform, rotate or translate. Those belong to the tilt
   module, and `transform` in particular would silently wipe it.

   Loads on every page. Pages with no [data-stack-item] fall straight out.
   ========================================================================== */

(function () {
    'use strict';

    var doc = document;
    var root = doc.documentElement;

    if (!root || !doc.querySelectorAll || typeof window.requestAnimationFrame !== 'function') {
        return;
    }

    var all = doc.querySelectorAll('[data-stack-item]');
    if (all.length < 2) {
        return; /* One card is not a stack, and no cards is not a page we touch. */
    }

    /* ----------------------------------------------------------------------
       Configuration
       ---------------------------------------------------------------------- */

    /* Kept in step with the off-switch media queries in css/stack.css. */
    var MIN_WIDTH = '(min-width: 48em)';
    var MIN_HEIGHT = '(min-height: 40em)';
    var REDUCED = '(prefers-reduced-motion: reduce)';

    /* Breathing room kept below a stuck card, so a card at rest is never
       pixel-flush with the bottom edge of the viewport. Deliberately tiny:
       this is not a design margin, it is the tolerance on a content-safety
       test, and every pixel spent here is a pixel of card height that the
       guard in measure() refuses to stack. */
    var BOTTOM_GAP = 4;

    /* Progress is written at three decimals. Anything finer is below the
       precision of a sub-pixel scale and only costs style recalculations. */
    var QUANT = 1000;

    /* Fallbacks used only if the page somehow renders without css/stack.css. */
    var FALLBACK_TOP = 96;
    var FALLBACK_FAN = 6;
    var FALLBACK_SCALE = 0.055;

    /* ----------------------------------------------------------------------
       Feature detection

       The brief's probe is `animation-timeline: view()`, and that is the flag
       that gates the whole scroll-driven animation feature. The timeline this
       module actually uses is scroll(), because only a scroll timeline accepts
       an animation-range expressed in raw scroll offsets, and raw offsets are
       what make the pinning math exact. A view() timeline stalls the moment a
       card sticks, since a stuck card stops moving through the scrollport.

       registerProperty stands in for @property support: the keyframes
       interpolate registered <number> custom properties, so without it the
       CSS path would snap from 0 to 1 instead of easing through.
       ---------------------------------------------------------------------- */

    var canCssDrive = (
        typeof window.CSS !== 'undefined' &&
        typeof window.CSS.supports === 'function' &&
        typeof window.CSS.registerProperty === 'function' &&
        window.CSS.supports('animation-timeline: view()') &&
        window.CSS.supports('animation-timeline: scroll(root block)') &&
        window.CSS.supports('animation-range: 100px 200px')
    );

    /* ----------------------------------------------------------------------
       State
       ---------------------------------------------------------------------- */

    var groups = [];       /* [{ parent, cards[], isGrid }] */
    var pairs = [];        /* [{ lower, upper, from, span, last }] one per adjacent pair */
    var touched = [];      /* every card we have written to, for teardown */

    var active = false;    /* stacking currently applied */
    var measuring = false; /* guards the resize observers during a measure pass */
    var frame = 0;         /* pending rAF id */
    var needsMeasure = false;
    var destroyed = false;

    var mqWidth = null;
    var mqHeight = null;
    var mqMotion = null;
    var ro = null;

    /* ----------------------------------------------------------------------
       Small helpers
       ---------------------------------------------------------------------- */

    function clamp01(n) {
        return n < 0 ? 0 : (n > 1 ? 1 : n);
    }

    function mq(query) {
        if (typeof window.matchMedia !== 'function') return null;
        try {
            return window.matchMedia(query);
        } catch (e) {
            return null;
        }
    }

    function listen(target, type, fn, opts) {
        if (target && typeof target.addEventListener === 'function') {
            target.addEventListener(type, fn, opts);
        }
    }

    function unlisten(target, type, fn, opts) {
        if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener(type, fn, opts);
        }
    }

    /* matchMedia change listeners: addEventListener on anything current,
       addListener on anything that predates it. */
    function onMq(m, fn) {
        if (!m) return;
        if (typeof m.addEventListener === 'function') m.addEventListener('change', fn);
        else if (typeof m.addListener === 'function') m.addListener(fn);
    }

    function offMq(m, fn) {
        if (!m) return;
        if (typeof m.removeEventListener === 'function') m.removeEventListener('change', fn);
        else if (typeof m.removeListener === 'function') m.removeListener(fn);
    }

    /* ----------------------------------------------------------------------
       Should the effect run at all?

       Three independent vetoes: a viewport too narrow to hold a pile beside
       its own gutters, a viewport too short for a stuck card to be readable,
       and any request for reduced motion. The site's own toggle is checked
       alongside the OS preference, because a visitor can opt out even when
       the OS has not.
       ---------------------------------------------------------------------- */

    function motionAllowed() {
        if (root.getAttribute('data-motion') === 'reduced') return false;
        return !(mqMotion && mqMotion.matches);
    }

    function shouldRun() {
        if (destroyed) return false;
        if (mqWidth && !mqWidth.matches) return false;
        if (mqHeight && !mqHeight.matches) return false;
        return motionAllowed();
    }

    /* ----------------------------------------------------------------------
       Grouping

       The markup has no list wrapper: cards are plain siblings, sometimes
       mixed in with section headings. Group them by common parent, in
       document order, which is the order querySelectorAll already returns.
       ---------------------------------------------------------------------- */

    function buildGroups() {
        var byParent = [];
        var i;

        for (i = 0; i < all.length; i++) {
            var el = all[i];
            var parent = el.parentNode;
            if (!parent || parent.nodeType !== 1) continue;

            var bucket = null;
            for (var j = 0; j < byParent.length; j++) {
                if (byParent[j].parent === parent) { bucket = byParent[j]; break; }
            }
            if (!bucket) {
                bucket = { parent: parent, cards: [], isGrid: false };
                byParent.push(bucket);
            }
            bucket.cards.push(el);
        }

        /* A lone card in a parent has nothing to stack against. */
        groups = byParent.filter(function (g) { return g.cards.length > 1; });
    }

    /* ----------------------------------------------------------------------
       Reading the dials out of CSS

       css/stack.css is the single source of truth for the numbers. Rather
       than re-derive nav height here, a throwaway probe resolves the two
       length dials to px. This costs one layout, inside a pass that is
       already forcing one.
       ---------------------------------------------------------------------- */

    function readDials() {
        var dials = { top: FALLBACK_TOP, fan: FALLBACK_FAN, scale: FALLBACK_SCALE };
        var probe = doc.createElement('div');

        probe.style.cssText =
            'position:absolute;top:0;left:0;width:0;visibility:hidden;' +
            'pointer-events:none;contain:strict;';
        doc.body.appendChild(probe);

        try {
            probe.style.height = 'var(--stack-top, ' + FALLBACK_TOP + 'px)';
            var t = probe.getBoundingClientRect().height;
            if (t > 0) dials.top = t;

            probe.style.height = 'var(--stack-fan, ' + FALLBACK_FAN + 'px)';
            var f = probe.getBoundingClientRect().height;
            if (f > 0) dials.fan = f;

            var raw = parseFloat(
                window.getComputedStyle(root).getPropertyValue('--stack-scale')
            );
            if (!isNaN(raw) && raw >= 0 && raw < 0.5) dials.scale = raw;
        } catch (e) {
            /* Keep the fallbacks. */
        }

        if (probe.parentNode) probe.parentNode.removeChild(probe);
        return dials;
    }

    /* ----------------------------------------------------------------------
       Measure

       One pass, reads first and writes second, never interleaved.

       Sticky positioning is switched off for the duration of the reads, so
       that getBoundingClientRect reports each card's normal-flow position
       rather than wherever it currently happens to be pinned. The attribute
       goes back on before the pass returns, inside the same task, so nothing
       is ever painted in the un-stacked state.
       ---------------------------------------------------------------------- */

    function measure() {
        measuring = true;
        teardownGeometry();

        root.removeAttribute('data-stack');
        active = false;

        var dials = readDials();
        var scrollY = window.pageYOffset || root.scrollTop || 0;
        var viewH = window.innerHeight || root.clientHeight || 0;
        var g, i;

        /* ---- reads ---- */
        var measured = [];
        for (g = 0; g < groups.length; g++) {
            var group = groups[g];
            var rows = [];
            for (i = 0; i < group.cards.length; i++) {
                var card = group.cards[i];
                var rect = card.getBoundingClientRect();
                rows.push({
                    el: card,
                    docTop: rect.top + scrollY,
                    left: rect.left,
                    height: card.offsetHeight
                });
            }
            group.isGrid = (
                window.getComputedStyle(group.parent).display.indexOf('grid') !== -1
            );
            measured.push(rows);
        }

        /* ---- compute ---- */
        var plan = [];

        for (g = 0; g < groups.length; g++) {
            var rows2 = measured[g];
            var ok = rows2.length > 1;

            /* The flex conversion in css/stack.css is only safe on a genuine
               single column. Anything laid out in more than one column is
               left alone: converting it would be a real layout change, and a
               side-by-side pair does not stack in the first place. */
            for (i = 1; ok && i < rows2.length; i++) {
                if (Math.abs(rows2[i].left - rows2[0].left) > 1) ok = false;
                if (rows2[i].docTop <= rows2[i - 1].docTop) ok = false;
            }

            /* A card taller than the space under the nav would pin with its
               tail below the fold and no way to scroll to it, which traps
               content. Rather than stack part of a group, the whole group
               opts out: a half-pile reads as a bug. `lift` accumulates as the
               loop goes, so the test uses each card's real resting position. */
            var lift = 0;
            var tops = [];
            for (i = 0; ok && i < rows2.length; i++) {
                var top = dials.top + lift;
                if (rows2[i].height > viewH - top - BOTTOM_GAP) ok = false;
                tops.push(top);

                /* Scaling happens about the card's centre, because the tilt
                   module owns transform-origin. A card shrinking by `scale`
                   therefore lifts its own top edge by half of that, which
                   would swallow a fixed fan offset on any tall card. Widening
                   the next card's offset by exactly that amount keeps the
                   visible sliver at --stack-fan whatever the card's height. */
                lift += dials.fan + (rows2[i].height * dials.scale) / 2;
            }

            if (!ok) continue;

            var planned = { group: groups[g], tops: tops, pairs: [] };

            for (i = 0; i < rows2.length - 1; i++) {
                /* The window over which card i is buried by card i+1.

                   from: the scroll position at which card i+1's top edge
                         reaches the bottom edge of card i sitting at rest,
                         i.e. the first moment they actually overlap.
                   to:   the scroll position at which card i+1 itself comes to
                         rest, i.e. the moment it has finished covering.

                   Both are absolute scroll offsets, which is what lets the
                   CSS path hand them straight to animation-range. `from` is
                   floored at card i's own resting point so that a card can
                   never start receding before it has arrived. */
                var from = rows2[i + 1].docTop - tops[i] - rows2[i].height;
                var to = rows2[i + 1].docTop - tops[i + 1];
                var arrives = rows2[i].docTop - tops[i];

                if (from < arrives) from = arrives;

                var span = to - from;
                if (span < 1) continue; /* degenerate: nothing to animate */

                planned.pairs.push({
                    lower: rows2[i].el,
                    upper: rows2[i + 1].el,
                    from: from,
                    span: span,
                    to: to,
                    last: -1
                });
            }

            if (planned.pairs.length) plan.push(planned);
        }

        /* ---- writes ---- */
        var mode = canCssDrive ? 'css' : 'raf';

        for (g = 0; g < plan.length; g++) {
            var p = plan[g];
            var cards = p.group.cards;

            if (p.group.isGrid) p.group.parent.setAttribute('data-stack-group', '');

            for (i = 0; i < cards.length; i++) {
                cards[i].classList.add('stack-card');
                cards[i].style.setProperty('--stack-lift', (p.tops[i] - dials.top) + 'px');
                if (touched.indexOf(cards[i]) === -1) touched.push(cards[i]);
            }

            for (i = 0; i < p.pairs.length; i++) {
                var pair = p.pairs[i];
                pair.lower.classList.add('stack-card--buries');
                pair.upper.classList.add('stack-card--covers');
                pairs.push(pair);

                if (mode === 'css') {
                    /* Each card can be on both sides of the pile at once: it
                       is buried by the card after it while it covers the card
                       before it. Those are two different scroll windows, so
                       the animation lists are built per card rather than set
                       from a stylesheet rule. */
                    addAnimation(pair.lower, 'stack-bury', pair.from, pair.to);
                    addAnimation(pair.upper, 'stack-cover', pair.from, pair.to);
                }
            }
        }

        root.setAttribute('data-stack-mode', mode);
        if (pairs.length && shouldRun()) {
            root.setAttribute('data-stack', 'on');
            active = true;
        }

        measuring = false;
    }

    /* Appends one entry to a card's inline animation-name / animation-range
       lists. The two lists stay index-aligned, which is what pairs a name
       with its own scroll window. */
    function addAnimation(el, name, from, to) {
        var names = el.style.animationName;
        var ranges = el.style.animationRange;
        var range = from + 'px ' + to + 'px';

        el.style.animationName = names ? names + ', ' + name : name;
        el.style.animationRange = ranges ? ranges + ', ' + range : range;
    }

    /* ----------------------------------------------------------------------
       Frame

       One rAF for every card on the page. Scroll events only raise a flag and
       ask for a frame; the frame does a single read of scrollY and then pure
       arithmetic, so no layout is read and no layout is written mid-loop.
       Nothing is written unless the quantised value actually moved.
       ---------------------------------------------------------------------- */

    function tick() {
        frame = 0;

        if (needsMeasure) {
            needsMeasure = false;
            measure();
            /* Ranges changed, so the current positions need re-publishing. */
        }

        if (!active || root.getAttribute('data-stack-mode') === 'css') return;

        var scrollY = window.pageYOffset || root.scrollTop || 0;

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            var p = clamp01((scrollY - pair.from) / pair.span);
            p = Math.round(p * QUANT) / QUANT;

            if (p === pair.last) continue;
            pair.last = p;

            pair.lower.style.setProperty('--stack-depth', p);
            pair.upper.style.setProperty('--stack-cover', p);
        }
    }

    function schedule() {
        if (!frame && !destroyed) frame = window.requestAnimationFrame(tick);
    }

    function scheduleMeasure() {
        needsMeasure = true;
        schedule();
    }

    /* ----------------------------------------------------------------------
       Enable / disable
       ---------------------------------------------------------------------- */

    function sync() {
        if (destroyed) return;

        if (shouldRun()) {
            if (!active) {
                scheduleMeasure();
            }
            return;
        }

        if (active || root.hasAttribute('data-stack')) {
            root.removeAttribute('data-stack');
            active = false;
            resetProgress();
        }
    }

    /* Returns every card to depth zero so that nothing is left mid-recede
       when the effect switches off. */
    function resetProgress() {
        for (var i = 0; i < pairs.length; i++) {
            pairs[i].last = -1;
            pairs[i].lower.style.removeProperty('--stack-depth');
            pairs[i].upper.style.removeProperty('--stack-cover');
        }
    }

    /* ----------------------------------------------------------------------
       Events
       ---------------------------------------------------------------------- */

    function onScroll() {
        schedule();
    }

    function onResize() {
        if (!measuring) scheduleMeasure();
        sync();
    }

    function onMotionChange() {
        sync();
        schedule();
    }

    function onObserved() {
        /* Fires while measure() is toggling position and classes. Ignoring it
           there is what stops the pass from re-triggering itself. */
        if (!measuring) scheduleMeasure();
    }

    /* ----------------------------------------------------------------------
       Teardown
       ---------------------------------------------------------------------- */

    /* Undoes everything measure() wrote, without touching the effect's own
       enabled/disabled state. */
    function teardownGeometry() {
        var i;

        for (i = 0; i < groups.length; i++) {
            groups[i].parent.removeAttribute('data-stack-group');
        }

        for (i = 0; i < touched.length; i++) {
            var el = touched[i];
            el.classList.remove('stack-card', 'stack-card--buries', 'stack-card--covers');
            el.style.removeProperty('--stack-lift');
            el.style.removeProperty('--stack-depth');
            el.style.removeProperty('--stack-cover');
            el.style.removeProperty('animation-name');
            el.style.removeProperty('animation-range');
        }

        touched = [];
        pairs = [];
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;

        if (frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
        }

        unlisten(window, 'scroll', onScroll);
        unlisten(window, 'resize', onResize);
        unlisten(window, 'orientationchange', onResize);
        unlisten(window, 'motionchange', onMotionChange);
        unlisten(window, 'load', scheduleMeasure);
        unlisten(window, 'pagehide', destroy);

        offMq(mqWidth, onResize);
        offMq(mqHeight, onResize);
        offMq(mqMotion, onMotionChange);

        if (ro) {
            ro.disconnect();
            ro = null;
        }

        teardownGeometry();
        root.removeAttribute('data-stack');
        root.removeAttribute('data-stack-mode');
        active = false;
    }

    /* ----------------------------------------------------------------------
       Start
       ---------------------------------------------------------------------- */

    function init() {
        buildGroups();
        if (!groups.length) return;

        mqWidth = mq(MIN_WIDTH);
        mqHeight = mq(MIN_HEIGHT);
        mqMotion = mq(REDUCED);

        onMq(mqWidth, onResize);
        onMq(mqHeight, onResize);
        onMq(mqMotion, onMotionChange);

        listen(window, 'scroll', onScroll, { passive: true });
        listen(window, 'resize', onResize, { passive: true });
        listen(window, 'orientationchange', onResize, { passive: true });

        /* The site publishes its motion setting on documentElement.dataset
           and announces changes with this event. Both directions are handled:
           sync() re-measures on the way back to full motion and strips the
           attribute on the way to reduced. */
        listen(window, 'motionchange', onMotionChange);

        /* Late images and webfonts change card heights, which moves every
           scroll window in the group. */
        listen(window, 'load', scheduleMeasure);
        listen(window, 'pagehide', destroy);

        if (typeof window.ResizeObserver === 'function') {
            ro = new window.ResizeObserver(onObserved);
            for (var g = 0; g < groups.length; g++) {
                ro.observe(groups[g].parent);
                for (var i = 0; i < groups[g].cards.length; i++) {
                    ro.observe(groups[g].cards[i]);
                }
            }
        }

        sync();
    }

    if (doc.readyState === 'loading') {
        listen(doc, 'DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
}());
