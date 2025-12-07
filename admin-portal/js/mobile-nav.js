document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Navigation Scroll Logic ---
    const mobileNavbar = document.getElementById('mobile-navbar');
    const mainContent = document.querySelector('.main-content');
    let lastScrollTop = 0;
    const scrollThreshold = 10; // Minimum scroll difference

    if (mobileNavbar && mainContent) {
        mainContent.addEventListener('scroll', () => {
            const currentScroll = mainContent.scrollTop;

            // Ignore small movements or bounce effects
            if (Math.abs(currentScroll - lastScrollTop) <= 5) return;

            if (currentScroll > lastScrollTop && currentScroll > 20) {
                // Scrolling Down -> Hide Navbar
                if (!mobileNavbar.classList.contains('hidden-nav')) {
                    mobileNavbar.classList.add('hidden-nav');
                }
            } else {
                // Scrolling Up -> Show Navbar
                if (mobileNavbar.classList.contains('hidden-nav')) {
                    mobileNavbar.classList.remove('hidden-nav');
                }
            }
            lastScrollTop = currentScroll;
        });
    }

    // --- Mobile Nav Active State logic (sync with Sidebar) ---
    const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
    const sidebarItems = document.querySelectorAll('.nav-item');
    const contentFrame = document.getElementById('content-frame');

    function updateActiveState(pageName) {
        // Update Sidebar
        sidebarItems.forEach(item => {
            if (item.getAttribute('data-page') === pageName) item.classList.add('active');
            else item.classList.remove('active');
        });

        // Update Mobile Nav
        mobileNavItems.forEach(item => {
            if (item.getAttribute('data-page') === pageName) item.classList.add('active');
            else item.classList.remove('active');
        });
    }

    mobileNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');

            // Update Iframe
            contentFrame.src = `pages/${page}/view.html`;

            // Update Active State
            updateActiveState(page);
        });
    });

    // Ensure sidebar clicks also update mobile nav state
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            updateActiveState(page);
        });
    });
});
