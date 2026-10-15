/* ==========================================================================
   draft-writing.js - the essay index accordion on draft-blog.html (draft)
   --------------------------------------------------------------------------
   Pattern: WAI-ARIA APG Accordion. Each row header is an <h2> whose only
   child is a <button aria-expanded aria-controls>; the panel it controls is
   role="region" aria-labelledby the button.

   - Many rows may be open at once (opening one never moves the one you are
     reading).
   - Enter / Space toggle (native button). ArrowDown / ArrowUp move between
     row headers, Home / End jump to the first / last (APG optional keys).
   - The height animation is pure CSS (grid-template-rows 0fr -> 1fr, see
     css/draft-theme.css section 8); a collapsed panel is also
     visibility: hidden, so its content leaves the tab order and a11y tree.
     Reduced motion is handled by main.css's kill switch (1ms transitions);
     nothing here animates in JS.
   - Rows ship expanded in the HTML. This script collapses them, marks the
     list .is-ready and drops html.accordion-pending (set by the inline head
     gate, which releases the page itself if this script never runs).
   - Deep link: draft-blog.html#essay-<slug> opens that row, on load and on
     hashchange. The id sits on the row's <li>, so the browser's own
     fragment scroll lands on the row header (with the site's [id]
     scroll-margin under the nav) and this script never scrolls. The
     fragment navigation's focus fallback moves focus to the viewport, so
     focus is put on the row's button after it, on `load` / `hashchange`.
     #essay-<slug>-panel and #essay-<slug>-btn work too. Toggling never
     rewrites the URL.
   - Silent no-op on a page without [data-accordion].
   ========================================================================== */

(function () {
    'use strict';

    var root = document.documentElement;
    var list = document.querySelector('[data-accordion]');
    if (!list) {
        root.classList.remove('accordion-pending');
        return;
    }

    var triggers = Array.prototype.slice.call(list.querySelectorAll('.essay-trigger[aria-controls]'));
    if (!triggers.length) {
        root.classList.remove('accordion-pending');
        return;
    }

    function panelOf(btn) {
        return document.getElementById(btn.getAttribute('aria-controls'));
    }

    function isOpen(btn) {
        return btn.getAttribute('aria-expanded') === 'true';
    }

    function set(btn, open) {
        var panel = panelOf(btn);
        if (!panel) return;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.classList.toggle('is-open', open);
    }

    function onKeyDown(e) {
        var i = triggers.indexOf(e.currentTarget);
        var next = -1;
        if (e.key === 'ArrowDown') next = (i + 1) % triggers.length;
        else if (e.key === 'ArrowUp') next = (i - 1 + triggers.length) % triggers.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = triggers.length - 1;
        if (next === -1 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        triggers[next].focus();
    }

    triggers.forEach(function (btn) {
        set(btn, false);
        btn.addEventListener('click', function () { set(btn, !isOpen(btn)); });
        btn.addEventListener('keydown', onKeyDown);
    });

    /* Collapse is now owned by .is-ready; release the pre-paint gate. */
    list.classList.add('is-ready');
    root.classList.remove('accordion-pending');

    function triggerForHash() {
        var id = '';
        try { id = decodeURIComponent((location.hash || '').slice(1)); } catch (err) { return null; }
        if (!id) return null;
        for (var i = 0; i < triggers.length; i++) {
            var btn = triggers[i];
            var row = btn.closest ? btn.closest('.essay') : null;
            if ((row && row.id === id) || btn.id === id || btn.getAttribute('aria-controls') === id) return btn;
        }
        return null;
    }

    function focusQuietly(btn) {
        try { btn.focus({ preventScroll: true }); } catch (err) { btn.focus(); }
    }

    /* Initial load: open now (before first paint where possible), focus once
       the browser has finished its own fragment scroll + focus fallback. */
    var initial = triggerForHash();
    if (initial) {
        set(initial, true);
        var focusInitial = function () {
            setTimeout(function () {
                var a = document.activeElement;
                if (!a || a === document.body || a === root) focusQuietly(initial);
            }, 0);
        };
        if (document.readyState === 'complete') focusInitial();
        else window.addEventListener('load', focusInitial, { once: true });
    }

    /* Later hash changes (typed URL, history): the browser has already
       scrolled to the row by the time this fires. */
    window.addEventListener('hashchange', function () {
        var btn = triggerForHash();
        if (!btn) return;
        set(btn, true);
        focusQuietly(btn);
    });
})();
