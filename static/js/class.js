// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Initialize time distribution chart
    initTimeChart();
    
    // Channel switching functionality
    const channels = document.querySelectorAll('.channel');
    const channelMessages = document.querySelectorAll('.channel-messages');
    const currentChannelElement = document.querySelector('.current-channel');
    
    if (channels && channelMessages) {
        channels.forEach(channel => {
            channel.addEventListener('click', function() {
                // Remove active class from all channels
                channels.forEach(ch => ch.classList.remove('active'));
                
                // Add active class to clicked channel
                this.classList.add('active');
                
                // Get channel name
                const channelName = this.getAttribute('data-channel');
                
                // Update channel name in header
                if (currentChannelElement) {
                    currentChannelElement.textContent = this.querySelector('span').textContent;
                }
                
                // Hide all message threads
                channelMessages.forEach(messages => {
                    messages.style.display = 'none';
                });
                
                // Show the selected channel's messages
                const selectedMessages = document.querySelector(`.channel-messages[data-channel="${channelName}"]`);
                if (selectedMessages) {
                    selectedMessages.style.display = 'flex';
                    
                    // Remove unread count for this channel if it exists
                    const unreadCount = this.querySelector('.unread-count');
                    if (unreadCount) {
                        unreadCount.remove();
                    }
                }
            });
        });
    }
    
    // Reaction functionality
    const reactionButtons = document.querySelectorAll('.message-reactions .btn-text');
    
    if (reactionButtons) {
        reactionButtons.forEach(button => {
            button.addEventListener('click', function() {
                // In a real app, this would open a reaction picker
                // For demo, we'll just add a random reaction
                const reactions = ['👍', '❤️', '🎉', '👏', '🔥', '⭐'];
                const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                
                const messageReactions = this.closest('.message-reactions');
                const newReaction = document.createElement('span');
                newReaction.className = 'reaction';
                newReaction.innerHTML = `${randomReaction} 1`;
                
                messageReactions.insertBefore(newReaction, this);
            });
        });
    }
    
    // Reply form functionality
    const replyButtons = document.querySelectorAll('.show-reply-form');
    
    if (replyButtons) {
        replyButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Check if a reply form is already open
                const existingForm = document.querySelector('.reply-form');
                if (existingForm) {
                    existingForm.remove();
                }
                
                // Create a new reply form
                const replyForm = document.createElement('div');
                replyForm.className = 'reply-form';
                replyForm.innerHTML = `
                    <div class="reply">
                        <div class="reply-avatar">ME</div>
                        <div class="reply-content">
                            <textarea placeholder="Type your reply..." class="message-input" rows="1"></textarea>
                            <div class="message-actions" style="justify-content: flex-end; margin-top: 0.5rem;">
                                <button class="btn-text cancel-reply">Cancel</button>
                                <button class="btn-primary send-reply-btn">Reply</button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Insert form after the button
                const messageReplies = this.closest('.message-replies');
                messageReplies.insertBefore(replyForm, this);
                
                // Hide the reply button
                this.style.display = 'none';
                
                // Focus on the textarea
                replyForm.querySelector('textarea').focus();
                
                // Add event listeners for cancel and send buttons
                replyForm.querySelector('.cancel-reply').addEventListener('click', function() {
                    replyForm.remove();
                    button.style.display = 'block';
                });
                
                replyForm.querySelector('.send-reply-btn').addEventListener('click', function() {
                    const replyText = replyForm.querySelector('textarea').value.trim();
                    if (replyText) {
                        // Create a new reply
                        const newReply = document.createElement('div');
                        newReply.className = 'reply';
                        newReply.innerHTML = `
                            <div class="reply-avatar">ME</div>
                            <div class="reply-content">
                                <div class="reply-header">
                                    <span class="reply-author">You</span>
                                    <span class="reply-time">Just now</span>
                                </div>
                                <div class="reply-text">
                                    ${replyText}
                                </div>
                            </div>
                        `;
                        
                        // Insert the new reply before the form
                        messageReplies.insertBefore(newReply, replyForm);
                        
                        // Remove the form
                        replyForm.remove();
                        
                        // Show the reply button
                        button.style.display = 'block';
                    }
                });
            });
        });
    }
    
    // Message input functionality
    const messageInput = document.querySelector('.message-input-area .message-input');
    const sendMessageBtn = document.querySelector('.send-message-btn');
    
    if (messageInput && sendMessageBtn) {
        // Auto-resize textarea as user types
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Send message on button click
        sendMessageBtn.addEventListener('click', sendMessage);
        
        // Send message on Enter key (without Shift)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
                // Get active channel
                const activeChannel = document.querySelector('.channel.active');
                if (activeChannel) {
                    const channelName = activeChannel.getAttribute('data-channel');
                    const messagesContainer = document.querySelector(`.channel-messages[data-channel="${channelName}"]`);
                    
                    if (messagesContainer) {
                        // Create new message
                        const newMessage = document.createElement('div');
                        newMessage.className = 'message-group';
                        newMessage.innerHTML = `
                            <div class="message-avatar">ME</div>
                            <div class="message-content">
                                <div class="message-header">
                                    <span class="message-author">You</span>
                                    <span class="message-time">Just now</span>
                                </div>
                                <div class="message-text">
                                    ${text}
                                </div>
                                <div class="message-reactions">
                                    <button class="btn-text btn-small">Add Reaction</button>
                                </div>
                            </div>
                        `;
                        
                        // Add the new message
                        messagesContainer.appendChild(newMessage);
                        
                        // Clear input and scroll to bottom
                        messageInput.value = '';
                        messageInput.style.height = 'auto';
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        
                        // Add reaction functionality to new message
                        const newReactionBtn = newMessage.querySelector('.message-reactions .btn-text');
                        newReactionBtn.addEventListener('click', function() {
                            const reactions = ['👍', '❤️', '🎉', '👏', '🔥', '⭐'];
                            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                            
                            const messageReactions = this.closest('.message-reactions');
                            const newReaction = document.createElement('span');
                            newReaction.className = 'reaction';
                            newReaction.innerHTML = `${randomReaction} 1`;
                            
                            messageReactions.insertBefore(newReaction, this);
                        });
                    }
                }
            }
        }
    }

    // Theme toggle initialization - moved inside DOMContentLoaded
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Initialize theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        console.log("Initial theme from localStorage:", savedTheme);
        
        // Create a style element for theme styling
        let themeStyleElement = document.getElementById('theme-styles');
        if (!themeStyleElement) {
            themeStyleElement = document.createElement('style');
            themeStyleElement.id = 'theme-styles';
            document.head.appendChild(themeStyleElement);
        }
        
        // Function to apply theme styles directly
        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            
            if (theme === 'dark') {
                themeStyleElement.textContent = `
                    body { 
                        background-color: #121212 !important; 
                        color: #f8f9fa !important; 
                    }
                    .dashboard-card {
                        background: linear-gradient(180deg, rgba(40, 44, 52, 0.7), rgba(25, 28, 33, 0.7)) !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .card-header {
                        background: rgba(30, 33, 39, 0.8) !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .chat-display {
                        background: #1e1e1e !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .message-input-area {
                        background: rgba(30, 33, 39, 0.8) !important;
                    }
                    .message-input {
                        background: rgba(25, 28, 33, 0.7) !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                        color: #f8f9fa !important;
                    }
                    .resources-section {
                        background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.05), transparent) !important;
                    }
                    .event, .guide, .assignment, .resource-card {
                        background-color: rgba(30, 33, 39, 0.7) !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .tab-pane {
                        background: transparent !important;
                    }
                    .footer {
                        background-color: #1a1a1a !important;
                        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
                    }
                `;
                themeToggle.innerHTML = '☀️';
                themeToggle.setAttribute('aria-label', 'Toggle Light Mode');
            } else {
                themeStyleElement.textContent = `
                    body { 
                        background-color: #f8f9fa !important; 
                        color: #333333 !important; 
                    }
                    .dashboard-card {
                        background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(245, 245, 245, 0.9)) !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                    }
                    .card-header {
                        background: rgba(240, 240, 240, 0.9) !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                    }
                    .chat-display {
                        background: #ffffff !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                    }
                    .message-input-area {
                        background: rgba(240, 240, 240, 0.9) !important;
                    }
                    .message-input {
                        background: rgba(240, 240, 240, 0.7) !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                        color: #333333 !important;
                    }
                    .resources-section {
                        background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.03), transparent) !important;
                    }
                    .event, .guide, .assignment, .resource-card {
                        background-color: rgba(255, 255, 255, 0.8) !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                    }
                    .tab-pane {
                        background: transparent !important;
                    }
                    .footer {
                        background-color: #f1f1f1 !important;
                        border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
                    }
                `;
                themeToggle.innerHTML = '🌙';
                themeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
            }
            console.log(`Theme applied: ${theme}`);
        }
        
        // Apply initial theme
        applyTheme(savedTheme);
        
        // Handle toggle click
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            console.log("Current theme:", currentTheme);
            
            // Toggle theme
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            console.log(`Switching to ${newTheme} theme`);
            
            // Apply new theme
            applyTheme(newTheme);
            
            // Save preference
            localStorage.setItem('theme', newTheme);
        });
    }
});

/**
 * Initialize the time distribution chart using Chart.js
 */
function initTimeChart() {
    const ctx = document.getElementById('timeChart');
    
    if (!ctx) return;
    
    // Sample data for time distribution
    const timeData = {
        labels: ['Lectures', 'Homework', 'Study', 'Practice', 'Group Work'],
        datasets: [{
            label: 'Hours Spent',
            data: [12, 8, 10, 6, 4],
            backgroundColor: [
                'rgba(52, 152, 219, 0.8)',
                'rgba(46, 204, 113, 0.8)',
                'rgba(155, 89, 182, 0.8)',
                'rgba(241, 196, 15, 0.8)',
                'rgba(231, 76, 60, 0.8)'
            ],
            borderColor: [
                'rgba(52, 152, 219, 1)',
                'rgba(46, 204, 113, 1)',
                'rgba(155, 89, 182, 1)',
                'rgba(241, 196, 15, 1)',
                'rgba(231, 76, 60, 1)'
            ],
            borderWidth: 1
        }]
    };

    // Chart configuration
    const timeChart = new Chart(ctx, {
        type: 'doughnut',
        data: timeData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} hrs (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}