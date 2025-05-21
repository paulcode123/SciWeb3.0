document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    console.log('NHS Credit Tracker page loaded');
    
    // Get the credit ID from the page
    const creditIdElement = document.querySelector('.credit-id');
    const creditId = creditIdElement ? creditIdElement.textContent.replace('#', '') : null;
    
    if (creditId) {
        console.log(`Loaded NHS credit tracker #${creditId}`);
    }
}); 