/**
 * CREST Studio — app.js
 * Homepage & auxiliary page interactions.
 * Unified schema: projects · articles · enlist_applications
 * ─────────────────────────────────────────────────────────────────────────
 * Sections:
 *   1. Custom Cursor
 *   2. Header Scroll
 *   3. Scroll Reveal Observer
 *   4. Parallax
 *   5. Portfolio Preview (projects table — schema unificado)
 *   6. Articles Preview  (articles table — schema unificado)
 *   7. Contact / Enlist form
 * ─────────────────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', async () => {

    /* ─── 1. CUSTOM CURSOR ───────────────────────────────────────── */

    const cursor         = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');

    if (cursor && cursorFollower) {
        let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.left = `${mouseX}px`;
            cursor.style.top  = `${mouseY}px`;
        });

        (function animateFollower() {
            followerX += (mouseX - followerX) * 0.15;
            followerY += (mouseY - followerY) * 0.15;
            cursorFollower.style.left = `${followerX}px`;
            cursorFollower.style.top  = `${followerY}px`;
            requestAnimationFrame(animateFollower);
        })();

        document.querySelectorAll('a, button, .bento-item, .project-card__image').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hovered');
                cursorFollower.classList.add('hovered');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hovered');
                cursorFollower.classList.remove('hovered');
            });
        });
    }


    /* ─── 2. HEADER SCROLL ───────────────────────────────────────── */

    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }


    /* ─── 3. SCROLL REVEAL OBSERVER ─────────────────────────────── */

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('active');
                e.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


    /* ─── 4. PARALLAX ────────────────────────────────────────────── */

    window.addEventListener('scroll', () => {
        document.querySelectorAll('.parallax-container').forEach(container => {
            const img  = container.querySelector('.parallax-img');
            const rect = container.getBoundingClientRect();
            if (img && rect.top <= window.innerHeight && rect.bottom >= 0) {
                img.style.transform = `translateY(${-(rect.top * 0.15) - 10}%)`;
            }
        });
    });


    /* ─── 5. PORTFOLIO PREVIEW ───────────────────────────────────── */
    /*
     * Reads from: public.projects
     * Schema: id, slug, client_name, project_title, category, main_image, is_featured
     * Routes: /system/:slug  (handled by Netlify _redirects → system-post.html?slug=)
     */

    const portfolioContainer = document.getElementById('dynamic-portfolio');

    // 5 categorías oficiales (cerrado — sin inputs libres)
    const OFFICIAL_CATEGORIES = [
        'VISUAL INFRASTRUCTURE',
        'DIGITAL SYSTEMS',
        'TANGIBLE MATTER',
        'CREATIVE DIRECTION',
        'SPECIAL OPERATIONS'
    ];

    function optimizeStorageUrl(url) {
        if (!url) return '';
        if (url.includes('.supabase.co/storage/v1/object/public/')) {
            return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?format=webp&quality=80';
        }
        return url;
    }

    function showSkeletons(container, count = 4) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const sk = document.createElement('div');
            sk.className = 'project-card skeleton-card';
            if (i === 0) sk.classList.add('project-card--large');
            if (i === 3) sk.classList.add('project-card--wide');
            sk.innerHTML = '<div class="skeleton skeleton--full"></div>';
            container.appendChild(sk);
        }
    }

    async function renderProjects(filterCategory = null) {
        if (!portfolioContainer) return;
        if (typeof window.db === 'undefined') return;

        showSkeletons(portfolioContainer, 4);

        let query = window.db
            .from('projects')
            .select('id, slug, client_name, project_title, category, main_image, is_featured')
            .order('created_at', { ascending: false })
            .limit(4);

        if (filterCategory) query = query.eq('category', filterCategory);

        const { data: projects, error } = await query;

        portfolioContainer.innerHTML = '';

        if (error || !projects || projects.length === 0) {
            portfolioContainer.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:4rem 0;">No projects found.</p>';
            return;
        }

        projects.forEach((project, index) => {
            const card = document.createElement('div');
            card.className = 'project-card reveal';
            if (index === 0) card.classList.add('project-card--large');
            if (index === 3) card.classList.add('project-card--wide');

            const imgSrc      = optimizeStorageUrl(project.main_image) || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';
            const displayName = project.project_title || project.client_name || '—';

            card.innerHTML = `
                <div class="project-card__image parallax-container" style="border-radius:24px;overflow:hidden;position:absolute;top:0;left:0;width:100%;height:100%;">
                    <img src="${imgSrc}" alt="${displayName}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                    <div class="project-card__overlay">
                        <a href="/system/${project.slug}" class="view-project">View Case <i class="ph ph-arrow-up-right"></i></a>
                    </div>
                </div>
                <div class="project-card__info" style="position:absolute;bottom:0;left:0;right:0;padding:2rem;background:linear-gradient(to top,rgba(0,0,0,0.9),transparent);border-radius:0 0 24px 24px;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;">
                    <h3 style="margin:0;font-size:1.5rem;">${displayName}</h3>
                    <span style="color:var(--color-accent);font-weight:600;font-size:0.875rem;">${project.category || ''}</span>
                </div>`;

            card.style.cssText = 'opacity:0;transform:translateY(20px);transition:opacity 0.5s ease,transform 0.5s ease;position:relative;';
            portfolioContainer.appendChild(card);
            setTimeout(() => {
                card.style.opacity   = '1';
                card.style.transform = 'translateY(0)';
            }, 60 * index);

            revealObserver.observe(card);
        });
    }

    // Build filter buttons from static OFFICIAL_CATEGORIES list
    function buildFilters() {
        const filterRow = document.querySelector('.portfolio-filters');
        if (!filterRow) return;

        filterRow.querySelectorAll('.filter-btn[data-cat]').forEach(b => b.remove());

        OFFICIAL_CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-cat', cat);
            btn.textContent = cat;
            filterRow.appendChild(btn);
        });

        filterRow.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const cat = btn.getAttribute('data-cat') || null;
                renderProjects(cat);
            });
        });
    }

    if (portfolioContainer) {
        buildFilters();
        await renderProjects();
    }


    /* ─── 6. ARTICLES PREVIEW ────────────────────────────────────── */
    /*
     * Reads from: public.articles
     * Schema: id, title, slug, read_time, published_date, body_content
     * Routes: /current/:slug  (handled by Netlify _redirects → current-post.html?slug=)
     */

    const blogPreviewContainer = document.getElementById('blog-preview');

    if (blogPreviewContainer && typeof window.db !== 'undefined') {
        blogPreviewContainer.innerHTML = '<div class="skeleton skeleton--text" style="height:200px;border-radius:16px;"></div>'.repeat(3);

        const { data: posts } = await window.db
            .from('articles')
            .select('id, title, slug, read_time, published_date, body_content')
            .order('created_at', { ascending: false })
            .limit(3);

        blogPreviewContainer.innerHTML = '';

        if (posts && posts.length > 0) {
            posts.forEach(post => {
                const el = document.createElement('a');
                el.href      = `/current/${post.slug}`;
                el.className = 'post-card';

                const excerpt = post.body_content
                    ? post.body_content.replace(/<[^>]*>/g, '').substring(0, 120) + '…'
                    : '';

                el.innerHTML = `
                    <div class="post-card__image" style="background:rgba(255,255,255,0.04);border-radius:12px;height:140px;margin-bottom:1rem;display:flex;align-items:center;justify-content:center;">
                        <i class="ph ph-article" style="font-size:2.5rem;color:var(--color-text-muted);"></i>
                    </div>
                    <div>
                        <div class="post-meta" style="margin-bottom:0.5rem;">
                            <span><i class="ph ph-clock"></i> ${post.read_time || ''}</span>
                            ${post.published_date ? `<span>${post.published_date}</span>` : ''}
                        </div>
                        <h3>${post.title}</h3>
                        <p style="color:var(--color-text-muted);font-size:0.875rem;">${excerpt}</p>
                    </div>`;

                blogPreviewContainer.appendChild(el);
            });
        } else {
            blogPreviewContainer.innerHTML = '<p style="color:var(--color-text-muted);">No articles published yet.</p>';
        }
    }


    /* ─── 7. CONTACT / ENLIST FORM ───────────────────────────────── */
    /*
     * If a legacy contact form is present (pages like billing.html),
     * redirect to /enlist.html instead of attempting a DB write
     * to the removed `leads` table.
     */

    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');

            submitBtn.disabled  = true;
            submitBtn.innerHTML = '<i class="ph ph-arrow-right"></i> Redirigiendo...';

            // Route to the official enlist briefing form
            window.location.href = '/enlist.html';
        });
    }

});


/* ─── SPIN KEYFRAME (loading indicator) ─────────────────────────── */

const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);
