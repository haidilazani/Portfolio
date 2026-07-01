/* ==========================================================================
   Site-wide behaviour: theme toggle, liquid nav indicator,
   page transitions, scroll reveal, contact form.
   Note: each page sets data-theme early in <head> to avoid a flash.
   ========================================================================== */

(function () {
    'use strict';

    /* ----- Theme toggle -------------------------------------------------- */
    const root = document.documentElement;

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            setTheme(next);
        });
    }

    /* ----- Liquid nav indicator ------------------------------------------ */
    const navList = document.querySelector('.nav-links');
    const indicator = document.querySelector('.nav-indicator');

    function currentPage() {
        const path = location.pathname.split('/').pop() || 'index.html';
        return path;
    }

    let activeLink = null;

    function moveIndicator(link, instant) {
        if (!indicator || !link) return;
        const listRect = navList.getBoundingClientRect();
        const rect = link.getBoundingClientRect();
        if (instant) indicator.style.transition = 'none';
        indicator.style.left = (rect.left - listRect.left) + 'px';
        indicator.style.width = rect.width + 'px';
        indicator.classList.add('visible');
        if (instant) {
            // Force reflow so the next move animates again
            void indicator.offsetWidth;
            indicator.style.transition = '';
        }
    }

    if (navList && indicator) {
        const links = navList.querySelectorAll('a');
        const page = currentPage();

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === page) {
                link.classList.add('active');
                activeLink = link;
            }
            link.addEventListener('mouseenter', () => moveIndicator(link));
        });

        navList.addEventListener('mouseleave', () => {
            if (activeLink) {
                moveIndicator(activeLink);
            } else {
                indicator.classList.remove('visible');
            }
        });

        if (activeLink) {
            // Wait a frame so fonts/layout settle before measuring
            requestAnimationFrame(() => moveIndicator(activeLink, true));
        }

        window.addEventListener('resize', () => {
            if (activeLink) moveIndicator(activeLink, true);
        });
    }

    /* ----- Compact nav on scroll ------------------------------------------ */
    const siteNav = document.querySelector('.site-nav');
    if (siteNav) {
        window.addEventListener('scroll', () => {
            siteNav.classList.toggle('scrolled', window.scrollY > 24);
        }, { passive: true });
    }

    /* ----- Page transitions ------------------------------------------------ */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link || reduceMotion) return;

        const href = link.getAttribute('href');
        if (!href || link.target === '_blank') return;
        // Only intercept internal page links (not anchors, mail, external)
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
        if (href === currentPage()) return;

        e.preventDefault();
        document.body.classList.add('page-exit');
        setTimeout(() => { location.href = href; }, 280);
    });

    // Restore state when navigating back from bfcache
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) document.body.classList.remove('page-exit');
    });

    /* ----- Scroll reveal ----------------------------------------------------- */
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(el => observer.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('visible'));
    }

    /* ----- Contact form (GitHub Pages friendly: opens mail client) -------- */
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = form.querySelector('#name').value.trim();
            const email = form.querySelector('#email').value.trim();
            const subject = form.querySelector('#subject').value.trim();
            const message = form.querySelector('#message').value.trim();

            const body = message + '\n\n— ' + name + ' (' + email + ')';
            location.href = 'mailto:haidilazani@gmail.com'
                + '?subject=' + encodeURIComponent(subject)
                + '&body=' + encodeURIComponent(body);
        });
    }
})();
