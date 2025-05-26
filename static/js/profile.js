// Profile Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Load user color preference immediately
    loadUserColorPreference();
    
    // Add test button for debugging (development only)
    addTestButton();
    
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
            const sectionElement = document.getElementById(`${targetSection}-section`);
            if (sectionElement) {
                sectionElement.classList.add('active');
                
                // Load specific data when switching to friends section
                if (targetSection === 'friends') {
                    loadUserFriends();
                    loadFriendRequests();
                }
            }
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
            const contentElement = document.getElementById(`${targetTab}-content`);
            if (contentElement) {
                contentElement.classList.add('active');
                
                // Load friend requests when switching to request tabs
                if (targetTab === 'pending-requests' || targetTab === 'sent-requests') {
                    loadFriendRequests();
                }
            }
        });
    });
    
    // Profile picture upload
    const changeButton = document.getElementById('change-picture');
    const fileInput = document.getElementById('picture-upload');
    const profilePicture = document.getElementById('profile-picture');
    
    if (changeButton && fileInput) {
        changeButton.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    profilePicture.src = e.target.result;
                    
                    // Upload the image to the server
                    uploadProfilePicture(this.files[0]);
                }.bind(this);
                
                reader.readAsDataURL(this.files[0]);
            }
        });
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
    
    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to log out?')) {
                // Clear local storage
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userData');
                
                // Call the logout API
                fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Logout successful');
                    // Redirect to home page
                    window.location.href = '/';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                    // Redirect anyway in case of error
                    window.location.href = '/';
                });
            }
        });
    }
    
    // Add/Edit Class functionality
    const addClassBtn = document.querySelector('.add-class-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const addClassForm = document.getElementById('add-class-form');
    const saveClassBtn = document.querySelector('.save-class-btn');
    const classList = document.querySelector('.class-list');
    
    // Track if we're editing an existing class (for update vs. create)
    let editingClassId = null;
    
    addClassBtn.addEventListener('click', function() {
        addClassForm.style.display = 'block';
        addClassBtn.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', function() {
        addClassForm.style.display = 'none';
        addClassBtn.style.display = 'block';
        
        // Clear form fields and reset editing state
        document.getElementById('class-name').value = '';
        document.getElementById('teacher-name').value = '';
        document.getElementById('period').value = '';
        editingClassId = null;
    });
    
    saveClassBtn.addEventListener('click', function() {
        const className = document.getElementById('class-name').value;
        const teacherName = document.getElementById('teacher-name').value;
        const period = document.getElementById('period').value;
        
        if (className && teacherName && period) {
            saveClass(className, teacherName, period, editingClassId);
        } else {
            alert('Please fill in all fields for the class');
        }
    });
    
    function saveClass(className, teacherName, period, classId = null) {
        // Get user ID from stored data
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userId = userData.id;
        
        if (!userId) {
            console.error('User ID not found');
            showSuccessMessage('Error: User not authenticated', 'error');
            return;
        }
        
        // Generate a new class object
        const classData = {
            name: className,
            teacher: teacherName,
            period: period,
            updatedAt: new Date()
        };
        
        // If classId is null, we're creating a new class
        if (!classId) {
            classData.id = generateUniqueId();
            classData.createdAt = new Date();
        } else {
            classData.id = classId;
        }
        
        // Send update to server
        fetch(`/api/Members/${userId}/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                classData: classData,
                operation: classId ? 'update' : 'add'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showSuccessMessage(`Error: ${data.error}`, 'error');
            } else {
                // Create new class item in UI
                createClassItem(classData.id, className, teacherName, period);
                
                // Clear form and hide it
                document.getElementById('class-name').value = '';
                document.getElementById('teacher-name').value = '';
                document.getElementById('period').value = '';
                addClassForm.style.display = 'none';
                addClassBtn.style.display = 'block';
                
                // Reset editing state
                editingClassId = null;
                
                showSuccessMessage(`Class ${classId ? 'updated' : 'added'} successfully`);
            }
        })
        .catch(error => {
            console.error('Error saving class:', error);
            showSuccessMessage('Failed to save class information', 'error');
        });
    }
    
    function deleteClass(classId) {
        // Get user ID from stored data
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userId = userData.id;
        
        if (!userId) {
            console.error('User ID not found');
            showSuccessMessage('Error: User not authenticated', 'error');
            return;
        }
        
        // Send delete request to server
        fetch(`/api/Members/${userId}/classes`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                classId: classId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showSuccessMessage(`Error: ${data.error}`, 'error');
            } else {
                showSuccessMessage('Class removed successfully');
                
                // Find and remove the class element from DOM
                const classItem = document.querySelector(`.class-item[data-id="${classId}"]`);
                if (classItem) {
                    classItem.remove();
                }
            }
        })
        .catch(error => {
            console.error('Error deleting class:', error);
            showSuccessMessage('Failed to remove class', 'error');
        });
    }
    
    // Create a class item in the UI
    function createClassItem(id, className, teacherName, period) {
        // Check if class with this ID already exists
        const existingClass = document.querySelector(`.class-item[data-id="${id}"]`);
        if (existingClass) {
            existingClass.remove(); // Remove it if updating
        }
        
        // Create new class item
        const newClass = document.createElement('div');
        newClass.className = 'class-item';
        newClass.setAttribute('data-id', id);
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
            
            // Set editing state
            editingClassId = id;
            
            // Show the form
            addClassForm.style.display = 'block';
            addClassBtn.style.display = 'none';
        });
        
        removeBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this class?')) {
                deleteClass(id);
            }
        });
        
        // Add the new class to the list
        classList.appendChild(newClass);
    }
    
    // Generate a unique ID for new classes
    function generateUniqueId() {
        return 'class_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Initialize other components
    initializeClassManagement();
    initializeFriendManagement();
    
    // Load user data and settings
    loadUserData();
    
    // Initialize enhanced form features
    initializeEnhancedForm();
    
    // Initialize friend search functionality
    initializeFriendSearch();
});

// Initialize Class Management
function initializeClassManagement() {
    // Initialize event listeners for existing Edit/Remove buttons
    document.querySelectorAll('.class-actions .btn-secondary').forEach(btn => {
        btn.addEventListener('click', function() {
            const classItem = this.closest('.class-item');
            const nameElement = classItem.querySelector('h3');
            const infoElement = classItem.querySelector('p');
            const classId = classItem.getAttribute('data-id');
            
            // Parse the class info
            const className = nameElement.textContent;
            const infoText = infoElement.textContent;
            const teacherName = infoText.split('•')[0].trim();
            const period = infoText.split('•')[1].trim();
            
            // Populate the form
            document.getElementById('class-name').value = className;
            document.getElementById('teacher-name').value = teacherName;
            document.getElementById('period').value = period;
            
            // Set editing state
            editingClassId = classId;
            
            // Show the form
            addClassForm.style.display = 'block';
            addClassBtn.style.display = 'none';
        });
    });
    
    document.querySelectorAll('.class-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const classItem = this.closest('.class-item');
            const classId = classItem.getAttribute('data-id');
            
            // Ask for confirmation before removing
            if (confirm('Are you sure you want to remove this class?')) {
                deleteClass(classId);
            }
        });
    });
}
    
// Initialize Friend Management
function initializeFriendManagement() {
    // Friend management functionality
    document.querySelectorAll('.friend-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const friendItem = this.closest('.friend-item');
            const friendName = friendItem.querySelector('h3').textContent;
            
            if (confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
                // Here we'd add API call to remove friend
                friendItem.remove();
            }
        });
    });
    
    // Accept/Reject friend requests
    document.querySelectorAll('.request-actions .btn-primary').forEach(btn => {
        btn.addEventListener('click', function() {
            acceptFriendRequest(this);
        });
    });
    
    document.querySelectorAll('.request-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            rejectFriendRequest(this);
        });
    });
}

// Function to accept friend request
function acceptFriendRequest(button) {
    const requestItem = button.closest('.request-item');
    const requesterId = requestItem.dataset.userId;
    const requesterName = requestItem.querySelector('h3').textContent;
    
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to accept friend requests", "error");
        return;
    }
    
    fetch(`/api/Members/${userId}/friend-requests/accept`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requesterId: requesterId })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data.error || 'Failed to accept friend request'));
        }
        return response.json();
    })
    .then(data => {
        showSuccessMessage(`${requesterName} is now your friend!`, "success");
        requestItem.remove();
        
        // Update badge count
        updateFriendRequestBadge();
        
        // Refresh friends list
        loadUserFriends();
    })
    .catch(error => {
        console.error('Error accepting friend request:', error);
        showSuccessMessage(error.toString(), "error");
    });
}

// Function to reject friend request
function rejectFriendRequest(button) {
    const requestItem = button.closest('.request-item');
    const requesterId = requestItem.dataset.userId;
    const requesterName = requestItem.querySelector('h3').textContent;
    
    if (!confirm(`Are you sure you want to reject ${requesterName}'s friend request?`)) {
        return;
    }
    
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to reject friend requests", "error");
        return;
    }
    
    fetch(`/api/Members/${userId}/friend-requests/reject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requesterId: requesterId })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data.error || 'Failed to reject friend request'));
        }
        return response.json();
    })
    .then(data => {
        showSuccessMessage(`Friend request from ${requesterName} rejected`, "success");
        requestItem.remove();
        
        // Update badge count
        updateFriendRequestBadge();
    })
    .catch(error => {
        console.error('Error rejecting friend request:', error);
        showSuccessMessage(error.toString(), "error");
    });
}

// Function to update friend request badge counts
function updateFriendRequestBadge() {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    fetch(`/api/Members/${userId}/friend-requests`)
    .then(response => response.json())
    .then(data => {
        const incomingCount = data.incoming ? data.incoming.length : 0;
        const outgoingCount = data.outgoing ? data.outgoing.length : 0;
        updateFriendRequestBadges(incomingCount, outgoingCount);
    })
    .catch(error => {
        console.error('Error updating friend request badges:', error);
    });
}

// Function to reset initialization flags (call this on successful data load)
function resetInitializationFlags() {
    window.friendsInitializationAttempted = false;
    window.requestsInitializationAttempted = false;
}

// Function to load all user data
function loadUserData() {
    // Reset initialization flags at the start of data loading
    resetInitializationFlags();
    
    // Load user profile info and settings
    loadUserSettings();
    
    // Load user classes
    loadUserClasses();
    
    // Load friends data
    loadUserFriends();
    
    // Load friend requests
    loadFriendRequests();
}

// Function to load and apply user settings
function loadUserSettings() {
    // Get user ID from stored data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    console.log('Loading user settings. User data from localStorage:', userData);
    
    if (!userId) {
        console.error('User ID not found for loading settings');
        return;
    }
    
    // Fetch user settings from server
    console.log(`Fetching user data from /api/Members/${userId}`);
    fetch(`/api/Members/${userId}`)
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error loading user settings:', data.error);
            return;
        }
        
        const user = data.user || {};
        console.log('Received user data from server:', user);
        
        // Populate account info
        if (user.username) document.getElementById('username').value = user.username;
        if (user.email) document.getElementById('email').value = user.email;
        if (user.first_name || user.last_name) {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
            document.getElementById('full-name').value = fullName;
        }
        if (user.bio) document.getElementById('bio').value = user.bio;
                
        // Set profile picture if available
        if (user.profilePicUrl) {
            console.log('Found profile picture URL:', user.profilePicUrl);
            const profilePicture = document.getElementById('profile-picture');
            profilePicture.setAttribute('src', user.profilePicUrl);
            console.log('Set profile picture src attribute to:', user.profilePicUrl);
            
            // Add error handling for image loading
            profilePicture.onerror = function(event) {
                console.error('Failed to load profile image from URL:', user.profilePicUrl);
                console.error('Image element src at error time:', this.src);
                console.error('Event object:', event);
                // Reset to default if there's an error
                this.src = '/static/images/default-avatar-1.png';
            };
            
            profilePicture.onload = function(event) {
                console.log('Profile image successfully loaded from URL:', user.profilePicUrl);
                console.log('Image element src at load time:', this.src);
                console.log('Event object:', event);
            };
        } else {
            console.log('No profile picture URL found in user data');
        }
        
        // Set privacy settings
        if (user.settings && user.settings.privacy) {
            const privacy = user.settings.privacy;
            
            if (privacy.profileVisibility) {
                document.querySelector(`input[name="profile-visibility"][value="${privacy.profileVisibility}"]`).checked = true;
            }
            if (privacy.webVisibility) {
                document.querySelector(`input[name="web-visibility"][value="${privacy.webVisibility}"]`).checked = true;
            }
            if (privacy.classesVisibility) {
                document.querySelector(`input[name="classes-visibility"][value="${privacy.classesVisibility}"]`).checked = true;
            }
            if (privacy.motivationsVisibility) {
                document.querySelector(`input[name="motivations-visibility"][value="${privacy.motivationsVisibility}"]`).checked = true;
            }
            if (privacy.friendsVisibility) {
                document.querySelector(`input[name="friends-visibility"][value="${privacy.friendsVisibility}"]`).checked = true;
            }
        }
        
        // Set appearance settings
        if (user.settings && user.settings.appearance) {
            const appearance = user.settings.appearance;
            
            if (appearance.theme) {
                document.querySelector(`input[name="theme"][value="${appearance.theme}"]`).checked = true;
                
                // Apply theme immediately
                applyThemeSettings(
                    appearance.theme,
                    appearance.colorAccent || 'pink'
                );
            }
            
            if (appearance.colorAccent) {
                document.querySelector(`input[name="color-accent"][value="${appearance.colorAccent}"]`).checked = true;
                
                // Update color option UI
                document.querySelectorAll('.color-option').forEach(option => {
                    option.classList.remove('active');
                });
                document.querySelector(`.color-option.${appearance.colorAccent}`).classList.add('active');
            }
        }
    })
    .catch(error => {
        console.error('Error loading user settings:', error);
    });
}

// Function to show success or error message
function showSuccessMessage(message, type = 'success') {
    // Create message element if it doesn't exist
    let messageElement = document.querySelector('.message-container');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.classList.add('message-container');
        document.querySelector('.profile-content').appendChild(messageElement);
    }
    
    // Create the message notification
    const notification = document.createElement('div');
    notification.classList.add('message');
    notification.classList.add(type); // 'success' or 'error'
    notification.textContent = message;
    
    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = type === 'success' 
        ? 'fas fa-check-circle message-icon'
        : 'fas fa-exclamation-circle message-icon';
    notification.prepend(icon);
    
    // Add to container
    messageElement.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide after timeout
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300); // Wait for fade out animation
    }, 3000);
}

// Function to upload profile picture
function uploadProfilePicture(file) {
    // Get user ID from stored data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    console.log('Uploading profile picture for user ID:', userId);
    
    if (!userId) {
        console.error('User ID not found');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    
    console.log('Sending profile photo upload request with file:', file.name);
    fetch('/api/profile-photo', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Profile photo upload response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Upload response data:', data);
        if (data.success) {
            console.log('Profile photo uploaded successfully. URL:', data.url);
            
            // Update stored user data with new profile pic URL
            userData.profilePicUrl = data.url;
            localStorage.setItem('userData', JSON.stringify(userData));
            console.log('Updated localStorage userData with new profilePicUrl:', userData.profilePicUrl);
            
            // Explicitly update the image again to ensure it's visible
            const profilePicture = document.getElementById('profile-picture');
            profilePicture.setAttribute('src', data.url);
            console.log('Updated profile picture element with new URL');
            
            // Log that the backend should have updated the database as well
            console.log('Assuming backend updated the user profilePicUrl in the database.');
            
            showSuccessMessage('Profile picture updated successfully');
        } else {
            console.error('Failed to upload profile photo:', data.error);
            showSuccessMessage('Failed to update profile picture');
        }
    })
    .catch(error => {
        console.error('Error uploading profile photo:', error);
        showSuccessMessage('Error uploading profile picture');
    });
}

// Load user's classes on page load
function loadUserClasses() {
    // Fix: define classList here
    const classList = document.querySelector('.class-list');
    // ... existing code ...
    
    // Get user ID from stored data
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    if (!userId) {
        console.error('User ID not found for loading classes');
        return;
    }
    
    // Clear existing classes
    if (classList) {
        classList.innerHTML = '';
    }
    
    // Fetch classes from server
    fetch(`/api/Members/${userId}/classes`)
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error loading classes:', data.error);
            return;
        }
        
        // Add each class to the UI
        if (data.classes && Array.isArray(data.classes)) {
            data.classes.forEach(classData => {
                createClassItem(
                    classData.id,
                    classData.name,
                    classData.teacher,
                    classData.period
                );
            });
        }
    })
    .catch(error => {
        console.error('Error loading classes:', error);
    });
}

// Helper function to get user ID consistently
function getCurrentUserId() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return userData.id || localStorage.getItem('userId');
}

// Function to initialize missing friend fields for existing users
function initializeMissingFields() {
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to initialize fields", "error");
        return;
    }
    
    console.log('Initializing missing friend fields for user:', userId);
    
    fetch(`/api/Members/${userId}/initialize-friends`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log('Field initialization result:', data);
            
            // Only show success message and retry if fields were actually updated
            if (data.updated_fields && data.updated_fields.length > 0) {
                showSuccessMessage('Profile fields initialized successfully', 'success');
                
                // Retry loading user data after initialization
                setTimeout(() => {
                    loadUserData();
                }, 1000);
            } else {
                console.log('All fields already exist, but still getting 404. There may be a server issue.');
                showSuccessMessage('Unable to load friend data. Please try refreshing the page.', 'error');
            }
        } else {
            console.error('Error initializing fields:', data.error);
            showSuccessMessage('Failed to initialize profile fields', 'error');
        }
    })
    .catch(error => {
        console.error('Error initializing fields:', error);
        showSuccessMessage('Error initializing profile fields', 'error');
    });
}

// Friend management functions
function loadUserFriends() {
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to view friends", "error");
        return;
    }

    // Show loading state
    const friendsList = document.getElementById('friends-list');
    if (friendsList) {
        friendsList.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading friends...</div>';
    }

    // Add flag to prevent multiple initialization attempts
    if (window.friendsInitializationAttempted) {
        console.log('Friends initialization already attempted, skipping retry to prevent infinite loop');
        const friendsList = document.getElementById('friends-list');
        if (friendsList) {
            friendsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Unable to load friends. Please refresh the page.</p></div>';
        }
        return;
    }

    fetch(`/api/Members/${userId}/friends`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // If we get 404, try to initialize missing fields (only once)
                    console.log('404 error loading friends, attempting to initialize missing fields...');
                    window.friendsInitializationAttempted = true;
                    initializeMissingFields();
                    return { friends: [] }; // Return empty friends for now
                }
                throw new Error('Failed to load friends');
            }
            return response.json();
        })
        .then(data => {
            const friendsList = document.getElementById('friends-list');
            friendsList.innerHTML = '';
            
            if (data.friends && data.friends.length > 0) {
                data.friends.forEach(friend => {
                    const friendItem = createFriendItem(friend);
                    friendsList.appendChild(friendItem);
                });
            } else {
                friendsList.innerHTML = '<div class="empty-state"><i class="fas fa-user-friends"></i><p>No friends added yet. Use the search above to find and add friends!</p></div>';
            }
        })
        .catch(error => {
            console.error('Error loading friends:', error);
            const friendsList = document.getElementById('friends-list');
            if (friendsList) {
                friendsList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading friends. Please try again.</p></div>';
            }
            showSuccessMessage("Error loading friends", "error");
        });
}

function createFriendItem(friend) {
    const friendItem = document.createElement('div');
    friendItem.className = 'friend-item';
    friendItem.dataset.id = friend.id;

    const friendAvatar = document.createElement('div');
    friendAvatar.className = 'friend-avatar';
    if (friend.profilePicUrl) {
        friendAvatar.style.backgroundImage = `url(${friend.profilePicUrl})`;
    } else {
        friendAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }

    const friendInfo = document.createElement('div');
    friendInfo.className = 'friend-info';
    
    const friendName = document.createElement('div');
    friendName.className = 'friend-name';
    friendName.textContent = friend.name || friend.username;
    
    const friendUsername = document.createElement('div');
    friendUsername.className = 'friend-username';
    friendUsername.textContent = friend.username;

    const friendControls = document.createElement('div');
    friendControls.className = 'friend-controls';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-sm btn-danger';
    removeBtn.innerHTML = '<i class="fas fa-user-minus"></i>';
    removeBtn.title = 'Remove friend';
    removeBtn.addEventListener('click', () => removeFriend(friend.id));
    
    const messageBtn = document.createElement('button');
    messageBtn.className = 'btn btn-sm btn-primary';
    messageBtn.innerHTML = '<i class="fas fa-comment"></i>';
    messageBtn.title = 'Message friend';
    messageBtn.addEventListener('click', () => messageFriend(friend.id));

    friendControls.appendChild(messageBtn);
    friendControls.appendChild(removeBtn);
    
    friendInfo.appendChild(friendName);
    friendInfo.appendChild(friendUsername);
    
    friendItem.appendChild(friendAvatar);
    friendItem.appendChild(friendInfo);
    friendItem.appendChild(friendControls);
    
    return friendItem;
}

function removeFriend(friendId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }
    
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to remove friends", "error");
        return;
    }
    
    fetch(`/api/Members/${userId}/friends`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendId })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data.error || 'Failed to remove friend'));
        }
        return response.json();
    })
    .then(data => {
        showSuccessMessage(data.message || "Friend removed successfully", "success");
        loadUserFriends();
    })
    .catch(error => {
        console.error('Error removing friend:', error);
        showSuccessMessage(error.toString(), "error");
    });
}

function messageFriend(friendId) {
    // You can implement this to redirect to a chat page or show a chat modal
    alert('Message functionality coming soon!');
}

// Function to show loading state
function showLoadingState(element, isLoading = true) {
    if (!element) return;
    
    if (isLoading) {
        element.disabled = true;
        const originalText = element.textContent;
        element.dataset.originalText = originalText;
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        element.disabled = false;
        element.textContent = element.dataset.originalText || 'Save';
        delete element.dataset.originalText;
    }
}

// Security and validation helper functions
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Basic HTML encoding to prevent XSS
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function validateUsername(username) {
    // Username validation: 3-20 chars, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

function validatePassword(password) {
    // Password validation: at least 8 chars, contains letters and numbers
    if (password.length < 8) return false;
    
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return hasLetter && hasNumber;
}

function validateEmail(email) {
    // More robust email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
}

function saveAccountChanges() {
    // Get the save button and show loading state
    const saveButton = document.querySelector('#account-section .save-btn');
    showLoadingState(saveButton, true);
    
    // Get and sanitize values from form fields
    const username = sanitizeInput(document.getElementById('username').value.trim());
    const email = sanitizeInput(document.getElementById('email').value.trim());
    const fullName = sanitizeInput(document.getElementById('full-name').value.trim());
    const bio = sanitizeInput(document.getElementById('bio').value.trim());
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Enhanced validation
    if (!username || !email || !fullName) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate username format
    if (!validateUsername(username)) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores', 'error');
        return;
    }

    // Validate email format
    if (!validateEmail(email)) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Validate full name length
    if (fullName.length > 100) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Full name must be less than 100 characters', 'error');
        return;
    }
    
    // Validate bio length
    if (bio.length > 500) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Bio must be less than 500 characters', 'error');
        return;
    }
    
    // Enhanced password validation
    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            showLoadingState(saveButton, false);
            showSuccessMessage('Passwords do not match', 'error');
            return;
        }
        
        if (!validatePassword(password)) {
            showLoadingState(saveButton, false);
            showSuccessMessage('Password must be at least 8 characters and contain both letters and numbers', 'error');
            return;
        }
    }
    
    // Rest of the function remains the same...
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    if (!userId) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Error: User not authenticated', 'error');
        return;
    }
    
    // Parse full name into first and last name
    let firstName = '', lastName = '';
    if (fullName) {
        const nameParts = fullName.split(' ');
        firstName = nameParts[0];
        if (nameParts.length > 1) {
            lastName = nameParts.slice(1).join(' ');
        }
    }
    
    // Create user data object
    const userUpdate = {
        username: username,
        email: email,
        first_name: firstName,
        last_name: lastName,
        bio: bio,
        updatedAt: new Date().toISOString()
    };
    
    // Add password only if changing it
    if (password) {
        userUpdate.password = password;
    }
    
    // Send update to server
    fetch(`/api/Members/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userUpdate)
    })
    .then(response => response.json())
    .then(data => {
        showLoadingState(saveButton, false);
        
        if (data.error) {
            showSuccessMessage(`Error: ${data.error}`, 'error');
        } else {
            // Update stored user data
            Object.assign(userData, userUpdate);
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Clear password fields
            document.getElementById('password').value = '';
            document.getElementById('confirm-password').value = '';
            
            showSuccessMessage('Account information updated successfully');
        }
    })
    .catch(error => {
        showLoadingState(saveButton, false);
        console.error('Error updating account:', error);
        showSuccessMessage('Failed to update account information', 'error');
    });
}

