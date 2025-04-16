document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality (shared with main.js)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            if (document.body.classList.contains('dark-mode')) {
                themeToggle.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            } else {
                themeToggle.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.textContent = '☀️';
    }

    // Vision Board Functionality
    const addMediaBtn = document.getElementById('addMediaItem');
    const mediaModal = document.getElementById('mediaModal');
    const closeModal = document.querySelector('.close-modal');
    const visionBoardGrid = document.getElementById('visionBoardGrid');
    
    // Inspirational quotes for the refresh-quote button
    const inspirationalQuotes = [
        {
            quote: "The future belongs to those who believe in the beauty of their dreams.",
            author: "Eleanor Roosevelt"
        },
        {
            quote: "Your time is limited, don't waste it living someone else's life.",
            author: "Steve Jobs"
        },
        {
            quote: "The only way to do great work is to love what you do.",
            author: "Steve Jobs"
        },
        {
            quote: "Believe you can and you're halfway there.",
            author: "Theodore Roosevelt"
        },
        {
            quote: "It does not matter how slowly you go as long as you do not stop.",
            author: "Confucius"
        },
        {
            quote: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            quote: "What you get by achieving your goals is not as important as what you become by achieving your goals.",
            author: "Zig Ziglar"
        },
        {
            quote: "The only limit to our realization of tomorrow will be our doubts of today.",
            author: "Franklin D. Roosevelt"
        },
        {
            quote: "Strive not to be a success, but rather to be of value.",
            author: "Albert Einstein"
        }
    ];
    
    // Open modal when add media button is clicked
    if (addMediaBtn) {
        addMediaBtn.addEventListener('click', function() {
            mediaModal.style.display = 'flex';
        });
    }
    
    // Close modal when X is clicked
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            mediaModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === mediaModal) {
            mediaModal.style.display = 'none';
        }
    });
    
    // Modal tab functionality
    const modalTabs = document.querySelectorAll('.modal-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    modalTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            modalTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding tab content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId + 'Tab').classList.add('active');
        });
    });
    
    // Form submissions for vision board items
    const uploadForm = document.querySelector('.upload-form');
    const urlForm = document.querySelector('.url-form');
    const textForm = document.querySelector('.text-form');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fileInput = document.querySelector('.file-input');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    addVisionBoardItem(e.target.result, file.type.startsWith('video') ? 'video' : 'image');
                    mediaModal.style.display = 'none';
                    fileInput.value = '';
                    updateProgressBar();
                };
                
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (urlForm) {
        urlForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const urlInput = urlForm.querySelector('input[type="url"]');
            const captionInput = urlForm.querySelector('input[type="text"]');
            
            if (urlInput.value) {
                const url = urlInput.value;
                const caption = captionInput.value;
                const isVideo = url.match(/\.(mp4|webm|ogg)$/) !== null;
                
                addVisionBoardItem(url, isVideo ? 'video' : 'image', caption);
                mediaModal.style.display = 'none';
                urlInput.value = '';
                captionInput.value = '';
                updateProgressBar();
            }
        });
    }
    
    if (textForm) {
        textForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const textInput = textForm.querySelector('textarea');
            const colorInput = textForm.querySelector('input[type="color"]');
            
            if (textInput.value) {
                addTextVisionBoardItem(textInput.value, colorInput.value);
                mediaModal.style.display = 'none';
                textInput.value = '';
                updateProgressBar();
            }
        });
    }
    
    // File Drop Area
    const fileDropArea = document.querySelector('.file-drop-area');
    const fileInput = document.querySelector('.file-input');
    
    if (fileDropArea && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            fileDropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            fileDropArea.classList.add('highlight');
        }
        
        function unhighlight() {
            fileDropArea.classList.remove('highlight');
        }
        
        fileDropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                fileInput.files = files;
                const file = files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    addVisionBoardItem(e.target.result, file.type.startsWith('video') ? 'video' : 'image');
                    mediaModal.style.display = 'none';
                    fileInput.value = '';
                    updateProgressBar();
                };
                
                reader.readAsDataURL(file);
            }
        }
        
        fileDropArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const result = e.target.result;
                    // Process the file
                };
                
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Function to add new vision board items
    function addVisionBoardItem(src, type, caption = '') {
        const newItem = document.createElement('div');
        newItem.className = 'vision-item scale-in';
        
        if (type === 'image') {
            newItem.innerHTML = `
                <img src="${src}" alt="${caption || 'Vision board image'}">
                ${caption ? `<div class="vision-item-caption">${caption}</div>` : ''}
            `;
        } else if (type === 'video') {
            newItem.innerHTML = `
                <video controls>
                    <source src="${src}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                ${caption ? `<div class="vision-item-caption">${caption}</div>` : ''}
            `;
        }
        
        // Insert before the add button
        visionBoardGrid.insertBefore(newItem, addMediaBtn);
    }
    
    // Function to add text vision board items
    function addTextVisionBoardItem(text, bgColor) {
        const newItem = document.createElement('div');
        newItem.className = 'vision-item vision-item-text scale-in';
        newItem.style.backgroundColor = bgColor;
        newItem.style.color = getContrastColor(bgColor);
        newItem.innerText = text;
        
        // Insert before the add button
        visionBoardGrid.insertBefore(newItem, addMediaBtn);
    }
    
    // Helper function to determine text color based on background
    function getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black or white based on luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    // Add Milestone functionality
    const addMilestoneBtn = document.getElementById('addMilestone');
    const milestonesContainer = document.querySelector('.milestones-container');
    
    if (addMilestoneBtn && milestonesContainer) {
        let milestoneCount = 1;
        
        addMilestoneBtn.addEventListener('click', function() {
            milestoneCount++;
            
            const newMilestone = document.createElement('div');
            newMilestone.className = 'milestone';
            newMilestone.innerHTML = `
                <div class="milestone-marker">${milestoneCount}</div>
                <div class="milestone-content">
                    <input type="text" class="milestone-title" placeholder="Milestone Title">
                    <textarea class="milestone-description" placeholder="Describe this milestone and why it matters"></textarea>
                    <div class="milestone-date">
                        <label>Target Date:</label>
                        <input type="date" class="milestone-date-input">
                    </div>
                </div>
            `;
            
            // Insert before the add button
            milestonesContainer.insertBefore(newMilestone, addMilestoneBtn);
            updateProgressBar();
        });
    }
    
    // Add Affirmation functionality
    const addAffirmationBtn = document.getElementById('addAffirmation');
    const affirmationsContainer = document.querySelector('.affirmations-container');
    
    if (addAffirmationBtn && affirmationsContainer) {
        addAffirmationBtn.addEventListener('click', function() {
            const newAffirmation = document.createElement('div');
            newAffirmation.className = 'affirmation-card scale-in';
            newAffirmation.setAttribute('contenteditable', 'true');
            newAffirmation.innerText = 'Type your affirmation here...';
            
            // Insert before the add button
            affirmationsContainer.insertBefore(newAffirmation, addAffirmationBtn);
            
            // Focus the new affirmation card and select all text
            setTimeout(() => {
                newAffirmation.focus();
                document.execCommand('selectAll', false, null);
            }, 0);
            
            updateProgressBar();
        });
    }
    
    // Add Supporter functionality
    const addSupporterBtn = document.getElementById('addSupporter');
    const supportersContainer = document.querySelector('.supporters-container');
    
    if (addSupporterBtn && supportersContainer) {
        addSupporterBtn.addEventListener('click', function() {
            const newSupporter = document.createElement('div');
            newSupporter.className = 'supporter-card scale-in';
            newSupporter.innerHTML = `
                <div class="supporter-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="supporter-info">
                    <input type="text" class="supporter-name" placeholder="Name">
                    <input type="text" class="supporter-role" placeholder="Relationship/Role">
                    <textarea class="supporter-help" placeholder="How can they help you?"></textarea>
                </div>
            `;
            
            // Insert before the add button
            supportersContainer.insertBefore(newSupporter, addSupporterBtn);
            updateProgressBar();
        });
    }
    
    // Quote refresh functionality
    const refreshQuoteBtn = document.querySelector('.refresh-quote');
    const inspirationQuote = document.querySelector('.inspiration-quote');
    
    if (refreshQuoteBtn && inspirationQuote) {
        refreshQuoteBtn.addEventListener('click', function() {
            const randomIndex = Math.floor(Math.random() * inspirationalQuotes.length);
            const quote = inspirationalQuotes[randomIndex];
            
            // Fade out
            inspirationQuote.style.opacity = 0;
            
            // Change quote and fade in
            setTimeout(() => {
                inspirationQuote.innerHTML = `
                    ${quote.quote}
                    <span class="quote-author">— ${quote.author}</span>
                `;
                inspirationQuote.style.opacity = 1;
            }, 300);
        });
    }
    
    // Progress bar functionality
    const progressBar = document.getElementById('visionProgress');
    const updateProgressBtn = document.querySelector('.update-progress');
    
    function updateProgressBar() {
        if (!progressBar) return;
        
        // Count completed sections
        let completedSections = 0;
        let totalSections = 5; // Vision board, reasons, milestones, affirmations, supporters
        
        // Check vision board items (excluding the add button)
        const visionItems = document.querySelectorAll('.vision-item:not(.vision-item-add)');
        if (visionItems.length > 0) completedSections++;
        
        // Check reasons sections
        const reasonTextareas = document.querySelectorAll('.reason-textarea');
        let reasonsCompleted = 0;
        reasonTextareas.forEach(textarea => {
            if (textarea.value.trim().length > 0) reasonsCompleted++;
        });
        if (reasonsCompleted > 0) completedSections++;
        
        // Check milestones
        const milestones = document.querySelectorAll('.milestone');
        let milestonesCompleted = 0;
        milestones.forEach(milestone => {
            const title = milestone.querySelector('.milestone-title');
            if (title && title.value.trim().length > 0) milestonesCompleted++;
        });
        if (milestonesCompleted > 0) completedSections++;
        
        // Check affirmations
        const affirmations = document.querySelectorAll('.affirmation-card:not(.affirmation-card-add)');
        if (affirmations.length > 0) completedSections++;
        
        // Check supporters
        const supporters = document.querySelectorAll('.supporter-card:not(.supporter-card-add)');
        let supportersCompleted = 0;
        supporters.forEach(supporter => {
            const name = supporter.querySelector('.supporter-name');
            if (name && name.value.trim().length > 0) supportersCompleted++;
        });
        if (supportersCompleted > 0) completedSections++;
        
        // Update progress bar
        const progressPercentage = Math.floor((completedSections / totalSections) * 100);
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.innerText = `${progressPercentage}%`;
    }
    
    if (updateProgressBtn) {
        updateProgressBtn.addEventListener('click', updateProgressBar);
    }
    
    // Initial progress update
    updateProgressBar();
}); 