// Global Color Accent Loader for SciWeb3.0
// This script should be loaded early in the <head> of all pages

(function() {
    'use strict';
    
    // Function to load and apply user's color accent preference
    function loadColorAccent() {
        // First check if user is logged in and has saved preferences
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        let colorAccent = 'pink'; // default
        let theme = 'light'; // default
        
        if (userData.settings && userData.settings.appearance) {
            colorAccent = userData.settings.appearance.colorAccent || 'pink';
            theme = userData.settings.appearance.theme || 'light';
        } else {
            // Fall back to localStorage
            colorAccent = localStorage.getItem('colorAccent') || 'pink';
            theme = localStorage.getItem('theme') || 'light';
        }
        
        // Apply color accent immediately
        document.body.setAttribute('data-accent', colorAccent);
        
        // Apply theme immediately
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-mode');
            }
        }
    }
    
    // Function to update color accent (can be called from other scripts)
    window.updateColorAccent = function(colorAccent, theme) {
        document.body.setAttribute('data-accent', colorAccent || 'pink');
        localStorage.setItem('colorAccent', colorAccent || 'pink');
        
        if (theme) {
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            localStorage.setItem('theme', theme);
        }
    };
    
    // Load immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadColorAccent);
    } else {
        loadColorAccent();
    }
})(); 