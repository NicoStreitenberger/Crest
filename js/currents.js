/**
 * STRN Studio — blog.js
 * Full blog feed driven by Supabase (published posts).
 */

document.addEventListener('DOMContentLoaded', async () => {

    const featuredContainer = document.getElementById('featured-post');
    const recentContainer   = document.getElementById('recent-posts');

    // Skeleton helper
    if (featuredContainer) featuredContainer.innerHTML = '<div class="skeleton" style="width:100%;height:350px;border-radius:16px;"></div>';
    if (recentContainer)   recentContainer.innerHTML   = '<div class="skeleton" style="width:100%;height:220px;border-radius:16px;"></div>'.repeat(4);

    const { data: posts, error } = await db
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    if (error || !posts || posts.length === 0) {
        if (featuredContainer) featuredContainer.innerHTML = '<p style="color:var(--color-text-muted);padding:3rem 0;">No articles published yet.</p>';
        if (recentContainer)   recentContainer.innerHTML   = '';
        return;
    }

    const [featured, ...rest] = posts;

    // Featured post
    if (featuredContainer) {
        const imgSrc = featured.featured_image || 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&q=80';
        const date   = featured.published_at ? new Date(featured.published_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        featuredContainer.innerHTML = `
            <a href="/current/${featured.slug}" class="featured-post glass-card" style="padding:0;overflow:hidden;border-radius:24px;">
                <div class="featured-post__image"><img src="${imgSrc}" alt="${featured.title}" loading="lazy"></div>
                <div style="padding:3rem;">
                    <div class="post-meta"><span><i class="ph ph-calendar-blank"></i> ${date}</span></div>
                    <h2 class="featured-post__title">${featured.title}</h2>
                    <p class="featured-post__excerpt">${featured.excerpt || ''}</p>
                    <span class="btn btn--outline btn--sm">Read Article <i class="ph ph-arrow-right"></i></span>
                </div>
            </a>`;
    }

    // Recent posts
    if (recentContainer) {
        recentContainer.innerHTML = '';
        rest.slice(0, 4).forEach(post => {
            const imgSrc = post.featured_image || 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&q=80';
            const date   = post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const el = document.createElement('a');
            el.href = `/current/${post.slug}`;
            el.className = 'post-card';
            el.innerHTML = `
                <div class="post-card__image"><img src="${imgSrc}" alt="${post.title}" loading="lazy"></div>
                <div>
                    <div class="post-meta" style="margin-bottom:0.5rem;"><span><i class="ph ph-calendar-blank"></i> ${date}</span></div>
                    <h3>${post.title}</h3>
                    <p>${post.excerpt || ''}</p>
                </div>`;
            recentContainer.appendChild(el);
        });
    }

    const header = document.querySelector('.header');
    if (header) window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 50));
    const revObs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));
});
