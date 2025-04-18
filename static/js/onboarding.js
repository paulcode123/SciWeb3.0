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
                // Redirect to grade_analysis step after successful connection
                window.location.href = '/onboarding/grade_analysis';
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
                    window.location.href = '/onboarding/grade_analysis';
                }
            });
        }
    }
    
    // Dashboard page functionality on Grade Analysis page
    const dashboardContainer = document.querySelector('.jupiter-dashboard');
    if (dashboardContainer) {
        // Initialize sortable charts
        initDashboard();
        
        // Initialize charts
        createCharts();
        
        // Handle chart controls
        setupChartControls();
        
        // Handle modal
        setupAddChartModal();
        
        // Skip button functionality for dashboard
        const skipBtn = document.querySelector('.jupiter-dashboard .skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Show confirming modal or just redirect
                if (confirm('Are you sure you want to skip customizing your dashboard? You can always do this later.')) {
                    window.location.href = '/onboarding/classes';
                }
            });
        }
        
        // Continue button
        const proceedBtn = document.getElementById('proceed-btn');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Save dashboard layout
                saveDashboardLayout();
                
                // Redirect to next step
                window.location.href = '/onboarding/classes';
            });
        }
        
        // Back button functionality
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                window.location.href = '/onboarding/jupiter';
            });
        }
    }
    
    // Grade Analysis form functionality (if the old form still exists)
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
    }
    
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
                window.location.href = '/onboarding/grade_analysis';
            });
        }
    }
    
    // Counselors page functionality
    const counselorsContainer = document.querySelector('.counselors-container');
    if (counselorsContainer) {
        // Handle avatar selection
        const avatarOptions = document.querySelectorAll('.avatar-option input[type="radio"]');
        avatarOptions.forEach(radio => {
            radio.addEventListener('change', function() {
                // Get all radio inputs in this group
                const name = this.getAttribute('name');
                const groupRadios = document.querySelectorAll(`input[name="${name}"]`);
                
                // Update selected state
                groupRadios.forEach(groupRadio => {
                    const avatarImg = groupRadio.nextElementSibling;
                    if (groupRadio.checked) {
                        avatarImg.style.borderColor = 'var(--primary)';
                    } else {
                        avatarImg.style.borderColor = 'transparent';
                    }
                });
            });
        });
        
        // Initialize with pre-selected avatars
        avatarOptions.forEach(radio => {
            if (radio.checked) {
                const avatarImg = radio.nextElementSibling;
                avatarImg.style.borderColor = 'var(--primary)';
            }
        });
        
        // Add hover effects for counselor cards
        const counselorCards = document.querySelectorAll('.counselor-card');
        counselorCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        });
        
        // Form validation
        const counselorsForm = document.querySelector('.onboarding-form');
        if (counselorsForm) {
            counselorsForm.addEventListener('submit', function(e) {
                let valid = true;
                
                // Validate counselor names
                const counselorNames = document.querySelectorAll('.counselor-name input');
                counselorNames.forEach(input => {
                    if (!input.value.trim()) {
                        input.style.borderColor = 'red';
                        valid = false;
                    } else {
                        input.style.borderColor = '';
                    }
                });
                
                if (!valid) {
                    e.preventDefault();
                    // Scroll to first error
                    const firstError = document.querySelector('.counselor-name input[style*="border-color: red"]');
                    if (firstError) {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });
        }
    }
    
    // Helper functions
    function showError(message) {
        // Create error notification if it doesn't exist
        let errorNotification = document.querySelector('.error-notification');
        
        if (!errorNotification) {
            errorNotification = document.createElement('div');
            errorNotification.className = 'error-notification';
            document.body.appendChild(errorNotification);
        }
        
        // Show error message
        errorNotification.textContent = message;
        errorNotification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            errorNotification.classList.remove('show');
        }, 3000);
    }
    
    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        
        // Update theme in localStorage
        const isDarkTheme = document.body.classList.contains('dark-theme');
        localStorage.setItem('darkTheme', isDarkTheme);
        
        // Update toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (isDarkTheme) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
    
    function initAnimatedBackground() {
        const container = document.querySelector('.animated-background');
        if (!container) return;
        
        // Create floating shapes
        for (let i = 0; i < 15; i++) {
            const shape = document.createElement('div');
            shape.className = 'floating-shape';
            
            // Randomize shape properties
            const size = Math.random() * 30 + 10;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const duration = Math.random() * 15 + 15;
            const delay = Math.random() * 5;
            
            // Set shape styles
            shape.style.width = `${size}px`;
            shape.style.height = `${size}px`;
            shape.style.left = `${posX}%`;
            shape.style.top = `${posY}%`;
            shape.style.animationDuration = `${duration}s`;
            shape.style.animationDelay = `${delay}s`;
            
            // Random shape type
            const shapeType = Math.floor(Math.random() * 3);
            if (shapeType === 0) {
                shape.style.borderRadius = '50%';
            } else if (shapeType === 1) {
                shape.style.borderRadius = '30%';
            }
            
            // Random color
            const colors = ['#4a6cf7', '#6c57d5', '#8c50c2', '#ff6b6b', '#ff9a8b'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            shape.style.backgroundColor = color;
            
            // Add shape to container
            container.appendChild(shape);
        }
    }
    
    // Add scroll animations
    function addScrollAnimations() {
        const elements = document.querySelectorAll('.fade-in, .slide-in');
        
        elements.forEach(element => {
            // Start hidden
            element.style.opacity = '0';
            
            // Add visibility check on scroll
            window.addEventListener('scroll', function() {
                if (checkIfInView(element)) {
                    element.classList.add('show');
                }
            });
            
            // Check initial visibility
            if (checkIfInView(element)) {
                element.classList.add('show');
            }
        });
    }
    
    function checkIfInView(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    }
    
    function applyCheckboxEffect(checkbox) {
        const parentOption = checkbox.closest('.service-option');
        
        if (checkbox.checked) {
            parentOption.classList.add('selected');
        } else {
            parentOption.classList.remove('selected');
        }
    }
    
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    
    function initDashboard() {
        // Initialize Sortable for drag-and-drop functionality
        const sortableContainer = document.getElementById('sortable-charts');
        if (sortableContainer) {
            new Sortable(sortableContainer, {
                animation: 150,
                handle: '.chart-header', // Drag by the header only
                ghostClass: 'chart-ghost', // Class for the drop placeholder
                onEnd: function(evt) {
                    // Save the new order to localStorage
                    saveDashboardLayout();
                }
            });
        }
    }
    
    function createCharts() {
        // Generate fake data for charts
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const subjects = ['Math', 'Science', 'English', 'History', 'Art'];
        const grades = ['A', 'B', 'C', 'D', 'F'];
        const assignmentTypes = ['Homework', 'Quiz', 'Test', 'Project', 'Participation'];
        
        // Create GPA Trend Chart
        const gpaTrendCtx = document.getElementById('gpa-trend-chart');
        if (gpaTrendCtx) {
            const gpaTrendChart = new Chart(gpaTrendCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'GPA',
                        data: [3.5, 3.2, 3.6, 3.8, 3.7, 3.9],
                        borderColor: '#4a6cf7',
                        backgroundColor: 'rgba(74, 108, 247, 0.2)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: false
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `GPA: ${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            min: 0,
                            max: 4.0,
                            ticks: {
                                stepSize: 0.5
                            }
                        }
                    }
                }
            });
        }
        
        // Create Subject Performance Chart
        const subjectCtx = document.getElementById('subject-performance-chart');
        if (subjectCtx) {
            const subjectPerformanceChart = new Chart(subjectCtx, {
                type: 'radar',
                data: {
                    labels: subjects,
                    datasets: [{
                        label: 'Current Grade',
                        data: [90, 85, 78, 92, 88],
                        borderColor: '#4a6cf7',
                        backgroundColor: 'rgba(74, 108, 247, 0.2)',
                        pointBackgroundColor: '#4a6cf7'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            min: 0,
                            max: 100,
                            ticks: {
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        }
        
        // Create Grade Distribution Chart
        const gradeDistCtx = document.getElementById('grade-distribution-chart');
        if (gradeDistCtx) {
            const gradeDistChart = new Chart(gradeDistCtx, {
                type: 'pie',
                data: {
                    labels: grades,
                    datasets: [{
                        data: [40, 30, 15, 10, 5],
                        backgroundColor: [
                            '#4CAF50', // A - Green
                            '#2196F3', // B - Blue
                            '#FFC107', // C - Yellow
                            '#FF9800', // D - Orange
                            '#F44336'  // F - Red
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.label}: ${context.raw}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Create Assignment Performance Chart
        const assignmentCtx = document.getElementById('assignment-performance-chart');
        if (assignmentCtx) {
            const assignmentChart = new Chart(assignmentCtx, {
                type: 'bar',
                data: {
                    labels: assignmentTypes,
                    datasets: [{
                        label: 'Average Score (%)',
                        data: [85, 78, 82, 91, 95],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)', // Blue
                            'rgba(255, 99, 132, 0.7)', // Red
                            'rgba(255, 206, 86, 0.7)', // Yellow
                            'rgba(75, 192, 192, 0.7)', // Green
                            'rgba(153, 102, 255, 0.7)' // Purple
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 99, 132, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }
    
    function setupChartControls() {
        // Widget visibility toggle
        const toggleButtons = document.querySelectorAll('.widget-toggle');
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const widget = this.closest('.chart-widget');
                const chartBody = widget.querySelector('.chart-body');
                
                if (chartBody.style.display === 'none') {
                    chartBody.style.display = 'block';
                    this.querySelector('i').classList.remove('fa-eye-slash');
                    this.querySelector('i').classList.add('fa-eye');
                } else {
                    chartBody.style.display = 'none';
                    this.querySelector('i').classList.remove('fa-eye');
                    this.querySelector('i').classList.add('fa-eye-slash');
                }
                
                // Save state
                saveDashboardLayout();
            });
        });
        
        // Widget resize
        const resizeButtons = document.querySelectorAll('.widget-resize');
        resizeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const widget = this.closest('.chart-widget');
                
                if (widget.classList.contains('chart-large')) {
                    widget.classList.remove('chart-large');
                    this.querySelector('i').classList.remove('fa-compress-alt');
                    this.querySelector('i').classList.add('fa-expand-alt');
                } else {
                    widget.classList.add('chart-large');
                    this.querySelector('i').classList.remove('fa-expand-alt');
                    this.querySelector('i').classList.add('fa-compress-alt');
                }
                
                // Trigger resize to redraw charts
                window.dispatchEvent(new Event('resize'));
                
                // Save state
                saveDashboardLayout();
            });
        });
        
        // Widget remove
        const removeButtons = document.querySelectorAll('.widget-remove');
        removeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const widget = this.closest('.chart-widget');
                
                if (confirm('Are you sure you want to remove this chart from your dashboard?')) {
                    widget.remove();
                    
                    // Save state
                    saveDashboardLayout();
                }
            });
        });
    }
    
    function setupAddChartModal() {
        const addChartBtn = document.getElementById('add-chart-btn');
        const addChartModal = document.getElementById('add-chart-modal');
        const cancelBtn = document.getElementById('cancel-add-chart');
        const confirmBtn = document.getElementById('confirm-add-chart');
        const closeModal = document.querySelector('#add-chart-modal .close-modal');
        const chartOptions = document.querySelectorAll('.chart-option');
        
        // Show modal
        if (addChartBtn && addChartModal) {
            addChartBtn.addEventListener('click', function() {
                addChartModal.style.display = 'block';
                document.body.classList.add('modal-open');
            });
        }
        
        // Hide modal
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                addChartModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                
                // Deselect all options
                chartOptions.forEach(option => {
                    option.classList.remove('selected');
                });
            });
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                addChartModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                
                // Deselect all options
                chartOptions.forEach(option => {
                    option.classList.remove('selected');
                });
            });
        }
        
        // Select chart options
        chartOptions.forEach(option => {
            option.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
        });
        
        // Add selected charts to dashboard
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const selectedOptions = document.querySelectorAll('.chart-option.selected');
                
                if (selectedOptions.length === 0) {
                    alert('Please select at least one chart to add');
                    return;
                }
                
                selectedOptions.forEach(option => {
                    const chartId = option.dataset.chartId;
                    addChart(chartId);
                    option.classList.remove('selected');
                });
                
                // Hide modal
                addChartModal.style.display = 'none';
                document.body.classList.remove('modal-open');
                
                // Save state
                saveDashboardLayout();
            });
        }
    }
    
    function addChart(chartId) {
        const chartsContainer = document.getElementById('sortable-charts');
        if (!chartsContainer) return;
        
        // Check if chart already exists
        const existingChart = document.querySelector(`.chart-widget[data-chart-id="${chartId}"]`);
        if (existingChart) {
            alert('This chart is already on your dashboard');
            return;
        }
        
        // Chart configurations
        const chartConfigs = {
            'grade-prediction': {
                title: 'Grade Prediction',
                type: 'line',
                data: {
                    labels: ['Current', 'Midterm', 'Final'],
                    datasets: [{
                        label: 'Math',
                        data: [87, 90, 92],
                        borderColor: '#4a6cf7',
                        backgroundColor: 'rgba(74, 108, 247, 0.2)',
                        tension: 0.3
                    }, {
                        label: 'Science',
                        data: [82, 85, 88],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        tension: 0.3
                    }]
                }
            },
            'test-score-analysis': {
                title: 'Test Score Analysis',
                type: 'bar',
                data: {
                    labels: ['Test 1', 'Test 2', 'Test 3', 'Test 4'],
                    datasets: [{
                        label: 'Score',
                        data: [78, 85, 82, 90],
                        backgroundColor: 'rgba(74, 108, 247, 0.7)',
                        borderColor: 'rgba(74, 108, 247, 1)',
                        borderWidth: 1
                    }]
                }
            },
            'improvement-opportunities': {
                title: 'Improvement Opportunities',
                type: 'polarArea',
                data: {
                    labels: ['Homework Completion', 'Test Preparation', 'Class Participation', 'Project Quality', 'Study Time'],
                    datasets: [{
                        data: [70, 60, 85, 75, 50],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.7)',
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(153, 102, 255, 0.7)'
                        ]
                    }]
                }
            }
        };
        
        // Create chart widget
        const widget = document.createElement('div');
        widget.className = 'chart-widget';
        widget.dataset.chartId = chartId;
        
        const config = chartConfigs[chartId];
        if (!config) return;
        
        widget.innerHTML = `
            <div class="chart-header">
                <h4>${config.title}</h4>
                <div class="widget-controls">
                    <button class="btn-icon widget-toggle"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon widget-resize"><i class="fas fa-expand-alt"></i></button>
                    <button class="btn-icon widget-remove"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="chart-body">
                <canvas id="${chartId}-chart"></canvas>
            </div>
        `;
        
        // Add to container
        chartsContainer.appendChild(widget);
        
        // Initialize chart
        const chartCanvas = document.getElementById(`${chartId}-chart`);
        if (chartCanvas) {
            new Chart(chartCanvas, {
                type: config.type,
                data: config.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        
        // Setup controls for the new widget
        const toggleBtn = widget.querySelector('.widget-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                const chartBody = widget.querySelector('.chart-body');
                
                if (chartBody.style.display === 'none') {
                    chartBody.style.display = 'block';
                    this.querySelector('i').classList.remove('fa-eye-slash');
                    this.querySelector('i').classList.add('fa-eye');
                } else {
                    chartBody.style.display = 'none';
                    this.querySelector('i').classList.remove('fa-eye');
                    this.querySelector('i').classList.add('fa-eye-slash');
                }
                
                // Save state
                saveDashboardLayout();
            });
        }
        
        const resizeBtn = widget.querySelector('.widget-resize');
        if (resizeBtn) {
            resizeBtn.addEventListener('click', function() {
                if (widget.classList.contains('chart-large')) {
                    widget.classList.remove('chart-large');
                    this.querySelector('i').classList.remove('fa-compress-alt');
                    this.querySelector('i').classList.add('fa-expand-alt');
                } else {
                    widget.classList.add('chart-large');
                    this.querySelector('i').classList.remove('fa-expand-alt');
                    this.querySelector('i').classList.add('fa-compress-alt');
                }
                
                // Trigger resize to redraw charts
                window.dispatchEvent(new Event('resize'));
                
                // Save state
                saveDashboardLayout();
            });
        }
        
        const removeBtn = widget.querySelector('.widget-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to remove this chart from your dashboard?')) {
                    widget.remove();
                    
                    // Save state
                    saveDashboardLayout();
                }
            });
        }
    }
    
    function saveDashboardLayout() {
        const widgets = document.querySelectorAll('.chart-widget');
        const layout = [];
        
        widgets.forEach(widget => {
            layout.push({
                id: widget.dataset.chartId,
                visible: widget.querySelector('.chart-body').style.display !== 'none',
                large: widget.classList.contains('chart-large')
            });
        });
        
        // In a real app, this would be saved to a database
        // For now, we'll just save to localStorage
        localStorage.setItem('dashboardLayout', JSON.stringify(layout));
    }
    
    // Initialize animations
    addScrollAnimations();
}); 