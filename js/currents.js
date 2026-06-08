/**
 * CREST Studio — currents.js
 * Dynamic Focus Articles List driven by Supabase (articles table).
 */

document.addEventListener('DOMContentLoaded', async () => {

    const container = document.getElementById('articles-list');

    // Skeleton helper
    function showSkeletons(count = 4) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem; padding:2.5rem 0; border-bottom:1px solid var(--c-border);';
            row.innerHTML = `
                <div class="skeleton" style="width:20%; height:1rem; border-radius:4px; margin-bottom:0.5rem;"></div>
                <div class="skeleton" style="width:75%; height:3rem; border-radius:8px;"></div>
            `;
            container.appendChild(row);
        }
    }

    if (container) showSkeletons();

    // Guard: Supabase client must be available
    if (typeof window.db === 'undefined') {
        console.error('[CREST] Supabase database client not found.');
        if (container) container.innerHTML = '<p style="color:var(--c-dim); padding:4rem 0; text-align:center;">Database client not configured.</p>';
        return;
    }

    // Fetch from articles table
    const { data: articles, error } = await db
        .from('articles')
        .select('id, title, slug, read_time, published_date')
        .order('created_at', { ascending: false });

    if (container) container.innerHTML = '';

    if (error || !articles || articles.length === 0) {
        if (container) {
            container.innerHTML = '<p style="color:var(--c-dim); padding:6rem 0; text-align:center;">No articles published yet.</p>';
        }
        return;
    }

    articles.forEach(article => {
        const formattedDate = article.published_date || 'MAY 2026';
        const readingTime = article.read_time || '3 MIN READ';

        const row = document.createElement('a');
        row.href = `/current-post.html?slug=${article.slug}`;
        row.className = 'articles-row';
        row.innerHTML = `
            <div class="articles-row__meta">
                <span>${formattedDate.toUpperCase()}</span>
                <span>—</span>
                <span>${readingTime.toUpperCase()}</span>
            </div>
            <h2 class="articles-row__title">${article.title.toUpperCase()}</h2>
        `;
        
        if (container) container.appendChild(row);
    });

    // Header interaction states & Reveal animation trigger
    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
    
    const revObs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
});
