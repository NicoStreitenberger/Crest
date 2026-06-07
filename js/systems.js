/**
 * STRN Studio — portfolio.js
 * Full mosaic portfolio page with Supabase + category filtering + skeleton loading.
 */

document.addEventListener('DOMContentLoaded', async () => {

    const container  = document.getElementById('full-portfolio');
    const filterRow  = document.querySelector('.portfolio-filters');
    let   allCategories = [];

    // ---- Skeletons ----
    function showSkeletons(count = 8) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const sk = document.createElement('div');
            sk.className = 'skeleton-card';
            sk.style.cssText = 'position:relative;';
            // Mosaic sizing
            if (i % 6 === 0) { sk.style.gridColumn = 'span 2'; sk.style.gridRow = 'span 2'; }
            else if (i % 6 === 3) { sk.style.gridColumn = 'span 2'; }
            sk.innerHTML = '<div class="skeleton" style="width:100%;height:100%;border-radius:0;"></div>';
            container.appendChild(sk);
        }
    }

    // ---- Load categories and build filters ----
    async function loadCategories() {
        const { data } = await db.from('categories').select('id, name, slug');
        if (data) allCategories = data;
    }

    function buildFilters() {
        if (!filterRow || allCategories.length === 0) return;
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
                renderProjects(btn.getAttribute('data-cat-id') || null);
            });
        });
    }

    // ---- Render projects ----
    async function renderProjects(categoryId = null) {
        showSkeletons();

        let query = db
            .from('projects')
            .select('id, title, slug, main_image, category_id')
            .order('created_at', { ascending: false });

        if (categoryId) query = query.eq('category_id', categoryId);

        const { data: projects, error } = await query;
        container.innerHTML = '';

        if (error || !projects || projects.length === 0) {
            container.innerHTML = `<p style="color:var(--color-text-muted);text-align:center;padding:6rem;grid-column:1/-1;">No projects found.</p>`;
            return;
        }

        projects.forEach((project, index) => {
            const cat    = allCategories.find(c => c.id === project.category_id);
            const imgSrc = project.main_image || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';

            // Mosaic pattern
            let colSpan = 'span 1', rowSpan = 'span 1';
            if (index % 6 === 0) { colSpan = 'span 2'; rowSpan = 'span 2'; }
            else if (index % 6 === 3) { colSpan = 'span 2'; }

            const card = document.createElement('div');
            card.className = 'project-card';
            card.style.cssText = `position:relative;grid-column:${colSpan};grid-row:${rowSpan};border:none;border-radius:0;`;
            card.innerHTML = `
                <div class="project-card__image" style="border-radius:0;overflow:hidden;position:absolute;top:0;left:0;width:100%;height:100%;">
                    <img src="${imgSrc}" alt="${project.title}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                    <div class="project-card__overlay">
                        <a href="/system/${project.slug}" class="view-project">View Case <i class="ph ph-arrow-up-right"></i></a>
                    </div>
                </div>
                <div class="project-card__info" style="position:absolute;bottom:0;left:0;right:0;padding:2rem;background:linear-gradient(to top,rgba(0,0,0,0.9),transparent);border-radius:0;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;">
                    <h3 style="margin:0;font-size:1.5rem;color:white;">${project.title}</h3>
                    <span style="color:var(--color-accent);font-weight:600;font-size:0.875rem;">${cat ? cat.name : ''}</span>
                </div>`;
            container.appendChild(card);
        });
    }

    // ---- Init ----
    await loadCategories();
    buildFilters();
    await renderProjects();

    // ---- Cursor & reveal (shared) ----
    const revealObs = new IntersectionObserver(
        entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }),
        { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
});
