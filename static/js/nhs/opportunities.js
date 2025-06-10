document.addEventListener('DOMContentLoaded', function() {
    // Initialize search and filter functionality
    const searchInput = document.getElementById('search');
    const categorySelect = document.getElementById('category');
    const opportunityCards = document.querySelectorAll('.nhs-card .nhs-card');
    const upcomingEvents = document.querySelectorAll('.nhs-table tbody tr');

    // Function to filter opportunities
    function filterOpportunities() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categorySelect.value.toLowerCase();

        opportunityCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p:nth-of-type(4)').textContent.toLowerCase();
            const location = card.querySelector('p:nth-of-type(1)').textContent.toLowerCase();
            
            const matchesSearch = title.includes(searchTerm) || 
                                description.includes(searchTerm) || 
                                location.includes(searchTerm);
            
            const matchesCategory = !selectedCategory || 
                                  (selectedCategory === 'community' && title.includes('community')) ||
                                  (selectedCategory === 'tutoring' && title.includes('tutoring')) ||
                                  (selectedCategory === 'leadership' && title.includes('leadership')) ||
                                  (selectedCategory === 'environmental' && title.includes('environmental')) ||
                                  (selectedCategory === 'healthcare' && title.includes('healthcare'));

            card.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
        });
    }

    // Add event listeners for search and filter
    searchInput.addEventListener('input', filterOpportunities);
    categorySelect.addEventListener('change', filterOpportunities);

    // Handle sign-up buttons
    const signUpButtons = document.querySelectorAll('.nhs-btn-primary');
    signUpButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const opportunityCard = this.closest('.nhs-card');
            const opportunityTitle = opportunityCard.querySelector('h3').textContent.trim();
            
            try {
                const response = await fetch('/api/nhs/events/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        event_id: opportunityTitle.toLowerCase().replace(/\s+/g, '-'),
                        // Add any other required data
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    showNotification('Successfully signed up for ' + opportunityTitle, 'success');
                    // Disable the button
                    this.disabled = true;
                    this.textContent = 'Signed Up';
                } else {
                    showNotification(data.error || 'Failed to sign up', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Failed to sign up. Please try again.', 'error');
            }
        });
    });

    // Handle "Join" buttons in upcoming events
    const joinButtons = document.querySelectorAll('.nhs-table .nhs-btn-secondary');
    joinButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const row = this.closest('tr');
            const eventName = row.querySelector('td:nth-child(2)').textContent;
            
            try {
                const response = await fetch('/api/nhs/events/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        event_id: eventName.toLowerCase().replace(/\s+/g, '-'),
                        // Add any other required data
                    })
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Successfully joined ' + eventName, 'success');
                    this.disabled = true;
                    this.textContent = 'Joined';
                } else {
                    showNotification(data.error || 'Failed to join event', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Failed to join event. Please try again.', 'error');
            }
        });
    });

    // Handle opportunity submission form
    const submitForm = document.getElementById('submit-opportunity-form');
    if (submitForm) {
        submitForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('opportunity-title').value,
                location: document.getElementById('opportunity-location').value,
                description: document.getElementById('opportunity-description').value,
                contact: document.getElementById('opportunity-contact').value
            };

            try {
                const response = await fetch('/api/nhs/events/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Opportunity submitted successfully!', 'success');
                    // Clear the form
                    submitForm.reset();
                } else {
                    showNotification(data.error || 'Failed to submit opportunity', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Failed to submit opportunity. Please try again.', 'error');
            }
        });
    }

    // Notification function
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add styles
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '1rem';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.zIndex = '1000';
        
        // Set background color based on type
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'info':
            default:
                notification.style.backgroundColor = '#2196F3';
        }

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Add dark mode toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            this.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
    }
}); 