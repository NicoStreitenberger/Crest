/**
 * CREST Studio — systems.js
 * Dynamic typographic portfolio list with Supabase + hover preview tracking.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('full-portfolio');
    const filterRow = document.querySelector('.portfolio-filters');
    const preview = document.getElementById('hover-preview');
    let allCategories = [];

    // Check if Supabase client (db) is available
    if (typeof window.db === 'undefined') {
        console.error('[CREST] Supabase database client not found.');
        return;
    }

    // ---- Skeletons ----
    function showSkeletons(count = 5) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'systems-row-skeleton';
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:2.5rem 0; border-bottom:1px solid var(--c-border);';
            row.innerHTML = `
                <div class="skeleton" style="width: 45%; height: 3.5rem; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 15%; height: 1.2rem; border-radius: 4px;"></div>
            `;
            container.appendChild(row);
        }
    }

    // ---- Load categories and build filters ----
    async function loadCategories() {
        // Under the official unified schema, categories are static closed nomenclatures
        allCategories = [
            { id: 'VISUAL INFRASTRUCTURE', name: 'VISUAL INFRASTRUCTURE' },
            { id: 'DIGITAL SYSTEMS', name: 'DIGITAL SYSTEMS' },
            { id: 'TANGIBLE MATTER', name: 'TANGIBLE MATTER' },
            { id: 'CREATIVE DIRECTION', name: 'CREATIVE DIRECTION' },
            { id: 'SPECIAL OPERATIONS', name: 'SPECIAL OPERATIONS' }
        ];
    }

    function buildFilters() {
        if (!filterRow || allCategories.length === 0) return;
        
        // Remove existing dynamic filter buttons if any
        filterRow.querySelectorAll('.filter-btn[data-cat-id]').forEach(b => b.remove());

        allCategories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.setAttribute('data-cat-id', cat.id);
            btn.textContent = cat.name.toUpperCase();
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

    function optimizeStorageUrl(url) {
        if (!url) return '';
        if (url.includes('vojwdyubksoozhyvnbfu.supabase.co/storage/v1/object/public/')) {
            return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?format=webp&quality=80';
        }
        return url;
    }

    // ---- Render projects ----
    async function renderProjects(categoryId = null) {
        if (!container) return;
        showSkeletons();

        try {
            let query = db
                .from('projects')
                .select('id, slug, client_name, main_image, category, is_featured')
                .order('is_featured', { ascending: false })
                .order('created_at',  { ascending: false });

            if (categoryId) {
                query = query.eq('category', categoryId);
            }

            const { data: projects, error } = await query;
            container.innerHTML = '';

            if (error || !projects || projects.length === 0) {
                container.innerHTML = `<p style="color:var(--c-dim);text-align:center;padding:6rem;grid-column:1/-1;">No projects found.</p>`;
                return;
            }

            projects.forEach((project) => {
                const client = project.client_name || 'UNTITLED';
                const categoryName = project.category || '';
                const imgSrc = optimizeStorageUrl(project.main_image || '');

                const row = document.createElement('a');
                row.href = `/system-post.html?slug=${project.slug}`;
                row.className = 'systems-row';
                row.setAttribute('data-img', imgSrc);
                
                row.innerHTML = `
                    <h2 class="systems-row__client">${client}</h2>
                    <span class="systems-row__category">${categoryName}</span>
                `;
                
                container.appendChild(row);
            });
        } catch (err) {
            console.error('Error rendering projects:', err);
            container.innerHTML = `<p style="color:var(--c-dim);text-align:center;padding:6rem;">Error loading portfolio archive.</p>`;
        }
    }

    // ---- Mouse Interaction (Hover Preview) ----
    function initHoverPreview() {
        if (!preview || !container) return;

        // Mousemove listener to update preview position
        window.addEventListener('mousemove', (e) => {
            preview.style.transform = `translate3d(${e.clientX + 20}px, ${e.clientY + 20}px, 0)`;
        });

        // Mouseover/mouseout delegation on container
        container.addEventListener('mouseover', (e) => {
            const row = e.target.closest('.systems-row');
            if (!row) return;

            const imgSrc = row.getAttribute('data-img');
            if (imgSrc) {
                preview.style.backgroundImage = `url('${imgSrc}')`;
                preview.classList.add('active');
            } else {
                preview.classList.remove('active');
            }
        });

        container.addEventListener('mouseout', (e) => {
            const row = e.target.closest('.systems-row');
            if (!row) return;

            const related = e.relatedTarget ? e.relatedTarget.closest('.systems-row') : null;
            if (related !== row) {
                preview.classList.remove('active');
            }
        });
    }

    // ---- Init ----
    await loadCategories();
    buildFilters();
    await renderProjects();
    initHoverPreview();
});
