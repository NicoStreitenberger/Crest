/**
 * STRN Studio — admin.js
 * Full CRUD Admin CMS backed by Supabase Auth + Storage + Database.
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ------------------------------------------------------------------ //
    //  FORM TRANSITIONS & TOGGLES (Módulo 22)
    // ------------------------------------------------------------------ //
    function showForm(container) {
        if (!container) return;
        container.style.display = 'block';
        container.offsetHeight; // force reflow
        container.classList.add('open');
    }

    function hideForm(container) {
        if (!container) return;
        container.classList.remove('open');
        setTimeout(() => {
            if (!container.classList.contains('open')) {
                container.style.display = 'none';
            }
        }, 200);
    }

    const addProjectBtn = document.getElementById('add-project-btn');
    const projectEditorContainer = document.querySelector('#view-portfolio .editor-container');
    if (addProjectBtn && projectEditorContainer) {
        addProjectBtn.addEventListener('click', () => {
            if (projectEditorContainer.classList.contains('open')) {
                hideForm(projectEditorContainer);
            } else {
                showForm(projectEditorContainer);
            }
        });
    }

    const addPostBtn = document.getElementById('add-post-btn');
    const blogEditorContainer = document.querySelector('#view-blog .editor-container');
    if (addPostBtn && blogEditorContainer) {
        addPostBtn.addEventListener('click', () => {
            if (blogEditorContainer.classList.contains('open')) {
                hideForm(blogEditorContainer);
            } else {
                showForm(blogEditorContainer);
            }
        });
    }

    // Quick action buttons click listeners to show forms
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.textContent.includes('WRITE ARTICLE')) {
            btn.addEventListener('click', () => {
                if (blogEditorContainer) showForm(blogEditorContainer);
            });
        } else if (btn.textContent.includes('ADD NEW SYSTEM')) {
            btn.addEventListener('click', () => {
                if (projectEditorContainer) showForm(projectEditorContainer);
            });
        }
    });

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

    const logoutButton = document.querySelector('#logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const supabase = window.db;
                // 1. Llama a la destrucción de la sesión en el servidor de Supabase
                const { error } = await supabase.auth.signOut();
                if (error) throw error;

                // 2. Limpia de forma explícita rastros remanentes en el almacenamiento del navegador
                localStorage.clear();
                sessionStorage.clear();

                // 3. Redirección inmediata y limpia de la ventana del navegador hacia la Home pública
                window.location.replace('/index.html');

            } catch (err) {
                console.error('Error crítico durante el proceso de cierre de sesión:', err.message);
                // Guardrail: Fuerza la redirección incluso si la promesa falla de forma aislada
                window.location.replace('/index.html');
            }
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
            // Lazy-load views when switching tabs
            if (item.getAttribute('data-target') === 'services')   loadExpertiseView();
            if (item.getAttribute('data-target') === 'analytics')  loadAnalyticsView();
            if (item.getAttribute('data-target') === 'settings')   loadSettingsView();
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
        const { count: leadCount } = await db.from('enlist_applications').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_REVIEW');
        const { count: projCount } = await db.from('projects').select('id', { count: 'exact', head: true });
        const { count: postCount } = await db.from('articles').select('id', { count: 'exact', head: true });

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
        loadExpertiseView();
        loadSettingsView();
    }

    // ------------------------------------------------------------------ //
    //  ENLISTMENT APPLICATIONS — Drawer + Table (Módulo 28)
    // ------------------------------------------------------------------ //
    const leadsDrawer    = document.getElementById('leads-drawer');
    const drawerOverlay  = document.getElementById('drawer-overlay');
    const drawerCloseBtn = document.getElementById('drawer-close');
    const drawerReplyBtn = document.getElementById('drawer-reply-btn');

    // Format timestamp to local datetime string
    function formatDateTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('es-ES', {
            day:    '2-digit',
            month:  'short',
            year:   'numeric',
            hour:   '2-digit',
            minute: '2-digit'
        }).toUpperCase();
    }

    // Active status on drawer buttons
    function setDrawerStatusActive(currentStatus) {
        document.querySelectorAll('#drawer-status-btns .enlist-status-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.status === currentStatus);
        });
    }

    window.openLeadsDrawer = async (leadId, event) => {
        if (event) event.stopPropagation();

        if (drawerOverlay) drawerOverlay.classList.add('open');
        if (leadsDrawer)   leadsDrawer.classList.add('open');

        // Reset drawer to loading state
        const drawerBrand    = document.getElementById('drawer-brand');
        const drawerEmail    = document.getElementById('drawer-email');
        const drawerDisc     = document.getElementById('drawer-discipline');
        const drawerBudget   = document.getElementById('drawer-budget');
        const drawerDate     = document.getElementById('drawer-date');
        const drawerScenario = document.getElementById('drawer-scenario');

        if (drawerBrand)    drawerBrand.textContent    = 'Loading...';
        if (drawerEmail)    drawerEmail.textContent    = '—';
        if (drawerDisc)     drawerDisc.textContent     = '—';
        if (drawerBudget)   drawerBudget.textContent   = '—';
        if (drawerDate)     drawerDate.textContent     = '—';
        if (drawerScenario) drawerScenario.textContent = '—';
        setDrawerStatusActive(null);

        const { data: lead, error } = await db
            .from('enlist_applications')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error || !lead) {
            if (drawerBrand) drawerBrand.textContent = 'Error loading briefing.';
            return;
        }

        // Populate fields
        if (drawerBrand)    drawerBrand.textContent    = lead.brand_name        || '—';
        if (drawerEmail)    drawerEmail.textContent    = lead.contact_email     || '—';
        if (drawerDisc)     drawerDisc.textContent     = lead.intervention_flow || '—';
        if (drawerBudget)   drawerBudget.textContent   = lead.estimated_budget  || '—';
        if (drawerDate)     drawerDate.textContent     = formatDateTime(lead.created_at);
        if (drawerScenario) drawerScenario.textContent = lead.scenario_desc || 'No competitive briefing submitted.';

        // Set active status
        setDrawerStatusActive(lead.status);

        // Auto-mark PENDING_REVIEW as read when opened (transition to IN_CONVERSATION)
        if (lead.status === 'PENDING_REVIEW') {
            await db.from('enlist_applications').update({ status: 'IN_CONVERSATION' }).eq('id', leadId);
            setDrawerStatusActive('IN_CONVERSATION');
            loadDashboardData();
        }

        // Wire status buttons to live DB update
        document.querySelectorAll('#drawer-status-btns .enlist-status-btn').forEach(btn => {
            btn.onclick = async () => {
                const newStatus = btn.dataset.status;
                btn.textContent = '...';
                const { error: upErr } = await db
                    .from('enlist_applications')
                    .update({ status: newStatus })
                    .eq('id', leadId);
                btn.textContent = btn.dataset.status;
                if (!upErr) {
                    setDrawerStatusActive(newStatus);
                    loadLeadsView();
                    loadRecentLeadsTable();
                }
            };
        });

        // Reply button
        const email = lead.contact_email || lead.client_email || '';
        if (drawerReplyBtn) drawerReplyBtn.href = `mailto:${email}?subject=CREST Studio — RE: Enlistment Application`;
    };

    function closeLeadsDrawer() {
        if (leadsDrawer)  leadsDrawer.classList.remove('open');
        if (drawerOverlay) drawerOverlay.classList.remove('open');
    }

    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeLeadsDrawer);
    if (drawerOverlay)  drawerOverlay.addEventListener('click', closeLeadsDrawer);

    async function loadRecentLeadsTable() {
        const tbody = document.getElementById('recent-leads-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);">Loading...</td></tr>';

        const { data: leads } = await db
            .from('enlist_applications')
            .select('id, brand_name, contact_email, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        tbody.innerHTML = '';
        if (!leads || leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:var(--color-text-muted);">No applications yet.</td></tr>';
            return;
        }
        leads.forEach(lead => {
            const date = formatDateTime(lead.created_at);
            tbody.innerHTML += `
                <tr onclick="openLeadsDrawer('${lead.id}', event)" style="cursor:pointer;">
                    <td>${sanitizeHTML(lead.brand_name)}</td>
                    <td>${sanitizeHTML(lead.contact_email || '—')}</td>
                    <td><span class="status ${lead.status}">${lead.status}</span></td>
                    <td>${date}</td>
                </tr>`;
        });
    }

    async function loadLeadsView() {
        const leadsBody = document.getElementById('leads-table-body');
        if (!leadsBody) return;
        leadsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);">Loading...</td></tr>';

        const { data: leads, error } = await db
            .from('enlist_applications')
            .select('id, brand_name, contact_email, intervention_flow, estimated_budget, status, created_at')
            .order('created_at', { ascending: false });

        leadsBody.innerHTML = '';
        if (!leads || leads.length === 0) {
            leadsBody.innerHTML = '<tr><td colspan="6" style="color:var(--color-text-muted);text-align:center;">No applications submitted yet.</td></tr>';
            return;
        }

        leads.forEach(lead => {
            const date = formatDateTime(lead.created_at);

            leadsBody.innerHTML += `
                <tr onclick="openLeadsDrawer('${lead.id}', event)" style="cursor:pointer;" title="Click to open full briefing">
                    <td><strong>${sanitizeHTML(lead.brand_name)}</strong></td>
                    <td style="color:var(--color-text-muted);font-size:0.85rem;">${sanitizeHTML(lead.contact_email || '—')}</td>
                    <td><span style="font-size:0.75rem;letter-spacing:0.05em;">${sanitizeHTML(lead.intervention_flow || '—')}</span></td>
                    <td style="font-size:0.85rem;">${sanitizeHTML(lead.estimated_budget || '—')}</td>
                    <td><span class="status ${lead.status}">${lead.status}</span></td>
                    <td style="color:var(--color-text-muted);font-size:0.8rem;white-space:nowrap;">${date}</td>
                </tr>`;
        });
    }

    // ------------------------------------------------------------------ //
    //  CRUD STATE VARIABLES
    // ------------------------------------------------------------------ //
    let editingProjectId = null;
    let editingBlogPostId = null;

    // ------------------------------------------------------------------ //
    //  SYSTEMS MANAGER — Create, List, Edit & Delete Projects (Módulo 23)
    // ------------------------------------------------------------------ //
    const projectForm = document.getElementById('project-form');
    const imageUpload = document.getElementById('project-image-upload');
    const imagePreview= document.getElementById('image-preview');
    const galleryUpload = document.getElementById('project-gallery-upload');
    const galleryPreviews = document.getElementById('gallery-previews');
    
    let uploadedImageUrl = null;
    let uploadedGalleryUrls = [];

    // Automatic Slug Generation
    function sanitizeSlug(text) {
        return text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // strip accents
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-') // spaces to hyphens
            .replace(/[^a-z0-9\-]/g, '') // remove special characters
            .replace(/\-+/g, '-'); // collapse hyphens
    }

    const projectTitleInput = document.getElementById('project-title');
    const projectSlugInput = document.getElementById('project-slug');

    if (projectTitleInput && projectSlugInput) {
        const updateSlug = () => {
            projectSlugInput.value = sanitizeSlug(projectTitleInput.value);
        };
        projectTitleInput.addEventListener('input', updateSlug);
        projectTitleInput.addEventListener('blur', updateSlug);
    }

    // Cover Image (Flow A)
    if (imageUpload) {
        imageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ext      = file.name.split('.').pop();
            const fileName = `covers/${Date.now()}.${ext}`;

            imagePreview.innerHTML = '<div class="skeleton" style="width:100%;height:180px;border-radius:12px;"></div>';

            const { data, error } = await db.storage.from('project-assets').upload(fileName, file, { upsert: true });

            if (error) {
                imagePreview.innerHTML = `<p style="color:#e53e3e;">Upload failed: ${error.message}</p>`;
                return;
            }

            const { data: { publicUrl } } = db.storage.from('project-assets').getPublicUrl(fileName);
            uploadedImageUrl = publicUrl;
            imagePreview.innerHTML = `<img src="${publicUrl}" style="width:100%;border-radius:12px;max-height:220px;object-fit:cover;" alt="Preview">`;
        });
    }

// Gallery Images (Flow B - Corregido, Limpio y Apuntando al Bucket Correcto)
    if (galleryUpload) {
        galleryUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Avisar instantáneamente al usuario en el contenedor que armamos en el HTML
            if (galleryPreviews) {
                galleryPreviews.innerHTML = '<p id="gallery-loading-text" style="color:var(--color-text-muted); font-size: 13px; margin: 5px;"><i class="ph ph-spinner animate-spin"></i> Subiendo mockups a la galería premium...</p>';
            }

            // Procesamos las imágenes de forma limpia
            for (const file of files) {
                try {
                    const ext = file.name.split('.').pop();
                    // Evitamos colisiones usando timestamps de alta precisión
                    const fileName = `gallery/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                    
                    // IMPORTANTE: Cambiado a 'portfolio' para que pegue en tu bucket real
                    const { data, error } = await db.storage
                        .from('portfolio')
                        .upload(fileName, file, { upsert: true });

                    if (error) throw error;

                    // Capturar URL pública oficial de Supabase
                    const { data: { publicUrl } } = db.storage.from('portfolio').getPublicUrl(fileName);
                    
                    // Empujar al array global que luego se envía al guardar el proyecto
                    uploadedGalleryUrls.push(publicUrl);

                } catch (err) {
                    console.error('Error al subir mockup individual:', err);
                    alert(`Error con el archivo "${file.name}": ${err.message}`);
                }
            }

            // Una vez que terminó todo el bucle, limpiamos el aviso de carga y pintamos la cuadrícula limpia
            const loadingText = document.getElementById('gallery-loading-text');
            if (loadingText) loadingText.remove();

            renderAllGalleryPreviews();
            galleryUpload.value = ''; // Reseteo del input
        });
    }

    // Función optimizada para dibujar la galería en caliente en STRN Studio
    function renderAllGalleryPreviews() {
        if (!galleryPreviews) return;
        galleryPreviews.innerHTML = ''; // Limpieza de caja
        
        uploadedGalleryUrls.forEach((url, index) => {
            galleryPreviews.innerHTML += `
                <div class="gallery-preview-item" data-url="${url}" style="
                    position: relative; 
                    width: 90px; 
                    height: 90px; 
                    border-radius: 8px; 
                    overflow: hidden; 
                    border: 1px solid #222; 
                    background-color: #111; 
                    display: inline-block; 
                    margin: 5px;
                ">
                    <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Preview">
                    <button type="button" class="remove-btn" onclick="removeGalleryImage('${url}', this)" style="
                        position: absolute; 
                        top: 4px; 
                        right: 4px; 
                        background: rgba(0,0,0,0.8); 
                        color: #fff; 
                        border: none; 
                        border-radius: 50%; 
                        width: 18px; 
                        height: 18px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        cursor: pointer; 
                        font-size: 10px;
                    ">×</button>
                </div>
            `;
        });
    }

    window.removeGalleryImage = (url, btn) => {
        uploadedGalleryUrls = uploadedGalleryUrls.filter(u => u !== url);
        const item = btn.closest('.gallery-preview-item');
        if (item) item.remove();
    };

    // Micro Delete Confirmation Modal Controller
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteOverlay = document.getElementById('delete-confirm-overlay');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    let projectToDeleteId = null;

    window.triggerDeleteProject = (id, event) => {
        if (event) event.stopPropagation();
        projectToDeleteId = id;
        if (deleteModal) deleteModal.classList.add('open');
        if (deleteOverlay) deleteOverlay.classList.add('open');
    };

    function closeDeleteModal() {
        projectToDeleteId = null;
        if (deleteModal) deleteModal.classList.remove('open');
        if (deleteOverlay) deleteOverlay.classList.remove('open');
    }

    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
    if (deleteOverlay) deleteOverlay.addEventListener('click', closeDeleteModal);

    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async () => {
            if (!projectToDeleteId) return;
            const targetId = projectToDeleteId;
            closeDeleteModal();
            
            const row = document.getElementById(`proj-row-${targetId}`);
            if (row) {
                row.classList.add('row-fade-out');
            }
            
            const { error } = await db.from('projects').delete().eq('id', targetId);
            if (error) {
                alert('Error deleting project: ' + error.message);
                if (row) row.classList.remove('row-fade-out');
            } else {
                setTimeout(() => {
                    if (row) row.remove();
                    loadDashboardData();
                }, 150);
            }
        });
    }

   async function loadProjectsList() {
    const tbody = document.getElementById('projects-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Loading projects...</td></tr>';

    // MODIFICADO: Excluimos el '*' y listamos solo las columnas de identidad que usa la tabla para mostrarse
    const { data: projects, error } = await db
        .from('projects')
        .select('id, client_name, project_title, category, year, is_featured')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#e53e3e;">Error: ${error.message}</td></tr>`;
        return;
    }
    
    // ... (todo el resto de la función projects.forEach queda exactamente igual)
c

        tbody.innerHTML = '';
        if (!projects || projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:var(--color-text-muted);text-align:center;">No projects found.</td></tr>';
            return;
        }

        projects.forEach(project => {
            const fullTitle = `<strong>${sanitizeHTML(project.client_name)}</strong> <span style="opacity: 0.5; margin-left: 0.5rem; font-weight: normal;">— ${sanitizeHTML(project.project_title || '')}</span>`;
            tbody.innerHTML += `
                <tr id="proj-row-${project.id}">
                    <td>${fullTitle}</td>
                    <td><span style="font-family: var(--font-heading); font-weight: 700; letter-spacing: 0.05em;">${sanitizeHTML(project.category)}</span></td>
                    <td>${sanitizeHTML(project.year ? project.year.toString() : '—')}</td>
                    <td><span class="status ${project.is_featured ? 'new' : 'read'}">${project.is_featured ? 'Yes' : 'No'}</span></td>
                    <td style="text-align:right;">
                        <button class="btn btn--outline btn--sm" onclick="editProject('${project.id}')"><i class="ph ph-note-pencil"></i> Edit</button>
                        <button class="btn btn--outline btn--sm" onclick="triggerDeleteProject('${project.id}', event)" style="margin-left:0.5rem;color:#e53e3e;border-color:rgba(229,62,62,0.2);"><i class="ph ph-trash"></i> Delete</button>
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
        
        document.getElementById('project-client').value = project.client_name || '';
        document.getElementById('project-title').value = project.project_title || '';
        document.getElementById('project-slug').value = project.slug || '';
        document.getElementById('project-category').value = project.category || '';
        document.getElementById('project-year').value = project.year || '';
        document.getElementById('project-description').value = project.strategy_description || '';
        const featuredEl = document.getElementById('project-featured');
        featuredEl.checked = project.is_featured || false;
        // Store original featured state so the guardrail can allow editing a self-featured project
        featuredEl.dataset.originalFeatured = String(project.is_featured || false);
        
        uploadedGalleryUrls = Array.isArray(project.project_images) ? [...project.project_images] : [];
        if (galleryPreviews) {
            galleryPreviews.innerHTML = '';
            uploadedGalleryUrls.forEach(url => {
                galleryPreviews.innerHTML += renderGalleryPreviewItem(url);
            });
        }
        
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
        
        showForm(projectEditorContainer);
        // Re-run guardrail after populating the form in edit mode
        await checkFeaturedGuardrail();
    };

    // ── FEATURED GUARDRAIL ────────────────────────────────────────────────
    // Max 4 featured projects. On checkbox change, count live DB rows.
    // If at limit and user tries to check a NEW project, block + warn.

    const featuredCheckbox   = document.getElementById('project-featured');
    const featuredWarning    = document.getElementById('featured-limit-warning');
    const FEATURED_MAX       = 4;

    async function checkFeaturedGuardrail() {
        if (!featuredCheckbox || !featuredWarning) return;

        const submitBtn = document.getElementById('project-submit-btn');

        // Count how many projects currently have is_featured = true
        const { count, error } = await db
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('is_featured', true);

        if (error) return; // fail silently, don't block on network error

        const atLimit = count >= FEATURED_MAX;

        // If editing an already-featured project, the user can keep it featured
        // (it won't add a net new featured slot). Only block when adding a NEW one.
        const isSelfFeatured = editingProjectId
            ? featuredCheckbox.dataset.originalFeatured === 'true'
            : false;

        const wouldExceed = atLimit && featuredCheckbox.checked && !isSelfFeatured;

        if (wouldExceed) {
            featuredWarning.style.display = 'block';
            if (submitBtn) submitBtn.disabled = true;
        } else {
            featuredWarning.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    if (featuredCheckbox) {
        featuredCheckbox.addEventListener('change', checkFeaturedGuardrail);
    }

    const projectCancelBtn = document.getElementById('project-cancel-btn');
    if (projectCancelBtn) {
        projectCancelBtn.addEventListener('click', () => {
            editingProjectId = null;
            projectForm.reset();
            uploadedImageUrl = null;
            uploadedGalleryUrls = [];
            if (imagePreview) imagePreview.innerHTML = '';
            if (galleryPreviews) galleryPreviews.innerHTML = '';
            // Reset guardrail state
            if (featuredWarning) featuredWarning.style.display = 'none';
            const submitBtn = document.getElementById('project-submit-btn');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Publish Project <i class="ph ph-rocket-launch"></i>'; }
            projectCancelBtn.style.display = 'none';
            hideForm(projectEditorContainer);
        });
    }

   if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn  = projectForm.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;

            // Final guardrail check before saving (safety net)
            if (featuredWarning && featuredWarning.style.display !== 'none') {
                return; // blocked — warning already visible
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner"></i> Saving...';

            // Captura de inputs limpia
            const clientName = document.getElementById('project-client').value.trim();
            const projectTitle = document.getElementById('project-title').value.trim();
            const slug       = document.getElementById('project-slug').value.trim() || sanitizeSlug(projectTitle);
            const category   = document.getElementById('project-category').value;
            const yearVal    = document.getElementById('project-year').value.trim();
            const year       = parseInt(yearVal, 10);
            const strategyDescription = document.getElementById('project-description').value.trim();
            const isFeatured          = document.getElementById('project-featured')?.checked || false;

            // Validar campos requeridos usando la variable correcta
            if (!clientName || !projectTitle || !category || !yearVal || !strategyDescription) {
                alert('Todos los campos de identidad y narrativa estratégica son obligatorios.');
                btn.innerHTML = orig;
                btn.disabled = false;
                return;
            }

            if (isNaN(year)) {
                alert('Por favor, introduce un año válido.');
                btn.innerHTML = orig;
                btn.disabled = false;
                return;
            }

            // Payload perfectamente sincronizado con el esquema actual de Supabase
            const projectPayload = {
                client_name: clientName,
                project_title: projectTitle,
                slug,
                category,
                year,
                strategy_description: strategyDescription || null,
                main_image: uploadedImageUrl || null,
                project_images: uploadedGalleryUrls, // Tus mockups guardados como array
                is_featured: isFeatured
            };

            let resError;
            
            if (editingProjectId) {
                // Modo Edición
                const { error } = await db
                    .from('projects')
                    .update(projectPayload)
                    .eq('id', editingProjectId);
                resError = error;
            } else {
                // Modo Creación
                const { error } = await db
                    .from('projects')
                    .insert([projectPayload]);
                resError = error;
            }

            // Restaurar estado del botón interactivo
            btn.disabled = false;
            btn.innerHTML = orig;

            if (resError) {
                alert('Error al guardar el proyecto: ' + resError.message);
            } else {
                // Éxito absoluto: Reseteo y actualización en caliente de la interfaz
                editingProjectId = null;
                projectForm.reset();
                uploadedImageUrl = null;
                uploadedGalleryUrls = [];
                if (imagePreview) imagePreview.innerHTML = '';
                if (galleryPreviews) galleryPreviews.innerHTML = '';
                if (featuredWarning) featuredWarning.style.display = 'none';
                if (projectCancelBtn) projectCancelBtn.style.display = 'none';
                
                hideForm(projectEditorContainer);
                await loadDashboardData(); // Recarga las tablas y contadores al instante
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  BLOG — Create, List, Edit & Delete Posts
    // ------------------------------------------------------------------ //
    const blogForm    = document.getElementById('blog-form');
    const postContent = document.getElementById('post-content');
    const readingTime = document.getElementById('reading-time');
    const postSlugEl  = document.getElementById('post-slug');

    // Auto-calculate reading time + auto-generate slug on title input
    const postTitleEl = document.getElementById('post-title');
    if (postTitleEl && postSlugEl) {
        postTitleEl.addEventListener('input', () => {
            if (!editingBlogPostId) {
                const raw = postTitleEl.value.trim();
                postSlugEl.value = raw
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
            }
        });
    }

    if (postContent && readingTime) {
        postContent.addEventListener('input', () => {
            const words = postContent.value.trim().split(/\s+/).filter(Boolean).length;
            readingTime.value = words > 0 ? `${Math.ceil(words / 200)} MIN READ` : '';
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

    // Helper: format Date → "MON YYYY" in uppercase (official studio nomenclature)
    function formatMonthYear(dateStr) {
        const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const d = dateStr ? new Date(dateStr) : new Date();
        return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }

    async function loadBlogList() {
        const tbody = document.getElementById('blog-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);">Loading articles...</td></tr>';

        const { data: posts, error } = await db.from('articles').select('*').order('created_at', { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#e53e3e;">Error: ${error.message}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        if (!posts || posts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:var(--color-text-muted);text-align:center;">No articles found.</td></tr>';
            return;
        }

        posts.forEach(post => {
            // Use stored published_date, or auto-derive from created_at
            const displayDate = post.published_date || formatMonthYear(post.created_at);
            tbody.innerHTML += `
                <tr>
                    <td><strong>${sanitizeHTML(post.title)}</strong></td>
                    <td>${sanitizeHTML(post.read_time || '—')}</td>
                    <td>${sanitizeHTML(displayDate)}</td>
                    <td style="text-align:right;">
                        <button class="btn btn--outline btn--sm" onclick="editBlogPost('${post.id}')"><i class="ph ph-note-pencil"></i> Edit</button>
                        <button class="btn btn--outline btn--sm" onclick="deleteBlogPost('${post.id}')" style="margin-left:0.5rem;color:#e53e3e;border-color:rgba(229,62,62,0.2);"><i class="ph ph-trash"></i> Delete</button>
                    </td>
                </tr>`;
        });
    }

    window.editBlogPost = async (id) => {
        const { data: post, error } = await db.from('articles').select('*').eq('id', id).single();
        if (error || !post) {
            alert('Error loading article: ' + error?.message);
            return;
        }

        editingBlogPostId = post.id;

        document.getElementById('post-title').value          = post.title || '';
        if (postSlugEl) postSlugEl.value                     = post.slug  || '';
        if (readingTime) readingTime.value                   = post.read_time || '';
        document.getElementById('post-published-date').value = post.published_date || '';
        postContent.value                                    = post.body_content || '';
        const metaTitleEl = document.getElementById('post-meta-title');
        const metaDescEl  = document.getElementById('post-meta-description');
        if (metaTitleEl) metaTitleEl.value = post.meta_title || '';
        if (metaDescEl)  metaDescEl.value  = post.meta_description || '';

        const submitBtn = document.getElementById('blog-submit-btn');
        if (submitBtn) submitBtn.innerHTML = '[ UPDATE ARTICLE ]';

        const cancelBtn = document.getElementById('blog-cancel-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        showForm(blogEditorContainer);
    };

    // Article delete micro-modal
    let _pendingDeleteId = null;
    const articleDeleteModal   = document.getElementById('article-delete-modal');
    const articleDeleteConfirm = document.getElementById('article-delete-confirm');
    const articleDeleteCancel  = document.getElementById('article-delete-cancel');

    function showArticleDeleteModal(id) {
        _pendingDeleteId = id;
        if (articleDeleteModal) {
            articleDeleteModal.style.display = 'flex';
            requestAnimationFrame(() => articleDeleteModal.style.opacity = '1');
        }
    }
    function hideArticleDeleteModal() {
        _pendingDeleteId = null;
        if (articleDeleteModal) articleDeleteModal.style.display = 'none';
    }

    if (articleDeleteCancel)  articleDeleteCancel.addEventListener('click', hideArticleDeleteModal);
    if (articleDeleteModal)   articleDeleteModal.addEventListener('click', (e) => { if (e.target === articleDeleteModal) hideArticleDeleteModal(); });

    if (articleDeleteConfirm) {
        articleDeleteConfirm.addEventListener('click', async () => {
            if (!_pendingDeleteId) return;
            const id = _pendingDeleteId;
            hideArticleDeleteModal();
            const { error } = await db.from('articles').delete().eq('id', id);
            if (error) alert('Error deleting article: ' + error.message);
            else loadDashboardData();
        });
    }

    window.deleteBlogPost = (id) => showArticleDeleteModal(id);

    const blogCancelBtn = document.getElementById('blog-cancel-btn');
    if (blogCancelBtn) {
        blogCancelBtn.addEventListener('click', () => {
            editingBlogPostId = null;
            blogForm.reset();
            if (readingTime) readingTime.value = '';
            if (postSlugEl)  postSlugEl.value  = '';
            const metaTitleEl = document.getElementById('post-meta-title');
            const metaDescEl  = document.getElementById('post-meta-description');
            if (metaTitleEl) metaTitleEl.value = '';
            if (metaDescEl)  metaDescEl.value  = '';
            const submitBtn = document.getElementById('blog-submit-btn');
            if (submitBtn) submitBtn.innerHTML = '[ PUBLISH ARTICLE ]';
            blogCancelBtn.style.display = 'none';
            hideForm(blogEditorContainer);
        });
    }

    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn  = blogForm.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-spinner"></i> Publishing...';

            const rawTitle    = document.getElementById('post-title').value.trim();
            const title       = rawTitle.toUpperCase();

            // Slug: use the preview field if populated, otherwise auto-generate
            const slugRaw = postSlugEl?.value.trim() ||
                rawTitle.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const bodyContent = postContent.value.trim();

            // Reading time: auto-calculated if field is empty
            let readTimeVal = readingTime?.value.trim() || '';
            if (!readTimeVal) {
                const words = bodyContent.split(/\s+/).filter(Boolean).length;
                readTimeVal = words > 0 ? `${Math.ceil(words / 200)} MIN READ` : '1 MIN READ';
            } else {
                readTimeVal = readTimeVal.toUpperCase();
                if (!readTimeVal.includes('READ')) readTimeVal += ' MIN READ';
            }

            // Published date: auto-derive from today if empty
            let pubDate = document.getElementById('post-published-date')?.value.trim() || '';
            if (!pubDate) {
                pubDate = formatMonthYear(null); // current month/year
            } else {
                pubDate = pubDate.toUpperCase();
            }

            // SEO optional fields
            const metaTitle = document.getElementById('post-meta-title')?.value.trim() || null;
            const metaDesc  = document.getElementById('post-meta-description')?.value.trim() || null;

            let resError;
            const articlePayload = {
                title,
                slug:           slugRaw,
                read_time:      readTimeVal,
                published_date: pubDate,
                body_content:   bodyContent,
                meta_title:        metaTitle,
                meta_description:  metaDesc
            };

            if (editingBlogPostId) {
                const { error } = await db.from('articles').update(articlePayload).eq('id', editingBlogPostId);
                resError = error;
            } else {
                const { error } = await db.from('articles').insert([articlePayload]);
                resError = error;
            }

            if (resError) {
                btn.innerHTML = '⚠ ' + resError.message;
                btn.style.background = '#e53e3e';
            } else {
                btn.innerHTML = editingBlogPostId ? '✓ Article Updated!' : '✓ Article Published!';
                btn.style.background = '#28a745';
                blogForm.reset();
                if (readingTime) readingTime.value = '';
                if (postSlugEl)  postSlugEl.value  = '';
                editingBlogPostId = null;
                if (blogCancelBtn) blogCancelBtn.style.display = 'none';
                hideForm(blogEditorContainer);
                loadDashboardData();
            }
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; }, 3000);
        });
    }

    // ------------------------------------------------------------------ //
    //  SEARCH — Live filter using Supabase ilike
    // ------------------------------------------------------------------ //
    const searchInput = document.querySelector('.topbar__search input');
    let searchDebounceTimeout = null;

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(async () => {
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    performSearch(query);
                } else {
                    // Reset to full list
                    loadDashboardData();
                }
            }, 300);
        });
    }

    async function performSearch(term) {
        const pattern = `%${term}%`;

        // 1. Search Systems (projects)
        const projBody = document.getElementById('projects-table-body');
        if (projBody) {
            projBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Searching...</td></tr>';
            const { data: projects } = await db.from('projects').select('*').ilike('client_name', pattern).order('created_at', { ascending: false });
            projBody.innerHTML = '';
            if (!projects || projects.length === 0) {
                projBody.innerHTML = '<tr><td colspan="5" style="color:var(--color-text-muted);text-align:center;">No matching systems found.</td></tr>';
            } else {
                projects.forEach(project => {
                    const fullTitle = `<strong>${sanitizeHTML(project.client_name)}</strong> <span style="opacity: 0.5; margin-left: 0.5rem; font-weight: normal;">— ${sanitizeHTML(project.project_title || '')}</span>`;
                    projBody.innerHTML += `
                        <tr id="proj-row-${project.id}">
                            <td>${fullTitle}</td>
                            <td><span style="font-family: var(--font-heading); font-weight: 700; letter-spacing: 0.05em;">${sanitizeHTML(project.category)}</span></td>
                            <td>${sanitizeHTML(project.year ? project.year.toString() : '—')}</td>
                            <td><span class="status ${project.is_featured ? 'new' : 'read'}">${project.is_featured ? 'Yes' : 'No'}</span></td>
                            <td style="text-align:right;">
                                <button class="btn btn--outline btn--sm" onclick="editProject('${project.id}')"><i class="ph ph-note-pencil"></i> Edit</button>
                                <button class="btn btn--outline btn--sm" onclick="triggerDeleteProject('${project.id}', event)" style="margin-left:0.5rem;color:#e53e3e;border-color:rgba(229,62,62,0.2);"><i class="ph ph-trash"></i> Delete</button>
                            </td>
                        </tr>`;
                });
            }
        }

        // 2. Search Articles
        const blogBody = document.getElementById('blog-table-body');
        if (blogBody) {
            blogBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);">Searching...</td></tr>';
            const { data: posts } = await db.from('articles').select('*').ilike('title', pattern).order('created_at', { ascending: false });
            blogBody.innerHTML = '';
            if (!posts || posts.length === 0) {
                blogBody.innerHTML = '<tr><td colspan="4" style="color:var(--color-text-muted);text-align:center;">No matching articles found.</td></tr>';
            } else {
                posts.forEach(post => {
                    blogBody.innerHTML += `
                        <tr>
                            <td><strong>${sanitizeHTML(post.title)}</strong></td>
                            <td>${sanitizeHTML(post.read_time || '—')}</td>
                            <td>${sanitizeHTML(post.published_date || '—')}</td>
                            <td style="text-align:right;">
                                <button class="btn btn--outline btn--sm" onclick="editBlogPost('${post.id}')"><i class="ph ph-note-pencil"></i> Edit</button>
                                <button class="btn btn--outline btn--sm" onclick="deleteBlogPost('${post.id}')" style="margin-left:0.5rem;color:#e53e3e;border-color:rgba(229,62,62,0.2);"><i class="ph ph-trash"></i> Delete</button>
                            </td>
                        </tr>`;
                });
            }
        }

        // 3. Search Enlist Applications (Leads)
        const leadsBody = document.getElementById('leads-table-body');
        if (leadsBody) {
            leadsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Searching...</td></tr>';
            const { data: leads } = await db.from('enlist_applications').select('*').ilike('brand_name', pattern).order('created_at', { ascending: false });
            leadsBody.innerHTML = '';
            if (!leads || leads.length === 0) {
                leadsBody.innerHTML = '<tr><td colspan="5" style="color:var(--color-text-muted);">No matching leads found.</td></tr>';
            } else {
                leads.forEach(lead => {
                    const date = new Date(lead.created_at).toLocaleDateString();
                    const snippet = `[${lead.discipline_needed || ''}] ${lead.market_scenario || ''}`.substring(0, 60) + (lead.market_scenario && lead.market_scenario.length > 60 ? '...' : '');
                    leadsBody.innerHTML += `
                        <tr onclick="openLeadsDrawer('${lead.id}', event)">
                            <td>${sanitizeHTML(lead.brand_name)}</td>
                            <td>${sanitizeHTML(lead.client_email)}</td>
                            <td>${sanitizeHTML(snippet)}</td>
                            <td><span class="status ${lead.status}">${lead.status}</span></td>
                            <td>
                                <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); markLeadRead('${lead.id}', this)">Mark Read</button>
                                <a href="mailto:${sanitizeHTML(lead.client_email)}" class="btn btn--primary btn--sm" style="margin-left:0.5rem;" onclick="event.stopPropagation();">Reply</a>
                            </td>
                        </tr>`;
                });
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  STRUCTURE & EXPERTISE MANAGER (Módulo 26)
    // ------------------------------------------------------------------ //
    async function loadExpertiseView() {
        const list = document.getElementById('expertise-pillars-list');
        if (!list) return;

        // Show skeletons while loading
        list.innerHTML = Array(5).fill('<div class="expertise-skeleton"></div>').join('');

        const { data: pillars, error } = await db
            .from('studio_expertise')
            .select('id, pillar_key, pillar_num, title, description')
            .order('pillar_num', { ascending: true });

        if (error || !pillars || pillars.length === 0) {
            list.innerHTML = '<p style="color:rgba(255,255,255,0.3);padding:2rem 0;">Error loading expertise data.</p>';
            return;
        }

        list.innerHTML = '';

        pillars.forEach(pillar => {
            const block = document.createElement('div');
            block.className = 'expertise-pillar';
            block.dataset.id = pillar.id;

            // Auto-resize textarea helper
            const taId = `expertise-ta-${pillar.pillar_key}`;
            const btnId = `expertise-btn-${pillar.pillar_key}`;

            block.innerHTML = `
                <span class="expertise-pillar__num">${sanitizeHTML(pillar.pillar_num)}</span>
                <div class="expertise-pillar__body">
                    <h3 class="expertise-pillar__title">${sanitizeHTML(pillar.title)}</h3>
                    <textarea
                        id="${taId}"
                        class="expertise-desc-ta"
                        rows="3"
                        spellcheck="false"
                        aria-label="Description for ${sanitizeHTML(pillar.title)}"
                    >${sanitizeHTML(pillar.description || '')}</textarea>
                </div>
                <button id="${btnId}" class="expertise-update-btn">[ UPDATE CORE EXPERTISE ]</button>
            `;

            list.appendChild(block);

            // Auto-resize on input
            const ta = block.querySelector(`#${taId}`);
            function autoResize() {
                ta.style.height = 'auto';
                ta.style.height = ta.scrollHeight + 'px';
            }
            ta.addEventListener('input', autoResize);
            // Initial size
            requestAnimationFrame(autoResize);

            // UPDATE button handler
            const btn = block.querySelector(`#${btnId}`);
            btn.addEventListener('click', async () => {
                const newDesc = ta.value.trim();
                btn.textContent = '[ SAVING... ]';
                btn.className = 'expertise-update-btn saving';

                const { error: updateError } = await db
                    .from('studio_expertise')
                    .update({ description: newDesc, updated_at: new Date().toISOString() })
                    .eq('id', pillar.id);

                if (updateError) {
                    btn.textContent = '[ ERROR ]';
                    btn.className = 'expertise-update-btn error';
                    setTimeout(() => {
                        btn.textContent = '[ UPDATE CORE EXPERTISE ]';
                        btn.className = 'expertise-update-btn';
                    }, 3000);
                } else {
                    btn.textContent = '[ UPDATED ✓ ]';
                    btn.className = 'expertise-update-btn success';
                    setTimeout(() => {
                        btn.textContent = '[ UPDATE CORE EXPERTISE ]';
                        btn.className = 'expertise-update-btn';
                    }, 2500);
                }
            });
        });
    }

    // ------------------------------------------------------------------ //
    //  ANALYTICS DASHBOARD (Módulo 29)
    // ------------------------------------------------------------------ //
    let _analyticsChartInstance = null;

    async function loadAnalyticsView() {
        // Guard: only run if the view is visible
        const view = document.getElementById('view-analytics');
        if (!view) return;

        // ── 1. KPI Counts ───────────────────────────────────────
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [pageViews, sessions, enlistClicks, enlistSubmits, scrollEvents] = await Promise.all([
            db.from('analytics_events').select('id', { count: 'exact', head: true })
              .eq('event_type', 'page_view').gte('created_at', thirtyDaysAgo),
            db.from('analytics_events').select('session_id', { count: 'exact', head: true })
              .gte('created_at', thirtyDaysAgo),
            db.from('analytics_events').select('id', { count: 'exact', head: true })
              .eq('event_type', 'enlist_click').gte('created_at', thirtyDaysAgo),
            db.from('analytics_events').select('id', { count: 'exact', head: true })
              .eq('event_type', 'enlist_submit').gte('created_at', thirtyDaysAgo),
            db.from('analytics_events').select('scroll_depth')
              .not('scroll_depth', 'is', null).gte('created_at', thirtyDaysAgo)
        ]);

        const pvCount  = pageViews.count  || 0;
        const sesCount = sessions.count   || 0;
        const ecCount  = enlistClicks.count || 0;
        const esCount  = enlistSubmits.count || 0;

        // CTR = enlist_clicks / page_views
        const ctr = pvCount > 0 ? ((ecCount / pvCount) * 100).toFixed(1) + '%' : '0%';

        // Avg scroll depth
        let avgScroll = '—';
        if (scrollEvents.data && scrollEvents.data.length > 0) {
            const depths = scrollEvents.data.map(e => parseFloat(e.scroll_depth) || 0);
            avgScroll = Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) + '%';
        }

        const kpiPageviews = document.getElementById('kpi-pageviews');
        const kpiSessions  = document.getElementById('kpi-sessions');
        const kpiCtr       = document.getElementById('kpi-ctr');
        const kpiScroll    = document.getElementById('kpi-scroll');
        if (kpiPageviews) kpiPageviews.textContent = pvCount.toLocaleString();
        if (kpiSessions)  kpiSessions.textContent  = sesCount.toLocaleString();
        if (kpiCtr)       kpiCtr.textContent        = ctr;
        if (kpiScroll)    kpiScroll.textContent      = avgScroll;

        // ── 2. Trend Chart (30 days) ─────────────────────────
        const { data: trendData } = await db
            .from('analytics_events')
            .select('created_at')
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: true });

        // Bucket by day
        const dayBuckets = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
            const key = d.toISOString().slice(0, 10);
            dayBuckets[key] = 0;
        }
        (trendData || []).forEach(ev => {
            const key = ev.created_at.slice(0, 10);
            if (dayBuckets[key] !== undefined) dayBuckets[key]++;
        });

        const labels = Object.keys(dayBuckets).map(d => {
            const dt = new Date(d + 'T12:00:00');
            return dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
        });
        const values = Object.values(dayBuckets);

        const canvas = document.getElementById('analytics-trend-chart');
        if (canvas && typeof Chart !== 'undefined') {
            // Destroy previous instance to avoid ghost charts
            if (_analyticsChartInstance) { _analyticsChartInstance.destroy(); }

            _analyticsChartInstance = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Events',
                        data: values,
                        borderColor: '#ffffff',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        tension: 0.35,
                        fill: true,
                        backgroundColor: 'rgba(255,255,255,0.04)'
                    }]
                },
                options: {
                    responsive: true,
                    animation: { duration: 400 },
                    plugins: { legend: { display: false }, tooltip: {
                        backgroundColor: '#111',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        titleFont: { family: "'Barlow Condensed', sans-serif", size: 11, weight: '700' },
                        bodyFont:  { family: "'Inter', sans-serif", size: 11 },
                        callbacks: { title: items => labels[items[0].dataIndex] }
                    }},
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                             ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 9, family: "'Barlow Condensed', sans-serif" }, maxTicksLimit: 10 }},
                        y: { grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                             ticks: { color: 'rgba(255,255,255,0.25)', font: { size: 9 } }, beginAtZero: true }
                    }
                }
            });
        }

        // ── 3. Conversion Funnel Bars ───────────────────────
        const funnelEvents = [
            { key: 'page_view',    count: pvCount },
            { key: 'section_view', count: 0 },   // fetched below
            { key: 'enlist_click', count: ecCount },
            { key: 'enlist_submit',count: esCount }
        ];

        // Fetch section_view count
        const { count: svCount } = await db.from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('event_type', 'section_view').gte('created_at', thirtyDaysAgo);
        funnelEvents[1].count = svCount || 0;

        const maxFunnel = Math.max(...funnelEvents.map(f => f.count), 1);
        funnelEvents.forEach(({ key, count }) => {
            const bar   = document.getElementById(`funnel-bar-${key}`);
            const label = document.getElementById(`funnel-count-${key}`);
            if (bar)   bar.style.width   = ((count / maxFunnel) * 100) + '%';
            if (label) label.textContent = count.toLocaleString();
        });

        // ── 4. Top Pages Table ─────────────────────────────
        const { data: pageData } = await db
            .from('analytics_events')
            .select('page_path')
            .gte('created_at', thirtyDaysAgo);

        const topPagesEl = document.getElementById('analytics-top-pages');
        if (topPagesEl) {
            if (!pageData || pageData.length === 0) {
                topPagesEl.innerHTML = '<tr><td colspan="2" style="color:var(--color-text-muted);text-align:center;">No data yet.</td></tr>';
            } else {
                // Count by page_path
                const pathCount = {};
                pageData.forEach(ev => {
                    const p = ev.page_path || '/';
                    pathCount[p] = (pathCount[p] || 0) + 1;
                });
                const sorted = Object.entries(pathCount)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8);

                topPagesEl.innerHTML = sorted.map(([path, count]) => `
                    <tr>
                        <td style="font-family:monospace;font-size:0.75rem;color:rgba(255,255,255,0.7);">${sanitizeHTML(path)}</td>
                        <td style="text-align:right;font-weight:700;">${count.toLocaleString()}</td>
                    </tr>`).join('');
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  GLOBAL SETTINGS ENGINE (Módulo 30)
    // ------------------------------------------------------------------ //
    async function loadSettingsView() {
        const form = document.getElementById('settings-form');
        if (!form) return;

        // Fetch settings from database
        const { data: settings, error } = await db
            .from('system_settings')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000000')
            .single();

        if (error || !settings) {
            console.error('[SETTINGS] Error loading configuration:', error);
            return;
        }

        // Populate form inputs
        document.getElementById('setting-calendly-url').value = settings.calendly_url || '';
        document.getElementById('setting-webhook-url').value = settings.webhook_url || '';
        document.getElementById('setting-behance-url').value = settings.behance_url || '';
        document.getElementById('setting-linkedin-url').value = settings.linkedin_url || '';
        document.getElementById('setting-contact-email').value = settings.contact_email || '';
        document.getElementById('setting-maintenance-mode').checked = !!settings.maintenance_mode;

        // Update Calendly widget in Discovery Calls view
        updateCalendlyWidget(settings.calendly_url);
    }

    function updateCalendlyWidget(url) {
        const wrapper = document.querySelector('.calendly-wrapper');
        if (!wrapper) return;

        if (url) {
            wrapper.innerHTML = `<iframe src="${sanitizeHTML(url)}" width="100%" height="700px" frameborder="0" style="border: none; border-radius: 8px; background: transparent;"></iframe>`;
        } else {
            wrapper.innerHTML = `
                <div class="calendly-placeholder">
                    <i class="ph ph-calendar-check"></i>
                    <h3>Calendly Widget Active</h3>
                    <p>In production, the Calendly iframe renders here.</p>
                </div>`;
        }
    }

    // Submit handler for settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-settings-btn');
            const origText = btn.textContent;

            btn.disabled = true;
            btn.textContent = '[ SAVING... ]';

            const calendly_url = document.getElementById('setting-calendly-url').value.trim();
            const webhook_url = document.getElementById('setting-webhook-url').value.trim();
            const behance_url = document.getElementById('setting-behance-url').value.trim();
            const linkedin_url = document.getElementById('setting-linkedin-url').value.trim();
            const contact_email = document.getElementById('setting-contact-email').value.trim();
            const maintenance_mode = document.getElementById('setting-maintenance-mode').checked;

            const { error: updateError } = await db
                .from('system_settings')
                .update({
                    calendly_url,
                    webhook_url,
                    behance_url,
                    linkedin_url,
                    contact_email,
                    maintenance_mode,
                    updated_at: new Date().toISOString()
                })
                .eq('id', '00000000-0000-0000-0000-000000000000');

            if (updateError) {
                console.error('[SETTINGS] Save error:', updateError);
                btn.textContent = '[ ERROR ]';
                btn.style.backgroundColor = '#e53e3e';
                setTimeout(() => {
                    btn.textContent = origText;
                    btn.style.backgroundColor = '';
                    btn.disabled = false;
                }, 3000);
            } else {
                btn.textContent = '[ UPDATED ✓ ]';
                btn.style.backgroundColor = '#22c55e';
                
                // Refresh the widget immediately
                updateCalendlyWidget(calendly_url);

                setTimeout(() => {
                    btn.textContent = origText;
                    btn.style.backgroundColor = '';
                    btn.disabled = false;
                }, 2500);
            }
        });
    }

});
