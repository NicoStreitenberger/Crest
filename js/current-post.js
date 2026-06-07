/**
 * STRN Studio — post.js
 * Dynamic blog post page. Reads ?slug= from URL and fetches from Supabase.
 */

document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    const slug   = params.get('slug');

    const titleEl   = document.getElementById('post-title');
    const metaEl    = document.getElementById('post-meta');
    const imageEl   = document.getElementById('post-image');
    const contentEl = document.getElementById('post-content');

    if (!slug) {
        if (titleEl) titleEl.textContent = 'Post not found';
        return;
    }

    // Show skeletons
    if (titleEl)   titleEl.innerHTML = '<div class="skeleton" style="height:3rem;width:70%;border-radius:8px;"></div>';
    if (imageEl)   imageEl.innerHTML = '<div class="skeleton" style="width:100%;height:500px;border-radius:16px;"></div>';
    if (contentEl) contentEl.innerHTML = '<div class="skeleton" style="height:1.2rem;width:90%;border-radius:4px;margin-bottom:1rem;"></div>'.repeat(10);

    const { data: post, error } = await db
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (error || !post) {
        if (titleEl) titleEl.textContent = 'Article not found';
        if (contentEl) contentEl.innerHTML = '<p>This article does not exist or has been unpublished.</p>';
        return;
    }

    // Update page title & OG
    document.title = `${post.title} | CREST Studio Currents`;

    if (titleEl)   titleEl.textContent = post.title.toUpperCase();

    if (metaEl) {
        const date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
        const words = (post.content || '').trim().split(/\s+/).length;
        const readTime = Math.max(1, Math.ceil(words / 200));
        metaEl.innerHTML = `
            <span><i class="ph ph-calendar-blank"></i> ${date}</span>
            <span><i class="ph ph-clock"></i> ${readTime} min read</span>`;
    }

    if (imageEl && post.featured_image) {
        imageEl.innerHTML = `<img src="${post.featured_image}" alt="${post.title}" class="blog-featured-image" loading="lazy">`;
    } else if (imageEl) {
        imageEl.innerHTML = '';
    }

    if (contentEl) {
        // Render markdown-like content (simple line breaks)
        contentEl.innerHTML = post.content
            ? post.content
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h2>$1</h2>')
                .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^(?!<h|<bl|<p)/, '<p>')
                .concat('</p>')
            : '<p>No content available.</p>';
    }

    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
    const revObs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
});
