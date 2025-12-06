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

            // Show loader
            contentFrame.classList.remove('loaded');
            // Timeout to simulate transition/allow CSS opacity to fade out
            setTimeout(() => {
                loader.classList.add('active');
                contentFrame.src = pageUrl;
            }, 300);
        });
    });

    // Content Frame Load Event
    contentFrame.addEventListener('load', () => {
        loader.classList.remove('active');
        contentFrame.classList.add('loaded');

        // Update document title based on page?
        // Optional polish
    });
});
