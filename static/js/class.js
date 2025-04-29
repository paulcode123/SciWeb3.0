// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get class ID from URL
    const urlPathParts = window.location.pathname.split('/');
    const classId = urlPathParts[urlPathParts.length - 1]; // Get the last part of the path

    // --- Global References (assuming these elements exist) ---
    const unitsNavContainer = document.querySelector('.units-navigation');
    const unitsContentContainer = document.querySelector('.units-content');
    const assignmentsContainer = document.querySelector('.assignments-card .card-content'); // Assuming assignments are listed here
    const eventsContainer = document.querySelector('.events-card .card-content'); // Assuming events are listed here
    const addAssignmentBtn = document.querySelector('.assignments-card .card-header .btn-icon'); // '+' button for assignments
    const addEventBtn = document.querySelector('.events-card .card-header .btn-icon'); // '+' button for events

    // Function to fetch class data and update the header
    async function loadClassData() {
        if (!classId) {
            console.error('Class ID not found in URL');
            // Optionally, display an error message on the page
            document.querySelector('.class-title').textContent = 'Error: Class Not Found';
            document.querySelector('.class-subtitle').textContent = 'Could not load class details.';
            return;
        }

        try {
            const response = await fetch(`/api/Classes/${classId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Assuming the response structure is { classId: { classData } }
            const classData = data[classId]; 

            if (classData) {
                // Update class header info
                document.querySelector('.class-title').textContent = classData.name || 'Unnamed Class';
                document.querySelector('.class-subtitle').textContent = classData.description || 'No description provided.';
                
                // --- Load Channels --- 
                channelsList.innerHTML = ''; // Clear existing channels/placeholders
                messagesContainerParent.innerHTML = ''; // Clear existing message containers
                
                if (classData.channels && classData.channels.length > 0) {
                    classData.channels.forEach(channel => {
                        // Add channel to the list
                        const newChannelElement = document.createElement('li');
                        newChannelElement.className = 'channel';
                        newChannelElement.setAttribute('data-channel', channel.id);
                        // Sanitize channel name if necessary before inserting
                        newChannelElement.innerHTML = `
                            <i class="fas fa-hashtag"></i>
                            <span>${channel.name}</span>
                            ${channel.unreadCount ? `<span class="unread-count">${channel.unreadCount}</span>` : ''}
                        `;
                        channelsList.appendChild(newChannelElement);
                        
                        // Add click listener
                        newChannelElement.addEventListener('click', function() {
                            activateChannel(this);
                        });
                        
                        // Create message container for this channel (initially hidden)
                        const channelMessagesDiv = document.createElement('div');
                        channelMessagesDiv.className = 'channel-messages';
                        channelMessagesDiv.setAttribute('data-channel', channel.id);
                        channelMessagesDiv.style.display = 'none'; // Hide initially
                        channelMessagesDiv.innerHTML = '<div class="empty-state-large" style="min-height: 300px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No messages in this channel yet.</p></div>'; // Add empty state
                        messagesContainerParent.appendChild(channelMessagesDiv);
                    });
                     // Activate the first channel by default if channels exist
                    activateChannel(channelsList.querySelector('.channel'));
                    
                } else {
                    // Display empty state if no channels exist
                    channelsList.innerHTML = '<li class="empty-state-small">No channels created yet.</li>';
                     messagesContainerParent.innerHTML = '<div class="empty-state-large" style="min-height: 300px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No channels available. Create one to start chatting.</p></div>';
                     currentChannelHeaderElement.textContent = 'No Channel Selected'; // Update header
                }
                 // --- End Load Channels ---
                 
                // --- Load Units --- 
                renderUnits(classData.units || []);

                // --- Load Assignments --- 
                loadAssignments(); 

                // --- Load Events --- 
                loadEvents();
                
                // You can update other parts of the page here using classData
                // e.g., populate members list, units, etc.
                console.log('Class data loaded:', classData);
            } else {
                console.error('Class data not found in response for ID:', classId);
                document.querySelector('.class-title').textContent = 'Error: Class Not Found';
                document.querySelector('.class-subtitle').textContent = 'Details for this class could not be loaded.';
            }
        } catch (error) {
            console.error('Error fetching class data:', error);
            document.querySelector('.class-title').textContent = 'Error Loading Class';
            document.querySelector('.class-subtitle').textContent = 'Could not connect to the server.';
        }
    }

    // Load the class data when the page loads
    loadClassData();

    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get the parent unit content to scope our tab selection
            const parentUnit = this.closest('.unit-content');
            if (!parentUnit) return;
            
            // Select only tabs and panes within this unit
            const unitTabs = parentUnit.querySelectorAll('.tab-btn');
            const unitPanes = parentUnit.querySelectorAll('.tab-pane');
            
            // Remove active class from all buttons and panes in this unit
            unitTabs.forEach(btn => btn.classList.remove('active'));
            unitPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            const targetPane = parentUnit.querySelector(`#${tabId}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
    
    // Unit tabs switching functionality
    const unitTabs = document.querySelectorAll('.unit-tab');
    const unitContents = document.querySelectorAll('.unit-content');
    
    unitTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all unit tabs and contents
            unitTabs.forEach(t => t.classList.remove('active'));
            unitContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const unitId = this.getAttribute('data-unit');
            document.getElementById(unitId).classList.add('active');
        });
    });
    
    // Add Unit button functionality
    const addUnitBtn = document.querySelector('.unit-add-btn');
    if (addUnitBtn) {
        addUnitBtn.addEventListener('click', function() {
            // In a real app, this would open a form to create a new unit
            // For the demo, we'll show an alert
            alert('In a real application, this would open a form to create a new unit.');
        });
    }
    
    // Upload/Attach button functionality
    const uploadButtons = document.querySelectorAll('.upload-btn');
    if (uploadButtons) {
        uploadButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Check if this is a mindweb attach button
                const isMindwebAttach = this.innerHTML.includes('Attach Mind Web');
                
                if (isMindwebAttach) {
                    // For mindweb attachment, show a different message
                    alert('In a real application, this would open a dialog to select from your existing mindwebs to attach.');
                } else {
                    // For regular uploads, use the file dialog
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.mm';
                    fileInput.style.display = 'none';
                    document.body.appendChild(fileInput);
                    
                    fileInput.addEventListener('change', function() {
                        if (this.files && this.files[0]) {
                            const fileName = this.files[0].name;
                            alert(`File "${fileName}" would be uploaded in a real application.`);
                            
                            // Remove the file input after use
                            document.body.removeChild(fileInput);
                        }
                    });
                    
                    // Trigger the file input click
                    fileInput.click();
                }
            });
        });
    }

    // Initialize time distribution chart
    initTimeChart();
    
    // === Channel Related Functionality ===
    const channelsList = document.querySelector('.channel-list');
    const createChannelBtn = document.querySelector('.chats-card .card-content .btn-text'); // Assuming this is the create button
    const addChannelIconBtn = document.querySelector('.chats-card .card-header .btn-icon'); // Assuming this is the plus icon button
    const channelMessagesContainers = document.querySelectorAll('.channel-messages');
    const currentChannelHeaderElement = document.querySelector('.current-channel');
    const messagesContainerParent = document.querySelector('.messages-container'); // Container for all channel message divs

    function activateChannel(channelElement) {
         if (!channelElement) return;
         
        // Remove active class from all channels
        document.querySelectorAll('.channel.active').forEach(ch => ch.classList.remove('active'));
        
        // Add active class to clicked channel
        channelElement.classList.add('active');
        
        // Get channel details
        const channelId = channelElement.getAttribute('data-channel');
        const channelName = channelElement.querySelector('span').textContent;
        
        // Update channel name in header
        if (currentChannelHeaderElement) {
            currentChannelHeaderElement.textContent = channelName;
        }
        
        // Hide all message threads
        channelMessagesContainers.forEach(messages => {
            messages.style.display = 'none';
        });
        
        // Show the selected channel's messages (or create if doesn't exist)
        let selectedMessages = messagesContainerParent.querySelector(`.channel-messages[data-channel="${channelId}"]`);
        if (!selectedMessages) {
            // Create a new container for this channel if it doesn't exist
            selectedMessages = document.createElement('div');
            selectedMessages.className = 'channel-messages';
            selectedMessages.setAttribute('data-channel', channelId);
            selectedMessages.style.display = 'flex'; // Show it immediately
            selectedMessages.innerHTML = '<div class="empty-state-large" style="min-height: 300px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No messages in this channel yet.</p></div>'; // Add empty state
            messagesContainerParent.appendChild(selectedMessages);
        } else {
            selectedMessages.style.display = 'flex';
        }
        
        // Load messages for the activated channel
        loadMessagesForChannel(channelId);
        
        // Remove unread count for this channel if it exists
        const unreadCount = channelElement.querySelector('.unread-count');
        if (unreadCount) {
            unreadCount.remove();
        }
    }

    // Function to load and render messages for a channel
    async function loadMessagesForChannel(channelId) {
        if (!channelId) return;

        const messagesContainer = messagesContainerParent.querySelector(`.channel-messages[data-channel="${channelId}"]`);
        if (!messagesContainer) {
            console.error('Message container not found for channel:', channelId);
            return;
        }

        // Show loading state (optional)
        messagesContainer.innerHTML = '<div class="loading-state">Loading messages...</div>';

        try {
            const response = await fetch(`/api/Classes/${classId}/channels/${channelId}/messages`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const messages = await response.json();

            // Sort messages by timestamp client-side
            messages.sort((a, b) => {
                // Handle potential undefined or null dates
                const dateA = a.sentAt ? new Date(a.sentAt) : new Date(0); // Treat missing date as epoch start
                const dateB = b.sentAt ? new Date(b.sentAt) : new Date(0);
                return dateA - dateB; // Ascending order
            });

            // Clear loading state
            messagesContainer.innerHTML = ''; 

            if (messages.length === 0) {
                messagesContainer.innerHTML = '<div class="empty-state-large" style="min-height: 300px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No messages in this channel yet. Be the first!</p></div>';
            } else {
                messages.forEach(msg => {
                    // Determine if message is from current user (Replace 'CURRENT_USER_ID' logic)
                    const isCurrentUser = msg.senderId === 'CURRENT_USER_ID'; 
                    const avatarText = isCurrentUser ? 'ME' : msg.senderName ? msg.senderName.substring(0, 2).toUpperCase() : '??'; // Need senderName
                    const authorName = isCurrentUser ? 'You' : msg.senderName || 'Unknown User'; // Need senderName
                    
                     // Format timestamp (Example: using basic JS Date)
                    let formattedTime = 'Invalid Date';
                    try {
                        const date = new Date(msg.sentAt);
                        formattedTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                        // Could add date if it's not today
                    } catch (e) { /* Ignore invalid date */ }
                    
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message-group';
                    messageElement.setAttribute('data-message-id', msg.id);
                    messageElement.innerHTML = `
                        <div class="message-avatar">${avatarText}</div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-author">${authorName}</span>
                                <span class="message-time">${formattedTime}</span>
                            </div>
                            <div class="message-text">
                                ${msg.content} <!-- Sanitize this content -->
                            </div>
                            <div class="message-reactions">
                                <!-- TODO: Render existing reactions from msg.reactions -->
                                <button class="btn-text btn-small">Add Reaction</button>
                            </div>
                            <!-- TODO: Add replies rendering -->
                        </div>
                    `;
                    messagesContainer.appendChild(messageElement);
                    addReactionListener(messageElement.querySelector('.message-reactions .btn-text'));
                });
                // Scroll to the bottom after loading messages
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

        } catch (error) {
            console.error(`Error loading messages for channel ${channelId}:`, error);
            messagesContainer.innerHTML = '<div class="error-state">Error loading messages. Please try again.</div>';
        }
    }

    async function handleCreateChannel() {
        const channelName = prompt("Enter the name for the new channel:");
        if (!channelName || channelName.trim() === "") {
            alert("Channel name cannot be empty.");
            return;
        }

        // Replace with actual user ID retrieval method
        const creatorId = 'CURRENT_USER_ID'; 
        
        const newChannelData = {
            name: channelName.trim(),
            description: "", // Add prompt or modal for description if needed
            type: "general", // Default type, can be changed via modal
            isPrivate: false, // Default, can be changed via modal
            allowedMembers: [],
            createdBy: creatorId, // Add this field if needed by backend/schema
            createdAt: new Date().toISOString() // Set timestamp on client-side
        };

        try {
            const response = await fetch(`/api/Classes/${classId}/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newChannelData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Failed to create channel'}`);
            }

            const result = await response.json();
            console.log('Channel created successfully:', result);

            // --- Update UI --- 
            const addedChannel = result.channel; // The backend returns the full channel object including ID
            
             // Remove the "No channels" message if it exists
            const emptyState = channelsList.querySelector('.empty-state-small');
            if (emptyState) {
                emptyState.remove();
            }

            const newChannelElement = document.createElement('li');
            newChannelElement.className = 'channel';
            newChannelElement.setAttribute('data-channel', addedChannel.id);
            newChannelElement.innerHTML = `
                <i class="fas fa-hashtag"></i>
                <span>${addedChannel.name}</span>
                <!-- <span class="unread-count">0</span> --> <!-- Initially no unread messages -->
            `;
            channelsList.appendChild(newChannelElement);

            // Add event listener to the new channel
            newChannelElement.addEventListener('click', function() {
                activateChannel(this);
            });

            // Optionally, activate the new channel immediately
            activateChannel(newChannelElement);
            // --- End UI Update ---

        } catch (error) {
            console.error('Error creating channel:', error);
            alert(`Failed to create channel: ${error.message}`);
        }
    }

    // Add listeners for channel creation
    if (createChannelBtn) {
        createChannelBtn.addEventListener('click', handleCreateChannel);
    }
     if (addChannelIconBtn) {
        addChannelIconBtn.addEventListener('click', handleCreateChannel);
    }

    // Add listeners to initially loaded channels (if any)
    document.querySelectorAll('.channel').forEach(channel => {
        channel.addEventListener('click', function() {
             activateChannel(this);
        });
    });
    // === End Channel Related Functionality ===

    // Channel switching functionality (REPLACED by activateChannel logic above)
    /* 
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
    */
    
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
        
        async function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return; // Don't send empty messages

            const activeChannelElement = document.querySelector('.channel.active');
            if (!activeChannelElement) {
                alert('Please select a channel first.');
                return;
            }
            const channelId = activeChannelElement.getAttribute('data-channel'); // Assuming data-channel holds the ID
            const messagesContainer = document.querySelector(`.channel-messages[data-channel="${channelId}"]`);

            if (!messagesContainer) {
                console.error('Could not find messages container for channel:', channelId);
                return;
            }

            // Replace with your actual method of getting the logged-in user's ID
            const senderId = 'CURRENT_USER_ID'; 

            const messageData = {
                classId: classId, // classId is available from the outer scope
                channelId: channelId,
                senderId: senderId,
                content: text,
                sentAt: new Date().toISOString(), // Send as ISO string, Firestore can convert this
                // Add other fields as needed from database.md (e.g., attachments, reactions initially empty)
                attachments: [],
                reactions: [],
                edited: false,
                replyTo: null, // Basic sending doesn't handle replies yet
                threadId: null, // Basic sending doesn't handle threads yet
                isThreadParent: false,
                readBy: [senderId], // Sender has read it
                mentions: [] // Basic sending doesn't handle mentions yet
            };

            try {
                 // Disable input while sending
                 messageInput.disabled = true;
                 sendMessageBtn.disabled = true;

                const response = await fetch('/api/Messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(messageData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Failed to send message'}`);
                }

                const result = await response.json();
                console.log('Message sent successfully:', result);

                 // --- Update UI Immediately (Optimistic Update or using server data) ---
                 // You might want to refine this to use the actual data returned (result.id, server timestamp etc.)
                
                const newMessageElement = document.createElement('div');
                newMessageElement.className = 'message-group';
                 // Store the message ID from the response for future reference (e.g., editing, deleting)
                 newMessageElement.setAttribute('data-message-id', result.id);
                newMessageElement.innerHTML = `
                    <div class="message-avatar">ME</div> <!-- Replace ME with user initials/avatar -->
                            <div class="message-content">
                                <div class="message-header">
                            <span class="message-author">You</span> <!-- Replace You with user name -->
                            <span class="message-time">Just now</span> <!-- Consider using a library to format the date/time -->
                                </div>
                                <div class="message-text">
                            ${text} <!-- Use sanitized text if needed -->
                                </div>
                                <div class="message-reactions">
                                    <button class="btn-text btn-small">Add Reaction</button>
                                </div>
                            </div>
                        `;
                        
                // Remove any "empty state" message if it exists
                 const emptyState = messagesContainer.querySelector('.empty-state-large');
                 if (emptyState) {
                     emptyState.remove();
                 }
                 
                messagesContainer.appendChild(newMessageElement);

                // Add reaction functionality (if needed, might be complex here)
                 addReactionListener(newMessageElement.querySelector('.message-reactions .btn-text'));
                        
                        // Clear input and scroll to bottom
                        messageInput.value = '';
                        messageInput.style.height = 'auto';
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                // --- End UI Update ---

            } catch (error) {
                console.error('Error sending message:', error);
                alert(`Failed to send message: ${error.message}`);
                // Optionally, add the message back to the input field
                 // messageInput.value = text; 
            } finally {
                 // Re-enable input
                 messageInput.disabled = false;
                 sendMessageBtn.disabled = false;
                 messageInput.focus();
             }
        }
        
        // Helper function to add reaction listener (avoids duplicating code)
        function addReactionListener(button) {
            if (!button) return;
            button.addEventListener('click', function() {
                // In a real app, this would open a reaction picker & update the DB
                            const reactions = ['👍', '❤️', '🎉', '👏', '🔥', '⭐'];
                            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                            
                            const messageReactions = this.closest('.message-reactions');
                            const newReaction = document.createElement('span');
                            newReaction.className = 'reaction';
                            newReaction.innerHTML = `${randomReaction} 1`;
                            
                            messageReactions.insertBefore(newReaction, this);
                // In a real app, you'd send an update to the server here
                        });
        }
        
        // Add reaction listeners to initially loaded messages (if any were loaded dynamically)
        document.querySelectorAll('.message-reactions .btn-text').forEach(addReactionListener);
    }

    // Problem more button functionality
    const problemMoreBtns = document.querySelectorAll('.problem-more-btn');
    
    if (problemMoreBtns) {
        problemMoreBtns.forEach(btn => {
            // Handle dropdown menu display
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Toggle dropdown visibility
                const dropdown = this.querySelector('.problem-actions-dropdown');
                if (dropdown) {
                    // Close all other open dropdowns first
                    document.querySelectorAll('.problem-actions-dropdown.show').forEach(d => {
                        if (d !== dropdown) d.classList.remove('show');
                    });
                    
                    // Toggle this dropdown
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                }
            });
            
            // Handle dropdown menu item actions
            const dropdownItems = btn.querySelectorAll('.problem-actions-dropdown a');
            dropdownItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Get the text content to determine which action was clicked
                    const actionText = this.textContent.trim();
                    const problemItem = this.closest('.problem-item');
                    const problemId = problemItem.querySelector('.problem-id').textContent.trim();
                    
                    if (actionText.includes('Map to Mindweb')) {
                        alert(`In a real application, this would open a dialog to map problem ${problemId} to a mindweb.`);
                    } else if (actionText.includes('Solve')) {
                        alert(`In a real application, this would open a workspace to solve problem ${problemId}.`);
                    } else if (actionText.includes('Hint')) {
                        alert(`In a real application, this would display a hint for problem ${problemId}.`);
                    }
                    
                    // Hide dropdown after action
                    btn.querySelector('.problem-actions-dropdown').style.display = 'none';
                });
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function() {
            document.querySelectorAll('.problem-actions-dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        });
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
                    .problem-item {
                        background-color: rgba(30, 33, 39, 0.7) !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .problem-actions-dropdown {
                        background-color: #2d3748 !important;
                        border-color: rgba(255, 255, 255, 0.1) !important;
                    }
                    .problem-actions-dropdown a {
                        color: #e2e8f0 !important;
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
                    .problem-item {
                        background-color: #fff !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                    }
                    .problem-actions-dropdown {
                        background-color: #fff !important;
                        border-color: rgba(0, 0, 0, 0.1) !important;
                    }
                    .problem-actions-dropdown a {
                        color: #333 !important;
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

    // --- Load Functions --- 
    
    async function loadAssignments() {
        try {
            const response = await fetch(`/api/Assignments?classId=${classId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const assignments = await response.json();
            renderAssignments(assignments);
        } catch (error) {
            console.error("Error loading assignments:", error);
             if (assignmentsContainer) assignmentsContainer.innerHTML = '<div class="error-state">Error loading assignments.</div>';
        }
    }
    
    async function loadEvents() {
        try {
            const response = await fetch(`/api/Events?classId=${classId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const events = await response.json();
            renderEvents(events);
        } catch (error) {
             console.error("Error loading events:", error);
             if (eventsContainer) eventsContainer.innerHTML = '<div class="error-state">Error loading events.</div>';
        }
    }

    // --- Render Functions --- 
    
    function renderUnits(units) {
        if (!unitsNavContainer || !unitsContentContainer) return;
        
        // Clear existing units (keep the 'Add Unit' button if it's inside nav container)
        unitsNavContainer.querySelectorAll('.unit-tab').forEach(tab => tab.remove());
        unitsContentContainer.innerHTML = ''; // Clear all content

        if (units.length === 0) {
            // Find the add button (might be outside the loop)
            const addUnitBtnEl = unitsNavContainer.querySelector('.unit-add-btn');
            unitsNavContainer.innerHTML = ''; // Clear completely first
            if (addUnitBtnEl) unitsNavContainer.appendChild(addUnitBtnEl); // Re-add button
            unitsNavContainer.insertAdjacentHTML('afterbegin', '<span class="empty-state-small">No units created.</span>');
            unitsContentContainer.innerHTML = '<div class="empty-state-large"><i class="fas fa-books"></i><h3>No units available yet.</h3><p>Create a unit to add resources.</p></div>';
        } else {
             // Sort units by position or title if needed
             // units.sort((a, b) => (a.position || 0) - (b.position || 0));

            units.forEach((unit, index) => {
                const isActive = index === 0; // Make the first unit active by default
                
                // Create Unit Tab Button
                const unitTab = document.createElement('button');
                unitTab.className = `unit-tab ${isActive ? 'active' : ''}`;
                unitTab.setAttribute('data-unit', unit.id);
                unitTab.textContent = unit.title || 'Untitled Unit';
                // Insert before the 'Add Unit' button if it exists
                const addBtn = unitsNavContainer.querySelector('.unit-add-btn');
                if(addBtn) {
                    unitsNavContainer.insertBefore(unitTab, addBtn);
                } else {
                    unitsNavContainer.appendChild(unitTab);
                }

                // Create Unit Content Div
                const unitContent = document.createElement('div');
                unitContent.className = `unit-content ${isActive ? 'active' : ''}`;
                unitContent.id = unit.id;
                unitContent.innerHTML = `
                    <div class="unit-header">
                        <h3 class="unit-title">${unit.title || 'Untitled Unit'}</h3>
                        <p class="unit-description">${unit.description || 'No description.'}</p>
                         <!-- Add Edit/Delete buttons here if needed -->
                    </div>
                    <div class="unit-tabs">
                        <div class="tabs">
                            <button class="tab-btn active" data-tab="${unit.id}-worksheets">Worksheets</button>
                            <button class="tab-btn" data-tab="${unit.id}-guides">Study Guides</button>
                            <button class="tab-btn" data-tab="${unit.id}-mindwebs">Mind Webs</button>
                            <button class="tab-btn" data-tab="${unit.id}-practice">Practice Problems</button>
                            <button class="tab-btn" data-tab="${unit.id}-tests">Practice Tests</button>
                        </div>
                    </div>
                    <div class="tab-content">
                        <div class="tab-pane active" id="${unit.id}-worksheets"></div>
                        <div class="tab-pane" id="${unit.id}-guides"></div>
                        <div class="tab-pane" id="${unit.id}-mindwebs"></div>
                        <div class="tab-pane" id="${unit.id}-practice"></div>
                        <div class="tab-pane" id="${unit.id}-tests"></div>
                    </div>
                `;
                // TODO: Populate tab-panes with actual resources (ClassFiles, Problems)
                unitsContentContainer.appendChild(unitContent);

                // Add listeners for the new unit's tabs
                unitContent.querySelectorAll('.tab-btn').forEach(button => {
                    button.addEventListener('click', handleTabSwitch);
                });
                 unitTab.addEventListener('click', handleUnitSwitch);
            });
        }
    }
    
    function renderAssignments(assignments) {
         if (!assignmentsContainer) return;
         // Keep header, clear only assignment items (assuming they are direct children)
         assignmentsContainer.querySelectorAll('.assignment, .empty-state').forEach(el => el.remove()); 

        if (assignments.length === 0) {
            assignmentsContainer.innerHTML += '<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>No upcoming assignments.</p></div>';
        } else {
            // Sort assignments if needed (e.g., by dueDate)
             assignments.sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0));

            assignments.forEach(assignment => {
                // Determine urgency based on due date (example logic)
                let statusClass = 'upcoming';
                let dueDate = new Date(assignment.dueDate || 0);
                let today = new Date();
                let diffDays = (dueDate - today) / (1000 * 60 * 60 * 24);
                if (diffDays < 3 && diffDays >= 0) statusClass = 'urgent';
                else if (diffDays < 0) statusClass = 'past-due'; // Add styling for past-due

                const assignmentElement = document.createElement('div');
                assignmentElement.className = `assignment ${statusClass}`;
                assignmentElement.setAttribute('data-assignment-id', assignment.id);
                assignmentElement.innerHTML = `
                    <div class="assignment-status ${statusClass}"></div>
                    <div class="assignment-details">
                        <h3>${assignment.title || 'Untitled Assignment'}</h3>
                        <p><i class="fas fa-calendar"></i> Due: ${dueDate.toLocaleDateString() || 'No date'}</p>
                         <!-- Add progress bar logic if needed -->
                         <!-- <div class="progress-bar"><div class="progress" style="width: 0%"></div></div> -->
                         <!-- <p class="progress-text">0% Complete</p> -->
                         <!-- Add Edit/Delete buttons here -->
                    </div>
                `;
                assignmentsContainer.appendChild(assignmentElement);
            });
        }
    }
    
    function renderEvents(events) {
         if (!eventsContainer) return;
         // Keep header and 'View All' button, clear only event items
         const viewAllBtn = eventsContainer.querySelector('.btn-text');
         eventsContainer.querySelectorAll('.event, .empty-state').forEach(el => el.remove());

        if (events.length === 0) {
            eventsContainer.insertAdjacentHTML('afterbegin', '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming events scheduled.</p></div>');
        } else {
             // Sort events by start date
             events.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
             
            events.forEach(event => {
                const startDate = event.startDate ? new Date(event.startDate) : null;
                const endDate = event.endDate ? new Date(event.endDate) : null;
                
                const eventElement = document.createElement('div');
                eventElement.className = 'event';
                eventElement.setAttribute('data-event-id', event.id);
                eventElement.innerHTML = `
                    <div class="event-date">
                        <span class="day">${startDate ? startDate.getDate() : '--'}</span>
                        <span class="month">${startDate ? startDate.toLocaleString('default', { month: 'short' }) : '---'}</span>
                    </div>
                    <div class="event-details">
                        <h3>${event.title || 'Untitled Event'}</h3>
                        ${startDate ? `<p><i class="fas fa-clock"></i> ${startDate.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} ${endDate ? ' - ' + endDate.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) : ''}</p>` : ''}
                        ${event.location ? `<p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>` : ''}
                        ${event.hostName ? `<p><i class="fas fa-user"></i> Hosted by: ${event.hostName}</p>` : ''} <!-- Need hostName -->
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-small">RSVP</button> <!-- Add Edit/Delete buttons here -->
                    </div>
                `;
                 // Insert before the 'View All' button
                 if (viewAllBtn) {
                    eventsContainer.insertBefore(eventElement, viewAllBtn);
                 } else {
                     eventsContainer.appendChild(eventElement);
                 }
            });
        }
    }

    // --- Add/Create Functions --- 
    
    async function handleAddUnit() {
        const title = prompt("Enter title for the new unit:");
        if (!title || title.trim() === "") return alert("Unit title is required.");

        const unitData = { title: title.trim() }; // Add description etc. via modal if needed

        try {
            const response = await fetch(`/api/Classes/${classId}/units`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(unitData)
            });
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            const result = await response.json();
            console.log("Unit added:", result);
            // Re-fetch all class data to get updated units array (simplest approach)
            // Alternatively, manually add the new unit to the UI
            loadClassData(); 
        } catch (error) {
            console.error("Error adding unit:", error);
            alert("Failed to add unit.");
        }
    }
    
    async function handleAddAssignment() {
         const title = prompt("Enter title for the new assignment:");
         if (!title || title.trim() === "") return alert("Assignment title is required.");
         
         // Use generic POST /Assignments route
         const assignmentData = {
             title: title.trim(),
             classId: classId, // Crucial: Associate with this class
             // Add other fields (description, dueDate, points) via modal/form
             description: "",
             dueDate: null, 
             points: 0,
             status: 'published' // Default status?
         };
         
        try {
            const response = await fetch(`/api/Assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignmentData)
            });
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            const result = await response.json();
            console.log("Assignment added:", result);
             // Re-fetch assignments for this class
            loadAssignments(); 
        } catch (error) {
            console.error("Error adding assignment:", error);
            alert("Failed to add assignment.");
        }
    }
    
    async function handleAddEvent() {
        const title = prompt("Enter title for the new event:");
        if (!title || title.trim() === "") return alert("Event title is required.");
        
        // Use generic POST /Events route
         const eventData = {
             title: title.trim(),
             classId: classId, // Associate with this class
             // Add other fields (description, location, dates, hostId) via modal/form
             description: "",
             location: "",
             startDate: null,
             endDate: null,
             // hostId: 'CURRENT_USER_ID' // Get current user ID
         };
         
        try {
            const response = await fetch(`/api/Events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            const result = await response.json();
            console.log("Event added:", result);
            // Re-fetch events for this class
            loadEvents(); 
        } catch (error) {
            console.error("Error adding event:", error);
            alert("Failed to add event.");
        }
    }

    // --- Event Listeners --- 
    
    // Add Unit Listener (assuming button exists and is unique)
    const addUnitButton = document.querySelector('.unit-add-btn');
    if (addUnitButton) {
        addUnitButton.removeEventListener('click', handleAddUnit); // Remove previous listener if any
        addUnitButton.addEventListener('click', handleAddUnit);
    } else {
        console.warn("Add Unit button (.unit-add-btn) not found.");
    }
    
    // Add Assignment Listener
    if (addAssignmentBtn) {
        addAssignmentBtn.addEventListener('click', handleAddAssignment);
    } else {
         console.warn("Add Assignment button not found in .assignments-card header.");
    }
    
    // Add Event Listener
    if (addEventBtn) {
        addEventBtn.addEventListener('click', handleAddEvent);
    } else {
         console.warn("Add Event button not found in .events-card header.");
    }
    
    // Helper function for Unit Tab switching
    function handleUnitSwitch() {
        const unitId = this.getAttribute('data-unit');
        // Remove active from all unit tabs/content
        unitsNavContainer.querySelectorAll('.unit-tab').forEach(t => t.classList.remove('active'));
        unitsContentContainer.querySelectorAll('.unit-content').forEach(c => c.classList.remove('active'));
        // Activate selected
        this.classList.add('active');
        const targetContent = unitsContentContainer.querySelector(`#${unitId}`);
        if (targetContent) targetContent.classList.add('active');
    }

    // Helper function for switching tabs within a unit
    function handleTabSwitch() {
         const tabId = this.getAttribute('data-tab');
         const parentUnitContent = this.closest('.unit-content');
         if (!parentUnitContent) return;
         // Deactivate tabs/panes within this unit only
         parentUnitContent.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
         parentUnitContent.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
         // Activate selected
         this.classList.add('active');
         const targetPane = parentUnitContent.querySelector(`#${tabId}`);
         if (targetPane) targetPane.classList.add('active');
    }

    // Initial listeners for tabs (might be redundant if units are dynamically loaded)
    // It's better to add listeners when rendering the elements
    // document.querySelectorAll('.unit-tab').forEach(tab => { tab.addEventListener('click', handleUnitSwitch); });
    // document.querySelectorAll('.tab-btn').forEach(button => { button.addEventListener('click', handleTabSwitch); });

    // Load the class data initially
    loadClassData();

    // ... (Rest of the code: Channel functionality, Message functionality, Theme, Chart) ...

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