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
            // Accept logic
        });
    });
    
    document.querySelectorAll('.request-actions .btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            // Reject logic
        });
    });
}

// Function to load all user data
function loadUserData() {
    // Load user profile info and settings
    loadUserSettings();
    
    // Load user classes
    loadUserClasses();
    
    // Load friends data
    loadUserFriends();
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
            profilePicture.onerror = function() {
                console.error('Failed to load profile image from URL:', user.profilePicUrl);
                // Reset to default if there's an error
                this.src = '/static/images/default-avatar.png';
            };
            
            profilePicture.onload = function() {
                console.log('Profile image successfully loaded from URL:', user.profilePicUrl);
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
        if (data.success) {
            console.log('Profile photo uploaded successfully. URL:', data.url);
            
            // Update stored user data with new profile pic URL
            userData.profilePicUrl = data.url;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Explicitly update the image again to ensure it's visible
            const profilePicture = document.getElementById('profile-picture');
            profilePicture.setAttribute('src', data.url);
            console.log('Updated profile picture element with new URL');
            
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

// Friend management functions
function loadUserFriends() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showSuccessMessage("You need to be logged in to view friends", "error");
        return;
    }

    fetch(`/api/Members/${userId}/friends`)
        .then(response => {
            if (!response.ok) {
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
                friendsList.innerHTML = '<p class="empty-message">No friends added yet.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading friends:', error);
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

function addFriend() {
    const friendInput = document.getElementById('friend-username');
    const friendUsername = friendInput.value.trim();
    
    if (!friendUsername) {
        showSuccessMessage("Please enter a username", "error");
        return;
    }
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
        showSuccessMessage("You need to be logged in to add friends", "error");
        return;
    }
    
    fetch(`/api/Members/${userId}/friends`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friendUsername })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => Promise.reject(data.error || 'Failed to add friend'));
        }
        return response.json();
    })
    .then(data => {
        showSuccessMessage(data.message || "Friend request sent successfully", "success");
        friendInput.value = '';
        loadUserFriends();
    })
    .catch(error => {
        console.error('Error adding friend:', error);
        showSuccessMessage(error.toString(), "error");
    });
}

function removeFriend(friendId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }
    
    const userId = localStorage.getItem('userId');
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

// Add event listener for adding friends
document.getElementById('add-friend-btn').addEventListener('click', addFriend);
document.getElementById('friend-username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addFriend();
    }
    });
    
    function saveAccountChanges() {
    // Get values from form fields
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const fullName = document.getElementById('full-name').value.trim();
    const bio = document.getElementById('bio').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
    // Validate inputs
        if (!username || !email || !fullName) {
        showSuccessMessage('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showSuccessMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Check if passwords match if changing password
    if (password || confirmPassword) {
        if (password !== confirmPassword) {
            showSuccessMessage('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showSuccessMessage('Password must be at least 6 characters', 'error');
                return;
            }
        }
        
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = userData.id;
    
    if (!userId) {
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
        updatedAt: new Date().toISOString() // Use ISO string instead of Firestore SERVER_TIMESTAMP
    };
    
    // Add password only if changing it
    if (password) {
        userUpdate.password = password; // In a real app, this should be hashed on the server
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
        console.error('Error updating account:', error);
        showSuccessMessage('Failed to update account information', 'error');
    });
    }
    
    function savePrivacySettings() {
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
        console.error('Error updating privacy settings:', error);
        showSuccessMessage('Failed to update privacy settings', 'error');
    });
}

function saveAppearanceSettings() {
    // Implementation for saving appearance settings
    // This function should be implemented to handle saving appearance settings
    showSuccessMessage('Appearance settings saving functionality not implemented', 'error');
} 