// Auth helper functions for SciWeb
class AuthManager {
    static isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true' && 
               localStorage.getItem('userId') !== null;
    }
    
    static getCurrentUserId() {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        return userData.id || localStorage.getItem('userId');
    }
    
    static getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('userData') || '{}');
        } catch (e) {
            return {};
        }
    }
    
    static async checkSession() {
        try {
            const response = await fetch('/api/auth/user');
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('userData', JSON.stringify(data.user));
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('isLoggedIn', 'true');
                return true;
            } else {
                this.logout(false); // Don't redirect on session check
                return false;
            }
        } catch (e) {
            console.error('Session check failed:', e);
            return false;
        }
    }
    
    static async logout(redirect = true) {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout request failed:', e);
        }
        
        // Clear local storage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        localStorage.removeItem('userId');
        
        if (redirect) {
            window.location.href = '/login';
        }
    }
    
    static requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login';
            return false;
        }
        return true;
    }
    
    static async makeAuthenticatedRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 401) {
                this.logout();
                return null;
            }
            
            return response;
        } catch (e) {
            console.error('Authenticated request failed:', e);
            throw e;
        }
    }
}

// Auto-check session on page load for authenticated pages
document.addEventListener('DOMContentLoaded', function() {
    // Skip auth check for login and signup pages
    const currentPath = window.location.pathname;
    const publicPaths = ['/login', '/signup', '/verify-email'];
    
    if (!publicPaths.some(path => currentPath.startsWith(path))) {
        AuthManager.requireAuth();
        AuthManager.checkSession(); // Refresh session data
    }
});

// Make AuthManager available globally
window.AuthManager = AuthManager; 