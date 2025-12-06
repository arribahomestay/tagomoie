document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    const loginBtn = document.querySelector('.btn-login');
    const inputs = document.querySelectorAll('.form-input');

    // Ripple Effect
    loginBtn.addEventListener('click', function (e) {
        const x = e.clientX - e.target.offsetLeft;
        const y = e.clientY - e.target.offsetTop;

        const ripple = document.createElement('span');
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.classList.add('ripple');

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // Input animation helpers
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                input.classList.add('has-value');
            } else {
                input.classList.remove('has-value');
            }
        });
    });

    // Notification System
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transform: translateX(120%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 1000;
            display: flex;
            align-items: center;
            font-weight: 500;
        `;
        notification.innerText = message;
        document.body.appendChild(notification);

        // Slide in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Input Shake Animation
    function shakeInputs() {
        const page = document.querySelector('.login-card');
        page.style.animation = 'none';
        page.offsetHeight; /* trigger reflow */
        page.style.animation = 'shake 0.5s';
    }

    // Add shake keyframes
    if (!document.getElementById('shake-style')) {
        const style = document.createElement('style');
        style.id = 'shake-style';
        style.innerHTML = `
            @keyframes shake {
                0% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                50% { transform: translateX(10px); }
                75% { transform: translateX(-10px); }
                100% { transform: translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Form Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const originalText = loginBtn.innerText;
        loginBtn.innerText = 'Verifying...';
        loginBtn.disabled = true;
        loginBtn.style.opacity = '0.7';
        loginBtn.style.cursor = 'wait';

        // Simulate Network Delay
        setTimeout(() => {
            if (email === 'admin@gmail.com' && password === 'ej123') {
                // Success
                loginBtn.innerText = 'Success!';
                loginBtn.style.background = '#10b981'; // Emerald 500
                showNotification('Login Successful! Redirecting...', 'success');

                setTimeout(() => {
                    // Redirect to the Admin Portal
                    window.location.href = '../admin-portal/index.html';
                }, 1000);
            } else {
                // Failure
                loginBtn.innerText = originalText;
                loginBtn.disabled = false;
                loginBtn.style.background = '';
                loginBtn.style.opacity = '1';
                loginBtn.style.cursor = 'pointer';

                showNotification('Invalid email or password', 'error');
                shakeInputs();
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
        }, 800);
    });
});
