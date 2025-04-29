// Handle authentication state in the navigation bar
document.addEventListener('DOMContentLoaded', function() {
    updateNavbar();
    
    // Update navbar when localStorage changes (for example, after login/logout)
    window.addEventListener('storage', function(event) {
        if (event.key === 'isLoggedIn') {
            updateNavbar();
        }
    });
    
    // Also check auth state on page load
    updateNavbar();
});

function updateNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const signupNavItem = document.getElementById('auth-nav-item');
    const loginNavItem = document.getElementById('login-nav-item');
    const profileNavItem = document.getElementById('profile-nav-item');
    
    if (isLoggedIn) {
        // User is logged in - show profile link, hide signup/login
        if (signupNavItem) signupNavItem.style.display = 'none';
        if (loginNavItem) loginNavItem.style.display = 'none';
        if (profileNavItem) profileNavItem.style.display = 'block';
        
        // If we have user data, we could customize the profile link text
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const profileLink = document.getElementById('profile-link');
        
        if (profileLink && userData && userData.first_name) {
            profileLink.innerHTML = `<i class="fas fa-user-circle"></i> ${userData.first_name}`;
        }
    } else {
        // User is not logged in - show signup/login, hide profile
        if (signupNavItem) signupNavItem.style.display = 'block';
        if (loginNavItem) loginNavItem.style.display = 'block';
        if (profileNavItem) profileNavItem.style.display = 'none';
    }
}

// Function to handle logout
function logout() {
    // Clear authentication state
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    
    // Call logout API if needed
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // To include cookies if using cookie-based auth
    })
    .then(() => {
        // Redirect to home or login page after logout
        window.location.href = '/';
    })
    .catch(error => {
        console.error('Logout error:', error);
        // Still redirect even if API call fails
        window.location.href = '/';
    });
} 