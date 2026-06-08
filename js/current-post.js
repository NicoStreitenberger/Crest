/**
 * CREST Studio — current-post.js
 * Dynamic blog article page. Reads ?slug= from URL and fetches from Supabase.
 */

document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('slug');

    const titleEl   = document.getElementById('post-title');
    const metaEl    = document.getElementById('post-meta');
    const contentEl = document.getElementById('post-content');
    const progressBar = document.getElementById('scroll-progress-bar');

    if (!slug) {
        if (titleEl) titleEl.textContent = 'Article not found';
        if (contentEl) contentEl.textContent = 'No article slug specified in the query path.';
        return;
    }

    // Show skeletons
    if (titleEl)   titleEl.innerHTML = '<div class="skeleton" style="height:3.5rem; width:85%; border-radius:8px;"></div>';
    if (contentEl) contentEl.innerHTML = '<div class="skeleton" style="height:1.2rem; width:100%; border-radius:4px; margin-bottom:0.75rem;"></div>'.repeat(8);

    // Guard: Supabase client must be available
    if (typeof window.db === 'undefined') {
        console.error('[CREST] Supabase database client not found.');
        return;
    }

    // Query from articles table strictly
    const { data: post, error } = await db
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error || !post) {
        if (titleEl) titleEl.textContent = 'Article not found';
        if (contentEl) contentEl.innerHTML = '<p style="color:var(--c-dim);">The requested article does not exist or has been unpublished.</p>';
        return;
    }

    // Update page title
    document.title = `${post.title} | CREST Studio Currents`;

    // Render Title
    if (titleEl) {
        titleEl.textContent = post.title.toUpperCase();
    }

    // Render Meta Details (Date & Reading time)
    if (metaEl) {
        const dateStr = post.published_date || 'MAY 2026';
        const readingTimeStr = post.read_time || '3 MIN READ';

        metaEl.innerHTML = `
            <span><i class="ph ph-calendar-blank"></i> ${dateStr.toUpperCase()}</span>
            <span style="margin: 0 0.5rem;">—</span>
            <span><i class="ph ph-clock"></i> ${readingTimeStr.toUpperCase()}</span>`;
    }

    // Render HTML/Markdown content
    if (contentEl) {
        const rawContent = post.body_content || '';
        
        if (rawContent) {
            const isHTML = /<[a-z][\s\S]*>/i.test(rawContent);
            if (isHTML) {
                contentEl.innerHTML = rawContent;
            } else {
                contentEl.innerHTML = rawContent
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/^## (.+)$/gm, '<h2 style="font-family:var(--f-display); font-weight:800; font-size:2rem; text-transform:uppercase; margin:2.5rem 0 1rem 0; color:#fff; line-height:1.2;">$1</h2>')
                    .replace(/^# (.+)$/gm, '<h2 style="font-family:var(--f-display); font-weight:800; font-size:2rem; text-transform:uppercase; margin:2.5rem 0 1rem 0; color:#fff; line-height:1.2;">$1</h2>')
                    .replace(/^> (.+)$/gm, '<blockquote style="border-left:2px solid var(--c-muted); padding-left:1.5rem; margin:1.5rem 0; font-style:italic; color:var(--c-muted);">$1</blockquote>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/\n/g, '<br>')
                    .replace(/^(?!<h|<bl|<p)/, '<p>')
                    .concat('</p>');
            }
        } else {
            contentEl.innerHTML = '<p>No content available.</p>';
        }
    }

    // Scroll Progress indicator listener
    if (progressBar) {
        const updateProgressBar = () => {
            const documentHeight = document.documentElement.scrollHeight;
            const windowHeight = window.innerHeight;
            const totalScrollable = documentHeight - windowHeight;
            
            if (totalScrollable > 0) {
                const scrollPercent = (window.scrollY / totalScrollable) * 100;
                progressBar.style.width = `${scrollPercent}%`;
            } else {
                progressBar.style.width = '0%';
            }
        };

        window.addEventListener('scroll', updateProgressBar);
        updateProgressBar();
    }

    // Header scrolled class toggle / Reveal triggers
    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
    
    const revObs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
});