function savePrivacySettings() {
    // Get the save button and show loading state
    const saveButton = document.querySelector('#privacy-section .save-btn');
    showLoadingState(saveButton, true);
    
    // Get values from radio buttons
    const profileVisibility = document.querySelector('input[name="profile-visibility"]:checked').value;
    const webVisibility = document.querySelector('input[name="web-visibility"]:checked').value;
    const classesVisibility = document.querySelector('input[name="classes-visibility"]:checked').value;
    const motivationsVisibility = document.querySelector('input[name="motivations-visibility"]:checked').value;
    const friendsVisibility = document.querySelector('input[name="friends-visibility"]:checked').value;
    
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    if (!userId) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Error: User not authenticated', 'error');
        return;
    }
    
    // Create privacy settings object
    const privacySettings = {
        settings: {
            privacy: {
                profileVisibility, 
                webVisibility, 
                classesVisibility, 
                motivationsVisibility, 
                friendsVisibility 
            }
        },
        updatedAt: new Date().toISOString()
    };
    
    // Send update to server
    fetch(`/api/Members/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(privacySettings)
    })
    .then(response => response.json())
    .then(data => {
        showLoadingState(saveButton, false);
        
        if (data.error) {
            showSuccessMessage(`Error: ${data.error}`, 'error');
        } else {
            // Update stored user data with new privacy settings
            if (!userData.settings) userData.settings = {};
            userData.settings.privacy = privacySettings.settings.privacy;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            showSuccessMessage('Privacy settings updated successfully');
        }
    })
    .catch(error => {
        showLoadingState(saveButton, false);
        console.error('Error updating privacy settings:', error);
        showSuccessMessage('Failed to update privacy settings', 'error');
    });
}

function saveAppearanceSettings() {
    // Get the save button and show loading state
    const saveButton = document.querySelector('#appearance-section .save-btn');
    showLoadingState(saveButton, true);
    
    // Get values from radio buttons
    const theme = document.querySelector('input[name="theme"]:checked').value;
    const colorAccent = document.querySelector('input[name="color-accent"]:checked').value;
    
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    if (!userId) {
        showLoadingState(saveButton, false);
        showSuccessMessage('Error: User not authenticated', 'error');
        return;
    }
    
    // Create appearance settings object
    const appearanceSettings = {
        settings: {
            appearance: {
                theme: theme,
                colorAccent: colorAccent
            }
        },
        updatedAt: new Date().toISOString()
    };
    
    // Send update to server
    fetch(`/api/Members/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(appearanceSettings)
    })
    .then(response => response.json())
    .then(data => {
        showLoadingState(saveButton, false);
        
        if (data.error) {
            showSuccessMessage(`Error: ${data.error}`, 'error');
        } else {
            // Update stored user data with new appearance settings
            if (!userData.settings) userData.settings = {};
            userData.settings.appearance = appearanceSettings.settings.appearance;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Apply theme immediately
            applyThemeSettings(theme, colorAccent);
            
            showSuccessMessage('Appearance settings updated successfully');
        }
    })
    .catch(error => {
        showLoadingState(saveButton, false);
        console.error('Error updating appearance settings:', error);
        showSuccessMessage('Failed to update appearance settings', 'error');
    });
}

