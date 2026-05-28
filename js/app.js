/**
 * STRN Studio — app.js (Homepage)
 * Handles: custom cursor, reveal animations, portfolio preview (Supabase),
 *          category filters, contact form (lead submission), blog preview.
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ------------------------------------------------------------------ //
    //  CUSTOM CURSOR
    // ------------------------------------------------------------------ //
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
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
        el.addEventListener('mouseenter', () => { cursor.classList.add('hovered'); cursorFollower.classList.add('hovered'); });
        el.addEventListener('mouseleave', () => { cursor.classList.remove('hovered'); cursorFollower.classList.remove('hovered'); });
    });

    // ------------------------------------------------------------------ //
    //  HEADER SCROLL
    // ------------------------------------------------------------------ //
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // ------------------------------------------------------------------ //
    //  INTERSECTION OBSERVER (Reveal)
    // ------------------------------------------------------------------ //
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ------------------------------------------------------------------ //
    //  PARALLAX
    // ------------------------------------------------------------------ //
    window.addEventListener('scroll', () => {
        document.querySelectorAll('.parallax-container').forEach(container => {
            const img  = container.querySelector('.parallax-img');
            const rect = container.getBoundingClientRect();
            if (img && rect.top <= window.innerHeight && rect.bottom >= 0) {
                img.style.transform = `translateY(${-(rect.top * 0.15) - 10}%)`;
            }
        });
    });

    // ------------------------------------------------------------------ //
    //  MOBILE MENU
    // ------------------------------------------------------------------ //
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) mobileBtn.addEventListener('click', () => alert('Mobile menu toggle'));

    // ------------------------------------------------------------------ //
    //  PORTFOLIO (Supabase) — Homepage preview (up to 4)
    // ------------------------------------------------------------------ //
    const portfolioContainer = document.getElementById('dynamic-portfolio');
    const filterBtns         = document.querySelectorAll('.filter-btn');
    let allCategories        = [];

    // Skeleton helper
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

    async function loadCategories() {
        const { data } = await db.from('categories').select('id, name, slug');
        if (data) allCategories = data;
    }

    async function renderProjects(categoryId = null) {
        if (!portfolioContainer) return;
        showSkeletons(portfolioContainer, 4);

        let query = db.from('projects')
            .select('id, title, slug, main_image, category_id, is_featured')
            .order('created_at', { ascending: false })
            .limit(4);

        if (categoryId) query = query.eq('category_id', categoryId);

        const { data: projects, error } = await query;

        portfolioContainer.innerHTML = '';

        if (error || !projects || projects.length === 0) {
            portfolioContainer.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:4rem 0;">No projects found.</p>';
            return;
        }

        projects.forEach((project, index) => {
            const cat  = allCategories.find(c => c.id === project.category_id);
            const card = document.createElement('div');
            card.className = 'project-card reveal';
            if (index === 0) card.classList.add('project-card--large');
            if (index === 3) card.classList.add('project-card--wide');

            const imgSrc = project.main_image || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';

            card.innerHTML = `
                <div class="project-card__image parallax-container" style="border-radius:24px;overflow:hidden;position:absolute;top:0;left:0;width:100%;height:100%;">
                    <img src="${imgSrc}" alt="${project.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                    <div class="project-card__overlay">
                        <a href="portfolio-post.html?slug=${project.slug}" class="view-project">View Case <i class="ph ph-arrow-up-right"></i></a>
                    </div>
                </div>
                <div class="project-card__info" style="position:absolute;bottom:0;left:0;right:0;padding:2rem;background:linear-gradient(to top,rgba(0,0,0,0.9),transparent);border-radius:0 0 24px 24px;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;">
                    <h3 style="margin:0;font-size:1.5rem;">${project.title}</h3>
                    <span style="color:var(--color-accent);font-weight:600;font-size:0.875rem;">${cat ? cat.name : ''}</span>
                </div>`;

            card.style.cssText = 'opacity:0;transform:translateY(20px);transition:opacity 0.5s ease,transform 0.5s ease;position:relative;';
            portfolioContainer.appendChild(card);
            setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 60 * index);

            revealObserver.observe(card);
        });
    }

    // Build dynamic filter buttons from categories
    async function buildFilters() {
        if (!filterBtns.length) return;
        const filterRow = document.querySelector('.portfolio-filters');
        if (!filterRow || allCategories.length === 0) return;

        // Clear dynamic buttons (keep "All Works")
        filterRow.querySelectorAll('.filter-btn[data-cat-id]').forEach(b => b.remove());

        allCategories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-cat-id', cat.id);
            btn.textContent = cat.name;
            filterRow.appendChild(btn);
        });

        filterRow.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                filterRow.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const catId = btn.getAttribute('data-cat-id') || null;
                renderProjects(catId);
            });
        });
    }

    if (portfolioContainer) {
        await loadCategories();
        await buildFilters();
        await renderProjects();
    }

    // ------------------------------------------------------------------ //
    //  BLOG PREVIEW (Latest 3 published posts) — Homepage
    // ------------------------------------------------------------------ //
    const blogPreviewContainer = document.getElementById('blog-preview');
    if (blogPreviewContainer) {
        blogPreviewContainer.innerHTML = '<div class="skeleton skeleton--text" style="height:200px;border-radius:16px;"></div>'.repeat(3);

        const { data: posts } = await db
            .from('blog_posts')
            .select('id, title, slug, excerpt, featured_image, published_at, status')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(3);

        blogPreviewContainer.innerHTML = '';

        if (posts && posts.length > 0) {
            posts.forEach(post => {
                const el = document.createElement('a');
                el.href = `blog-post.html?slug=${post.slug}`;
                el.className = 'post-card';
                const imgSrc = post.featured_image || 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&q=80';
                const date   = post.published_at ? new Date(post.published_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                el.innerHTML = `
                    <div class="post-card__image"><img src="${imgSrc}" alt="${post.title}" loading="lazy"></div>
                    <div>
                        <div class="post-meta" style="margin-bottom:0.5rem;">
                            <span><i class="ph ph-calendar-blank"></i> ${date}</span>
                        </div>
                        <h3>${post.title}</h3>
                        <p>${post.excerpt || ''}</p>
                    </div>`;
                blogPreviewContainer.appendChild(el);
            });
        } else {
            blogPreviewContainer.innerHTML = '<p style="color:var(--color-text-muted);">No posts published yet.</p>';
        }
    }

    // ------------------------------------------------------------------ //
    //  CONTACT FORM → leads table
    // ------------------------------------------------------------------ //
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const origText  = submitBtn.innerHTML;

            submitBtn.disabled  = true;
            submitBtn.innerHTML = '<i class="ph ph-spinner" style="animation:spin 1s linear infinite"></i> Enviando...';

            const inputs = contactForm.querySelectorAll('input, textarea');
            const name   = inputs[0]?.value?.trim() || '';
            const email  = inputs[1]?.value?.trim() || '';
            const message = contactForm.querySelector('textarea')?.value?.trim() || '';

            if (!name || !email) {
                submitBtn.innerHTML = origText;
                submitBtn.disabled  = false;
                return;
            }

            const { error } = await db.from('leads').insert([{ name, email, message }]);

            if (error) {
                submitBtn.innerHTML = '⚠ Error. Inténtalo de nuevo.';
                submitBtn.style.background = '#e53e3e';
                setTimeout(() => { submitBtn.innerHTML = origText; submitBtn.style.background = ''; submitBtn.disabled = false; }, 3000);
            } else {
                submitBtn.innerHTML = '✓ Solicitud Enviada <i class="ph ph-check-circle"></i>';
                submitBtn.style.background = '#28a745';
                contactForm.reset();
                setTimeout(() => { submitBtn.innerHTML = origText; submitBtn.style.background = ''; submitBtn.disabled = false; }, 4000);
            }
        });
    }

});

// Spin keyframe (for loading spinner)
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);
