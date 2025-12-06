document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    // Default to collapsed on load
    sidebar.classList.add('collapsed');

    // Auto-expand on hover
    sidebar.addEventListener('mouseenter', () => {
        sidebar.classList.remove('collapsed');
    });

    // Auto-collapse on leave
    sidebar.addEventListener('mouseleave', () => {
        sidebar.classList.add('collapsed');
    });

    // Optional: Hide or repurpose the toggle button since it's now automatic.
    // For now, we will hide it via style to avoid confusion, or we can leave it.
    // User requested "automatic", implying hover interaction is primary.
    if (toggleBtn) {
        toggleBtn.style.display = 'none';
    }
});
