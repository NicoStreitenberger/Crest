document.addEventListener('DOMContentLoaded', () => {

    // --- Auth Logic ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    
    if (sessionStorage.getItem('strn_logged_in') === 'true') {
        if (loginOverlay) loginOverlay.style.display = 'none';
    }

    // XSS Sanitizer Function
    function sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('login-user').value;
            const pass = document.getElementById('login-pass').value;
            
            // Default credentials handling (as requested)
            const savedPass = localStorage.getItem('strn_admin_pass') || 'admin';
            
            if (user === 'admin' && pass === savedPass) {
                sessionStorage.setItem('strn_logged_in', 'true');
                loginOverlay.style.opacity = '0';
                setTimeout(() => loginOverlay.style.display = 'none', 300);
            } else {
                document.getElementById('login-error').style.display = 'block';
            }
        });
    }

    // --- Sidebar & Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    // Switch Views
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items and views
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show corresponding view
            const targetId = `view-${item.getAttribute('data-target')}`;
            const targetView = document.getElementById(targetId);
            if (targetView) {
                targetView.classList.add('active');
            }
            
            // Close sidebar on mobile after clicking
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // --- Mobile Menu Toggle ---
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const mobileClose = document.getElementById('mobile-close');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (mobileClose && sidebar) {
        mobileClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // --- Blog Engine: Estimated Reading Time ---
    const postContent = document.getElementById('post-content');
    const readingTimeInput = document.getElementById('reading-time');

    if (postContent && readingTimeInput) {
        postContent.addEventListener('input', () => {
            const text = postContent.value;
            const words = text.trim().split(/\s+/).length;
            
            // If empty text, words is 1 because split on empty string gives [""]
            if (text.trim() === '') {
                readingTimeInput.value = '0 min read';
                return;
            }
            
            // Average reading speed is ~200 words per minute
            const time = Math.ceil(words / 200);
            readingTimeInput.value = `${time} min read`;
        });
    }

    // --- Markdown Toolbar Interactions (Placeholder) ---
    const mdButtons = document.querySelectorAll('.md-toolbar button');
    mdButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = btn.querySelector('i').className;
            
            // Basic text insertion logic for demo purposes
            if (postContent) {
                const start = postContent.selectionStart;
                const end = postContent.selectionEnd;
                const selectedText = postContent.value.substring(start, end);
                let insertText = '';

                if (icon.includes('text-b')) insertText = `**${selectedText || 'bold text'}**`;
                else if (icon.includes('text-italic')) insertText = `*${selectedText || 'italic text'}*`;
                else if (icon.includes('link')) insertText = `[${selectedText || 'link text'}](url)`;
                else if (icon.includes('quotes')) insertText = `> ${selectedText || 'quote'}`;
                else if (icon.includes('code')) insertText = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
                else if (icon.includes('image')) insertText = `![alt text](image_url)`;

                postContent.setRangeText(insertText, start, end, 'select');
            }
        });
    });

    // --- Prevent Form Submissions for Demo & Add Logic ---
    const forms = document.querySelectorAll('form:not(#login-form)');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Change button state to show save success
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = 'Saved Successfully! <i class="ph ph-check"></i>';
                submitBtn.style.backgroundColor = '#28a745'; // Green success
                
                // If this is the project form, save to localStorage
                if (form.closest('#view-portfolio')) {
                    const title = sanitizeHTML(form.querySelector('input[type="text"]').value);
                    const category = sanitizeHTML(form.querySelector('select').value);
                    const tags = sanitizeHTML(form.querySelectorAll('input[type="text"]')[1].value);
                    
                    if (title) {
                        let projects = JSON.parse(localStorage.getItem('strn_projects')) || [];
                        projects.push({
                            id: Date.now(),
                            title: title.toUpperCase(),
                            category: category,
                            tags: tags,
                            image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80' // Placeholder
                        });
                        localStorage.setItem('strn_projects', JSON.stringify(projects));
                        form.reset();
                    }
                }
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.style.backgroundColor = ''; // Reset to default CSS
                }, 2000);
            }
        });
    });

});
