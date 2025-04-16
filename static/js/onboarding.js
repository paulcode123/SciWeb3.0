// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the animated background
    initAnimatedBackground();
    
    // Handle theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Handle usertype selection
    const typeOptions = document.querySelectorAll('.type-option');
    const selectedTypeInput = document.getElementById('selected-type');
    const continueBtn = document.getElementById('continue-btn');
    
    if (typeOptions.length > 0) {
        typeOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                typeOptions.forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Set the hidden input value
                if (selectedTypeInput) {
                    selectedTypeInput.value = this.dataset.value;
                }
                
                // Enable continue button
                if (continueBtn) {
                    continueBtn.disabled = false;
                }
                
                // Add a subtle animation effect
                this.style.animation = 'none';
                setTimeout(() => {
                    this.style.animation = 'pulse 0.5s ease';
                }, 10);
            });
        });
    }
    
    // Prevent form submissions if validation fails
    const userTypeForm = document.getElementById('usertype-form');
    if (userTypeForm) {
        userTypeForm.addEventListener('submit', function(e) {
            if (!selectedTypeInput || !selectedTypeInput.value) {
                e.preventDefault();
                showError('Please select an option to continue');
                return false;
            }
            
            // Show loading state
            if (continueBtn) {
                continueBtn.disabled = true;
                continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }
            
            // Continue with submission (in a real app, would submit via AJAX)
            return true;
        });
    }
    
    // Handle service checkboxes for service selection page
    const serviceCheckboxes = document.querySelectorAll('.service-checkbox input[type="checkbox"]');
    const serviceOptions = document.querySelectorAll('.service-option');
    const servicesForm = document.getElementById('services-form');
    
    if (serviceCheckboxes.length > 0) {
        // Add click event to the whole service option area
        serviceOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                // Prevent checkbox handling if clicked directly on the checkbox
                if (e.target.type === 'checkbox' || e.target.classList.contains('custom-checkbox') || e.target.parentElement.classList.contains('custom-checkbox')) {
                    return;
                }
                
                // Find the checkbox within this option
                const checkbox = this.querySelector('input[type="checkbox"]');
                
                // Toggle the checkbox
                checkbox.checked = !checkbox.checked;
                
                // Apply visual feedback
                applyCheckboxEffect(checkbox);
            });
        });
        
        // Also handle direct checkbox clicks
        serviceCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                applyCheckboxEffect(this);
            });
        });
        
        // Add form validation for services
        if (servicesForm) {
            servicesForm.addEventListener('submit', function(e) {
                // Check if at least one service is selected
                let hasSelection = false;
                serviceCheckboxes.forEach(checkbox => {
                    if (checkbox.checked) {
                        hasSelection = true;
                    }
                });
                
                if (!hasSelection) {
                    e.preventDefault();
                    showError('Please select at least one service to continue');
                    return false;
                }
                
                // Continue with form submission
                return true;
            });
        }
    }
    
    // Jupiter form validation and submission
    const jupiterForm = document.getElementById('jupiter-form');
    if (jupiterForm) {
        const jupiterUsername = document.getElementById('jupiter-username');
        const jupiterPassword = document.getElementById('jupiter-password');
        const continueBtn = document.querySelector('#jupiter-form .continue-btn');
        
        jupiterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            if (!jupiterUsername.value.trim()) {
                showError('Please enter your Jupiter username');
                return false;
            }
            
            if (!jupiterPassword.value.trim()) {
                showError('Please enter your Jupiter password');
                return false;
            }
            
            // Show loading state
            if (continueBtn) {
                continueBtn.disabled = true;
                continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            }
            
            // Simulate API call to Jupiter
            setTimeout(function() {
                // Redirect to next step after successful connection
                window.location.href = '/onboarding/classes';
            }, 1500);
            
            return false;
        });
        
        // Password visibility toggle
        const togglePassword = document.querySelector('.toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', function() {
                const passwordField = document.getElementById('jupiter-password');
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                
                // Toggle icon
                const icon = this.querySelector('i');
                if (type === 'text') {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
        
        // Skip button functionality for Jupiter
        const skipBtn = document.querySelector('#jupiter-form .skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Show confirming modal or just redirect
                if (confirm('Are you sure you want to skip connecting your Jupiter account? You can always do this later.')) {
                    window.location.href = '/onboarding/classes';
                }
            });
        }
    }
    
    // Add more onboarding-specific functionality here
    // This will be expanded as more onboarding steps are created
    
    // Classes page functionality
    const classesForm = document.getElementById('classes-form');
    const addClassBtn = document.getElementById('add-class-btn');
    const colorPickerModal = document.getElementById('color-picker-modal');
    const closeModal = document.querySelector('.close-modal');
    const colorOptions = document.querySelectorAll('.color-option');
    
    if (classesForm) {
        let currentColorPickerTarget = null;
        let classCounter = document.querySelectorAll('.class-item').length + 1;
        
        // Add new class item
        if (addClassBtn) {
            addClassBtn.addEventListener('click', function() {
                const randomColor = getRandomColor();
                const classItem = document.createElement('div');
                classItem.className = 'class-item';
                classItem.innerHTML = `
                    <div class="class-color" style="background-color: ${randomColor};"></div>
                    <div class="class-details">
                        <div class="class-name-section">
                            <input type="text" name="class_name_${classCounter}" placeholder="Class Name">
                            <div class="class-controls">
                                <button type="button" class="color-picker-btn" data-color="${randomColor}">
                                    <i class="fas fa-palette"></i>
                                </button>
                                <button type="button" class="delete-class-btn">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="class-meta">
                            <div class="form-group">
                                <label>Teacher</label>
                                <input type="text" name="teacher_${classCounter}" placeholder="Teacher Name">
                            </div>
                            <div class="form-group">
                                <label>Room</label>
                                <input type="text" name="room_${classCounter}" placeholder="Room Number">
                            </div>
                            <div class="form-group">
                                <label>Period</label>
                                <select name="period_${classCounter}">
                                    <option value="1">1st Period</option>
                                    <option value="2">2nd Period</option>
                                    <option value="3">3rd Period</option>
                                    <option value="4">4th Period</option>
                                    <option value="5">5th Period</option>
                                    <option value="6">6th Period</option>
                                    <option value="7">7th Period</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `;
                
                const classesList = document.querySelector('.classes-list');
                classesList.appendChild(classItem);
                classCounter++;
                
                // Add event listeners to the new buttons
                attachClassItemListeners(classItem);
                
                // Focus on the new class name input
                classItem.querySelector('input[type="text"]').focus();
            });
        }
        
        // Delete class item
        function attachClassItemListeners(classItem) {
            const deleteBtn = classItem.querySelector('.delete-class-btn');
            const colorBtn = classItem.querySelector('.color-picker-btn');
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you want to remove this class?')) {
                        classItem.remove();
                    }
                });
            }
            
            if (colorBtn) {
                colorBtn.addEventListener('click', function() {
                    currentColorPickerTarget = this;
                    colorPickerModal.style.display = 'block';
                });
            }
        }
        
        // Attach listeners to existing class items
        document.querySelectorAll('.class-item').forEach(item => {
            attachClassItemListeners(item);
        });
        
        // Color picker modal functionality
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                colorPickerModal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', function(event) {
            if (event.target === colorPickerModal) {
                colorPickerModal.style.display = 'none';
            }
        });
        
        // Color selection
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                const selectedColor = this.getAttribute('data-color');
                
                if (currentColorPickerTarget) {
                    // Update the data-color attribute
                    currentColorPickerTarget.setAttribute('data-color', selectedColor);
                    
                    // Find the parent class item
                    const classItem = currentColorPickerTarget.closest('.class-item');
                    
                    // Update the class color element
                    const colorElement = classItem.querySelector('.class-color');
                    colorElement.style.backgroundColor = selectedColor;
                    
                    // Close the modal
                    colorPickerModal.style.display = 'none';
                }
            });
        });
        
        // Classes form submission
        classesForm.addEventListener('submit', function(e) {
            const classItems = document.querySelectorAll('.class-item');
            
            // Basic validation - check if at least one class has a name
            let hasValidClass = false;
            classItems.forEach(item => {
                const nameInput = item.querySelector('input[name^="class_name_"]');
                if (nameInput && nameInput.value.trim()) {
                    hasValidClass = true;
                }
            });
            
            if (!hasValidClass) {
                e.preventDefault();
                showError('Please add at least one class with a name to continue');
                return false;
            }
            
            // Continue with form submission
            return true;
        });
        
        // Back button functionality
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                window.location.href = '/onboarding/jupiter';
            });
        }
    }
    
    // Grade Analysis page functionality
    const gradeAnalysisForm = document.getElementById('grade-analysis-form');
    const analyticsItems = document.querySelectorAll('.analytics-item');
    const toggleInputs = document.querySelectorAll('.toggle-input');
    
    if (gradeAnalysisForm) {
        // Toggle analytics selection
        toggleInputs.forEach(toggle => {
            toggle.addEventListener('change', function() {
                const analyticsItem = this.closest('.analytics-item');
                
                if (this.checked) {
                    analyticsItem.classList.add('selected');
                } else {
                    analyticsItem.classList.remove('selected');
                }
            });
        });
        
        // Click on analytics item toggles the checkbox
        analyticsItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Don't trigger if they clicked directly on the toggle
                if (e.target.closest('.toggle-switch')) {
                    return;
                }
                
                const toggle = this.querySelector('.toggle-input');
                toggle.checked = !toggle.checked;
                
                // Trigger the change event to update classes
                const changeEvent = new Event('change');
                toggle.dispatchEvent(changeEvent);
            });
        });
        
        // Form submission
        gradeAnalysisForm.addEventListener('submit', function(e) {
            // Ensure at least one analytics option is selected
            let hasSelection = false;
            toggleInputs.forEach(toggle => {
                if (toggle.checked) {
                    hasSelection = true;
                }
            });
            
            if (!hasSelection) {
                e.preventDefault();
                showError('Please select at least one analytics option to continue');
                return false;
            }
            
            // Continue with form submission
            return true;
        });
        
        // Back button functionality
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                window.location.href = '/onboarding/classes';
            });
        }
    }
    
    // Helper functions
    function showError(message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create and add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        // Find where to insert the error
        const formActions = document.querySelector('.form-actions');
        if (formActions) {
            formActions.insertAdjacentElement('beforebegin', errorDiv);
            
            // Scroll to error if needed
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Auto-remove after delay
        setTimeout(() => {
            errorDiv.classList.add('fade-out');
            setTimeout(() => {
                errorDiv.remove();
            }, 500);
        }, 5000);
    }
    
    function toggleTheme() {
        const body = document.body;
        body.classList.toggle('dark-mode');
        
        // Update icon
        const themeIcon = themeToggle.textContent;
        themeToggle.textContent = themeIcon === '🌙' ? '☀️' : '🌙';
        
        // Save preference to localStorage
        const isDarkMode = body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }
    
    // Check saved theme preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        if (themeToggle) {
            themeToggle.textContent = '☀️';
        }
    }
    
    // Animated background with moving gradients
    function initAnimatedBackground() {
        const background = document.querySelector('.animated-bg');
        if (!background) return;
        
        // Create animated elements
        const gradientCount = 3;
        for (let i = 0; i < gradientCount; i++) {
            const gradient = document.createElement('div');
            gradient.className = 'gradient-orb';
            
            // Set random properties
            const size = Math.random() * 300 + 200;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const opacity = Math.random() * 0.2 + 0.05;
            const animDuration = Math.random() * 80 + 40;
            
            // Apply styles
            gradient.style.width = `${size}px`;
            gradient.style.height = `${size}px`;
            gradient.style.left = `${posX}%`;
            gradient.style.top = `${posY}%`;
            gradient.style.opacity = opacity;
            gradient.style.background = `radial-gradient(circle, rgba(255,26,117,${opacity}) 0%, rgba(255,26,117,0) 70%)`;
            gradient.style.animation = `float ${animDuration}s linear infinite`;
            gradient.style.animationDelay = `-${Math.random() * animDuration}s`;
            
            background.appendChild(gradient);
        }
        
        // Add animated gradient style
        const styleSheet = document.createElement('style');
        styleSheet.type = 'text/css';
        styleSheet.innerText = `
            .gradient-orb {
                position: absolute;
                border-radius: 50%;
                filter: blur(80px);
                pointer-events: none;
            }
            
            @keyframes float {
                0% {
                    transform: translate(0, 0) rotate(0deg);
                }
                25% {
                    transform: translate(10%, 10%) rotate(90deg);
                }
                50% {
                    transform: translate(5%, -5%) rotate(180deg);
                }
                75% {
                    transform: translate(-10%, 5%) rotate(270deg);
                }
                100% {
                    transform: translate(0, 0) rotate(360deg);
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    // Add subtle animations to page elements
    function addScrollAnimations() {
        const elements = document.querySelectorAll('.onboarding-card, .sidebar-content, .onboarding-helper');
        
        elements.forEach(element => {
            // Add initial invisible class
            element.classList.add('animate-on-scroll');
            
            // Check if element is in viewport
            checkIfInView(element);
        });
        
        // Check on scroll
        window.addEventListener('scroll', () => {
            elements.forEach(element => {
                checkIfInView(element);
            });
        });
    }
    
    function checkIfInView(element) {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const isVisible = elementTop < window.innerHeight && elementBottom > 0;
        
        if (isVisible) {
            element.classList.add('visible');
        }
    }
    
    function applyCheckboxEffect(checkbox) {
        // Find the parent service option
        const serviceOption = checkbox.closest('.service-option');
        
        // Apply visual effect if it's a checkbox change
        if (checkbox.checked) {
            serviceOption.style.borderColor = 'var(--primary)';
            serviceOption.style.boxShadow = '0 5px 20px rgba(255, 26, 117, 0.15)';
            serviceOption.style.transform = 'translateY(-2px)';
        } else {
            serviceOption.style.borderColor = '';
            serviceOption.style.boxShadow = '';
            serviceOption.style.transform = '';
        }
        
        // Add animation effect
        serviceOption.style.animation = 'none';
        setTimeout(() => {
            serviceOption.style.animation = checkbox.checked ? 'pulse 0.5s ease' : '';
        }, 10);
    }
    
    // Helper functions for class setup
    function getRandomColor() {
        const colors = [
            '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', 
            '#F44336', '#009688', '#673AB7', '#3F51B5',
            '#E91E63', '#FFC107', '#795548', '#607D8B'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Initialize animations
    addScrollAnimations();
}); 