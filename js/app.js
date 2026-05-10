document.addEventListener('DOMContentLoaded', () => {
    
    // --- Custom Cursor ---
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    const links = document.querySelectorAll('a, button, .bento-item, .project-card__image');

    let mouseX = 0, mouseY = 0;
    let followerX = 0, followerY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Move inner dot instantly
        cursor.style.left = `${mouseX}px`;
        cursor.style.top = `${mouseY}px`;
    });

    // Smooth follower loop
    function animateFollower() {
        // Easing factor (0.1 = smooth and slow)
        let dx = mouseX - followerX;
        let dy = mouseY - followerY;
        
        followerX += dx * 0.15;
        followerY += dy * 0.15;
        
        cursorFollower.style.left = `${followerX}px`;
        cursorFollower.style.top = `${followerY}px`;
        
        requestAnimationFrame(animateFollower);
    }
    animateFollower();

    // Hover states for cursor
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            cursor.classList.add('hovered');
            cursorFollower.classList.add('hovered');
        });
        link.addEventListener('mouseleave', () => {
            cursor.classList.remove('hovered');
            cursorFollower.classList.remove('hovered');
        });
    });

    // --- Header Scroll Effect ---
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Reveal Animations (Intersection Observer) ---
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                // Optional: unobserve if you only want it to animate once
                // observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // --- Parallax Effect on Project Images ---
    const parallaxContainers = document.querySelectorAll('.parallax-container');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        
        parallaxContainers.forEach(container => {
            const img = container.querySelector('.parallax-img');
            // Check if element is in viewport
            const rect = container.getBoundingClientRect();
            
            if (rect.top <= window.innerHeight && rect.bottom >= 0) {
                // Calculate parallax offset based on scroll position relative to the element
                const speed = 0.15;
                const yPos = -(rect.top * speed);
                img.style.transform = `translateY(${yPos - 10}%)`; // -10% is the base offset from CSS
            }
        });
    });

    // --- Mobile Menu (Placeholder) ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            alert('Mobile menu toggle');
        });
    }

    // --- CMS & LocalStorage Logic ---
    function initData() {
        const defaultProjects = [
            { id: 1, title: 'FUSION BODYBOARD', category: 'Physical Branding', tags: 'Sports & Technical Gear', image: 'assets/project1.png' },
            { id: 2, title: 'LIFERUN APP', category: 'Digital Design', tags: 'UX/UI Product Design', image: 'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=800&q=80' },
            { id: 3, title: 'MODO PATRIA', category: 'Brand Identity', tags: 'Streetwear E-commerce', image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=800&q=80' },
            { id: 4, title: 'AETHER FINANCIER', category: 'Digital Design', tags: 'SaaS Dashboard', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
            { id: 5, title: 'NORDIC COFFEE', category: 'Brand Identity', tags: 'Packaging & Visuals', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80' }
        ];

        // Check if there are less than 5 projects, then update
        let existingProjects = JSON.parse(localStorage.getItem('strn_projects')) || [];
        if (existingProjects.length < 5) {
            // Keep any newly added custom projects but merge defaults
            const customProjects = existingProjects.filter(p => p.id > 10); // Assume custom ones use Date.now() timestamp
            const merged = [...defaultProjects, ...customProjects];
            localStorage.setItem('strn_projects', JSON.stringify(merged));
        }

        const defaultPosts = [
            { id: 1, title: 'The Power of Branding in 2026', tags: 'Branding', time: '5 Min Read', author: 'Nico Streitenberger' },
            { id: 2, title: 'Digital Identity vs. Visual Identity', tags: 'Strategy', time: '3 Min Read', author: 'Nico Streitenberger' },
            { id: 3, title: 'Design Discipline in the Creative Process', tags: 'Workflow', time: '6 Min Read', author: 'Nico Streitenberger' }
        ];

        if (!localStorage.getItem('strn_posts')) {
            localStorage.setItem('strn_posts', JSON.stringify(defaultPosts));
        }
    }
    initData();

    // --- Dynamic Portfolio Rendering & Filtering ---
    const portfolioContainer = document.getElementById('dynamic-portfolio');
    const filterBtns = document.querySelectorAll('.filter-btn');

    function renderProjects(filter = 'all') {
        if (!portfolioContainer) return;
        
        let projects = JSON.parse(localStorage.getItem('strn_projects')) || [];
        
        if (filter !== 'all') {
            projects = projects.filter(p => p.category === filter);
        }

        portfolioContainer.innerHTML = '';
        
        // Limit to 4 projects max on home to match Bento Grid
        const displayProjects = projects.slice(0, 4);
        
        displayProjects.forEach((project, index) => {
            const card = document.createElement('div');
            card.className = 'project-card';
            
            // Assign bento-style grid classes
            if (index === 0) card.classList.add('project-card--large');
            if (index === 3) card.classList.add('project-card--wide');

            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.position = 'relative';

            card.innerHTML = `
                <div class="project-card__image parallax-container" style="border-radius:24px;overflow:hidden;position:absolute;top:0;left:0;width:100%;height:100%;">
                    <img src="${project.image}" alt="${project.title}" style="width:100%;height:100%;object-fit:cover;">
                    <div class="project-card__overlay">
                        <a href="portfolio-post.html" class="view-project">View Case <i class="ph ph-arrow-up-right"></i></a>
                    </div>
                </div>
                <div class="project-card__info" style="position:absolute;bottom:0;left:0;right:0;padding:2rem;background:linear-gradient(to top, rgba(0,0,0,0.9), transparent);border-radius:0 0 24px 24px;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;">
                    <h3 style="margin:0;font-size:1.5rem;">${project.title}</h3>
                    <span style="color:var(--color-accent);font-weight:600;font-size:0.875rem;">${project.category}</span>
                </div>
            `;
            portfolioContainer.appendChild(card);

            // Animate In
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50 * index);
        });
    }

    if (portfolioContainer) {
        renderProjects();

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderProjects(btn.getAttribute('data-filter'));
            });
        });
    }
});
