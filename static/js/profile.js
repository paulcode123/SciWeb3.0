// Profile Page JavaScript

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
    
    // Friends tab navigation
    const friendsTabs = document.querySelectorAll('.friends-tab');
    const friendsContents = document.querySelectorAll('.friends-content');
    
    friendsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs and content
            friendsTabs.forEach(t => t.classList.remove('active'));
            friendsContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current tab
            this.classList.add('active');
            
            // Show the corresponding content
            const targetTab = this.getAttribute('data-tab');
            document.getElementById(`${targetTab}-content`).classList.add('active');
        });
    });
    
    // Profile picture upload
    const changeButton = document.getElementById('change-picture');
    const fileInput = document.getElementById('picture-upload');
    const profilePicture = document.getElementById('profile-picture');
    
    changeButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                profilePicture.src = e.target.result;
                
                // Here you would normally upload the image to the server
                // and update the profile picture URL in the database
                console.log('Picture changed, ready to upload to server');
            };
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // Add/Edit Class functionality
    const addClassBtn = document.querySelector('.add-class-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const addClassForm = document.getElementById('add-class-form');
    const saveClassBtn = document.querySelector('.save-class-btn');
    const classList = document.querySelector('.class-list');
    
    addClassBtn.addEventListener('click', function() {
        addClassForm.style.display = 'block';
        addClassBtn.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', function() {
        addClassForm.style.display = 'none';
        addClassBtn.style.display = 'block';
        
        // Clear form fields
        document.getElementById('class-name').value = '';
        document.getElementById('teacher-name').value = '';
        document.getElementById('period').value = '';
    });
    
    saveClassBtn.addEventListener('click', function() {
        const className = document.getElementById('class-name').value;
        const teacherName = document.getElementById('teacher-name').value;
        const period = document.getElementById('period').value;
        
        if (className && teacherName && period) {
            // Create new class item
            const newClass = document.createElement('div');
            newClass.className = 'class-item';
            newClass.innerHTML = `
                <div class="class-info">
                    <h3>${className}</h3>
                    <p>${teacherName} • ${period}</p>
                </div>
                <div class="class-actions">
                    <button class="btn btn-secondary btn-sm">Edit</button>
                    <button class="btn btn-danger btn-sm">Remove</button>
                </div>
            `;
            
            // Add event listeners to the new buttons
            const editBtn = newClass.querySelector('.btn-secondary');
            const removeBtn = newClass.querySelector('.btn-danger');
            
            editBtn.addEventListener('click', function() {
                // Populate the form with current values
                document.getElementById('class-name').value = className;
                document.getElementById('teacher-name').value = teacherName;
                document.getElementById('period').value = period;
                
                // Show the form
                addClassForm.style.display = 'block';
                addClassBtn.style.display = 'none';
                
                // Remove the class item (will be replaced with updated version on save)
                newClass.remove();
            });
            
            removeBtn.addEventListener('click', function() {
                newClass.remove();
            });
            
            // Add the new class to the list
            classList.appendChild(newClass);
            
            // Clear form and hide it
            document.getElementById('class-name').value = '';
            document.getElementById('teacher-name').value = '';
            document.getElementById('period').value = '';
            addClassForm.style.display = 'none';
            addClassBtn.style.display = 'block';
        } else {
            alert('Please fill in all fields for the class');
        }
    });
    
    // Initialize event listeners for existing Edit/Remove buttons
    document.querySelectorAll('.class-actions .btn-secondary').forEach(btn => {
        btn.addEventListener('click', function() {
            const classItem = this.closest('.class-item');
            const nameElement = classItem.querySelector('h3');
            const infoElement = classItem.querySelector('p');
            
            // Parse the class info
            const className = nameElement.textContent;
            const infoText = infoElement.textContent;
            const teacherName = infoText.split('•')[0].trim();
            const period = infoText.split('•')[1].trim();
            
            // Populate the form
            document.getElementById('class-name').value = className;
            document.getElementById('teacher-name').value = teacherName;
            document.getElementById('period').value = period;
            
            // Show the form
            addClassForm.style.display = 'block';
            addClassBtn.style.display = 'none';
            
            // Remove the class item (will be replaced with updated version on save)
            classItem.remove();
        });
    });
    
    document.querySelectorAll('.class-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const classItem = this.closest('.class-item');
            
            // Ask for confirmation before removing
            if (confirm('Are you sure you want to remove this class?')) {
                classItem.remove();
            }
        });
    });
    
    // Friend management functionality
    document.querySelectorAll('.friend-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const friendItem = this.closest('.friend-item');
            const friendName = friendItem.querySelector('h3').textContent;
            
            if (confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
                friendItem.remove();
            }
        });
    });
    
    // Accept/Reject friend requests
    document.querySelectorAll('.request-actions .btn-primary').forEach(btn => {
        btn.addEventListener('click', function() {
            const requestItem = this.closest('.request-item');
            const requesterName = requestItem.querySelector('h3').textContent;
            const requesterUsername = requestItem.querySelector('p').textContent.split('•')[0].trim();
            
            // Create new friend item
            const newFriend = document.createElement('div');
            newFriend.className = 'friend-item';
            newFriend.innerHTML = `
                <img src="${requestItem.querySelector('img').src}" alt="Friend" class="friend-avatar">
                <div class="friend-info">
                    <h3>${requesterName}</h3>
                    <p>${requesterUsername} • 0 mutual classes</p>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-secondary btn-sm">View Profile</button>
                    <button class="btn btn-danger btn-sm">Remove</button>
                </div>
            `;
            
            // Add event listener to the new Remove button
            newFriend.querySelector('.btn-danger').addEventListener('click', function() {
                if (confirm(`Are you sure you want to remove ${requesterName} from your friends?`)) {
                    newFriend.remove();
                }
            });
            
            // Add the new friend to the friends list
            document.querySelector('.friends-list').appendChild(newFriend);
            
            // Remove the request item
            requestItem.remove();
            
            // Update the badge count
            updateRequestBadge();
        });
    });
    
    document.querySelectorAll('.request-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const requestItem = this.closest('.request-item');
            requestItem.remove();
            
            // Update the badge count
            updateRequestBadge();
        });
    });
    
    document.querySelectorAll('.request-actions .btn-danger').forEach(btn => {
        if (btn.textContent.trim() === 'Cancel Request') {
            btn.addEventListener('click', function() {
                const requestItem = this.closest('.request-item');
                requestItem.remove();
                
                // Update the badge count for sent requests
                const sentBadge = document.querySelector('.friends-tab[data-tab="sent-requests"] .badge');
                const currentCount = parseInt(sentBadge.textContent);
                sentBadge.textContent = Math.max(0, currentCount - 1);
                
                if (parseInt(sentBadge.textContent) === 0) {
                    document.getElementById('sent-requests-content').innerHTML = '<p>You have no pending sent requests.</p>';
                }
            });
        }
    });
    
    // Function to update the pending requests badge
    function updateRequestBadge() {
        const pendingRequests = document.querySelectorAll('#pending-requests-content .request-item').length;
        const badge = document.querySelector('.friends-tab[data-tab="pending-requests"] .badge');
        
        badge.textContent = pendingRequests;
        
        if (pendingRequests === 0) {
            document.getElementById('pending-requests-content').innerHTML = '<p>You have no pending friend requests.</p>';
        }
    }
    
    // Form submission handlers
    const saveButtons = document.querySelectorAll('.save-btn');
    
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.closest('.profile-section');
            const sectionId = section.id;
            
            switch (sectionId) {
                case 'account-section':
                    saveAccountChanges();
                    break;
                case 'privacy-section':
                    savePrivacySettings();
                    break;
                case 'appearance-section':
                    saveAppearanceSettings();
                    break;
            }
        });
    });
    
    function saveAccountChanges() {
        // Get form values
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const fullName = document.getElementById('full-name').value;
        const bio = document.getElementById('bio').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validate form
        if (!username || !email || !fullName) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (password || confirmPassword) {
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
        }
        
        // In a real application, this would send the data to the server
        console.log('Account changes saved', { username, email, fullName, bio });
        alert('Account changes saved successfully!');
    }
    
    function savePrivacySettings() {
        // Get selected privacy options
        const profileVisibility = document.querySelector('input[name="profile-visibility"]:checked').value;
        const webVisibility = document.querySelector('input[name="web-visibility"]:checked').value;
        const classesVisibility = document.querySelector('input[name="classes-visibility"]:checked').value;
        const motivationsVisibility = document.querySelector('input[name="motivations-visibility"]:checked').value;
        const friendsVisibility = document.querySelector('input[name="friends-visibility"]:checked').value;
        
        // In a real application, this would send the data to the server
        console.log('Privacy settings saved', { 
            profileVisibility, 
            webVisibility, 
            classesVisibility, 
            motivationsVisibility, 
            friendsVisibility 
        });
        alert('Privacy settings saved successfully!');
    }
    
    function saveAppearanceSettings() {
        // Get selected appearance options
        const theme = document.querySelector('input[name="theme"]:checked').value;
        const colorAccent = document.querySelector('input[name="color-accent"]:checked').value;
        
        // In a real application, this would send the data to the server
        console.log('Appearance settings saved', { theme, colorAccent });
        alert('Appearance settings saved successfully!');
        
        // Apply theme change immediately
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'light') {
            document.body.classList.remove('dark-mode');
        } else {
            // Use system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    }
    
    // Handle color accent options
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Set the corresponding radio button as checked
            this.querySelector('input[type="radio"]').checked = true;
        });
    });
}); 