// Function to apply theme settings to the page
function applyThemeSettings(theme, colorAccent) {
    // Use the global color accent function if available
    if (window.updateColorAccent) {
        window.updateColorAccent(colorAccent, theme);
    } else {
        // Fallback if the global function isn't loaded
        document.body.setAttribute('data-accent', colorAccent || 'pink');
        localStorage.setItem('colorAccent', colorAccent || 'pink');
        
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'light') {
            document.body.classList.remove('dark-mode');
        } else if (theme === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
        localStorage.setItem('theme', theme);
    }
    
    // Update theme toggle if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDark ? '☀️' : '🌙';
    }
    
    console.log(`Applied theme: ${theme}, color accent: ${colorAccent}`);
}

// Function to load user's color preference on page load
function loadUserColorPreference() {
    // First check if user is logged in and has saved preferences
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.settings && userData.settings.appearance) {
        const colorAccent = userData.settings.appearance.colorAccent || 'pink';
        const theme = userData.settings.appearance.theme || 'light';
        applyThemeSettings(theme, colorAccent);
        console.log('Loaded user color preference from userData:', colorAccent, theme);
    } else {
        // Fall back to localStorage
        const savedAccent = localStorage.getItem('colorAccent') || 'pink';
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyThemeSettings(savedTheme, savedAccent);
        console.log('Loaded color preference from localStorage:', savedAccent, savedTheme);
    }
    
    // Debug: Log current body data-accent attribute
    console.log('Body data-accent attribute:', document.body.getAttribute('data-accent'));
    console.log('Computed CSS variable --accent-primary:', getComputedStyle(document.documentElement).getPropertyValue('--accent-primary'));
}

