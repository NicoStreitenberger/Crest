/**
 * STRN Studio — project.js
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
    const csGallery   = document.getElementById('cs-gallery');

    if (!slug) {
        if (csTitle) csTitle.textContent = 'Project not found';
        return;
    }

    // Skeleton loading on hero
    if (csTitle) csTitle.innerHTML = '<div class="skeleton" style="height:4rem;width:60%;border-radius:8px;display:inline-block;"></div>';

    const { data: project, error } = await db
        .from('projects')
        .select('*, categories(name, slug)')
        .eq('slug', slug)
        .single();

    if (error || !project) {
        if (csTitle) csTitle.textContent = 'Project not found';
        return;
    }

    document.title = `${project.title} — Case Study | CREST Studio`;

    if (heroBg && project.main_image) {
        heroBg.style.backgroundImage = `url('${project.main_image}')`;
    }
    if (csCategory) csCategory.textContent = project.categories ? project.categories.name : '';
    if (csTitle)    csTitle.textContent     = project.title;
    if (csClient)   csClient.textContent    = project.client_name || '—';
    if (csDesc)     csDesc.textContent      = project.description || '';

    // Gallery
    if (csGallery) {
        csGallery.innerHTML = '';
        const gallery = Array.isArray(project.gallery) ? project.gallery : [];
        if (gallery.length > 0) {
            gallery.forEach((url, i) => {
                const div = document.createElement('div');
                div.className = i === 0 ? 'cs-img cs-img--full' : (i % 3 === 0 ? 'cs-img cs-img--half-left' : 'cs-img cs-img--square');
                div.innerHTML = `<img src="${url}" alt="Gallery image ${i + 1}" loading="lazy">`;
                csGallery.appendChild(div);
            });
        } else if (project.main_image) {
            csGallery.innerHTML = `<div class="cs-img cs-img--full"><img src="${project.main_image}" alt="${project.title}" loading="lazy"></div>`;
        }
    }

    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
    const revObs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
});
