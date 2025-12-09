document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const contentFrame = document.getElementById('content-frame');
    const loader = document.getElementById('loader');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add active to clicked
            item.classList.add('active');

            const page = item.getAttribute('data-page');
            const pageUrl = `pages/${page}/view.html`;

            // Set active page attribute for CSS hooks
            document.querySelector('.main-content').setAttribute('data-active-page', page);

            // Show loader
            contentFrame.classList.remove('loaded');
            // Timeout to simulate transition/allow CSS opacity to fade out
            setTimeout(() => {
                loader.classList.add('active');
                contentFrame.src = pageUrl;
            }, 300);
        });
    });

    // Initial Active Page Set
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        document.querySelector('.main-content').setAttribute('data-active-page', activeNav.getAttribute('data-page'));
    }


    // Content Frame Load Event
    contentFrame.addEventListener('load', () => {
        loader.classList.remove('active');
        contentFrame.classList.add('loaded');

        // Update document title based on page?
        // Optional polish
    });
});