// Function to test color accent changes (for debugging)
function testColorAccents() {
    console.log('Testing color accent changes...');
    const colors = ['pink', 'blue', 'purple', 'green', 'orange'];
    let index = 0;
    
    setInterval(() => {
        const color = colors[index % colors.length];
        console.log('Testing color:', color);
        document.body.setAttribute('data-accent', color);
        index++;
    }, 2000);
}

// Add test button to DOM for debugging (only in development)
function addTestButton() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Accents';
        testButton.style.position = 'fixed';
        testButton.style.top = '10px';
        testButton.style.left = '10px';
        testButton.style.zIndex = '10000';
        testButton.style.padding = '10px';
        testButton.style.background = 'var(--accent-primary)';
        testButton.style.color = 'white';
        testButton.style.border = 'none';
        testButton.style.borderRadius = '5px';
        testButton.style.cursor = 'pointer';
        testButton.onclick = testColorAccents;
        document.body.appendChild(testButton);
        console.log('Test button added for color accent debugging');
    }
}

// Function to load friend requests
function loadFriendRequests() {
    const userId = getCurrentUserId();
    if (!userId) {
        return;
    }

    // Add flag to prevent multiple initialization attempts
    if (window.requestsInitializationAttempted) {
        console.log('Friend requests initialization already attempted, skipping retry to prevent infinite loop');
        return;
    }

    fetch(`/api/Members/${userId}/friend-requests`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    // If we get 404, try to initialize missing fields (only once)
                    console.log('404 error loading friend requests, attempting to initialize missing fields...');
                    window.requestsInitializationAttempted = true;
                    initializeMissingFields();
                    return { incoming: [], outgoing: [] }; // Return empty requests for now
                }
                throw new Error('Failed to load friend requests');
            }
            return response.json();
        })
        .then(data => {
            loadIncomingRequests(data.incoming || []);
            loadOutgoingRequests(data.outgoing || []);
            updateFriendRequestBadges(data.incoming?.length || 0, data.outgoing?.length || 0);
        })
        .catch(error => {
            console.error('Error loading friend requests:', error);
        });
}

