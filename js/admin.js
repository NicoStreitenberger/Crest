/**
 * STRN Studio — admin.js
 * Full CRUD Admin CMS backed by Supabase Auth + Storage + Database.
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ------------------------------------------------------------------ //
    //  AUTH — Supabase Auth (Email/Password)
    // ------------------------------------------------------------------ //
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm    = document.getElementById('login-form');
    const loginError   = document.getElementById('login-error');
    const logoutBtn    = document.getElementById('logout-btn');

    function sanitizeHTML(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    async function checkSession() {
        const { data: { session } } = await db.auth.getSession();
        if (session) showDashboard();
        else         showLogin();
    }

    function showLogin()     { if (loginOverlay) loginOverlay.style.display = 'flex'; }
    function showDashboard() {
        if (loginOverlay) { loginOverlay.style.opacity = '0'; setTimeout(() => loginOverlay.style.display = 'none', 300); }
        loadDashboardData();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-user').value.trim();
            const pass  = document.getElementById('login-pass').value;

            const { error } = await db.auth.signInWithPassword({ email, password: pass });

            if (error) {
                if (loginError) { loginError.textContent = error.message; loginError.style.display = 'block'; }
            } else {
                showDashboard();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await db.auth.signOut();
            showLogin();
        });
    }

    db.auth.onAuthStateChange((_event, session) => {
        if (session) showDashboard();
        else         showLogin();
    });

    await checkSession();

    // ------------------------------------------------------------------ //
    //  SIDEBAR NAVIGATION
    // ------------------------------------------------------------------ //
    const navItems = document.querySelectorAll('.nav-item');
    const views    = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            item.classList.add('active');
            const target = document.getElementById(`view-${item.getAttribute('data-target')}`);
            if (target) target.classList.add('active');
            if (window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });

    const sidebar    = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileClose= document.getElementById('mobile-close');
    if (menuToggle)  menuToggle.addEventListener('click', () => sidebar.classList.add('open'));
    if (mobileClose) mobileClose.addEventListener('click', () => sidebar.classList.remove('open'));

    // ------------------------------------------------------------------ //
    //  DASHBOARD STATS
    // ------------------------------------------------------------------ //
    async function loadDashboardData() {
        // Lead count
        const { count: leadCount } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
        const { count: projCount } = await db.from('projects').select('id', { count: 'exact', head: true });
        const { count: postCount } = await db.from('blog_posts').select('id', { count: 'exact', head: true });

        const statLeads = document.getElementById('stat-leads');
        const statProjs = document.getElementById('stat-projects');
        const statPosts = document.getElementById('stat-posts');

        if (statLeads) statLeads.textContent = leadCount ?? 0;
        if (statProjs) statProjs.textContent = projCount ?? 0;
        if (statPosts) statPosts.textContent = postCount ?? 0;

        loadRecentLeadsTable();
        loadLeadsView();
    }

    // ------------------------------------------------------------------ //
    //  LEADS — Dashboard table + full view
    // ------------------------------------------------------------------ //
    async function loadRecentLeadsTable() {
        const tbody = document.getElementById('recent-leads-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);">Loading...</td></tr>';

        const { data: leads } = await db.from('leads').select('*').order('created_at', { ascending: false }).limit(5);

        tbody.innerHTML = '';
        if (!leads || leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:var(--color-text-muted);">No leads yet.</td></tr>';
            return;
        }
        leads.forEach(lead => {
            const date = new Date(lead.created_at).toLocaleDateString();
            tbody.innerHTML += `
                <tr>
                    <td>${sanitizeHTML(lead.name)}</td>
                    <td>${sanitizeHTML(lead.email)}</td>
                    <td><span class="status ${lead.status}">${lead.status}</span></td>
                    <td>${date}</td>
                </tr>`;
        });
    }

    async function loadLeadsView() {
        const leadsBody = document.getElementById('leads-table-body');
        if (!leadsBody) return;
        leadsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Loading...</td></tr>';

        const { data: leads } = await db.from('leads').select('*').order('created_at', { ascending: false });

        leadsBody.innerHTML = '';
        if (!leads || leads.length === 0) {
            leadsBody.innerHTML = '<tr><td colspan="5" style="color:var(--color-text-muted);">No leads submitted yet.</td></tr>';
            return;
        }
        leads.forEach(lead => {
            const date = new Date(lead.created_at).toLocaleDateString();
            const snippet = (lead.message || '').substring(0, 60) + (lead.message && lead.message.length > 60 ? '...' : '');
            leadsBody.innerHTML += `
                <tr>
                    <td>${sanitizeHTML(lead.name)}</td>
                    <td>${sanitizeHTML(lead.email)}</td>
                    <td>${sanitizeHTML(snippet)}</td>
                    <td><span class="status ${lead.status}">${lead.status}</span></td>
                    <td>
                        <button class="btn btn--outline btn--sm" onclick="markLeadRead('${lead.id}', this)">Mark Read</button>
                        <a href="mailto:${sanitizeHTML(lead.email)}" class="btn btn--primary btn--sm" style="margin-left:0.5rem;">Reply</a>
                    </td>
                </tr>`;
        });
    }

    window.markLeadRead = async (id, btn) => {
        btn.disabled = true;
        btn.textContent = '...';
        await db.from('leads').update({ status: 'read' }).eq('id', id);
        loadLeadsView();
        loadRecentLeadsTable();
    };

    // ------------------------------------------------------------------ //
    //  PORTFOLIO — Create Project with Image Upload
    // ------------------------------------------------------------------ //
    const projectForm = document.getElementById('project-form');
    const imageUpload = document.getElementById('project-image-upload');
    const imagePreview= document.getElementById('image-preview');
    let   uploadedImageUrl = null;

    if (imageUpload) {
        imageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ext      = file.name.split('.').pop();
            const fileName = `projects/${Date.now()}.${ext}`;

            imagePreview.innerHTML = '<div class="skeleton" style="width:100%;height:180px;border-radius:12px;"></div>';

            const { data, error } = await db.storage.from('strn-assets').upload(fileName, file, { upsert: true });

            if (error) {
                imagePreview.innerHTML = `<p style="color:#e53e3e;">Upload failed: ${error.message}</p>`;
                return;
            }

            const { data: { publicUrl } } = db.storage.from('strn-assets').getPublicUrl(fileName);
            uploadedImageUrl = publicUrl;
            imagePreview.innerHTML = `<img src="${publicUrl}" style="width:100%;border-radius:12px;max-height:220px;object-fit:cover;" alt="Preview">`;
        });
    }

    // Load categories for project form select
    async function loadCategorySelect() {
        const sel = document.getElementById('project-category');
        if (!sel) return;
        const { data: cats } = await db.from('categories').select('id, name');
        if (cats) {
            sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }
    await loadCategorySelect();

    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn  = projectForm.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner"></i> Saving...';

            const title       = document.getElementById('project-title').value.trim();
            const slug        = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const categoryId  = document.getElementById('project-category').value;
            const description = document.getElementById('project-description').value.trim();
            const clientName  = document.getElementById('project-client').value.trim();
            const isFeatured  = document.getElementById('project-featured')?.checked || false;

            const { error } = await db.from('projects').insert([{
                title,
                slug,
                category_id:  categoryId || null,
                description:  description || null,
                client_name:  clientName  || null,
                main_image:   uploadedImageUrl || null,
                is_featured:  isFeatured,
            }]);

            if (error) {
                btn.innerHTML = '⚠ Error: ' + error.message;
                btn.style.background = '#e53e3e';
            } else {
                btn.innerHTML = '✓ Project Published!';
                btn.style.background = '#28a745';
                projectForm.reset();
                uploadedImageUrl = null;
                if (imagePreview) imagePreview.innerHTML = '';
            }
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; }, 3000);
        });
    }

    // ------------------------------------------------------------------ //
    //  BLOG — Create Post
    // ------------------------------------------------------------------ //
    const blogForm    = document.getElementById('blog-form');
    const postContent = document.getElementById('post-content');
    const readingTime = document.getElementById('reading-time');

    if (postContent && readingTime) {
        postContent.addEventListener('input', () => {
            const words = postContent.value.trim().split(/\s+/).filter(Boolean).length;
            readingTime.value = words > 0 ? `${Math.ceil(words / 200)} min read` : '0 min read';
        });
    }

    // Markdown toolbar
    document.querySelectorAll('.md-toolbar button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!postContent) return;
            const icon = btn.querySelector('i')?.className || '';
            const start = postContent.selectionStart;
            const end   = postContent.selectionEnd;
            const sel   = postContent.value.substring(start, end);
            let insert  = '';
            if (icon.includes('text-b'))      insert = `**${sel || 'bold text'}**`;
            else if (icon.includes('italic')) insert = `*${sel || 'italic text'}*`;
            else if (icon.includes('link'))   insert = `[${sel || 'link text'}](url)`;
            else if (icon.includes('quotes')) insert = `> ${sel || 'quote'}`;
            else if (icon.includes('code'))   insert = `\`\`\`\n${sel || 'code'}\n\`\`\``;
            else if (icon.includes('image'))  insert = `![alt text](image_url)`;
            postContent.setRangeText(insert, start, end, 'select');
        });
    });

    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn  = blogForm.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner"></i> Publishing...';

            const title   = document.getElementById('post-title').value.trim();
            const slug    = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const content = postContent.value.trim();
            const excerpt = content.replace(/[#*`>]/g, '').substring(0, 160).trim();
            const status  = document.getElementById('post-status')?.value || 'published';

            const { error } = await db.from('blog_posts').insert([{
                title,
                slug,
                content: content || null,
                excerpt: excerpt || null,
                status,
                published_at: status === 'published' ? new Date().toISOString() : null,
            }]);

            if (error) {
                btn.innerHTML = '⚠ ' + error.message;
                btn.style.background = '#e53e3e';
            } else {
                btn.innerHTML = '✓ Post Published!';
                btn.style.background = '#28a745';
                blogForm.reset();
                if (readingTime) readingTime.value = '';
            }
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; }, 3000);
        });
    }

});
