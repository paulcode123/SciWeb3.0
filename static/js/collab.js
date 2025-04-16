// Collab Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Tab Navigation
    const tabLinks = document.querySelectorAll('.sidebar-nav a');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and tabs
            tabLinks.forEach(l => {
                l.parentElement.classList.remove('active');
            });
            tabContents.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.parentElement.classList.add('active');
            
            // Show the corresponding tab content
            const targetTab = document.querySelector(this.getAttribute('href'));
            if (targetTab) {
                targetTab.classList.add('active');
            }
        });
    });
    
    // Project Title Editing
    const projectTitle = document.getElementById('project-title');
    const editTitleBtn = document.querySelector('.btn-edit-title');
    
    if (projectTitle && editTitleBtn) {
        editTitleBtn.addEventListener('click', function() {
            projectTitle.focus();
        });
        
        projectTitle.addEventListener('blur', function() {
            // Save changes (would be API call in real implementation)
            console.log('Project title updated to:', projectTitle.textContent);
        });
        
        projectTitle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                projectTitle.blur();
            }
        });
    }
    
    // Project Description Editing
    const projectDescription = document.getElementById('project-description');
    const editDescBtn = document.querySelector('.btn-edit');
    
    if (projectDescription && editDescBtn) {
        editDescBtn.addEventListener('click', function() {
            projectDescription.focus();
        });
        
        projectDescription.addEventListener('blur', function() {
            // Save changes (would be API call in real implementation)
            console.log('Project description updated');
        });
    }
    
    // Modal Handling
    const addMemberBtn = document.getElementById('add-member-btn');
    const addMemberModal = document.getElementById('add-member-modal');
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const shareProjectBtn = document.getElementById('share-project-btn');
    const shareProjectModal = document.getElementById('share-project-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    
    function openModal(modal) {
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    function closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }
    
    // Open modals
    if (addMemberBtn && addMemberModal) {
        addMemberBtn.addEventListener('click', function() {
            openModal(addMemberModal);
        });
    }
    
    if (addTaskBtn && addTaskModal) {
        addTaskBtn.addEventListener('click', function() {
            openModal(addTaskModal);
        });
    }
    
    if (shareProjectBtn && shareProjectModal) {
        shareProjectBtn.addEventListener('click', function() {
            openModal(shareProjectModal);
        });
    }
    
    // Close modals
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Drag and Drop Tasks
    const taskCards = document.querySelectorAll('.task-card');
    const taskLists = document.querySelectorAll('.task-list');
    
    let draggedTask = null;
    
    taskCards.forEach(card => {
        card.addEventListener('dragstart', function(e) {
            draggedTask = this;
            setTimeout(() => {
                this.classList.add('dragging');
            }, 0);
        });
        
        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedTask = null;
        });
    });
    
    taskLists.forEach(list => {
        list.addEventListener('dragover', function(e) {
            e.preventDefault();
            
            // Get the closest task card below the cursor
            const afterElement = getDragAfterElement(this, e.clientY);
            
            if (draggedTask) {
                if (afterElement) {
                    this.insertBefore(draggedTask, afterElement);
                } else {
                    this.appendChild(draggedTask);
                }
                
                // Update task counts
                updateTaskCounts();
            }
        });
    });
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function updateTaskCounts() {
        const taskColumns = document.querySelectorAll('.task-column');
        
        taskColumns.forEach(column => {
            const taskList = column.querySelector('.task-list');
            const taskCount = column.querySelector('.task-count');
            
            if (taskList && taskCount) {
                const count = taskList.querySelectorAll('.task-card').length;
                taskCount.textContent = count;
            }
        });
    }
    
    // File Filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    const fileItems = document.querySelectorAll('.file-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all filter buttons
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterValue = this.getAttribute('data-filter');
            
            // Show/hide files based on filter
            fileItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-type') === filterValue) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // Whiteboard Implementation
    const canvas = document.getElementById('whiteboard-canvas');
    const toolButtons = document.querySelectorAll('.tool-btn');
    const colorPicker = document.getElementById('colorPicker');
    const clearWhiteboardBtn = document.getElementById('clear-whiteboard');
    const saveWhiteboardBtn = document.getElementById('save-whiteboard');
    
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        let currentTool = 'pen';
        let currentColor = '#000000';
        let currentLineWidth = 2;
        
        // Set canvas size
        function resizeCanvas() {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = 500;
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        
        // Set initial canvas background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Tool selection
        toolButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all tool buttons
                toolButtons.forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Set current tool
                currentTool = this.getAttribute('data-tool');
                
                // Update cursor style
                updateCursor();
            });
        });
        
        function updateCursor() {
            switch(currentTool) {
                case 'pen':
                    canvas.style.cursor = 'crosshair';
                    break;
                case 'eraser':
                    canvas.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17.1a2 2 0 0 1 0-2.83l6.59-6.59c.36-.36.86-.58 1.41-.58.55 0 1.05.22 1.41.59l1.18 1.18 1.76-1.77c.39-.39.9-.59 1.41-.59.51 0 1.02.2 1.41.59zM7.52 19.8A2.99 2.99 0 0 0 10.8 16.5l-2.12-2.12-2.12 2.12A3 3 0 0 0 7.52 19.8z\'/%3E%3C/svg%3E") 0 24, auto';
                    break;
                case 'text':
                    canvas.style.cursor = 'text';
                    break;
                case 'shape':
                    canvas.style.cursor = 'crosshair';
                    break;
                case 'image':
                    canvas.style.cursor = 'pointer';
                    break;
                default:
                    canvas.style.cursor = 'default';
            }
        }
        
        // Color selection
        if (colorPicker) {
            colorPicker.addEventListener('input', function() {
                currentColor = this.value;
            });
            
            colorPicker.addEventListener('change', function() {
                currentColor = this.value;
            });
        }
        
        // Clear whiteboard
        if (clearWhiteboardBtn) {
            clearWhiteboardBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to clear the whiteboard?')) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            });
        }
        
        // Save whiteboard
        if (saveWhiteboardBtn) {
            saveWhiteboardBtn.addEventListener('click', function() {
                const dataURL = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = 'whiteboard.png';
                link.href = dataURL;
                link.click();
            });
        }
        
        // Drawing functionality
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch support for mobile
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });
        
        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
        
        function startDrawing(e) {
            isDrawing = true;
            [lastX, lastY] = [e.offsetX, e.offsetY];
            
            // Special handling for text tool
            if (currentTool === 'text') {
                const text = prompt('Enter text:');
                if (text) {
                    ctx.font = '16px Arial';
                    ctx.fillStyle = currentColor;
                    ctx.fillText(text, lastX, lastY);
                }
                isDrawing = false;
            }
            
            // Special handling for shape tool
            if (currentTool === 'shape') {
                ctx.beginPath();
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentLineWidth;
            }
            
            // Special handling for image tool
            if (currentTool === 'image') {
                // Simulated image upload
                alert('In a real implementation, this would open a file picker for image upload.');
                isDrawing = false;
            }
        }
        
        function draw(e) {
            if (!isDrawing) return;
            
            if (currentTool === 'pen') {
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentLineWidth;
                ctx.stroke();
                [lastX, lastY] = [e.offsetX, e.offsetY];
            } else if (currentTool === 'eraser') {
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 20;
                ctx.stroke();
                [lastX, lastY] = [e.offsetX, e.offsetY];
            }
        }
        
        function stopDrawing() {
            isDrawing = false;
        }
    }
    
    // Chat functionality
    const messageInput = document.querySelector('.message-input');
    const sendBtn = document.querySelector('.send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    if (messageInput && sendBtn && chatMessages) {
        sendBtn.addEventListener('click', sendMessage);
        
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        function sendMessage() {
            const message = messageInput.value.trim();
            
            if (message) {
                // Create message element
                const messageElement = document.createElement('div');
                messageElement.classList.add('message');
                
                // Get current time
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const timeStr = `${hours}:${minutes}`;
                
                // Set message content
                messageElement.innerHTML = `
                    <div class="message-avatar">
                        <img src="/static/images/avatar1.png" alt="You">
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">You</span>
                            <span class="message-time">${timeStr}</span>
                        </div>
                        <div class="message-text">
                            <p>${message}</p>
                        </div>
                    </div>
                `;
                
                // Add message to chat
                chatMessages.appendChild(messageElement);
                
                // Clear input
                messageInput.value = '';
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // In a real app, would send to server here
                console.log('Message sent:', message);
            }
        }
    }
    
    // Copy share link
    const copyLinkBtn = document.querySelector('.copy-link-btn');
    const shareLink = document.getElementById('share-link');
    
    if (copyLinkBtn && shareLink) {
        copyLinkBtn.addEventListener('click', function() {
            shareLink.select();
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        });
    }
    
    // Initialize first tab
    if (tabLinks.length > 0 && tabContents.length > 0) {
        tabLinks[0].click();
    }
});

// Theme toggle functionality
document.getElementById('theme-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Update toggle button text
    this.innerHTML = isDarkMode ? '☀️' : '🌙';
    
    // Save theme preference in localStorage
    localStorage.setItem('darkMode', isDarkMode);
});

// Apply saved theme
(function() {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '☀️';
    }
})(); 