// Function to load incoming friend requests
function loadIncomingRequests(requests) {
    const pendingContent = document.getElementById('pending-requests-content');
    const requestsList = pendingContent ? pendingContent.querySelector('.requests-list') : null;
    
    if (!requestsList) return;
    
    // Clear existing content
    requestsList.innerHTML = '';
    
    if (requests.length > 0) {
        requests.forEach(request => {
            const requestItem = createRequestItem(request, 'incoming');
            requestsList.appendChild(requestItem);
        });
    } else {
        requestsList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No pending friend requests</p></div>';
    }
}

// Function to load outgoing friend requests
function loadOutgoingRequests(requests) {
    const sentContent = document.getElementById('sent-requests-content');
    const requestsList = sentContent ? sentContent.querySelector('.requests-list') : null;
    
    if (!requestsList) return;
    
    // Clear existing content
    requestsList.innerHTML = '';
    
    if (requests.length > 0) {
        requests.forEach(request => {
            const requestItem = createRequestItem(request, 'outgoing');
            requestsList.appendChild(requestItem);
        });
    } else {
        requestsList.innerHTML = '<div class="empty-state"><i class="fas fa-paper-plane"></i><p>No sent friend requests</p></div>';
    }
}

// Function to create request item elements
function createRequestItem(request, type) {
    const requestItem = document.createElement('div');
    requestItem.className = 'request-item';
    requestItem.dataset.userId = request.userId;

    const avatar = document.createElement('img');
    avatar.className = 'friend-avatar';
    avatar.src = request.profilePicUrl || '/static/images/default-avatar.png';
    avatar.alt = 'Friend';
    avatar.onerror = function() {
        this.src = '/static/images/default-avatar.png';
    };

    const friendInfo = document.createElement('div');
    friendInfo.className = 'friend-info';
    
    const name = document.createElement('h3');
    name.textContent = request.name || request.username;
    
    const username = document.createElement('p');
    const timeAgo = request.requestedAt ? formatTimeAgo(request.requestedAt) : '';
    username.textContent = `@${request.username}${timeAgo ? ' • ' + timeAgo : ''}`;

    friendInfo.appendChild(name);
    friendInfo.appendChild(username);

    const actions = document.createElement('div');
    actions.className = 'request-actions';

    if (type === 'incoming') {
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn btn-primary btn-sm';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', () => acceptFriendRequest(acceptBtn));

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-danger btn-sm';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => rejectFriendRequest(rejectBtn));

        actions.appendChild(acceptBtn);
        actions.appendChild(rejectBtn);
    } else {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary btn-sm';
        cancelBtn.textContent = 'Cancel Request';
        cancelBtn.addEventListener('click', () => cancelFriendRequest(request.userId));

        actions.appendChild(cancelBtn);
    }

    requestItem.appendChild(avatar);
    requestItem.appendChild(friendInfo);
    requestItem.appendChild(actions);

    return requestItem;
}

