// User Profile Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Tab navigation for profile sections
    const navItems = document.querySelectorAll('.profile-nav-item');
    const sections = document.querySelectorAll('.profile-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all nav items and sections
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to current nav item
            this.classList.add('active');
            
            // Show the corresponding section
            const targetSection = this.getAttribute('data-section');
            document.getElementById(`${targetSection}-section`).classList.add('active');
        });
    });
    
    // Add friend button functionality
    const addFriendBtn = document.querySelector('.add-friend-btn');
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', function() {
            // In a real application, this would send a friend request to the server
            console.log('Friend request sent');
            
            // Update button state to show pending request
            const actionsDiv = this.closest('.profile-actions');
            actionsDiv.innerHTML = `
                <button class="btn btn-secondary request-pending" disabled><i class="fas fa-clock"></i> Request Pending</button>
                <button class="btn btn-danger cancel-request-btn"><i class="fas fa-times"></i> Cancel Request</button>
            `;
            
            // Add event listener to the new cancel button
            document.querySelector('.cancel-request-btn').addEventListener('click', function() {
                // In a real application, this would cancel the friend request
                console.log('Friend request canceled');
                
                // Reset to original state
                actionsDiv.innerHTML = `
                    <button class="btn btn-primary add-friend-btn"><i class="fas fa-user-plus"></i> Add Friend</button>
                `;
                
                // Re-add event listener to the new button
                document.querySelector('.add-friend-btn').addEventListener('click', addFriendBtn.onclick);
            });
        });
    }
    
    // Cancel friend request button functionality
    const cancelRequestBtn = document.querySelector('.cancel-request-btn');
    if (cancelRequestBtn) {
        cancelRequestBtn.addEventListener('click', function() {
            // In a real application, this would cancel the friend request
            console.log('Friend request canceled');
            
            // Update button state to allow sending a new request
            const actionsDiv = this.closest('.profile-actions');
            actionsDiv.innerHTML = `
                <button class="btn btn-primary add-friend-btn"><i class="fas fa-user-plus"></i> Add Friend</button>
            `;
            
            // Re-add event listener to the new button
            document.querySelector('.add-friend-btn').addEventListener('click', function() {
                console.log('Friend request sent');
                
                // Update button state to show pending request
                actionsDiv.innerHTML = `
                    <button class="btn btn-secondary request-pending" disabled><i class="fas fa-clock"></i> Request Pending</button>
                    <button class="btn btn-danger cancel-request-btn"><i class="fas fa-times"></i> Cancel Request</button>
                `;
                
                // Add event listener to the new cancel button
                document.querySelector('.cancel-request-btn').addEventListener('click', cancelRequestBtn.onclick);
            });
        });
    }
    
    // Unfriend button functionality
    const unfriendBtn = document.querySelector('.unfriend-btn');
    if (unfriendBtn) {
        unfriendBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this person from your friends?')) {
                // In a real application, this would send the unfriend request to the server
                console.log('User unfriended');
                
                // Update button state to allow adding as friend again
                const actionsDiv = this.closest('.profile-actions');
                actionsDiv.innerHTML = `
                    <button class="btn btn-primary add-friend-btn"><i class="fas fa-user-plus"></i> Add Friend</button>
                `;
                
                // Re-add event listener to the new button
                document.querySelector('.add-friend-btn').addEventListener('click', function() {
                    console.log('Friend request sent');
                    
                    // Update button state to show pending request
                    actionsDiv.innerHTML = `
                        <button class="btn btn-secondary request-pending" disabled><i class="fas fa-clock"></i> Request Pending</button>
                        <button class="btn btn-danger cancel-request-btn"><i class="fas fa-times"></i> Cancel Request</button>
                    `;
                    
                    // Add event listener to the new cancel button
                    document.querySelector('.cancel-request-btn').addEventListener('click', cancelRequestBtn ? cancelRequestBtn.onclick : null);
                });
            }
        });
    }
    
    // Message button functionality
    const messageBtn = document.querySelector('.message-btn');
    if (messageBtn) {
        messageBtn.addEventListener('click', function() {
            // In a real application, this would open a messaging interface
            alert('Messaging feature coming soon!');
        });
    }
    
    // Friends search functionality
    const friendsSearch = document.querySelector('.friends-search input');
    if (friendsSearch) {
        friendsSearch.addEventListener('input', function() {
            const searchValue = this.value.toLowerCase();
            const friends = document.querySelectorAll('.friend-card');
            
            friends.forEach(friend => {
                const name = friend.querySelector('h3').textContent.toLowerCase();
                const username = friend.querySelector('.friend-username').textContent.toLowerCase();
                
                if (name.includes(searchValue) || username.includes(searchValue)) {
                    friend.style.display = 'flex';
                } else {
                    friend.style.display = 'none';
                }
            });
        });
    }
    
    // Animate elements when they come into view
    function animateOnScroll() {
        const animatableElements = document.querySelectorAll('.about-card, .motivation-card, .web-stat-card, .class-card, .friend-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = 1;
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        animatableElements.forEach(element => {
            element.style.opacity = 0;
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(element);
        });
    }
    
    // Initialize animation on scroll
    animateOnScroll();
    
    // Create a visual effect for the profile banner
    function createBannerEffect() {
        const banner = document.querySelector('.profile-banner');
        if (!banner) return;
        
        // Create particle elements
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'banner-particle';
            
            // Randomize particle properties
            const size = Math.random() * 40 + 10;
            const xPos = Math.random() * 100;
            const yPos = Math.random() * 100;
            const opacity = Math.random() * 0.3 + 0.1;
            const animationDuration = Math.random() * 20 + 10;
            const animationDelay = Math.random() * 5;
            
            // Apply styles
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${xPos}%`;
            particle.style.top = `${yPos}%`;
            particle.style.opacity = opacity;
            particle.style.animationDuration = `${animationDuration}s`;
            particle.style.animationDelay = `${animationDelay}s`;
            
            banner.appendChild(particle);
        }
    }
    
    // Initialize banner effect
    createBannerEffect();
}); 