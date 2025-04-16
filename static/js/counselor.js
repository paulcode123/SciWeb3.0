document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startAdmissionsBtn = document.getElementById('start-admissions');
    const startCoordinatorBtn = document.getElementById('start-coordinator');
    const startAssistantBtn = document.getElementById('start-assistant');
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const userMessageInput = document.getElementById('user-message');
    const sendMessageBtn = document.getElementById('send-message');
    const closeChat = document.getElementById('close-chat');
    const activeAvatar = document.getElementById('active-avatar');
    const activeCounselorName = document.getElementById('active-counselor-name');
    const toggleAssistant = document.getElementById('toggle-assistant');
    const themeToggle = document.querySelector('.theme-toggle');
    
    // Create default avatar directory if it doesn't exist
    ensureDefaultAvatars();

    // Current active counselor
    let activeCounselor = null;
    // Chat history for each counselor
    const chatHistory = {
        admissionsOfficer: [],
        strategicCoordinator: [],
        assistant: []
    };

    // Counselor data
    const counselors = {
        admissionsOfficer: {
            name: 'Admissions Officer',
            avatar: '/static/images/admissions-officer.png',
            defaultAvatar: '/static/images/default-avatar-1.png',
            greeting: "Hello! I'm your Admissions Officer advisor. I can help review your transcript, resume, and extracurricular activities to provide guidance on your college admissions strategy. What would you like to discuss today?",
            frequency: "We typically meet every 2-3 months for a comprehensive review of your academic profile and progress.",
            capabilities: [
                "Review academic transcripts and grades",
                "Evaluate college application profiles",
                "Provide strategic admissions advice",
                "Suggest improvements to your resume and ECs"
            ],
            accessibleData: [
                "Academic transcripts",
                "Standardized test scores",
                "Extracurricular activities",
                "Personal statement drafts",
                "College application history"
            ]
        },
        strategicCoordinator: {
            name: 'Strategic Coordinator',
            avatar: '/static/images/strategic-coordinator.png',
            defaultAvatar: '/static/images/default-avatar-2.png',
            greeting: "Hi there! I'm your Strategic Coordinator. I can help with detailed grade tracking, managing your academic tree, finding opportunities, and discussing your progress in depth. How can I assist you today?",
            frequency: "We can meet weekly to keep track of your progress and adjust your strategy as needed for optimal academic performance.",
            capabilities: [
                "Detailed grade analysis and tracking",
                "Tree management and organization",
                "Opportunity search and recommendations",
                "Progress monitoring and goal setting"
            ],
            accessibleData: [
                "Detailed grade data",
                "Tree structure and nodes",
                "Academic goals and milestones",
                "Available opportunities",
                "Web search capabilities",
                "Previous advice from Admissions Officer"
            ]
        },
        assistant: {
            name: 'Assistant',
            avatar: '/static/images/assistant.png',
            defaultAvatar: '/static/images/default-avatar-3.png',
            greeting: "Hey! I'm your personal Assistant. I'm here to help you with day-to-day tasks, managing your schedule, and navigating the platform. What do you need help with?",
            frequency: "I'm available anytime you need assistance with daily tasks and platform navigation.",
            capabilities: [
                "Task management and reminders",
                "Schedule planning and organization",
                "Platform navigation assistance",
                "Quick answers to common questions"
            ],
            accessibleData: [
                "Daily tasks and to-dos",
                "Class schedule",
                "Assignment deadlines",
                "Test and project dates",
                "Essay drafts and study materials"
            ]
        }
    };

    // Initialize function to ensure default avatar images are created
    function ensureDefaultAvatars() {
        const defaultAvatarPaths = [
            '/static/images/default-avatar-1.png',
            '/static/images/default-avatar-2.png',
            '/static/images/default-avatar-3.png'
        ];
        
        // This is a simple check - in a real app, you'd handle this server-side
        defaultAvatarPaths.forEach((path, index) => {
            const img = new Image();
            img.onerror = function() {
                console.log(`Default avatar ${index+1} not found. In a production environment, we would create it.`);
            };
            img.src = path;
        });
    }

    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
        
        // Save preference to localStorage
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Load theme preference from localStorage
    function loadThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            const icon = themeToggle.querySelector('i');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    }
    loadThemePreference();

    // Shooting stars animation
    function createShootingStars() {
        const stars = document.querySelector('.stars');
        const numberOfStars = 5;
        
        // Clear existing stars
        stars.innerHTML = '';
        
        // Create new shooting stars with random positions
        for (let i = 0; i < numberOfStars; i++) {
            const star = document.createElement('div');
            star.classList.add('shooting-star');
            
            // Set random position
            const topPos = Math.random() * 100;
            const rightPos = Math.random() * window.innerWidth;
            
            star.style.top = `${topPos}px`;
            star.style.right = `${rightPos}px`;
            star.style.left = 'initial';
            star.style.animationDelay = `${Math.random() * 3}s`;
            star.style.animationDuration = `${1 + Math.random() * 2}s`;
            
            stars.appendChild(star);
        }
        
        // Recreate stars periodically
        setTimeout(createShootingStars, 3000);
    }
    
    // Initialize shooting stars
    createShootingStars();

    // Start chat with Admissions Officer
    startAdmissionsBtn.addEventListener('click', function() {
        activeCounselor = 'admissionsOfficer';
        startChat(counselors.admissionsOfficer);
    });

    // Start chat with Strategic Coordinator
    startCoordinatorBtn.addEventListener('click', function() {
        activeCounselor = 'strategicCoordinator';
        startChat(counselors.strategicCoordinator);
    });

    // Start chat with Assistant
    startAssistantBtn.addEventListener('click', function() {
        activeCounselor = 'assistant';
        startChat(counselors.assistant);
    });

    // Toggle assistant from floating button
    toggleAssistant.addEventListener('click', function() {
        if (chatWindow.classList.contains('hidden')) {
            activeCounselor = 'assistant';
            startChat(counselors.assistant);
        } else {
            chatWindow.classList.add('hidden');
        }
    });

    // Close chat window
    closeChat.addEventListener('click', function() {
        chatWindow.classList.add('hidden');
    });

    // Send message
    sendMessageBtn.addEventListener('click', sendUserMessage);
    userMessageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage();
        }
    });

    // Add event listeners for drag functionality
    addDragFunctionality();

    // Functions
    function startChat(counselor) {
        // Set active counselor
        activeAvatar.src = counselor.avatar;
        activeAvatar.onerror = function() {
            this.src = counselor.defaultAvatar;
        };
        activeCounselorName.textContent = counselor.name;
        
        // Clear previous messages if no chat history
        if (chatHistory[activeCounselor].length === 0) {
            chatMessages.innerHTML = '';
            
            // Add greeting message
            addCounselorMessage(counselor.greeting);
            
            // Add frequency message
            addCounselorMessage(counselor.frequency);
            
            // Add capabilities message
            let capabilitiesMessage = "I can help you with:";
            counselor.capabilities.forEach(capability => {
                capabilitiesMessage += `<br>• ${capability}`;
            });
            addCounselorMessage(capabilitiesMessage);
            
            // Add accessible data message
            let accessibleDataMessage = "I have access to your:";
            counselor.accessibleData.forEach(data => {
                accessibleDataMessage += `<br>• ${data}`;
            });
            addCounselorMessage(accessibleDataMessage);
            
            // Save initial messages to chat history
            saveChatHistory(counselor.greeting, 'counselor');
            saveChatHistory(counselor.frequency, 'counselor');
            saveChatHistory(capabilitiesMessage, 'counselor');
            saveChatHistory(accessibleDataMessage, 'counselor');
        } else {
            // Load chat history
            loadChatHistory();
        }
        
        // Show chat window
        chatWindow.classList.remove('hidden');
        
        // Focus on input
        userMessageInput.focus();
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendUserMessage() {
        const message = userMessageInput.value.trim();
        if (message) {
            // Add user message to chat
            addUserMessage(message);
            
            // Save to chat history
            saveChatHistory(message, 'user');
            
            // Clear input
            userMessageInput.value = '';
            
            // Simulate counselor response (in a real app, this would be an API call)
            showTypingIndicator();
            
            setTimeout(() => {
                removeTypingIndicator();
                respondToCounselor(message);
            }, Math.random() * 1000 + 500); // Random delay between 500-1500ms
        }
    }

    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'user-message');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addCounselorMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'counselor-message');
        messageElement.innerHTML = message;
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'counselor-message', 'typing-indicator');
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingIndicator);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    function saveChatHistory(message, sender) {
        if (!activeCounselor) return;
        
        chatHistory[activeCounselor].push({
            sender: sender,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // In a real app, you might want to save this to localStorage or a database
        // localStorage.setItem(`chatHistory_${activeCounselor}`, JSON.stringify(chatHistory[activeCounselor]));
    }

    function loadChatHistory() {
        if (!activeCounselor) return;
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // In a real app, you might want to load this from localStorage or a database
        // const savedHistory = localStorage.getItem(`chatHistory_${activeCounselor}`);
        // if (savedHistory) {
        //     chatHistory[activeCounselor] = JSON.parse(savedHistory);
        // }
        
        // Add messages from chat history
        chatHistory[activeCounselor].forEach(item => {
            if (item.sender === 'user') {
                addUserMessage(item.message);
            } else {
                addCounselorMessage(item.message);
            }
        });
    }

    function respondToCounselor(userMessage) {
        // This is a simple simulation - in a real app, this would be replaced with actual AI processing
        if (!activeCounselor) return;
        
        const counselor = counselors[activeCounselor];
        let response = '';
        
        // Sample responses based on keywords
        if (userMessage.toLowerCase().includes('transcript') || userMessage.toLowerCase().includes('grades')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "I see your transcript shows a strong GPA of 3.8 with excellent performance in STEM subjects. Your AP Calculus and AP Physics scores are particularly impressive. These strengths will be attractive to engineering and science programs at competitive universities.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "Looking at your detailed grade data, I notice your Chemistry grades have fluctuated this semester. The test on molecular bonding seems to have been challenging. Would you like me to help create a study plan to strengthen this area?";
            } else {
                response = "I can help you keep track of upcoming tests and assignments. You have a Physics quiz on Friday and a Math assignment due next Tuesday. Would you like me to set up reminders?";
            }
        } 
        else if (userMessage.toLowerCase().includes('resume') || userMessage.toLowerCase().includes('cv')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Your resume shows good extracurricular involvement, particularly in the Robotics Club and volunteer work. To strengthen your application, consider adding more leadership experiences or initiatives where you've made a measurable impact.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "I can help update your resume with your recent Science Fair achievement. Looking at potential opportunities, the NASA Summer Internship program would be a perfect match for your skills and interests. The application deadline is next month.";
            } else {
                response = "I see you're working on your resume. Do you need help organizing the different sections or formatting the document? I can also remind you of important activities and achievements to include.";
            }
        }
        else if (userMessage.toLowerCase().includes('tree') || userMessage.toLowerCase().includes('plan')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Your academic plan shows a rigorous course selection that aligns well with your goal of studying Computer Science. I recommend adding an additional AP course in your senior year to further strengthen your application.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "I've analyzed your academic tree and notice you have a gap in your programming skills pathway. Adding a node for learning Python would complete this branch and align well with your machine learning interests. Would you like me to add this to your tree?";
            } else {
                response = "I can help you navigate through your academic tree. Your next milestone is completing the 'Introduction to Algorithms' node. You have 3 related tasks due this week.";
            }
        }
        else if (userMessage.toLowerCase().includes('opportunit') || userMessage.toLowerCase().includes('internship') || userMessage.toLowerCase().includes('program')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Based on your profile, I recommend focusing on research opportunities or internships in your field of interest before applying to colleges. This would significantly strengthen your application narrative.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "I've searched for opportunities matching your interests in artificial intelligence. There's an upcoming AI competition hosted by Stanford, and a summer research program at MIT that accepts high school students. Both would be excellent additions to your profile.";
            } else {
                response = "I can help you keep track of application deadlines for the opportunities you're interested in. The Google Code-in submission is due next Friday. Would you like me to set a reminder?";
            }
        }
        else if (userMessage.toLowerCase().includes('schedule') || userMessage.toLowerCase().includes('task')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Your overall scheduling looks well-balanced between academics and extracurriculars. This demonstrates good time management skills, which colleges value. Consider documenting how you prioritize tasks as part of your application essays.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "Looking at your weekly schedule, I notice you have several high-intensity study periods back-to-back on Tuesdays and Thursdays. Research shows that incorporating short breaks can improve retention and productivity. Would you like me to suggest a modified schedule?";
            } else {
                response = "Here's your schedule for today:<br>• 9:00 AM - Math Class<br>• 11:00 AM - Chemistry Lab<br>• 1:00 PM - Lunch<br>• 2:00 PM - English Essay (deadline tomorrow)<br>• 4:00 PM - Robotics Club meeting<br><br>Would you like me to remind you before each activity?";
            }
        }
        else if (userMessage.toLowerCase().includes('college') || userMessage.toLowerCase().includes('universit') || userMessage.toLowerCase().includes('application')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Based on your academic profile and interests, I recommend considering these universities: MIT, Stanford, Carnegie Mellon, UC Berkeley, and Georgia Tech. Each has strong programs in your field and varying admission requirements. Would you like me to explain why each would be a good fit?";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "I've analyzed the admission requirements for your target universities. To be competitive for MIT, you should aim to strengthen your math competition results and consider participating in their summer research program. I can help create a specific preparation plan for each university on your list.";
            } else {
                response = "I see you're working on college applications. You have the following deadlines coming up:<br>• Common App - November 1 (2 weeks away)<br>• MIT - November 15<br>• Stanford - December 1<br><br>Would you like me to help you organize your essay drafts and supplemental materials?";
            }
        }
        else if (userMessage.toLowerCase().includes('essay') || userMessage.toLowerCase().includes('personal statement') || userMessage.toLowerCase().includes('writing')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Your personal statement has a compelling narrative about your journey in robotics. I suggest strengthening the conclusion to better connect your experiences with your future goals. Remember, this essay should reveal aspects of yourself not visible elsewhere in your application.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "I've reviewed your essay draft and have suggestions for improvement. Your opening paragraph effectively grabs attention, but the middle section could use more specific examples of how your project overcame technical challenges. Would you like me to suggest some revisions?";
            } else {
                response = "I can help you manage your essay writing process. You have draft deadlines for the following essays:<br>• Common App main essay - Friday<br>• 'Why This College' essay for MIT - next Tuesday<br>• Supplemental essay on leadership - next Thursday<br><br>Would you like to schedule specific writing sessions?";
            }
        }
        else if (userMessage.toLowerCase().includes('test') || userMessage.toLowerCase().includes('sat') || userMessage.toLowerCase().includes('act')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "Your SAT score of 1480 places you within the competitive range for most top universities. Your math score is particularly strong at 790. If you decide to retake, focus on improving the verbal section, though your current score is already strong enough for most applications.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "Looking at your SAT practice test results, I notice patterns in the types of reading questions you miss. Questions involving tone and author's purpose seem most challenging. I can develop a targeted study plan to address these specific areas before your next test date.";
            } else {
                response = "You have an SAT practice test scheduled for this Saturday at 9:00 AM. I've created a reminder and your study materials are organized in your English folder. Would you like me to create a study schedule for the days leading up to it?";
            }
        }
        else if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('how to')) {
            if (activeCounselor === 'admissionsOfficer') {
                response = "I can help you understand the college admissions process and evaluate your overall academic profile. For specific questions, you can ask me about college selection, application strategies, or how to strengthen particular aspects of your profile.";
            } else if (activeCounselor === 'strategicCoordinator') {
                response = "I can help with detailed academic planning, tree management, and finding opportunities. To get the most from our sessions, try asking specific questions about your progress, goals, or areas you want to improve. I can also analyze your data to identify patterns and make recommendations.";
            } else {
                response = "I'm here to help you navigate the platform and manage your daily tasks. You can ask me about your schedule, upcoming deadlines, or how to use specific features of the website. I can also help you organize your assignments and study materials.";
            }
        }
        else {
            // Generic responses based on counselor type
            if (activeCounselor === 'admissionsOfficer') {
                response = "As your Admissions Officer, I focus on the big picture of your academic journey and college application strategy. I review your profile quarterly to provide strategic guidance. What specific aspect of your college preparation would you like to discuss?";
            } 
            else if (activeCounselor === 'strategicCoordinator') {
                response = "As your Strategic Coordinator, I'm here to help you track your weekly progress and make data-driven decisions. I can analyze your academic performance, update your tree, search for opportunities, and help you stay on track with your goals. What specific area should we focus on today?";
            }
            else if (activeCounselor === 'assistant') {
                response = "As your daily Assistant, I'm here to help you stay organized and productive. I can help you manage your tasks, navigate the platform, and keep track of your schedule. What can I assist you with today?";
            }
        }
        
        // Add counselor response to chat
        addCounselorMessage(response);
        
        // Save to chat history
        saveChatHistory(response, 'counselor');
    }

    // Make assistant visible on all pages
    function initFloatingAssistant() {
        const floatingAssistant = document.querySelector('.floating-assistant');
        if (floatingAssistant) {
            // Show on all pages except the counselor page
            if (!window.location.pathname.includes('/counselor')) {
                floatingAssistant.style.display = 'block';
            } else {
                // On the counselor page, hide the floating assistant when a chat is active
                document.addEventListener('click', function(e) {
                    if (!chatWindow.classList.contains('hidden') && 
                        !chatWindow.contains(e.target) && 
                        !e.target.matches('#toggle-assistant') && 
                        !e.target.closest('#toggle-assistant')) {
                        // Don't hide chat if clicking on counselor cards
                        if (!e.target.closest('.counselor-card')) {
                            // chatWindow.classList.add('hidden');
                        }
                    }
                });
            }
        }
    }
    
    // Add drag functionality to chat window
    function addDragFunctionality() {
        const chatHeader = document.querySelector('.chat-header');
        
        if (!chatHeader) return;
        
        let isDragging = false;
        let offsetX, offsetY;
        
        chatHeader.addEventListener('mousedown', function(e) {
            isDragging = true;
            offsetX = e.clientX - chatWindow.getBoundingClientRect().left;
            offsetY = e.clientY - chatWindow.getBoundingClientRect().top;
            
            chatHeader.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                const left = e.clientX - offsetX;
                const top = e.clientY - offsetY;
                
                // Ensure the chat stays within viewport bounds
                const maxX = window.innerWidth - chatWindow.offsetWidth;
                const maxY = window.innerHeight - chatWindow.offsetHeight;
                
                chatWindow.style.left = Math.max(0, Math.min(left, maxX)) + 'px';
                chatWindow.style.top = Math.max(0, Math.min(top, maxY)) + 'px';
                chatWindow.style.right = 'auto';
                chatWindow.style.bottom = 'auto';
                chatWindow.style.position = 'fixed';
            }
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                chatHeader.style.cursor = 'grab';
            }
        });
        
        // Make header appear grabbable
        chatHeader.addEventListener('mouseover', function() {
            if (!isDragging) {
                chatHeader.style.cursor = 'grab';
            }
        });
    }
    
    // Initialize the assistant
    initFloatingAssistant();
}); 