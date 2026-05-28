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
        loadProjectsList();
        loadBlogList();
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
    //  CRUD STATE VARIABLES
    // ------------------------------------------------------------------ //
    let editingProjectId = null;
    let editingBlogPostId = null;

    // ------------------------------------------------------------------ //
    //  PORTFOLIO — Create, List, Edit & Delete Projects
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
            sel.innerHTML = '<option value="">Select category...</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }
    await loadCategorySelect();

    async function loadProjectsList() {
        const tbody = document.getElementById('projects-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Loading projects...</td></tr>';

        const { data: projects, error } = await db.from('projects').select('*, categories(name)').order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#e53e3e;">Error: ${error.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (!projects || projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:var(--color-text-muted);text-align:center;">No projects found.</td></tr>';
            return;
        }

        projects.forEach(project => {
            const categoryName = project.categories ? project.categories.name : 'Uncategorized';
            tbody.innerHTML += `
                <tr>
                    <td><strong>${sanitizeHTML(project.title)}</strong></td>
                    <td>${sanitizeHTML(categoryName)}</td>
                    <td>${sanitizeHTML(project.client_name || '—')}</td>
                    <td><span class="status ${project.is_featured ? 'new' : 'read'}">${project.is_featured ? 'Yes' : 'No'}</span></td>
                    <td style="text-align:right;">
                        <button class="btn btn--outline btn--sm" onclick="editProject('${project.id}')"><i class="ph ph-note-pencil"></i> Edit</button>
                        <button class="btn btn--outline btn--sm" onclick="deleteProject('${project.id}')" style="margin-left:0.5rem;color:#e53e3e;border-color:rgba(229,62,62,0.2);"><i class="ph ph-trash"></i> Delete</button>
                    </td>
                </tr>`;
        });
    }

    window.editProject = async (id) => {
        const { data: project, error } = await db.from('projects').select('*').eq('id', id).single();
        if (error || !project) {
            alert('Error loading project: ' + error?.message);
            return;
        }

        editingProjectId = project.id;
        
        document.getElementById('project-title').value = project.title || '';
        document.getElementById('project-category').value = project.category_id || '';
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-client').value = project.client_name || '';
        document.getElementById('project-featured').checked = project.is_featured || false;
        
        uploadedImageUrl = project.main_image;
        if (uploadedImageUrl) {
            imagePreview.innerHTML = `<img src="${uploadedImageUrl}" style="width:100%;border-radius:12px;max-height:220px;object-fit:cover;" alt="Preview">`;
        } else {
            imagePreview.innerHTML = '';
        }

        const submitBtn = document.getElementById('project-submit-btn');
        if (submitBtn) submitBtn.innerHTML = 'Update Project <i class="ph ph-floppy-disk"></i>';
        
        const cancelBtn = document.getElementById('project-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        projectForm.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteProject = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este proyecto de tu portafolio?')) return;
        
        const { error } = await db.from('projects').delete().eq('id', id);
        if (error) {
            alert('Error deleting project: ' + error.message);
        } else {
            loadDashboardData();
        }
    };

    const projectCancelBtn = document.getElementById('project-cancel-btn');
    if (projectCancelBtn) {
        projectCancelBtn.addEventListener('click', () => {
            editingProjectId = null;
            projectForm.reset();
            uploadedImageUrl = null;
            if (imagePreview) imagePreview.innerHTML = '';
            
            const submitBtn = document.getElementById('project-submit-btn');
            if (submitBtn) submitBtn.innerHTML = 'Publish Project <i class="ph ph-rocket-launch"></i>';
            projectCancelBtn.style.display = 'none';
        });
    }

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

            let resError;
            if (editingProjectId) {
                const { error } = await db.from('projects').update({
                    title,
                    slug,
                    category_id:  categoryId || null,
                    description:  description || null,
                    client_name:  clientName  || null,
                    main_image:   uploadedImageUrl || null,
                    is_featured:  isFeatured,
                }).eq('id', editingProjectId);
                resError = error;
            } else {
                const { error } = await db.from('projects').insert([{
                    title,
                    slug,
                    category_id:  categoryId || null,
                    description:  description || null,
                    client_name:  clientName  || null,
                    main_image:   uploadedImageUrl || null,
                    is_featured:  isFeatured,
                }]);
                resError = error;
            }

            if (resError) {
                btn.innerHTML = '⚠ Error: ' + resError.message;
                btn.style.background = '#e53e3e';
            } else {
                btn.innerHTML = editingProjectId ? '✓ Project Updated!' : '✓ Project Published!';
                btn.style.background = '#28a745';
                projectForm.reset();
                uploadedImageUrl = null;
                if (imagePreview) imagePreview.innerHTML = '';
                editingProjectId = null;
                if (projectCancelBtn) projectCancelBtn.style.display = 'none';
                
                loadDashboardData();
            }
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; }, 3000);
        });
    }

    // ------------------------------------------------------------------ //
    //  BLOG — Create, List, Edit & Delete Posts
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

    async function loadBlogList() {
        const tbody = document.getElementById('blog-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);">Loading blog posts...</td></tr>';

        const { data: posts, error } = await db.from('blog_posts').select('*').order('published_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#e53e3e;">Error: ${error.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (!posts || posts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:var(--color-text-muted);text-align:center;">No blog posts found.</td></tr>';
            return;
        }

        posts.forEach(post => {
            const date = post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft';
            tbody.innerHTML += `
                <tr>
                    <td><strong>${sanitizeHTML(post.title)}</strong></td>
                    <td><span class="status ${post.status === 'published' ? 'new' : 'read'}">${post.status}</span></td>
                    <td>${date}</td>
                    <td style="text-align:right;">
                        <button class="btn btn--outline btn--sm" onclick="editBlogPost('${post.id}')"><i class="ph ph-note-pencil"></i> Edit</button>
                        <button class="btn btn--outline btn--sm" onclick="deleteBlogPost('${post.id}')" style="margin-left:0.5rem;color:#e53e3e;border-color:rgba(229,62,62,0.2);"><i class="ph ph-trash"></i> Delete</button>
                    </td>
                </tr>`;
        });
    }

    window.editBlogPost = async (id) => {
        const { data: post, error } = await db.from('blog_posts').select('*').eq('id', id).single();
        if (error || !post) {
            alert('Error loading post: ' + error?.message);
            return;
        }

        editingBlogPostId = post.id;
        
        document.getElementById('post-title').value = post.title || '';
        document.getElementById('post-status').value = post.status || 'published';
        postContent.value = post.content || '';
        
        const words = (post.content || '').trim().split(/\s+/).filter(Boolean).length;
        readingTime.value = words > 0 ? `${Math.ceil(words / 200)} min read` : '0 min read';

        const seoTitle = document.getElementById('post-seo-title');
        if (seoTitle) seoTitle.value = post.title || '';
        
        const seoDesc = document.getElementById('post-seo-desc');
        if (seoDesc) seoDesc.value = post.excerpt || '';

        const submitBtn = document.getElementById('blog-submit-btn');
        if (submitBtn) submitBtn.innerHTML = 'Update Post <i class="ph ph-floppy-disk"></i>';
        
        const cancelBtn = document.getElementById('blog-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        blogForm.scrollIntoView({ behavior: 'smooth' });
    };

    window.deleteBlogPost = async (id) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta entrada del blog?')) return;
        
        const { error } = await db.from('blog_posts').delete().eq('id', id);
        if (error) {
            alert('Error deleting post: ' + error.message);
        } else {
            loadDashboardData();
        }
    };

    const blogCancelBtn = document.getElementById('blog-cancel-btn');
    if (blogCancelBtn) {
        blogCancelBtn.addEventListener('click', () => {
            editingBlogPostId = null;
            blogForm.reset();
            if (readingTime) readingTime.value = '';
            
            const submitBtn = document.getElementById('blog-submit-btn');
            if (submitBtn) submitBtn.innerHTML = 'Publish Post <i class="ph ph-rocket-launch"></i>';
            blogCancelBtn.style.display = 'none';
        });
    }

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
            const seoDesc = document.getElementById('post-seo-desc')?.value.trim() || '';
            const excerpt = seoDesc || content.replace(/[#*`>]/g, '').substring(0, 160).trim();
            const status  = document.getElementById('post-status')?.value || 'published';

            let resError;
            if (editingBlogPostId) {
                const { error } = await db.from('blog_posts').update({
                    title,
                    slug,
                    content: content || null,
                    excerpt: excerpt || null,
                    status,
                    published_at: status === 'published' ? new Date().toISOString() : null,
                }).eq('id', editingBlogPostId);
                resError = error;
            } else {
                const { error } = await db.from('blog_posts').insert([{
                    title,
                    slug,
                    content: content || null,
                    excerpt: excerpt || null,
                    status,
                    published_at: status === 'published' ? new Date().toISOString() : null,
                }]);
                resError = error;
            }

            if (resError) {
                btn.innerHTML = '⚠ ' + resError.message;
                btn.style.background = '#e53e3e';
            } else {
                btn.innerHTML = editingBlogPostId ? '✓ Post Updated!' : '✓ Post Published!';
                btn.style.background = '#28a745';
                blogForm.reset();
                if (readingTime) readingTime.value = '';
                editingBlogPostId = null;
                if (blogCancelBtn) blogCancelBtn.style.display = 'none';
                
                loadDashboardData();
            }
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; }, 3000);
        });
    }

});
