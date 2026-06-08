/**
 * CREST Studio — system-post.js
 * Dynamic portfolio project page. Reads ?slug= from URL and fetches from Supabase.
 */

document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('slug');

    const heroBg      = document.getElementById('cs-hero-bg');
    const csCategory  = document.getElementById('cs-category');
    const csTitle     = document.getElementById('cs-title');
    const csClient    = document.getElementById('cs-client');
    const csDesc      = document.getElementById('cs-desc');
    const csYear      = document.getElementById('cs-year');
    const csDiscipline = document.getElementById('cs-discipline');
    const csGallery   = document.getElementById('cs-gallery');

    if (!slug) {
        if (csTitle) csTitle.textContent = 'Project not found';
        return;
    }

    // Guard: Supabase client must be available
    if (typeof window.db === 'undefined') {
        console.error('[CREST] Supabase database client not found.');
        return;
    }

    // Skeleton loading states
    if (csTitle) csTitle.innerHTML = '<div class="skeleton" style="height:4rem; width:60%; border-radius:8px; display:inline-block;"></div>';
    if (csDesc) csDesc.innerHTML = '<div class="skeleton" style="height:1.2rem; width:100%; border-radius:4px; margin-bottom:0.75rem;"></div><div class="skeleton" style="height:1.2rem; width:90%; border-radius:4px; margin-bottom:0.75rem;"></div><div class="skeleton" style="height:1.2rem; width:40%; border-radius:4px;"></div>';

    function optimizeStorageUrl(url) {
        if (!url) return '';
        if (url.includes('vojwdyubksoozhyvnbfu.supabase.co/storage/v1/object/public/')) {
            return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?format=webp&quality=80';
        }
        return url;
    }

    try {
        const { data: project, error } = await db
            .from('projects')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error || !project) {
            if (csTitle) csTitle.textContent = 'Project not found';
            if (csDesc) csDesc.textContent = 'The requested project could not be found or does not exist.';
            return;
        }

        // Page title
        document.title = `${project.client_name} — Case Study | CREST Studio`;

        // Hero Background & Header Content
        if (heroBg && project.main_image) {
            heroBg.style.backgroundImage = `url('${optimizeStorageUrl(project.main_image)}')`;
        }
        if (csCategory) {
            csCategory.textContent = project.category || '';
        }
        if (csTitle) {
            csTitle.textContent = project.project_title || project.client_name;
        }

        // Left Sticky Column Details mapping
        if (csDesc) {
            csDesc.textContent = project.strategy_description || 'No strategic description available for this case study.';
        }
        if (csClient) {
            csClient.textContent = project.client_name;
        }
        if (csYear) {
            csYear.textContent = project.year || (project.created_at ? new Date(project.created_at).getFullYear() : new Date().getFullYear());
        }
        if (csDiscipline) {
            csDiscipline.textContent = project.category || 'Branding & Identity';
        }

        // Right Column Mockups Gallery rendering
        if (csGallery) {
            csGallery.innerHTML = '';
            
            const gallery = Array.isArray(project.project_images) ? project.project_images 
                          : (Array.isArray(project.gallery) ? project.gallery : []);

            if (gallery.length > 0) {
                gallery.forEach((url, i) => {
                    const img = document.createElement('img');
                    img.src = optimizeStorageUrl(url);
                    img.alt = `${project.client_name} mockup image ${i + 1}`;
                    img.style.cssText = 'width:100%; height:auto; border-radius:12px; border:1px solid rgba(255,255,255,0.05); display:block;';
                    img.loading = 'lazy';
                    csGallery.appendChild(img);
                });
            } else if (project.main_image) {
                // Fallback to main image if no gallery list exists
                const img = document.createElement('img');
                img.src = optimizeStorageUrl(project.main_image);
                img.alt = `${project.client_name} main feature image`;
                img.style.cssText = 'width:100%; height:auto; border-radius:12px; border:1px solid rgba(255,255,255,0.05); display:block;';
                img.loading = 'lazy';
                csGallery.appendChild(img);
            } else {
                csGallery.innerHTML = '<p style="color:var(--c-dim); padding:4rem; text-align:center;">No project images available.</p>';
            }
        }

    } catch (err) {
        console.error('Error loading project details:', err);
        if (csTitle) csTitle.textContent = 'Error Loading Case Study';
    }

    // Scroll headers styling / Reveal animation loops
    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
    
    const revObs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
});