// Function to cancel outgoing friend request
function cancelFriendRequest(recipientId) {
    if (!confirm('Are you sure you want to cancel this friend request?')) {
        return;
    }
    
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to cancel friend requests", "error");
        return;
    }
    
    fetch(`/api/Members/${userId}/friend-requests/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipientId: recipientId })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data.error || 'Failed to cancel friend request'));
        }
        return response.json();
    })
    .then(data => {
        showSuccessMessage('Friend request cancelled successfully', 'success');
        
        // Remove the request item from the UI
        const requestItem = document.querySelector(`[data-user-id="${recipientId}"]`);
        if (requestItem) {
            requestItem.remove();
        }
        
        // Update badge counts
        updateFriendRequestBadge();
    })
    .catch(error => {
        console.error('Error cancelling friend request:', error);
        showSuccessMessage(error.toString(), 'error');
    });
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.seconds) {
        // Firestore timestamp
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
}

// Function to update friend request badge counts
function updateFriendRequestBadges(incomingCount, outgoingCount) {
    const pendingBadge = document.querySelector('.friends-tab[data-tab="pending-requests"] .badge');
    const sentBadge = document.querySelector('.friends-tab[data-tab="sent-requests"] .badge');
    
    if (pendingBadge) {
        pendingBadge.textContent = incomingCount;
        pendingBadge.style.display = incomingCount > 0 ? 'inline-flex' : 'none';
    }
    
    if (sentBadge) {
        sentBadge.textContent = outgoingCount;
        sentBadge.style.display = outgoingCount > 0 ? 'inline-flex' : 'none';
    }
}

// Add character counters and real-time validation
function addCharacterCounter(textareaId, maxLength) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    
    const counter = document.createElement('div');
    counter.className = 'character-counter';
    textarea.parentNode.appendChild(counter);
    
    function updateCounter() {
        const current = textarea.value.length;
        const remaining = maxLength - current;
        counter.textContent = `${current}/${maxLength}`;
        
        // Update counter styling based on remaining characters
        counter.classList.remove('warning', 'danger');
        if (remaining < 50) {
            counter.classList.add('warning');
        }
        if (remaining < 0) {
            counter.classList.add('danger');
        }
    }
    
    textarea.addEventListener('input', updateCounter);
    updateCounter(); // Initial update
}

// Real-time form validation
function addFormValidation() {
    // Username validation
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.addEventListener('blur', function() {
            const formGroup = this.closest('.form-group');
            if (validateUsername(this.value)) {
                this.classList.remove('error');
                this.classList.add('success');
                formGroup.classList.remove('has-error');
                formGroup.classList.add('has-success');
            } else if (this.value) {
                this.classList.remove('success');
                this.classList.add('error');
                formGroup.classList.remove('has-success');
                formGroup.classList.add('has-error');
            } else {
                this.classList.remove('error', 'success');
                formGroup.classList.remove('has-error', 'has-success');
            }
        });
    }
    
    // Email validation
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('blur', function() {
            const formGroup = this.closest('.form-group');
            if (validateEmail(this.value)) {
                this.classList.remove('error');
                this.classList.add('success');
                formGroup.classList.remove('has-error');
                formGroup.classList.add('has-success');
            } else if (this.value) {
                this.classList.remove('success');
                this.classList.add('error');
                formGroup.classList.remove('has-success');
                formGroup.classList.add('has-error');
            } else {
                this.classList.remove('error', 'success');
                formGroup.classList.remove('has-error', 'has-success');
            }
        });
    }
    
    // Password validation
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm-password');
    
    if (passwordField) {
        passwordField.addEventListener('blur', function() {
            const formGroup = this.closest('.form-group');
            if (this.value && validatePassword(this.value)) {
                this.classList.remove('error');
                this.classList.add('success');
                formGroup.classList.remove('has-error');
                formGroup.classList.add('has-success');
            } else if (this.value) {
                this.classList.remove('success');
                this.classList.add('error');
                formGroup.classList.remove('has-success');
                formGroup.classList.add('has-error');
            } else {
                this.classList.remove('error', 'success');
                formGroup.classList.remove('has-error', 'has-success');
            }
        });
    }
    
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('blur', function() {
            const formGroup = this.closest('.form-group');
            const password = passwordField ? passwordField.value : '';
            if (this.value && this.value === password) {
                this.classList.remove('error');
                this.classList.add('success');
                formGroup.classList.remove('has-error');
                formGroup.classList.add('has-success');
            } else if (this.value) {
                this.classList.remove('success');
                this.classList.add('error');
                formGroup.classList.remove('has-success');
                formGroup.classList.add('has-error');
            } else {
                this.classList.remove('error', 'success');
                formGroup.classList.remove('has-error', 'has-success');
            }
        });
    }
}

// Initialize enhanced form features
function initializeEnhancedForm() {
    // Add character counters
    addCharacterCounter('bio', 500);
    
    // Add real-time validation
    addFormValidation();
}

// Initialize friend search functionality
function initializeFriendSearch() {
    const searchInput = document.getElementById('friend-username');
    const searchBtn = document.getElementById('search-friends-btn');
    const clearBtn = document.getElementById('clear-search');
    const searchResults = document.getElementById('search-results');
    
    let searchTimeout;
    
    // Search input event listener for live search
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length >= 2) {
                // Debounce search requests
                searchTimeout = setTimeout(() => {
                    performFriendSearch(query);
                }, 300);
            } else if (query.length === 0) {
                hideSearchResults();
            }
        });
        
        // Handle enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length >= 2) {
                    performFriendSearch(query);
                }
            }
        });
        
        // Handle focus/blur for search results visibility
        searchInput.addEventListener('focus', function() {
            const query = this.value.trim();
            if (query.length >= 2) {
                searchResults.style.display = 'block';
            }
        });
        
        // Don't hide immediately on blur to allow clicking on results
        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (!searchResults.contains(document.activeElement)) {
                    hideSearchResults();
                }
            }, 150);
        });
    }
    
    // Search button click
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                performFriendSearch(query);
            } else {
                showSuccessMessage('Please enter at least 2 characters to search', 'error');
                searchInput.focus();
            }
        });
    }
    
    // Clear search button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            hideSearchResults();
            searchInput.focus();
        });
    }
    
    // Click outside to close search results
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            hideSearchResults();
        }
    });
}

// Perform friend search
function performFriendSearch(query) {
    const userId = getCurrentUserId();
    if (!userId) {
        showSuccessMessage("You need to be logged in to search for friends", "error");
        return;
    }
    
    const searchResults = document.getElementById('search-results');
    const searchResultsList = document.getElementById('search-results-list');
    const resultsCount = document.querySelector('.results-count');
    
    // Show loading state
    searchResults.style.display = 'block';
    searchResultsList.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i>Searching...</div>';
    
    // Make search request
    fetch(`/api/Members/search?q=${encodeURIComponent(query)}&currentUserId=${userId}&limit=10`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Search failed');
            }
            return response.json();
        })
        .then(data => {
            displaySearchResults(data.users || [], query);
        })
        .catch(error => {
            console.error('Error searching for friends:', error);
            searchResultsList.innerHTML = '<div class="no-results"><i class="fas fa-exclamation-triangle"></i><p>Error searching for users. Please try again.</p></div>';
        });
}

// Display search results
function displaySearchResults(users, query) {
    const searchResultsList = document.getElementById('search-results-list');
    const resultsCount = document.querySelector('.results-count');
    
    // Update results count
    resultsCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''} found`;
    
    // Clear previous results
    searchResultsList.innerHTML = '';
    
    if (users.length === 0) {
        searchResultsList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-user-slash"></i>
                <p>No users found for "${query}"</p>
                <small>Try searching by username or full name</small>
            </div>
        `;
        return;
    }
    
    // Create result items
    users.forEach(user => {
        const resultItem = createSearchResultItem(user);
        searchResultsList.appendChild(resultItem);
    });
}

// Create search result item
function createSearchResultItem(user) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    
    // Avatar
    const avatar = document.createElement('img');
    avatar.className = 'search-result-avatar';
    avatar.src = user.profilePicUrl || '/static/images/default-avatar.png';
    avatar.alt = 'User Avatar';
    avatar.onerror = function() {
        this.src = '/static/images/default-avatar.png';
    };
    
    // User info
    const info = document.createElement('div');
    info.className = 'search-result-info';
    
    const name = document.createElement('div');
    name.className = 'search-result-name';
    name.textContent = user.name || user.username;
    
    const username = document.createElement('div');
    username.className = 'search-result-username';
    username.textContent = `@${user.username}`;
    
    info.appendChild(name);
    info.appendChild(username);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'search-result-actions';
    
    const actionBtn = createActionButton(user);
    actions.appendChild(actionBtn);
    
    // Assemble item
    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
}

// Create action button based on relationship status
function createActionButton(user) {
    const btn = document.createElement('button');
    btn.className = 'search-action-btn';
    
    switch (user.relationship) {
        case 'friends':
            btn.classList.add('already-friends');
            btn.innerHTML = '<i class="fas fa-check"></i> Friends';
            btn.disabled = true;
            break;
            
        case 'request_sent':
            btn.classList.add('request-sent');
            btn.innerHTML = '<i class="fas fa-clock"></i> Sent';
            btn.disabled = true;
            break;
            
        case 'request_received':
            btn.classList.add('request-received');
            btn.innerHTML = '<i class="fas fa-reply"></i> Respond';
            btn.addEventListener('click', () => {
                // Switch to pending requests tab
                switchToRequestsTab();
                hideSearchResults();
            });
            break;
            
        default:
            btn.classList.add('add-friend');
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Add';
            btn.addEventListener('click', () => sendFriendRequest(user.id, user.username, btn));
            break;
    }
    
    return btn;
}

// Send friend request
function sendFriendRequest(userId, username, button) {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
        showSuccessMessage("You need to be logged in to send friend requests", "error");
        return;
    }
    
    // Show loading state
    showLoadingState(button, true);
    
    fetch(`/api/Members/${currentUserId}/friend-requests/send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendUsername: username })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data.error || 'Failed to send friend request'));
        }
        return response.json();
    })
    .then(data => {
        showLoadingState(button, false);
        showSuccessMessage(data.message || "Friend request sent successfully", "success");
        
        // Update button state
        button.classList.remove('add-friend');
        button.classList.add('request-sent');
        button.innerHTML = '<i class="fas fa-clock"></i> Sent';
        button.disabled = true;
        
        // Refresh friend requests to update badges
        loadFriendRequests();
    })
    .catch(error => {
        showLoadingState(button, false);
        console.error('Error sending friend request:', error);
        showSuccessMessage(error.toString(), "error");
    });
}

// Switch to pending requests tab
function switchToRequestsTab() {
    // Click the pending requests tab
    const pendingTab = document.querySelector('.friends-tab[data-tab="pending-requests"]');
    if (pendingTab) {
        pendingTab.click();
    }
}

// Hide search results
function hideSearchResults() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
}

// Legacy addFriend function for backwards compatibility (if needed)
function addFriend() {
    const friendInput = document.getElementById('friend-username');
    const friendUsername = friendInput.value.trim();
    
    if (!friendUsername) {
        showSuccessMessage("Please enter a username", "error");
        return;
    }
    
    if (friendUsername.length < 2) {
        showSuccessMessage("Please enter at least 2 characters to search", "error");
        return;
    }
    
    // Trigger search instead of direct add
    performFriendSearch(friendUsername);
}
