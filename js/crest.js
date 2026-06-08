/**
 * CREST Studio — crest.js
 * Core interactions: mobile nav, scroll reveal, portfolio Supabase loader, footer dates.
 * ─────────────────────────────────────────────────────────────────
 * Sections:
 *   1. Mobile Navigation
 *   2. Scroll Reveal Observer
 *   3. Portfolio — Dynamic Supabase Loader
 *   4. Footer Dates
 * ─────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─── 1. MOBILE NAVIGATION ─────────────────────────────────── */

    const navToggle = document.getElementById('nav-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileLinks = mobileNav ? mobileNav.querySelectorAll('.mobile-nav__link') : [];

    function openMenu() {
        mobileNav.classList.add('is-open');
        mobileNav.setAttribute('aria-hidden', 'false');
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'Cerrar menú');
        document.body.style.overflow = 'hidden';

        // Animate hamburger → X
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = 'translateY(6px) rotate(45deg)';
        spans[1].style.opacity   = '0';
        spans[2].style.transform = 'translateY(-6px) rotate(-45deg)';
    }

    function closeMenu() {
        mobileNav.classList.remove('is-open');
        mobileNav.setAttribute('aria-hidden', 'true');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
        document.body.style.overflow = '';

        // Reset hamburger
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity   = '';
        spans[2].style.transform = '';
    }

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            const isOpen = mobileNav.classList.contains('is-open');
            isOpen ? closeMenu() : openMenu();
        });
    }

    // Close on link click
    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) {
            closeMenu();
        }
    });


    /* ─── 2. SCROLL REVEAL OBSERVER ────────────────────────────── */

    const revealEls = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // fire once
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -50px 0px'
        });

        revealEls.forEach(el => observer.observe(el));
    } else {
        // Fallback: show all immediately
        revealEls.forEach(el => el.classList.add('is-visible'));
    }


    /* ─── 3. PORTFOLIO — DYNAMIC SUPABASE LOADER ───────────────── */

    /**
     * Attempts to load portfolio projects from Supabase.
     * Falls back silently to static HTML placeholders if:
     *   - db is not available
     *   - the query returns an error or no rows
     */
    async function loadPortfolio() {
        const grid = document.getElementById('portfolio-grid');
        if (!grid) return;

        function optimizeStorageUrl(url) {
            if (!url) return '';
            if (url.includes('vojwdyubksoozhyvnbfu.supabase.co/storage/v1/object/public/')) {
                return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?format=webp&quality=80';
            }
            return url;
        }

        // Guard: Supabase client must be available (loaded via supabase.js)
        if (typeof window.db === 'undefined') return;

        try {
            const { data: projects, error } = await window.db
                .from('projects')
                .select('id, slug, client_name, main_image, category')
                .eq('is_featured', true)
                .order('created_at', { ascending: false })
                .limit(4);

            if (error || !projects || projects.length === 0) return;

            // Clear static placeholders
            grid.innerHTML = '';

            // Asymmetric grid spans for visual rhythm
            const spans = [7, 5, 5, 7];

            projects.forEach((project, idx) => {
                const item = document.createElement('a');
                item.href      = `/system/${project.slug}`;
                item.className = `project-item reveal${idx > 0 ? ' reveal-delay-' + Math.min(idx, 3) : ''}`;
                item.id        = `project-${project.slug}`;
                
                const client = project.client_name || '??';
                const category = project.category || '';
                
                item.setAttribute('aria-label', `Ver proyecto: ${client} — ${category}`);
                item.style.setProperty('--col-span', spans[idx] || 6);

                const indexStr = String(idx + 1).padStart(2, '0');
                let imageHtml = '';
                if (project.main_image) {
                    imageHtml = `
                        <img
                            src="${optimizeStorageUrl(project.main_image)}"
                            alt="${client} — ${category}"
                            class="project-item__img"
                            loading="lazy"
                        />
                    `;
                }

                item.innerHTML = `
                    <div class="project-item__bg">
                        <span class="project-item__placeholder" aria-hidden="true">${indexStr}</span>
                    </div>
                    ${imageHtml}
                    <div class="project-item__overlay" aria-hidden="true"></div>
                    <div class="project-item__info">
                        <span class="project-item__client">${client}</span>
                        <span class="project-item__category">${category}</span>
                    </div>
                `;

                grid.appendChild(item);
            });

            // Re-observe newly added elements
            const newItems = grid.querySelectorAll('.reveal');
            if ('IntersectionObserver' in window) {
                const obs = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-visible');
                            obs.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });
                newItems.forEach(el => obs.observe(el));
            } else {
                newItems.forEach(el => el.classList.add('is-visible'));
            }

        } catch (err) {
            // Silent fail — static placeholders remain visible
            console.warn('[CREST] Portfolio load skipped:', err.message);
        }
    }

    loadPortfolio();


    /* ─── 4. FOOTER DATES ──────────────────────────────────────── */

    const currentYear = new Date().getFullYear();

    const yearEl  = document.getElementById('footer-year');
    const buildEl = document.getElementById('build-date');

    if (yearEl)  yearEl.textContent  = currentYear;
    if (buildEl) buildEl.textContent = currentYear;

    /* ─── 5. ANALOG NOISE OVERLAY INJECTION ────────────────────── */
    const noise = document.createElement('div');
    noise.className = 'noise-overlay';
    noise.setAttribute('aria-hidden', 'true');
    document.body.appendChild(noise);

    /* ─── 6. DYNAMIC SYSTEM STATUS CHECK ───────────────────────── */
    async function checkSystemStatus() {
        const dot = document.querySelector('.footer__perf-dot');
        if (!dot) return;
        const perfText = dot.parentElement;

        if (typeof window.db === 'undefined') {
            dot.style.backgroundColor = '#e53e3e';
            dot.style.boxShadow = 'none';
            perfText.innerHTML = '<span class="footer__perf-dot" style="background-color:#e53e3e;box-shadow:none;" aria-hidden="true"></span>Systems Degraded';
            return;
        }

        try {
            const { error } = await window.db.from('projects').select('id', { count: 'exact', head: true });
            if (error) throw error;
        } catch (err) {
            console.warn('[CREST] Database connection failed, degrading system status:', err.message);
            dot.style.backgroundColor = '#e53e3e';
            dot.style.boxShadow = 'none';
            perfText.innerHTML = '<span class="footer__perf-dot" style="background-color:#e53e3e;box-shadow:none;" aria-hidden="true"></span>Systems Degraded';
        }
    }
    checkSystemStatus();

    /* ─── 7. DYNAMIC FOOTER SETTINGS LOADER ────────────────────── */
    async function loadDynamicFooterSettings() {
        if (typeof window.db === 'undefined') return;

        try {
            const { data: settings, error } = await window.db
                .from('system_settings')
                .select('behance_url, linkedin_url, contact_email')
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .single();

            if (error || !settings) return;

            // Update email
            const emailEl = document.getElementById('footer-email');
            if (emailEl) {
                emailEl.href = `mailto:${settings.contact_email}`;
                emailEl.textContent = settings.contact_email;
            }

            // Update socials
            const socialsEl = document.querySelector('.footer__socials');
            if (socialsEl) {
                socialsEl.innerHTML = '';
                
                const links = [];
                if (settings.behance_url) {
                    links.push(`<a href="${settings.behance_url}" target="_blank" rel="noopener" class="footer__social-link" id="footer-social-behance">Behance</a>`);
                }
                if (settings.linkedin_url) {
                    links.push(`<a href="${settings.linkedin_url}" target="_blank" rel="noopener" class="footer__social-link" id="footer-social-linkedin">LinkedIn</a>`);
                }

                socialsEl.innerHTML = links.join('<span class="social-separator">/</span>');
            }
        } catch (err) {
            console.warn('[CREST] Dynamic settings load skipped:', err.message);
        }
    }
    loadDynamicFooterSettings();

});
