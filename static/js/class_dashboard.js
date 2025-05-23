document.addEventListener('DOMContentLoaded', function() {
    // Get class ID from URL
    const classId = getClassIdFromUrl();
    
    // Set up edit mode tracking
    window.isEditMode = false;
    
    // Check if class data is available from the server
    const classDataElement = document.getElementById('class-data');
    let classData = null;
    
    if (classDataElement) {
        try {
            classData = JSON.parse(classDataElement.textContent);
            console.log('Class data loaded from server:', classData);
        } catch (e) {
            console.error('Error parsing class data:', e);
        }
    }
    
    // Initialize the dashboard
    initDashboard(classId, classData);
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Set up modal functionality
    setupModals();
    
    // Set up edit mode toggle
    setupEditMode();
});

/**
 * Extract class ID from URL
 * URL format: /class_dashboard/[classId]
 */
function getClassIdFromUrl() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return parts[parts.length - 1];
}

/**
 * Initialize dashboard with class data
 */
function initDashboard(classId, serverClassData) {
    // If we have server data, use it
    if (serverClassData) {
        updateDashboardWithServerData(serverClassData);
    } else {
        // Load from Firebase
        fetchClassDataFromFirebase(classId);
    }
    
    // Set random gradient background for header
    setRandomHeaderGradient();
}

/**
 * Fetch class data from Firebase
 */
function fetchClassDataFromFirebase(classId) {
    if (is_firebase_available()) {
        db.collection('Classes').doc(classId).get()
            .then(doc => {
                if (doc.exists) {
                    const classData = doc.data();
                    classData.id = doc.id;
                    console.log('Class data loaded from Firebase:', classData);
                    updateDashboardWithServerData(classData);
                    
                    // Load additional data
                    fetchUpcomingEventsFromFirebase(classId);
                    fetchUpcomingAssignmentsFromFirebase(classId);
                } else {
                    console.error('No class found with ID:', classId);
                }
            })
            .catch(error => {
                console.error('Error fetching class data from Firebase:', error);
            });
    } else {
        console.error('Firebase is not available. Please check your connection or setup.');
        // Show an error message to the user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = '<p>Unable to connect to the database. Please check your connection or contact support.</p>';
        document.querySelector('.dashboard-grid').prepend(errorMessage);
    }
}

/**
 * Update dashboard with data from the server or Firebase
 */
function updateDashboardWithServerData(classData) {
    // Update teacher info
    document.getElementById('teacher-name').textContent = classData.teacherName || 'Unknown';
    document.getElementById('class-period').textContent = classData.period || 'Unknown';
    document.getElementById('student-count').textContent = `${classData.studentCount || 0} Students`;
    
    // Update teacher profile
    const teacherProfile = document.getElementById('teacher-profile');
    teacherProfile.innerHTML = `
        <img src="${classData.teacherProfilePic || 'https://via.placeholder.com/64'}" alt="${classData.teacherName || 'Teacher'}" class="teacher-img">
        <h4>${classData.teacherName || 'Unknown'}</h4>
        <p>${classData.teacherEmail || 'No email available'}</p>
    `;
    
    // Update syllabus
    const syllabusContent = document.getElementById('syllabus-content');
    syllabusContent.innerHTML = `<p>${classData.syllabus || 'No syllabus available'}</p>`;
    
    // Update office hours
    const officeHoursList = document.getElementById('office-hours-list');
    if (classData.teacherOfficeHours && classData.teacherOfficeHours.length > 0) {
        officeHoursList.innerHTML = classData.teacherOfficeHours.map(hour => 
            `<li>${hour}</li>`
        ).join('');
    } else {
        officeHoursList.innerHTML = '<li>No office hours listed</li>';
    }
    
    // Update current unit if available
    if (classData.units && classData.units.length > 0) {
        // Find the active unit
        const activeUnit = classData.units.find(unit => unit.status === 'active') || classData.units[0];
        updateCurrentUnit(activeUnit);
    }
    
    // Update recent activities if available
    if (classData.recentActivities && classData.recentActivities.length > 0) {
        updateRecentActivity(classData.recentActivities);
    } else {
        // Fetch recent activities from database
        fetchRecentActivityFromFirebase(classData.id);
    }
    
    // Update class stats if available
    if (classData.stats) {
        updateClassStats(classData.stats);
                } else {
        // Calculate stats from database
        fetchClassStatsFromFirebase(classData.id);
    }
}

/**
 * Function to determine if Firebase is available
 */
function is_firebase_available() {
    return typeof firebase !== 'undefined' && 
           firebase.app && 
           firebase.firestore && 
           typeof db !== 'undefined';
}

/**
 * Set up tab navigation
 */
function setupTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentTabs = document.querySelectorAll('.content-tab');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all tabs
            navItems.forEach(navItem => navItem.classList.remove('active'));
            contentTabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content tab
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Load tab-specific data if needed
            loadTabData(tabId, getClassIdFromUrl());
        });
    });
    
    // Handle "View All" links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
            // Simulate click on the corresponding nav item
            document.querySelector(`.nav-item[data-tab="${tabId}"]`).click();
        });
    });
}

/**
 * Load tab-specific data
 */
function loadTabData(tabId, classId) {
    switch(tabId) {
        case 'assignments':
            if (!document.querySelector('#assignments-grid .assignment-card')) {
                fetchAssignmentsFromFirebase(classId);
            }
            break;
            
        case 'resources':
            if (!document.querySelector('#resources-grid .resource-card')) {
                fetchResourcesFromFirebase(classId);
            }
            break;
            
        case 'discussions':
            if (!document.querySelector('#messages-container .message')) {
                // Default to 'general' channel if no active channel selected
                const activeChannel = document.querySelector('.channel.active');
                const channelId = activeChannel ? 
                                 (activeChannel.getAttribute('data-channel-id') || activeChannel.getAttribute('data-channel')) : 
                                 'general';
                fetchChannelMessagesFromFirebase(classId, channelId);
            }
            break;
            
        case 'grades':
            if (!document.querySelector('#grades-table-body tr:not(.skeleton-row)')) {
                fetchGradesFromFirebase(classId);
            }
            break;
            
        case 'students':
            if (!document.querySelector('#students-grid .student-card')) {
                fetchClassmatesFromFirebase(classId);
            }
            break;
            
        case 'mindweb':
            if (!document.querySelector('#mindweb-container canvas')) {
                initMindWebFromFirebase(classId);
            }
            break;
    }
}

/**
 * Set up modal functionality
 */
function setupModals() {
    // Close modal buttons
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.classList.remove('active');
        });
    });
    
    // Create channel modal
    const createChannelBtn = document.getElementById('create-channel-btn');
    if (createChannelBtn) {
        createChannelBtn.addEventListener('click', function() {
            document.getElementById('create-channel-modal').classList.add('active');
        });
    }
    
    // Save channel button
    const saveChannelBtn = document.getElementById('save-channel-btn');
    if (saveChannelBtn) {
        saveChannelBtn.addEventListener('click', function() {
            const channelName = document.getElementById('channel-name').value.trim();
            const channelDesc = document.getElementById('channel-description').value.trim();
            const isPrivate = document.getElementById('private-channel').checked;
            
            if (channelName) {
                createNewChannel(getClassIdFromUrl(), channelName, channelDesc, isPrivate);
                document.getElementById('create-channel-modal').classList.remove('active');
            }
        });
    }
}

/**
 * Set random gradient background for header
 */
function setRandomHeaderGradient() {
    const colors = [
        ['#4361ee', '#3a0ca3'], // Blue to Purple
        ['#7209b7', '#3a0ca3'], // Purple to Deep Purple
        ['#f72585', '#7209b7'], // Pink to Purple
        ['#4cc9f0', '#4361ee'], // Light Blue to Blue
        ['#4361ee', '#4cc9f0'], // Blue to Light Blue
        ['#f72585', '#4361ee'], // Pink to Blue
    ];
    
    const randomIndex = Math.floor(Math.random() * colors.length);
    const [color1, color2] = colors[randomIndex];
    
    const headerBg = document.getElementById('class-header-bg');
    headerBg.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
}

/**
 * Fetch class data from API
 */
function fetchClassData(classId) {
    // In a real app, this would fetch from API
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock class data
        const classData = {
            id: classId,
            name: document.querySelector('.class-title').textContent,
            teacher: {
                id: 'teacher123',
                name: 'Dr. Alex Rodriguez',
                email: 'arodriguez@school.edu',
                profilePic: 'https://randomuser.me/api/portraits/men/44.jpg',
                officeHours: [
                    'Monday: 3:00 PM - 4:30 PM',
                    'Wednesday: 2:00 PM - 3:30 PM',
                    'Friday: By appointment'
                ]
            },
            period: '2nd Period (10:15 AM - 11:45 AM)',
            studentCount: 28,
            syllabus: 'This course covers fundamental concepts in molecular biology and genetics, with an emphasis on recent discoveries and research methods. Students will learn about DNA structure and replication, gene expression, protein synthesis, and the regulation of cellular processes. Laboratory sessions will provide hands-on experience with techniques such as PCR, gel electrophoresis, and microscopy. The course also explores ethical implications of genetic research and biotechnology applications.'
        };
        
        // Update UI with class data
        updateClassInfo(classData);
    }, 800);
}

/**
 * Update class information in the UI
 */
function updateClassInfo(classData) {
    // Update teacher info
    document.getElementById('teacher-name').textContent = classData.teacher.name;
    document.getElementById('class-period').textContent = classData.period;
    document.getElementById('student-count').textContent = `${classData.studentCount} Students`;
    
    // Update teacher profile
    const teacherProfile = document.getElementById('teacher-profile');
    teacherProfile.innerHTML = `
        <img src="${classData.teacher.profilePic}" alt="${classData.teacher.name}" class="teacher-img">
        <h4>${classData.teacher.name}</h4>
        <p>${classData.teacher.email}</p>
    `;
    
    // Update syllabus
    const syllabusContent = document.getElementById('syllabus-content');
    syllabusContent.innerHTML = `<p>${classData.syllabus}</p>`;
    
    // Update office hours
    const officeHoursList = document.getElementById('office-hours-list');
    officeHoursList.innerHTML = classData.teacher.officeHours.map(hour => 
        `<li>${hour}</li>`
    ).join('');
}

/**
 * Fetch upcoming events for the class
 */
function fetchUpcomingEvents(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock events data
        const events = [
            {
                id: 'e1',
                title: 'Lab Session: DNA Extraction',
                date: 'Tomorrow',
                time: '2:30 PM - 4:00 PM',
                location: 'Lab 203',
                type: 'lab'
            },
            {
                id: 'e2',
                title: 'Quiz: Cell Structure',
                date: 'Friday',
                time: 'During class',
                location: 'Classroom',
                type: 'quiz'
            },
            {
                id: 'e3',
                title: 'Study Group Session',
                date: 'Saturday',
                time: '11:00 AM - 1:00 PM',
                location: 'Library Study Room 4',
                type: 'study_group'
            }
        ];
        
        // Update events list
        updateUpcomingEvents(events);
    }, 1000);
}

/**
 * Update upcoming events in the UI
 */
function updateUpcomingEvents(events) {
    const eventsList = document.getElementById('upcoming-events-list');
    
    if (events.length > 0) {
        eventsList.innerHTML = events.map(event => `
            <div class="event-item event-${event.type}">
                <div class="event-header">
                    <span class="event-type">${formatEventType(event.type)}</span>
                    <span class="event-date">${event.date}</span>
                </div>
                <div class="event-title">${event.title}</div>
                <div class="event-details">
                    <span><i class="fas fa-clock"></i> ${event.time}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                </div>
            </div>
        `).join('');
    } else {
        eventsList.innerHTML = '<div class="no-events">No upcoming events</div>';
    }
}

/**
 * Format event type for display
 */
function formatEventType(type) {
    const types = {
        'lab': 'Lab',
        'quiz': 'Quiz',
        'exam': 'Exam',
        'assignment': 'Assignment',
        'study_group': 'Study Group',
        'review': 'Review Session',
        'lecture': 'Lecture'
    };
    
    return types[type] || 'Event';
}

/**
 * Fetch current unit information
 */
function fetchCurrentUnit(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock unit data
        const unit = {
            id: 'u3',
            title: 'Molecular Biology Fundamentals',
            description: 'An exploration of DNA structure, replication, and protein synthesis',
            progress: 65,
            topics: [
                'DNA Structure and Organization',
                'Replication Mechanisms',
                'Transcription and RNA Processing',
                'Translation and Protein Synthesis',
                'Gene Regulation'
            ],
            current_topic: 'Translation and Protein Synthesis'
        };
        
        // Update unit content
        updateCurrentUnit(unit);
    }, 1200);
}

/**
 * Update current unit in the UI
 */
function updateCurrentUnit(unit) {
    const unitContent = document.getElementById('current-unit-content');
    
    unitContent.innerHTML = `
        <h4>${unit.title}</h4>
        <p>${unit.description}</p>
        <div class="current-topic">
            <span class="topic-label">Current Topic:</span>
            <span class="topic-value">${unit.current_topic}</span>
        </div>
    `;
    
    // Update progress bar
    document.getElementById('unit-progress-percent').textContent = `${unit.progress}%`;
    document.querySelector('.progress-bar-fill').style.width = `${unit.progress}%`;
}

/**
 * Fetch recent activity
 */
function fetchRecentActivity(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock activity data
        const activities = [
            {
                id: 'a1',
                text: 'Lab Report: DNA Extraction graded (92%)',
                time: '2 hours ago',
                icon: 'fas fa-flask',
                type: 'grade'
            },
            {
                id: 'a2',
                text: 'Dr. Rodriguez posted new lecture slides',
                time: 'Yesterday',
                icon: 'fas fa-file-powerpoint',
                type: 'resource'
            },
            {
                id: 'a3',
                text: 'New assignment posted: Protein Synthesis Diagram',
                time: '2 days ago',
                icon: 'fas fa-tasks',
                type: 'assignment'
            },
            {
                id: 'a4',
                text: 'You asked a question in the discussion channel',
                time: '3 days ago',
                icon: 'fas fa-comment-dots',
                type: 'discussion'
            }
        ];
        
        // Update activity list
        updateRecentActivity(activities);
    }, 1500);
}

/**
 * Update recent activity in the UI
 */
function updateRecentActivity(activities) {
    const activityList = document.getElementById('activity-list');
    
    activityList.innerHTML = activities.map(activity => `
        <li class="activity-item activity-${activity.type}">
            <i class="${activity.icon}"></i>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </li>
    `).join('');
}

/**
 * Fetch class stats
 */
function fetchClassStats(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock stats data
        const stats = {
            assignments: 14,
            resources: 26,
            discussions: 72,
            average_grade: '89%'
        };
        
        // Update stats
        updateClassStats(stats);
    }, 1000);
}

/**
 * Update class stats in the UI
 */
function updateClassStats(stats) {
    document.getElementById('assignment-count').textContent = stats.assignments;
    document.getElementById('resource-count').textContent = stats.resources;
    document.getElementById('discussion-count').textContent = stats.discussions;
    document.getElementById('avg-grade').textContent = stats.average_grade;
}

/**
 * Fetch upcoming assignments
 */
function fetchUpcomingAssignments(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock assignments data
        const assignments = [
            {
                id: 'as1',
                title: 'Protein Synthesis Diagram',
                due_date: 'Oct 15, 2025',
                time_left: '5 days left',
                type: 'project',
                status: 'not_started'
            },
            {
                id: 'as2',
                title: 'Gene Expression Problem Set',
                due_date: 'Oct 18, 2025',
                time_left: '8 days left',
                type: 'homework',
                status: 'in_progress'
            },
            {
                id: 'as3',
                title: 'DNA Replication Quiz',
                due_date: 'Oct 22, 2025',
                time_left: '12 days left',
                type: 'quiz',
                status: 'not_started'
            }
        ];
        
        // Update assignments list
        updateUpcomingAssignments(assignments);
    }, 1300);
}

/**
 * Update upcoming assignments in the UI
 */
function updateUpcomingAssignments(assignments) {
    const assignmentsList = document.getElementById('upcoming-assignments-list');
    
    assignmentsList.innerHTML = assignments.map(assignment => `
        <li class="assignment-item assignment-${assignment.status}">
            <div class="assignment-header">
                <span class="assignment-type">${assignment.type}</span>
                <span class="assignment-due">${assignment.time_left}</span>
            </div>
            <div class="assignment-title">${assignment.title}</div>
            <div class="assignment-date">Due: ${assignment.due_date}</div>
        </li>
    `).join('');
}

/**
 * Fetch assignments for the assignments tab
 */
function fetchAssignments(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock assignments data (more detailed than the overview ones)
        const assignments = [
            {
                id: 'as1',
                title: 'Protein Synthesis Diagram',
                description: 'Create a detailed diagram showing the process of protein synthesis, including transcription and translation steps.',
                due_date: 'Oct 15, 2025',
                time_left: '5 days left',
                type: 'project',
                status: 'not_started',
                points: 50,
                allowed_formats: 'PDF, JPG, PNG',
                resources: ['Lecture 4 Slides', 'Chapter 7 in textbook']
            },
            {
                id: 'as2',
                title: 'Gene Expression Problem Set',
                description: 'Complete the problem set on gene expression regulation and feedback mechanisms.',
                due_date: 'Oct 18, 2025',
                time_left: '8 days left',
                type: 'homework',
                status: 'in_progress',
                points: 25,
                allowed_formats: 'PDF',
                resources: ['Problem Set PDF', 'Chapter 8 in textbook']
            },
            {
                id: 'as3',
                title: 'DNA Replication Quiz',
                description: 'Online quiz covering DNA replication, enzymes involved, and proofreading mechanisms.',
                due_date: 'Oct 22, 2025',
                time_left: '12 days left',
                type: 'quiz',
                status: 'not_started',
                points: 30,
                time_limit: '30 minutes',
                resources: ['Lecture 3 Slides', 'Study Guide']
            },
            {
                id: 'as4',
                title: 'Genetic Disorders Research Paper',
                description: 'Write a 5-page research paper on a genetic disorder of your choice, covering causes, symptoms, treatments, and current research.',
                due_date: 'Nov 5, 2025',
                time_left: '26 days left',
                type: 'paper',
                status: 'not_started',
                points: 100,
                allowed_formats: 'DOCX, PDF',
                resources: ['Research Paper Guidelines', 'Example Papers']
            },
            {
                id: 'as5',
                title: 'Cell Division Video Analysis',
                description: 'Watch the provided video on cell division and answer the analysis questions.',
                due_date: 'Oct 25, 2025',
                time_left: '15 days left',
                type: 'analysis',
                status: 'not_started',
                points: 20,
                allowed_formats: 'PDF, DOCX',
                resources: ['Video Link', 'Analysis Questions']
            },
            {
                id: 'as6',
                title: 'Midterm Exam',
                description: 'Comprehensive exam covering all topics from the first half of the semester.',
                due_date: 'Nov 10, 2025',
                time_left: '31 days left',
                type: 'exam',
                status: 'not_started',
                points: 200,
                time_limit: '2 hours',
                resources: ['Study Guide', 'Review Session Schedule']
            }
        ];
        
        // Update assignments grid
        updateAssignmentsGrid(assignments);
        
        // Set up assignment filtering
        setupAssignmentFilters(assignments);
    }, 1000);
}

/**
 * Update assignments grid in the UI
 */
function updateAssignmentsGrid(assignments) {
    const assignmentsGrid = document.getElementById('assignments-grid');
    
    assignmentsGrid.innerHTML = assignments.map(assignment => `
        <div class="assignment-card assignment-${assignment.status}" data-id="${assignment.id}" data-type="${assignment.type}" data-status="${assignment.status}">
            <div class="assignment-card-header">
                <span class="assignment-type">${capitalizeFirstLetter(assignment.type)}</span>
                <span class="assignment-points">${assignment.points} pts</span>
            </div>
            <h3 class="assignment-title">${assignment.title}</h3>
            <p class="assignment-desc">${assignment.description.substring(0, 100)}${assignment.description.length > 100 ? '...' : ''}</p>
            <div class="assignment-meta">
                <div class="due-date">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Due: ${assignment.due_date}</span>
                </div>
                <div class="time-left ${getTimeLeftClass(assignment.time_left)}">
                    <i class="fas fa-clock"></i>
                    <span>${assignment.time_left}</span>
                </div>
            </div>
            <button class="btn-view-details btn-primary-outline" data-id="${assignment.id}">View Details</button>
        </div>
    `).join('');
    
    // Add event listeners to view details buttons
    document.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', function() {
            const assignmentId = this.getAttribute('data-id');
            showAssignmentDetails(assignmentId, assignments);
        });
    });
}

/**
 * Show assignment details in a modal
 */
function showAssignmentDetails(assignmentId, assignments) {
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) return;
    
    // Update modal content
    document.getElementById('assignment-detail-title').textContent = assignment.title;
    
    const detailContent = document.getElementById('assignment-detail-content');
    detailContent.innerHTML = `
        <div class="assignment-detail-meta">
            <div class="detail-item">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${capitalizeFirstLetter(assignment.type)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value status-${assignment.status}">${formatAssignmentStatus(assignment.status)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Due Date:</span>
                <span class="detail-value">${assignment.due_date} (${assignment.time_left})</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Points:</span>
                <span class="detail-value">${assignment.points} points</span>
            </div>
            ${assignment.time_limit ? `
                <div class="detail-item">
                    <span class="detail-label">Time Limit:</span>
                    <span class="detail-value">${assignment.time_limit}</span>
                </div>
            ` : ''}
            ${assignment.allowed_formats ? `
                <div class="detail-item">
                    <span class="detail-label">Allowed Formats:</span>
                    <span class="detail-value">${assignment.allowed_formats}</span>
                </div>
            ` : ''}
        </div>
        
        <div class="assignment-description">
            <h4>Description</h4>
            <p>${assignment.description}</p>
        </div>
        
        ${assignment.resources && assignment.resources.length > 0 ? `
            <div class="assignment-resources">
                <h4>Resources</h4>
                <ul>
                    ${assignment.resources.map(resource => `<li><a href="#">${resource}</a></li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    
    // Update submit button based on status
    const submitBtn = document.getElementById('submit-assignment-btn');
    if (assignment.status === 'completed') {
        submitBtn.textContent = 'View Submission';
    } else if (assignment.status === 'in_progress') {
        submitBtn.textContent = 'Continue Working';
    } else {
        submitBtn.textContent = 'Start Assignment';
    }
    
    // Show modal
    document.getElementById('assignment-detail-modal').classList.add('active');
}

/**
 * Format assignment status for display
 */
function formatAssignmentStatus(status) {
    const statuses = {
        'not_started': 'Not Started',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'late': 'Late',
        'graded': 'Graded'
    };
    
    return statuses[status] || 'Unknown';
}

/**
 * Set up assignment filters
 */
function setupAssignmentFilters(assignments) {
    // Status filter
    const statusFilter = document.getElementById('assignment-status');
    statusFilter.addEventListener('change', filterAssignments);
    
    // Type filter
    const typeFilter = document.getElementById('assignment-type');
    typeFilter.addEventListener('change', filterAssignments);
    
    // Search filter
    const searchInput = document.getElementById('assignment-search');
    const searchBtn = document.getElementById('search-btn');
    
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            filterAssignments();
        }
    });
    
    searchBtn.addEventListener('click', filterAssignments);
    
    // Initial filter (show all)
    filterAssignments();
}

/**
 * Filter assignments based on selected criteria
 */
function filterAssignments() {
    const statusFilter = document.getElementById('assignment-status').value;
    const typeFilter = document.getElementById('assignment-type').value;
    const searchFilter = document.getElementById('assignment-search').value.toLowerCase();
    
    const assignmentCards = document.querySelectorAll('.assignment-card');
    
    assignmentCards.forEach(card => {
        const status = card.getAttribute('data-status');
        const type = card.getAttribute('data-type');
        const title = card.querySelector('.assignment-title').textContent.toLowerCase();
        const desc = card.querySelector('.assignment-desc').textContent.toLowerCase();
        
        // Check if card matches all filters
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        const matchesType = typeFilter === 'all' || type === typeFilter;
        const matchesSearch = searchFilter === '' || 
                             title.includes(searchFilter) || 
                             desc.includes(searchFilter);
        
        // Show or hide based on filter matches
        if (matchesStatus && matchesType && matchesSearch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Get time left class based on time left text
 */
function getTimeLeftClass(timeLeft) {
    if (timeLeft.includes('hours') || timeLeft.includes('hour') || timeLeft.includes('day left')) {
        return 'urgent';
    } else if (timeLeft.includes('days left') && parseInt(timeLeft) <= 3) {
        return 'warning';
    } else {
        return 'normal';
    }
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Fetch resources for the resources tab
 */
function fetchResources(classId) {
    // In a real app, this would use an API call
    // For demo, we'll use mock data
    
    // Simulate API delay
    setTimeout(() => {
        // Mock resources data
        const resources = [
            {
                id: 'r1',
                title: 'Lecture 1: Introduction to Molecular Biology',
                description: 'Overview of course, key concepts, and research methodologies',
                type: 'slides',
                date_added: 'Sep 5, 2025',
                file_type: 'PDF',
                file_size: '2.4 MB',
                thumbnail: 'https://via.placeholder.com/300x200/4361ee/ffffff?text=Lecture+1'
            },
            {
                id: 'r2',
                title: 'DNA Structure and Replication',
                description: 'Video lecture explaining DNA structure and the replication process',
                type: 'videos',
                date_added: 'Sep 8, 2025',
                duration: '28:45',
                thumbnail: 'https://via.placeholder.com/300x200/3a0ca3/ffffff?text=DNA+Video'
            },
            {
                id: 'r3',
                title: 'Lab 1: Microscopy Techniques',
                description: 'Handout for first lab session on microscopy techniques',
                type: 'handouts',
                date_added: 'Sep 10, 2025',
                file_type: 'PDF',
                file_size: '1.8 MB',
                thumbnail: 'https://via.placeholder.com/300x200/f72585/ffffff?text=Lab+1'
            },
            {
                id: 'r4',
                title: 'The Cell Cycle and Division',
                description: 'Interactive simulation of cell division processes',
                type: 'practice',
                date_added: 'Sep 15, 2025',
                duration: 'Interactive',
                thumbnail: 'https://via.placeholder.com/300x200/4cc9f0/000000?text=Cell+Cycle'
            },
            {
                id: 'r5',
                title: 'Current Research in Gene Therapy',
                description: 'Recent journal articles on advances in gene therapy applications',
                type: 'readings',
                date_added: 'Sep 18, 2025',
                file_type: 'PDF',
                file_size: '4.2 MB',
                thumbnail: 'https://via.placeholder.com/300x200/7209b7/ffffff?text=Research'
            },
            {
                id: 'r6',
                title: 'Lecture 2: Protein Synthesis',
                description: 'Detailed lecture on transcription and translation processes',
                type: 'slides',
                date_added: 'Sep 20, 2025',
                file_type: 'PDF',
                file_size: '3.1 MB',
                thumbnail: 'https://via.placeholder.com/300x200/4361ee/ffffff?text=Lecture+2'
            },
            {
                id: 'r7',
                title: 'Genetic Engineering Techniques',
                description: 'Video demonstration of key genetic engineering methods',
                type: 'videos',
                date_added: 'Sep 23, 2025',
                duration: '34:12',
                thumbnail: 'https://via.placeholder.com/300x200/3a0ca3/ffffff?text=Genetic+Eng'
            },
            {
                id: 'r8',
                title: 'Practice Problems: Gene Expression',
                description: 'Practice problems with solutions for gene expression mechanisms',
                type: 'practice',
                date_added: 'Sep 25, 2025',
                file_type: 'PDF',
                file_size: '1.5 MB',
                thumbnail: 'https://via.placeholder.com/300x200/4cc9f0/000000?text=Practice'
            }
        ];
        
        // Update resources grid
        updateResourcesGrid(resources);
        
        // Set up resource filtering
        setupResourceFilters(resources);
    }, 1000);
}

/**
 * Update resources grid in the UI
 */
function updateResourcesGrid(resources) {
    const resourcesGrid = document.getElementById('resources-grid');
    
    resourcesGrid.innerHTML = resources.map(resource => `
        <div class="resource-card" data-id="${resource.id}" data-type="${resource.type}">
            <div class="resource-thumbnail">
                <img src="${resource.thumbnail}" alt="${resource.title}">
                <div class="resource-type">${capitalizeFirstLetter(resource.type)}</div>
            </div>
            <div class="resource-content">
                <h3 class="resource-title">${resource.title}</h3>
                <p class="resource-desc">${resource.description}</p>
                <div class="resource-meta">
                    <span class="resource-date">Added: ${resource.date_added}</span>
                    <span class="resource-info">
                        ${resource.file_type ? `${resource.file_type} · ${resource.file_size}` : ''}
                        ${resource.duration ? `${resource.duration}` : ''}
                    </span>
                </div>
                <button class="btn-view-details btn-primary-outline">View Resource</button>
            </div>
        </div>
    `).join('');
}

/**
 * Set up resource filters
 */
function setupResourceFilters(resources) {
    // Category buttons
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter resources
            const category = this.getAttribute('data-category');
            filterResourcesByCategory(category);
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('resource-search');
    const searchBtn = document.getElementById('resource-search-btn');
    
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            filterResourcesBySearch(this.value.toLowerCase());
        }
    });
    
    searchBtn.addEventListener('click', function() {
        filterResourcesBySearch(searchInput.value.toLowerCase());
    });
}

/**
 * Filter resources by category
 */
function filterResourcesByCategory(category) {
    const resourceCards = document.querySelectorAll('.resource-card');
    
    resourceCards.forEach(card => {
        if (category === 'all' || card.getAttribute('data-type') === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Filter resources by search term
 */
function filterResourcesBySearch(searchTerm) {
    const resourceCards = document.querySelectorAll('.resource-card');
    
    resourceCards.forEach(card => {
        const title = card.querySelector('.resource-title').textContent.toLowerCase();
        const desc = card.querySelector('.resource-desc').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || desc.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Fetch channel messages for discussions tab
 */
function fetchChannelMessages(classId, channelId) {
    // Show loading indicator
    document.getElementById('messages-container').innerHTML = '<div class="loading-message">Loading messages...</div>';
    
    // Set up channel switching
    setupChannelSwitching();
    
    // Set up message sending
    setupMessageSending(classId, channelId);
    
    if (!is_firebase_available()) {
        document.getElementById('messages-container').innerHTML = 
            '<div class="error-message">Unable to load messages. Please check your connection.</div>';
        return;
    }
    
    // Update current channel display
    updateCurrentChannelDisplay(channelId, getChannelNameFromId(channelId));
    
    // Fetch messages
    db.collection('Messages')
        .where('classId', '==', classId)
        .where('channelId', '==', channelId)
        .orderBy('sentAt', 'asc')
        .get()
        .then(querySnapshot => {
            const messages = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                // Format date and time
                let messageTime = 'Unknown time';
                let messageDate = 'Unknown date';
                
                if (data.sentAt) {
                    const sentDate = data.sentAt.toDate ? data.sentAt.toDate() : new Date(data.sentAt);
                    const now = new Date();
                    
                    messageTime = sentDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                    
                    // Format relative date (Today, Yesterday, or actual date)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    const messageDateOnly = new Date(sentDate);
                    messageDateOnly.setHours(0, 0, 0, 0);
                    
                    if (messageDateOnly.getTime() === today.getTime()) {
                        messageDate = 'Today';
                    } else if (messageDateOnly.getTime() === yesterday.getTime()) {
                        messageDate = 'Yesterday';
                    } else {
                        messageDate = sentDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: sentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                        });
                    }
                }
                
                messages.push({
                    id: doc.id,
                    senderId: data.senderId || 'unknown',
                    senderName: data.senderName || 'Unknown User',
                    senderProfilePic: data.senderProfilePic || 'https://via.placeholder.com/64',
                    content: data.content || '',
                    time: data.time || messageTime,
                    date: data.date || messageDate
                });
            });
            
            updateMessagesContainer(messages);
        })
        .catch(error => {
            console.error('Error fetching messages:', error);
            document.getElementById('messages-container').innerHTML = 
                '<div class="error-message">Failed to load messages. Please try again later.</div>';
        });
}

/**
 * Get channel name from ID 
 */
function getChannelNameFromId(channelId) {
    // Try to find the channel name in the DOM
    const channel = document.querySelector(`.channel[data-channel="${channelId}"], .channel[data-channel-id="${channelId}"]`);
    
    if (channel) {
        return channel.querySelector('.channel-name')?.textContent || channelId;
    }
    
    // Default channel names for common channels
    if (channelId === 'general') return 'General';
    if (channelId === 'announcements') return 'Announcements';
    if (channelId === 'help') return 'Help';
    
    return channelId;
}

/**
 * Fetch grades for the grades tab
 */
function fetchGrades(classId) {
    // Simulate API delay
    setTimeout(() => {
        // Mock grades data
        const grades = [
            {
                id: 'g1',
                assignment: 'Lab Report: DNA Extraction',
                type: 'lab',
                dueDate: 'Oct 1, 2025',
                status: 'graded',
                score: '92/100',
                grade: 'A-'
            },
            {
                id: 'g2',
                assignment: 'Quiz: Cell Structure',
                type: 'quiz',
                dueDate: 'Sep 25, 2025',
                status: 'graded',
                score: '18/20',
                grade: 'A'
            },
            {
                id: 'g3',
                assignment: 'Homework: Gene Expression',
                type: 'homework',
                dueDate: 'Sep 20, 2025',
                status: 'graded',
                score: '24/25',
                grade: 'A'
            },
            {
                id: 'g4',
                assignment: 'Midterm Exam',
                type: 'exam',
                dueDate: 'Sep 15, 2025',
                status: 'graded',
                score: '178/200',
                grade: 'B+'
            },
            {
                id: 'g5',
                assignment: 'Protein Synthesis Diagram',
                type: 'project',
                dueDate: 'Oct 15, 2025',
                status: 'not_submitted',
                score: '-',
                grade: '-'
            }
        ];
        
        // Update grades table
        updateGradesTable(grades);
        
        // Update grade summary
        updateGradeSummary(grades);
        
        // Render grade distribution chart
        renderGradeChart(grades);
    }, 1000);
}

/**
 * Update grades table in the UI
 */
function updateGradesTable(grades) {
    const gradesTableBody = document.getElementById('grades-table-body');
    
    gradesTableBody.innerHTML = grades.map(grade => `
        <tr class="grade-row status-${grade.status}">
            <td>${grade.assignment}</td>
            <td>${capitalizeFirstLetter(grade.type)}</td>
            <td>${grade.dueDate}</td>
            <td><span class="status-badge status-${grade.status}">${formatGradeStatus(grade.status)}</span></td>
            <td>${grade.score}</td>
            <td><span class="grade-value ${getGradeClass(grade.grade)}">${grade.grade}</span></td>
        </tr>
    `).join('');
}

/**
 * Update grade summary in the UI
 */
function updateGradeSummary(grades) {
    // Calculate overall grade
    const gradedAssignments = grades.filter(g => g.status === 'graded');
    const totalPoints = gradedAssignments.reduce((sum, g) => {
        const scoreParts = g.score.split('/');
        return sum + parseInt(scoreParts[0]);
    }, 0);
    const maxPoints = gradedAssignments.reduce((sum, g) => {
        const scoreParts = g.score.split('/');
        return sum + parseInt(scoreParts[1]);
    }, 0);
    
    const overallPercentage = Math.round((totalPoints / maxPoints) * 100);
    const overallGrade = getLetterGrade(overallPercentage);
    
    // Update UI
    document.getElementById('overall-grade-value').textContent = overallGrade;
    document.getElementById('completed-assignments').textContent = `${gradedAssignments.length}/${grades.length}`;
    document.getElementById('ontime-rate').textContent = '100%'; // Mock value
    document.getElementById('class-rank').textContent = '5/28'; // Mock value
    
    // Set grade circle color
    const gradeCircle = document.querySelector('.grade-circle');
    gradeCircle.className = 'grade-circle ' + getGradeClass(overallGrade);
}

/**
 * Render grade distribution chart
 */
function renderGradeChart(grades) {
    const ctx = document.createElement('canvas');
    ctx.id = 'grade-chart';
    ctx.width = 400;
    ctx.height = 200;
    
    // Replace skeleton with canvas
    const chartContainer = document.getElementById('grade-chart-container');
    chartContainer.innerHTML = '';
    chartContainer.appendChild(ctx);
    
    // Mock data for grade distribution
    const gradeData = {
        labels: ['A', 'B', 'C', 'D', 'F'],
        datasets: [{
            label: 'Class Grade Distribution',
            data: [8, 12, 5, 2, 1],
            backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(255, 159, 64, 0.7)',
                'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: gradeData,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Students'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Grade'
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw} students`;
                        }
                    }
                }
            }
        }
    });
    
    // Add your current grade indicator
    const chartFooter = document.createElement('div');
    chartFooter.className = 'chart-footer';
    chartFooter.innerHTML = `
        <div class="your-grade-indicator">
            <span class="indicator-dot"></span>
            <span>Your Grade</span>
        </div>
    `;
    chartContainer.appendChild(chartFooter);
}

/**
 * Format grade status for display
 */
function formatGradeStatus(status) {
    const statuses = {
        'graded': 'Graded',
        'submitted': 'Submitted',
        'late': 'Late',
        'not_submitted': 'Not Submitted',
        'missing': 'Missing'
    };
    
    return statuses[status] || 'Unknown';
}

/**
 * Get CSS class for grade
 */
function getGradeClass(grade) {
    if (!grade || grade === '-') return '';
    
    const letterGrade = grade.charAt(0);
    switch (letterGrade) {
        case 'A': return 'grade-a';
        case 'B': return 'grade-b';
        case 'C': return 'grade-c';
        case 'D': return 'grade-d';
        case 'F': return 'grade-f';
        default: return '';
    }
}

/**
 * Get letter grade from percentage
 */
function getLetterGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

/**
 * Fetch classmates for the students tab
 */
function fetchClassmates(classId) {
    // Simulate API delay
    setTimeout(() => {
        // Mock students data
        const students = [
            {
                id: 's1',
                name: 'Emma Thompson',
                email: 'ethompson@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/women/22.jpg',
                grade: '11th Grade',
                lastActive: '2 hours ago'
            },
            {
                id: 's2',
                name: 'James Wilson',
                email: 'jwilson@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
                grade: '11th Grade',
                lastActive: '1 day ago'
            },
            {
                id: 's3',
                name: 'Sophia Lee',
                email: 'slee@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/women/33.jpg',
                grade: '11th Grade',
                lastActive: '3 hours ago'
            },
            {
                id: 's4',
                name: 'Michael Brown',
                email: 'mbrown@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/men/55.jpg',
                grade: '11th Grade',
                lastActive: '5 hours ago'
            },
            {
                id: 's5',
                name: 'Olivia Garcia',
                email: 'ogarcia@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/women/66.jpg',
                grade: '11th Grade',
                lastActive: 'Just now'
            },
            {
                id: 's6',
                name: 'William Chen',
                email: 'wchen@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/men/77.jpg',
                grade: '11th Grade',
                lastActive: '2 days ago'
            },
            {
                id: 's7',
                name: 'Ava Patel',
                email: 'apatel@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/women/45.jpg',
                grade: '11th Grade',
                lastActive: '4 hours ago'
            },
            {
                id: 's8',
                name: 'Noah Johnson',
                email: 'njohnson@student.edu',
                profilePic: 'https://randomuser.me/api/portraits/men/15.jpg',
                grade: '11th Grade',
                lastActive: '1 hour ago'
            }
        ];
        
        // Update students grid
        updateStudentsGrid(students);
        
        // Set up student search functionality
        setupStudentSearch();
    }, 1000);
}

/**
 * Update students grid in the UI
 */
function updateStudentsGrid(students) {
    const studentsGrid = document.getElementById('students-grid');
    
    studentsGrid.innerHTML = students.map(student => `
        <div class="student-card" data-id="${student.id}">
            <div class="student-avatar">
                <img src="${student.profilePic}" alt="${student.name}">
                <span class="activity-indicator" title="Last active: ${student.lastActive}"></span>
            </div>
            <div class="student-info">
                <h3 class="student-name">${student.name}</h3>
                <p class="student-email">${student.email}</p>
                <p class="student-grade">${student.grade}</p>
            </div>
            <div class="student-actions">
                <button class="btn-message" data-id="${student.id}">
                    <i class="fas fa-comment"></i> Message
                </button>
                <button class="btn-view-profile" data-id="${student.id}">
                    <i class="fas fa-user"></i> Profile
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to buttons
    document.querySelectorAll('.btn-message').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const studentId = this.getAttribute('data-id');
            // In a real app, this would open a message dialog
            alert(`Message dialog for student ${studentId} would open here`);
        });
    });
    
    document.querySelectorAll('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const studentId = this.getAttribute('data-id');
            // In a real app, this would navigate to the student's profile
            alert(`Navigate to profile for student ${studentId}`);
        });
    });
}

/**
 * Set up student search functionality
 */
function setupStudentSearch() {
    const searchInput = document.getElementById('student-search');
    const searchBtn = document.getElementById('student-search-btn');
    
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchStudents(this.value.toLowerCase());
        }
    });
    
    searchBtn.addEventListener('click', function() {
        searchStudents(searchInput.value.toLowerCase());
    });
}

/**
 * Search students by name or email
 */
function searchStudents(searchTerm) {
    const studentCards = document.querySelectorAll('.student-card');
    
    studentCards.forEach(card => {
        const name = card.querySelector('.student-name').textContent.toLowerCase();
        const email = card.querySelector('.student-email').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Initialize the mind web visualization
 */
function initMindWeb(classId) {
    // Get container and clear loading indicator
    const container = document.getElementById('mindweb-container');
    container.innerHTML = '';
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'mindweb-canvas';
    container.appendChild(canvas);
    
    // In a real app, this would use a visualization library like D3.js or Vis.js
    // For this demo, we'll create a simple canvas visualization
    
    // Set up canvas
    const ctx = canvas.getContext('2d');
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Mock mind web data
    const nodes = [
        { id: 'n1', label: 'DNA Structure', x: width / 2, y: height / 2, radius: 50, color: '#4361ee' },
        { id: 'n2', label: 'Nucleotides', x: width / 2 - 200, y: height / 2 - 100, radius: 40, color: '#3a0ca3' },
        { id: 'n3', label: 'Double Helix', x: width / 2 + 200, y: height / 2 - 100, radius: 40, color: '#7209b7' },
        { id: 'n4', label: 'Base Pairs', x: width / 2 - 150, y: height / 2 + 150, radius: 40, color: '#f72585' },
        { id: 'n5', label: 'Hydrogen Bonds', x: width / 2 + 150, y: height / 2 + 150, radius: 40, color: '#4cc9f0' },
        { id: 'n6', label: 'Phosphate Backbone', x: width / 2 - 300, y: height / 2, radius: 40, color: '#4361ee' }
    ];
    
    const edges = [
        { from: 'n1', to: 'n2' },
        { from: 'n1', to: 'n3' },
        { from: 'n1', to: 'n4' },
        { from: 'n4', to: 'n5' },
        { from: 'n2', to: 'n6' }
    ];
    
    // Draw mind web
    drawMindWeb(ctx, nodes, edges);
    
    // Set up controls
    setupMindWebControls(ctx, nodes, edges);
}

/**
 * Draw the mind web visualization
 */
function drawMindWeb(ctx, nodes, edges) {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw edges
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    
    edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode) {
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.stroke();
        }
    });
    
    // Draw nodes
    nodes.forEach(node => {
        // Draw circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y);
    });
}

/**
 * Set up mind web controls
 */
function setupMindWebControls(ctx, nodes, edges) {
    // Add node button
    document.getElementById('add-node-btn').addEventListener('click', function() {
        // In a real app, this would open a dialog to create a new node
        alert('Add node dialog would open here');
    });
    
    // Zoom in button
    document.getElementById('zoom-in-btn').addEventListener('click', function() {
        // In a real app, this would zoom in the visualization
        alert('Zoom in functionality would be implemented here');
    });
    
    // Zoom out button
    document.getElementById('zoom-out-btn').addEventListener('click', function() {
        // In a real app, this would zoom out the visualization
        alert('Zoom out functionality would be implemented here');
    });
    
    // Center button
    document.getElementById('center-btn').addEventListener('click', function() {
        // In a real app, this would center the visualization
        alert('Center visualization functionality would be implemented here');
    });
}

/**
 * Set up edit mode toggle
 */
function setupEditMode() {
    // Add edit mode toggle button to the page
    const dashboardGrid = document.querySelector('.dashboard-grid');
    const editButton = document.createElement('button');
    editButton.id = 'toggle-edit-mode';
    editButton.className = 'edit-mode-toggle';
    editButton.innerHTML = '<i class="fas fa-edit"></i> Edit Dashboard';
    dashboardGrid.appendChild(editButton);
    
    // Add styles for the button
    const style = document.createElement('style');
    style.textContent = `
        .edit-mode-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: all 0.3s ease;
        }
        
        .edit-mode-toggle:hover {
            background-color: var(--primary-dark);
            transform: translateY(-2px);
        }
        
        .edit-mode-toggle.active {
            background-color: #e74c3c;
        }
        
        .editable {
            position: relative;
        }
        
        .editable:hover::after {
            content: "Click to edit";
            position: absolute;
            top: -20px;
            left: 0;
            background-color: rgba(0,0,0,0.7);
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .edit-mode .editable:hover {
            outline: 2px dashed var(--primary-color);
            cursor: pointer;
        }
        
        .edit-mode .editable:hover::after {
            opacity: 1;
        }
        
        .edit-form {
            background-color: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 10px 0;
        }
        
        .edit-form input, .edit-form textarea {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid var(--gray-300);
            border-radius: 4px;
        }
        
        .edit-form textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .edit-form .button-group {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .edit-form button {
            padding: 5px 15px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .edit-form .save-btn {
            background-color: var(--primary-color);
            color: white;
            border: none;
        }
        
        .edit-form .cancel-btn {
            background-color: white;
            border: 1px solid var(--gray-400);
        }
    `;
    document.head.appendChild(style);
    
    // Add event listener to toggle edit mode
    editButton.addEventListener('click', function() {
        window.isEditMode = !window.isEditMode;
        this.classList.toggle('active');
        
        if (window.isEditMode) {
            this.innerHTML = '<i class="fas fa-times"></i> Exit Edit Mode';
            document.body.classList.add('edit-mode');
            makeElementsEditable();
        } else {
            this.innerHTML = '<i class="fas fa-edit"></i> Edit Dashboard';
            document.body.classList.remove('edit-mode');
            removeEditableListeners();
        }
    });
}

/**
 * Make elements editable
 */
function makeElementsEditable() {
    // Make class header editable
    const classTitle = document.querySelector('.class-title');
    const classSubtitle = document.querySelector('.class-subtitle');
    
    classTitle.classList.add('editable');
    classSubtitle.classList.add('editable');
    
    classTitle.addEventListener('click', createEditHandler('class-title', 'input', 'Class Name'));
    classSubtitle.addEventListener('click', createEditHandler('class-subtitle', 'textarea', 'Class Description'));
    
    // Make teacher profile editable
    const teacherProfile = document.getElementById('teacher-profile');
    teacherProfile.classList.add('editable');
    teacherProfile.addEventListener('click', editTeacherProfile);
    
    // Make syllabus editable
    const syllabusContent = document.getElementById('syllabus-content');
    syllabusContent.classList.add('editable');
    syllabusContent.addEventListener('click', createEditHandler('syllabus-content', 'textarea', 'Class Syllabus', true));
    
    // Make office hours editable
    const officeHoursList = document.getElementById('office-hours-list');
    officeHoursList.classList.add('editable');
    officeHoursList.addEventListener('click', editOfficeHours);
    
    // Make current unit editable
    const currentUnitContent = document.getElementById('current-unit-content');
    if (currentUnitContent) {
        currentUnitContent.classList.add('editable');
        currentUnitContent.addEventListener('click', editCurrentUnit);
    }
    
    // Add edit buttons to assignment cards
    addEditButtonsToAssignments();
    
    // Add edit buttons to resources
    addEditButtonsToResources();
    
    // Add edit buttons to channels
    addEditButtonsToChannels();
    
    // Add edit buttons to students
    addEditButtonsToStudents();
}

/**
 * Edit current unit
 */
function editCurrentUnit() {
    if (!window.isEditMode) return;
    
    const unitContent = document.getElementById('current-unit-content');
    const originalContent = unitContent.innerHTML;
    
    // Parse the current unit data
    const title = unitContent.querySelector('h4')?.textContent || '';
    const description = unitContent.querySelector('p')?.textContent || '';
    const currentTopic = unitContent.querySelector('.topic-value')?.textContent || '';
    
    // Create edit form
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Unit Title</label>
            <input type="text" id="unit-title-input" value="${title}" placeholder="Unit Title">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="unit-description-input" placeholder="Unit Description">${description}</textarea>
        </div>
        <div class="form-group">
            <label>Current Topic</label>
            <input type="text" id="unit-topic-input" value="${currentTopic}" placeholder="Current Topic">
        </div>
        <div class="form-group">
            <label>Progress (%)</label>
            <input type="number" id="unit-progress-input" value="${document.getElementById('unit-progress-percent')?.textContent.replace('%', '') || 0}" min="0" max="100" step="1">
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    unitContent.innerHTML = '';
    unitContent.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newTitle = form.querySelector('#unit-title-input').value;
        const newDescription = form.querySelector('#unit-description-input').value;
        const newTopic = form.querySelector('#unit-topic-input').value;
        const newProgress = form.querySelector('#unit-progress-input').value;
        
        // Update the UI
        unitContent.innerHTML = `
            <h4>${newTitle}</h4>
            <p>${newDescription}</p>
            <div class="current-topic">
                <span class="topic-label">Current Topic:</span>
                <span class="topic-value">${newTopic}</span>
            </div>
        `;
        
        // Update progress bar
        document.getElementById('unit-progress-percent').textContent = `${newProgress}%`;
        document.querySelector('.progress-bar-fill').style.width = `${newProgress}%`;
        
        // In a real app, you would save this to the server here
        // console.log('Updated unit:', { newTitle, newDescription, newTopic, newProgress });
        
        // Update Firebase database
        const classId = getClassIdFromUrl();
        if (is_firebase_available()) {
            db.collection('Classes').doc(classId).get().then(doc => {
                if (doc.exists) {
                    let classData = doc.data();
                    let units = classData.units || [];
                    // Assuming the first active unit or the first unit is being edited
                    // A more robust solution would involve passing the unit ID
                    let unitIndex = units.findIndex(unit => unit.status === 'active');
                    if (unitIndex === -1 && units.length > 0) {
                        unitIndex = 0; // Fallback to the first unit if no active one
                    }

                    if (unitIndex !== -1) {
                        units[unitIndex].title = newTitle;
                        units[unitIndex].description = newDescription;
                        units[unitIndex].current_topic = newTopic;
                        units[unitIndex].progress = parseInt(newProgress);
                        units[unitIndex].updatedAt = firebase.firestore.FieldValue.serverTimestamp(); // Or a client-side timestamp

                        db.collection('Classes').doc(classId).update({
                            units: units,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                        .then(() => {
                            console.log('Current unit updated successfully in Firebase!');
                        })
                        .catch(error => {
                            console.error('Error updating current unit in Firebase:', error);
                        });
                    } else {
                         console.error('Could not find the unit to update.');
                    }
                } else {
                    console.error('Class document not found for updating unit.');
                }
            }).catch(error => {
                console.error('Error fetching class document for unit update:', error);
            });
        } else {
            console.log('Firebase not available. Skipping database update.');
        }
        
        // Re-add the editable class and event listener
        unitContent.classList.add('editable');
        unitContent.addEventListener('click', editCurrentUnit);
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        unitContent.innerHTML = originalContent;
        
        // Re-add the editable class and event listener
        unitContent.classList.add('editable');
        unitContent.addEventListener('click', editCurrentUnit);
    });
    
    // Prevent edit mode from being triggered again while editing
    unitContent.classList.remove('editable');
}

/**
 * Add edit buttons to assignment cards
 */
function addEditButtonsToAssignments() {
    // Add edit button to assignment cards in the overview
    const assignmentItems = document.querySelectorAll('.assignment-item');
    assignmentItems.forEach(item => {
        // Skip if button already exists
        if (item.querySelector('.edit-assignment-btn')) return;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-assignment-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.display = 'none'; // Hide by default
        
        // Position the button
        editBtn.style.position = 'absolute';
        editBtn.style.top = '5px';
        editBtn.style.right = '5px';
        editBtn.style.padding = '3px 6px';
        editBtn.style.background = 'rgba(0,0,0,0.6)';
        editBtn.style.color = 'white';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '3px';
        editBtn.style.cursor = 'pointer';
        
        // Make sure the parent is positioned relatively
        item.style.position = 'relative';
        
        item.appendChild(editBtn);
        
        // Add click event
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent parent click
            editAssignmentItem(item);
        });
        
        // Show/hide edit button based on edit mode
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('edit-mode')) {
                        editBtn.style.display = 'block';
                    } else {
                        editBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    });
    
    // Add edit button to assignment cards in the assignments tab
    const assignmentCards = document.querySelectorAll('.assignment-card');
    assignmentCards.forEach(card => {
        // Skip if button already exists
        if (card.querySelector('.edit-assignment-btn')) return;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-assignment-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.display = 'none'; // Hide by default
        
        // Position the button
        editBtn.style.position = 'absolute';
        editBtn.style.top = '10px';
        editBtn.style.right = '10px';
        editBtn.style.padding = '5px 8px';
        editBtn.style.background = 'rgba(0,0,0,0.6)';
        editBtn.style.color = 'white';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '3px';
        editBtn.style.cursor = 'pointer';
        
        // Make sure the parent is positioned relatively
        card.style.position = 'relative';
        
        card.appendChild(editBtn);
        
        // Add click event
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent parent click
            editAssignmentCard(card);
        });
        
        // Show/hide edit button based on edit mode
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('edit-mode')) {
                        editBtn.style.display = 'block';
                    } else {
                        editBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    });
}

/**
 * Edit assignment item (in overview tab)
 */
function editAssignmentItem(item) {
    // Get current assignment data
    const title = item.querySelector('.assignment-title').textContent;
    const type = item.querySelector('.assignment-type').textContent;
    const dueDate = item.querySelector('.assignment-date').textContent.replace('Due: ', '');
    const timeLeft = item.querySelector('.assignment-due').textContent;
    const status = item.className.split('assignment-')[1].trim();
    
    // Create edit form
    const originalContent = item.innerHTML;
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="assignment-title-input" value="${title}" placeholder="Assignment Title">
        </div>
        <div class="form-group">
            <label>Type</label>
            <select id="assignment-type-input">
                <option value="homework" ${type.toLowerCase() === 'homework' ? 'selected' : ''}>Homework</option>
                <option value="project" ${type.toLowerCase() === 'project' ? 'selected' : ''}>Project</option>
                <option value="quiz" ${type.toLowerCase() === 'quiz' ? 'selected' : ''}>Quiz</option>
                <option value="exam" ${type.toLowerCase() === 'exam' ? 'selected' : ''}>Exam</option>
                <option value="paper" ${type.toLowerCase() === 'paper' ? 'selected' : ''}>Paper</option>
            </select>
        </div>
        <div class="form-group">
            <label>Due Date</label>
            <input type="text" id="assignment-date-input" value="${dueDate}" placeholder="Due Date">
        </div>
        <div class="form-group">
            <label>Status</label>
            <select id="assignment-status-input">
                <option value="not_started" ${status === 'not_started' ? 'selected' : ''}>Not Started</option>
                <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="late" ${status === 'late' ? 'selected' : ''}>Late</option>
            </select>
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    // Clear the item content and add the form
    item.innerHTML = '';
    item.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newTitle = form.querySelector('#assignment-title-input').value;
        const newType = form.querySelector('#assignment-type-input').value;
        const newDate = form.querySelector('#assignment-date-input').value;
        const newStatus = form.querySelector('#assignment-status-input').value;
        
        // Update class for status
        item.className = `assignment-item assignment-${newStatus}`;
        
        // Update the content
        item.innerHTML = `
            <div class="assignment-header">
                <span class="assignment-type">${newType}</span>
                <span class="assignment-due">${timeLeft}</span>
            </div>
            <div class="assignment-title">${newTitle}</div>
            <div class="assignment-date">Due: ${newDate}</div>
        `;
        
        // Add the edit button back
        addEditButtonsToAssignments();
        
        // In a real app, you would save this to the server here
        // console.log('Updated assignment:', { newTitle, newType, newDate, newStatus });
        const assignmentId = item.dataset.id; // Assuming item has data-id attribute
        if (is_firebase_available() && assignmentId) {
            db.collection('Assignments').doc(assignmentId).update({
                title: newTitle,
                type: newType,
                due_date: newDate, // Ensure this matches Firestore field name, might be dueDate (timestamp)
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log(`Assignment ${assignmentId} updated successfully in Firebase!`);
            })
            .catch(error => {
                console.error(`Error updating assignment ${assignmentId} in Firebase:`, error);
            });
        } else {
            console.log('Firebase not available or assignment ID missing. Skipping database update.');
        }
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        item.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToAssignments();
    });
}

/**
 * Edit assignment card (in assignments tab)
 */
function editAssignmentCard(card) {
    // Get current assignment data
    const title = card.querySelector('.assignment-title').textContent;
    const description = card.querySelector('.assignment-desc').textContent;
    const type = card.querySelector('.assignment-type').textContent;
    const points = card.querySelector('.assignment-points').textContent.replace(' pts', '');
    const dueDate = card.querySelector('.due-date span').textContent.replace('Due: ', '');
    const status = card.getAttribute('data-status');
    
    // Create edit form
    const originalContent = card.innerHTML;
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="assignment-title-input" value="${title}" placeholder="Assignment Title">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="assignment-desc-input" placeholder="Assignment Description">${description}</textarea>
        </div>
        <div class="form-group">
            <label>Type</label>
            <select id="assignment-type-input">
                <option value="homework" ${type.toLowerCase() === 'homework' ? 'selected' : ''}>Homework</option>
                <option value="project" ${type.toLowerCase() === 'project' ? 'selected' : ''}>Project</option>
                <option value="quiz" ${type.toLowerCase() === 'quiz' ? 'selected' : ''}>Quiz</option>
                <option value="exam" ${type.toLowerCase() === 'exam' ? 'selected' : ''}>Exam</option>
                <option value="paper" ${type.toLowerCase() === 'paper' ? 'selected' : ''}>Paper</option>
            </select>
        </div>
        <div class="form-group">
            <label>Points</label>
            <input type="number" id="assignment-points-input" value="${points}" min="0" step="1">
        </div>
        <div class="form-group">
            <label>Due Date</label>
            <input type="text" id="assignment-date-input" value="${dueDate}" placeholder="Due Date">
        </div>
        <div class="form-group">
            <label>Status</label>
            <select id="assignment-status-input">
                <option value="not_started" ${status === 'not_started' ? 'selected' : ''}>Not Started</option>
                <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="late" ${status === 'late' ? 'selected' : ''}>Late</option>
            </select>
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    // Clear the card content and add the form
    card.innerHTML = '';
    card.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newTitle = form.querySelector('#assignment-title-input').value;
        const newDesc = form.querySelector('#assignment-desc-input').value;
        const newType = form.querySelector('#assignment-type-input').value;
        const newPoints = form.querySelector('#assignment-points-input').value;
        const newDate = form.querySelector('#assignment-date-input').value;
        const newStatus = form.querySelector('#assignment-status-input').value;
        
        // Update attributes
        card.setAttribute('data-status', newStatus);
        card.setAttribute('data-type', newType);
        
        // Update class for status
        card.className = `assignment-card assignment-${newStatus}`;
        
        // Update the content
        card.innerHTML = `
            <div class="assignment-card-header">
                <span class="assignment-type">${capitalizeFirstLetter(newType)}</span>
                <span class="assignment-points">${newPoints} pts</span>
            </div>
            <h3 class="assignment-title">${newTitle}</h3>
            <p class="assignment-desc">${newDesc.substring(0, 100)}${newDesc.length > 100 ? '...' : ''}</p>
            <div class="assignment-meta">
                <div class="due-date">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Due: ${newDate}</span>
                </div>
                <div class="time-left">
                    <i class="fas fa-clock"></i>
                    <span>Time left placeholder</span>
                </div>
            </div>
            <button class="btn-view-details btn-primary-outline" data-id="${card.getAttribute('data-id')}">View Details</button>
        `;
        
        // Add the edit button back
        addEditButtonsToAssignments();
        
        // In a real app, you would save this to the server here
        // console.log('Updated assignment card:', { 
        //     newTitle, newDesc, newType, newPoints, newDate, newStatus 
        // });
        const assignmentIdCard = card.getAttribute('data-id');
        if (is_firebase_available() && assignmentIdCard) {
            db.collection('Assignments').doc(assignmentIdCard).update({
                title: newTitle,
                description: newDesc,
                type: newType,
                points: parseInt(newPoints),
                due_date: newDate, // Ensure this matches Firestore field name, might be dueDate (timestamp)
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log(`Assignment card ${assignmentIdCard} updated successfully in Firebase!`);
            })
            .catch(error => {
                console.error(`Error updating assignment card ${assignmentIdCard} in Firebase:`, error);
            });
        } else {
            console.log('Firebase not available or assignment ID missing. Skipping database update.');
        }
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        card.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToAssignments();
    });
}

/**
 * Add edit buttons to resources
 */
function addEditButtonsToResources() {
    const resourceCards = document.querySelectorAll('.resource-card');
    resourceCards.forEach(card => {
        // Skip if button already exists
        if (card.querySelector('.edit-resource-btn')) return;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-resource-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.display = 'none'; // Hide by default
        
        // Position the button
        editBtn.style.position = 'absolute';
        editBtn.style.top = '10px';
        editBtn.style.right = '10px';
        editBtn.style.padding = '5px 8px';
        editBtn.style.background = 'rgba(0,0,0,0.6)';
        editBtn.style.color = 'white';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '3px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.zIndex = '10';
        
        // Make sure the parent is positioned relatively
        card.style.position = 'relative';
        
        card.appendChild(editBtn);
        
        // Add click event
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent parent click
            editResourceCard(card);
        });
        
        // Show/hide edit button based on edit mode
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('edit-mode')) {
                        editBtn.style.display = 'block';
                    } else {
                        editBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    });
}

/**
 * Edit resource card
 */
function editResourceCard(card) {
    // Get current resource data
    const title = card.querySelector('.resource-title').textContent;
    const description = card.querySelector('.resource-desc').textContent;
    const type = card.querySelector('.resource-type').textContent;
    const thumbnail = card.querySelector('.resource-thumbnail img').src;
    const metaInfo = card.querySelector('.resource-info')?.textContent || '';
    const dateAdded = card.querySelector('.resource-date').textContent.replace('Added: ', '');
    
    // Create edit form
    const originalContent = card.innerHTML;
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="resource-title-input" value="${title}" placeholder="Resource Title">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="resource-desc-input" placeholder="Resource Description">${description}</textarea>
        </div>
        <div class="form-group">
            <label>Type</label>
            <select id="resource-type-input">
                <option value="slides" ${type.toLowerCase() === 'slides' ? 'selected' : ''}>Slides</option>
                <option value="videos" ${type.toLowerCase() === 'videos' ? 'selected' : ''}>Videos</option>
                <option value="handouts" ${type.toLowerCase() === 'handouts' ? 'selected' : ''}>Handouts</option>
                <option value="readings" ${type.toLowerCase() === 'readings' ? 'selected' : ''}>Readings</option>
                <option value="practice" ${type.toLowerCase() === 'practice' ? 'selected' : ''}>Practice</option>
            </select>
        </div>
        <div class="form-group">
            <label>Thumbnail URL</label>
            <input type="text" id="resource-thumbnail-input" value="${thumbnail}" placeholder="Thumbnail URL">
        </div>
        <div class="form-group">
            <label>File Info (Type, Size, Duration)</label>
            <input type="text" id="resource-info-input" value="${metaInfo}" placeholder="File Info">
        </div>
        <div class="form-group">
            <label>Date Added</label>
            <input type="text" id="resource-date-input" value="${dateAdded}" placeholder="Date Added">
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    // Clear the card content and add the form
    card.innerHTML = '';
    card.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newTitle = form.querySelector('#resource-title-input').value;
        const newDesc = form.querySelector('#resource-desc-input').value;
        const newType = form.querySelector('#resource-type-input').value;
        const newThumbnail = form.querySelector('#resource-thumbnail-input').value;
        const newInfo = form.querySelector('#resource-info-input').value;
        const newDate = form.querySelector('#resource-date-input').value;
        
        // Update attribute
        card.setAttribute('data-type', newType);
        
        // Update the content
        card.innerHTML = `
            <div class="resource-thumbnail">
                <img src="${newThumbnail}" alt="${newTitle}">
                <div class="resource-type">${capitalizeFirstLetter(newType)}</div>
            </div>
            <div class="resource-content">
                <h3 class="resource-title">${newTitle}</h3>
                <p class="resource-desc">${newDesc}</p>
                <div class="resource-meta">
                    <span class="resource-date">Added: ${newDate}</span>
                    <span class="resource-info">${newInfo}</span>
                </div>
                <button class="btn-view-details btn-primary-outline">View Resource</button>
            </div>
        `;
        
        // Add the edit button back
        addEditButtonsToResources();
        
        // In a real app, you would save this to the server here
        // console.log('Updated resource:', { 
        //     newTitle, newDesc, newType, newThumbnail, newInfo, newDate 
        // });
        const resourceId = card.getAttribute('data-id');
        if (is_firebase_available() && resourceId) {
            // Split newInfo into file_type and file_size or duration
            let file_type = null;
            let file_size = null;
            let duration = null;
            if (newType === 'videos') {
                duration = newInfo;
            } else if (newType !== 'practice') { // practice might not have file_type or file_size
                const infoParts = newInfo.split('·').map(part => part.trim());
                file_type = infoParts[0] || null;
                file_size = infoParts[1] || null;
            }

            db.collection('Resources').doc(resourceId).update({
                title: newTitle,
                description: newDesc,
                type: newType,
                thumbnail: newThumbnail,
                file_type: file_type,
                file_size: file_size,
                duration: duration,
                date_added: newDate, // Ensure this matches Firestore field name
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log(`Resource ${resourceId} updated successfully in Firebase!`);
            })
            .catch(error => {
                console.error(`Error updating resource ${resourceId} in Firebase:`, error);
            });
        } else {
            console.log('Firebase not available or resource ID missing. Skipping database update.');
        }
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        card.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToResources();
    });
}

/**
 * Edit teacher profile
 */
function editTeacherProfile() {
    if (!window.isEditMode) return;
    
    const teacherProfile = document.getElementById('teacher-profile');
    const originalContent = teacherProfile.innerHTML;
    
    // Get current teacher data
    const teacherImg = teacherProfile.querySelector('img').src;
    const teacherName = teacherProfile.querySelector('h4').textContent;
    const teacherEmail = teacherProfile.querySelector('p').textContent;
    
    // Create edit form
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Profile Image URL</label>
            <input type="text" id="teacher-img-input" value="${teacherImg}" placeholder="Image URL">
        </div>
        <div class="form-group">
            <label>Teacher Name</label>
            <input type="text" id="teacher-name-input" value="${teacherName}" placeholder="Teacher Name">
        </div>
        <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="teacher-email-input" value="${teacherEmail}" placeholder="Email Address">
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    teacherProfile.innerHTML = '';
    teacherProfile.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newImg = form.querySelector('#teacher-img-input').value;
        const newName = form.querySelector('#teacher-name-input').value;
        const newEmail = form.querySelector('#teacher-email-input').value;
        
        // Update the UI
        teacherProfile.innerHTML = `
            <img src="${newImg}" alt="${newName}" class="teacher-img">
            <h4>${newName}</h4>
            <p>${newEmail}</p>
        `;
        
        // In a real app, you would save this to the server here
        // console.log('Updated teacher profile:', { newImg, newName, newEmail });
        
        // Update Firebase database
        const classId = getClassIdFromUrl();
        if (is_firebase_available()) {
            db.collection('Classes').doc(classId).update({
                teacherProfilePic: newImg,
                teacherName: newName,
                teacherEmail: newEmail,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log('Teacher profile updated successfully in Firebase!');
            })
            .catch(error => {
                console.error('Error updating teacher profile in Firebase:', error);
            });
        } else {
            console.log('Firebase not available. Skipping database update.');
        }
        
        // Re-add the editable class and event listener
        teacherProfile.classList.add('editable');
        teacherProfile.addEventListener('click', editTeacherProfile);
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        teacherProfile.innerHTML = originalContent;
        
        // Re-add the editable class and event listener
        teacherProfile.classList.add('editable');
        teacherProfile.addEventListener('click', editTeacherProfile);
    });
    
    // Prevent edit mode from being triggered again while editing
    teacherProfile.classList.remove('editable');
}

/**
 * Edit office hours
 */
function editOfficeHours() {
    if (!window.isEditMode) return;
    
    const officeHoursList = document.getElementById('office-hours-list');
    const originalContent = officeHoursList.innerHTML;
    
    // Get current office hours
    const officeHours = [];
    officeHoursList.querySelectorAll('li').forEach(li => {
        officeHours.push(li.textContent);
    });
    
    // Create edit form
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    // Create initial fields
    let officeHoursFields = '';
    officeHours.forEach((hour, index) => {
        officeHoursFields += `
            <div class="office-hour-row" data-index="${index}">
                <input type="text" class="office-hour-input" value="${hour}" placeholder="Day and Time">
                <button type="button" class="remove-hour-btn"><i class="fas fa-times"></i></button>
            </div>
        `;
    });
    
    form.innerHTML = `
        <div class="office-hours-container">
            ${officeHoursFields}
        </div>
        <button type="button" class="add-hour-btn"><i class="fas fa-plus"></i> Add Office Hour</button>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    officeHoursList.innerHTML = '';
    officeHoursList.appendChild(form);
    
    // Add event listener for adding new office hour
    form.querySelector('.add-hour-btn').addEventListener('click', function() {
        const container = form.querySelector('.office-hours-container');
        const newIndex = container.querySelectorAll('.office-hour-row').length;
        
        const newRow = document.createElement('div');
        newRow.className = 'office-hour-row';
        newRow.dataset.index = newIndex;
        
        newRow.innerHTML = `
            <input type="text" class="office-hour-input" placeholder="Day and Time">
            <button type="button" class="remove-hour-btn"><i class="fas fa-times"></i></button>
        `;
        
        container.appendChild(newRow);
        
        // Add event listener for the remove button
        newRow.querySelector('.remove-hour-btn').addEventListener('click', function() {
            newRow.remove();
        });
    });
    
    // Add event listeners for existing remove buttons
    form.querySelectorAll('.remove-hour-btn').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.office-hour-row').remove();
        });
    });
    
    // Add event listeners for save/cancel
    form.querySelector('.save-btn').addEventListener('click', function() {
        const updatedHours = [];
        form.querySelectorAll('.office-hour-input').forEach(input => {
            if (input.value.trim()) {
                updatedHours.push(input.value.trim());
            }
        });
        
        // Update the UI
        officeHoursList.innerHTML = updatedHours.map(hour => `<li>${hour}</li>`).join('');
        
        // In a real app, you would save this to the server here
        // console.log('Updated office hours:', updatedHours);
        
        // Update Firebase database
        const classId = getClassIdFromUrl();
        if (is_firebase_available()) {
            db.collection('Classes').doc(classId).update({
                teacherOfficeHours: updatedHours,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log('Office hours updated successfully in Firebase!');
            })
            .catch(error => {
                console.error('Error updating office hours in Firebase:', error);
            });
        } else {
            console.log('Firebase not available. Skipping database update.');
        }
        
        // Re-add the editable class and event listener
        officeHoursList.classList.add('editable');
        officeHoursList.addEventListener('click', editOfficeHours);
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        officeHoursList.innerHTML = originalContent;
        
        // Re-add the editable class and event listener
        officeHoursList.classList.add('editable');
        officeHoursList.addEventListener('click', editOfficeHours);
    });
    
    // Prevent edit mode from being triggered again while editing
    officeHoursList.classList.remove('editable');
}

/**
 * Remove editable listeners
 */
function removeEditableListeners() {
    // Remove editable classes and click listeners
    document.querySelectorAll('.editable').forEach(element => {
        element.classList.remove('editable');
        
        // Clone the element to remove all event listeners
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
    });
}

/**
 * Create an edit handler for a simple text element
 */
function createEditHandler(elementId, inputType, placeholder, isRichText = false) {
    return function() {
        if (!window.isEditMode) return;
        
        const element = document.getElementById(elementId) || this;
        const originalContent = element.innerHTML;
        let originalText = element.textContent.trim();
        
        // Create edit form
        const form = document.createElement('form');
        form.className = 'edit-form';
        
        let inputField;
        if (inputType === 'textarea') {
            inputField = document.createElement('textarea');
            inputField.value = originalText;
        } else {
            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.value = originalText;
        }
        
        inputField.placeholder = placeholder;
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'save-btn';
        saveButton.textContent = 'Save';
        
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'cancel-btn';
        cancelButton.textContent = 'Cancel';
        
        buttonGroup.appendChild(cancelButton);
        buttonGroup.appendChild(saveButton);
        
        form.appendChild(inputField);
        form.appendChild(buttonGroup);
        
        element.innerHTML = '';
        element.appendChild(form);
        
        // Focus the input field
        inputField.focus();
        
        // Add event listeners
        saveButton.addEventListener('click', function() {
            const newValue = inputField.value.trim();
            if (isRichText) {
                element.innerHTML = `<p>${newValue}</p>`;
            } else {
                element.textContent = newValue;
            }
            
            // In a real app, you would save this to the server here
            // console.log(`Updated ${elementId} to: ${newValue}`);
            
            // Update Firebase database
            const classId = getClassIdFromUrl();
            const fieldToUpdate = {};
            if (elementId === 'class-title') {
                fieldToUpdate['name'] = newValue;
            } else if (elementId === 'class-subtitle') {
                fieldToUpdate['description'] = newValue;
            } else if (elementId === 'syllabus-content') {
                fieldToUpdate['syllabus'] = newValue;
            }
            fieldToUpdate['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
            
            if (is_firebase_available() && Object.keys(fieldToUpdate).length > 1) {
                db.collection('Classes').doc(classId).update(fieldToUpdate)
                .then(() => {
                    console.log(`${elementId} updated successfully in Firebase!`);
                })
                .catch(error => {
                    console.error(`Error updating ${elementId} in Firebase:`, error);
                });
            } else {
                console.log('Firebase not available or no field to update. Skipping database update.');
            }
            
            // Re-add the editable class and event listener
            element.classList.add('editable');
            if (isRichText) {
                element.addEventListener('click', createEditHandler(elementId, inputType, placeholder, true));
            } else {
                element.addEventListener('click', createEditHandler(elementId, inputType, placeholder));
            }
        });
        
        cancelButton.addEventListener('click', function() {
            element.innerHTML = originalContent;
            
            // Re-add the editable class and event listener
            element.classList.add('editable');
            if (isRichText) {
                element.addEventListener('click', createEditHandler(elementId, inputType, placeholder, true));
            } else {
                element.addEventListener('click', createEditHandler(elementId, inputType, placeholder));
            }
        });
        
        // Prevent edit mode from being triggered again while editing
        element.classList.remove('editable');
    };
}

/**
 * Add edit buttons to discussion channels
 */
function addEditButtonsToChannels() {
    // Add edit button to each channel
    const channels = document.querySelectorAll('.channel');
    channels.forEach(channel => {
        // Skip if button already exists
        if (channel.querySelector('.edit-channel-btn')) return;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-channel-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.display = 'none'; // Hide by default
        
        // Position the button
        editBtn.style.position = 'absolute';
        editBtn.style.right = '5px';
        editBtn.style.top = '50%';
        editBtn.style.transform = 'translateY(-50%)';
        editBtn.style.padding = '3px 6px';
        editBtn.style.background = 'rgba(0,0,0,0.6)';
        editBtn.style.color = 'white';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '3px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.zIndex = '10';
        
        // Make sure the parent is positioned relatively
        channel.style.position = 'relative';
        
        channel.appendChild(editBtn);
        
        // Add click event
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent parent click
            editChannel(channel);
        });
        
        // Show/hide edit button based on edit mode
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('edit-mode')) {
                        editBtn.style.display = 'block';
                    } else {
                        editBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    });
    
    // Add an edit button to the current channel header
    const currentChannelHeader = document.querySelector('.channel-header');
    if (currentChannelHeader && !currentChannelHeader.querySelector('.edit-channel-header-btn')) {
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-channel-header-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Channel';
        editBtn.style.display = 'none'; // Hide by default
        
        // Style the button
        editBtn.style.marginLeft = '10px';
        editBtn.style.padding = '3px 8px';
        editBtn.style.background = 'rgba(0,0,0,0.1)';
        editBtn.style.border = '1px solid rgba(0,0,0,0.2)';
        editBtn.style.borderRadius = '3px';
        editBtn.style.cursor = 'pointer';
        
        currentChannelHeader.appendChild(editBtn);
        
        // Add click event
        editBtn.addEventListener('click', function() {
            editCurrentChannel();
        });
        
        // Show/hide edit button based on edit mode
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('edit-mode')) {
                        editBtn.style.display = 'inline-block';
                    } else {
                        editBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    }
}

/**
 * Edit a channel
 */
function editChannel(channel) {
    // Get current channel data
    const channelName = channel.querySelector('.channel-name').textContent;
    const channelIcon = channel.querySelector('.channel-icon').textContent;
    const isPrivate = channelIcon === '🔒';
    const channelId = channel.getAttribute('data-channel');
    
    // Create edit form
    const originalContent = channel.innerHTML;
    const form = document.createElement('form');
    form.className = 'edit-form';
    form.style.padding = '8px';
    form.style.margin = '0';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Channel Name</label>
            <input type="text" id="channel-name-input" value="${channelName}" placeholder="Channel Name">
        </div>
        <div class="form-group">
            <label>Private Channel</label>
            <input type="checkbox" id="channel-private-input" ${isPrivate ? 'checked' : ''}>
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    // Clear the channel content and add the form
    channel.innerHTML = '';
    channel.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newName = form.querySelector('#channel-name-input').value;
        const newIsPrivate = form.querySelector('#channel-private-input').checked;
        
        // Update the content
        channel.innerHTML = `
            <span class="channel-icon">${newIsPrivate ? '🔒' : '#'}</span>
            <span class="channel-name">${newName}</span>
        `;
        
        // Add the edit button back
        addEditButtonsToChannels();
        
        // In a real app, you would save this to the server here
        // console.log('Updated channel:', { 
        //     id: channelId, 
        //     name: newName, 
        //     isPrivate: newIsPrivate 
        // });
        const classId = getClassIdFromUrl();
        if (is_firebase_available()) {
            db.collection('Classes').doc(classId).get().then(doc => {
                if (doc.exists) {
                    let classData = doc.data();
                    let channels = classData.channels || [];
                    const channelIndex = channels.findIndex(ch => ch.id === channelId || ch.name === channelId); // Use ID preferably

                    if (channelIndex !== -1) {
                        channels[channelIndex].name = newName;
                        channels[channelIndex].isPrivate = newIsPrivate;
                        // channels[channelIndex].updatedAt = firebase.firestore.FieldValue.serverTimestamp(); // If channels have timestamps

                        db.collection('Classes').doc(classId).update({
                            channels: channels,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                        .then(() => {
                            console.log(`Channel ${channelId} updated successfully in Firebase!`);
                        })
                        .catch(error => {
                            console.error(`Error updating channel ${channelId} in Firebase:`, error);
                        });
                    } else {
                         console.error('Could not find the channel to update in class data.');
                    }
                } else {
                    console.error('Class document not found for updating channel.');
                }
            }).catch(error => {
                console.error('Error fetching class document for channel update:', error);
            });
        } else {
            console.log('Firebase not available. Skipping database update.');
        }
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        channel.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToChannels();
    });
}

/**
 * Edit current channel
 */
function editCurrentChannel() {
    const channelHeader = document.querySelector('.channel-header');
    const channelName = document.getElementById('current-channel').textContent;
    
    // Create edit form
    const originalContent = channelHeader.innerHTML;
    const form = document.createElement('form');
    form.className = 'edit-form';
    form.style.padding = '10px';
    form.style.margin = '0';
    form.style.display = 'flex';
    form.style.alignItems = 'center';
    
    form.innerHTML = `
        <div style="flex-grow: 1;">
            <div class="form-group" style="margin-bottom: 5px;">
                <label>Channel Name</label>
                <input type="text" id="channel-name-input" value="${channelName}" placeholder="Channel Name">
            </div>
            <div class="form-group">
                <label>Channel Description</label>
                <input type="text" id="channel-desc-input" placeholder="Channel Description">
            </div>
        </div>
        <div class="button-group" style="margin-left: 10px;">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    // Clear the header content and add the form
    channelHeader.innerHTML = '';
    channelHeader.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newName = form.querySelector('#channel-name-input').value;
        const newDesc = form.querySelector('#channel-desc-input').value;
        
        // Update the header
        channelHeader.innerHTML = originalContent;
        document.getElementById('current-channel').textContent = newName;
        
        // In a real app, you would save this to the server here
        // console.log('Updated channel details:', { 
        //     name: newName, 
        //     description: newDesc 
        // });
        const classIdForHeader = getClassIdFromUrl();
        // Assuming channelName (newName) is unique and can be used to find the channel
        // A more robust solution uses channel ID, which needs to be available here
        const currentChannelId = document.getElementById('current-channel').getAttribute('data-channel-id'); // Предполагается, что ID канала доступен

        if (is_firebase_available()) {
            db.collection('Classes').doc(classIdForHeader).get().then(doc => {
                if (doc.exists) {
                    let classData = doc.data();
                    let channels = classData.channels || [];
                    const channelIndex = channels.findIndex(ch => ch.id === currentChannelId || ch.name === newName ); 

                    if (channelIndex !== -1) {
                        channels[channelIndex].name = newName; // Update name
                        channels[channelIndex].description = newDesc; // Update description
                        // channels[channelIndex].updatedAt = firebase.firestore.FieldValue.serverTimestamp();

                        db.collection('Classes').doc(classIdForHeader).update({
                            channels: channels,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                        .then(() => {
                            console.log(`Channel header for ${newName} updated successfully in Firebase!`);
                        })
                        .catch(error => {
                            console.error(`Error updating channel header for ${newName} in Firebase:`, error);
                        });
                    } else {
                         console.error('Could not find the channel to update its header in class data.');
                    }
                } else {
                    console.error('Class document not found for updating channel header.');
                }
            }).catch(error => {
                console.error('Error fetching class document for channel header update:', error);
            });
        } else {
            console.log('Firebase not available. Skipping database update.');
        }
        
        // Add the edit button back
        addEditButtonsToChannels();
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        channelHeader.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToChannels();
    });
}

/**
 * Add edit buttons to students
 */
function addEditButtonsToStudents() {
    const studentCards = document.querySelectorAll('.student-card');
    studentCards.forEach(card => {
        // Skip if button already exists
        if (card.querySelector('.edit-student-btn')) return;
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-student-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.style.display = 'none'; // Hide by default
        
        // Position the button
        editBtn.style.position = 'absolute';
        editBtn.style.top = '10px';
        editBtn.style.right = '10px';
        editBtn.style.padding = '5px 8px';
        editBtn.style.background = 'rgba(0,0,0,0.6)';
        editBtn.style.color = 'white';
        editBtn.style.border = 'none';
        editBtn.style.borderRadius = '3px';
        editBtn.style.cursor = 'pointer';
        editBtn.style.zIndex = '10';
        
        // Make sure the parent is positioned relatively
        card.style.position = 'relative';
        
        card.appendChild(editBtn);
        
        // Add click event
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent parent click
            editStudentCard(card);
        });
        
        // Show/hide edit button based on edit mode
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (document.body.classList.contains('edit-mode')) {
                        editBtn.style.display = 'block';
                    } else {
                        editBtn.style.display = 'none';
                    }
                }
            });
        });
        
        observer.observe(document.body, { attributes: true });
    });
}

/**
 * Edit student card
 */
function editStudentCard(card) {
    // Get current student data
    const studentName = card.querySelector('.student-name').textContent;
    const studentEmail = card.querySelector('.student-email').textContent;
    const studentGrade = card.querySelector('.student-grade').textContent;
    const studentImg = card.querySelector('.student-avatar img').src;
    
    // Create edit form
    const originalContent = card.innerHTML;
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-group">
            <label>Student Name</label>
            <input type="text" id="student-name-input" value="${studentName}" placeholder="Student Name">
        </div>
        <div class="form-group">
            <label>Email</label>
            <input type="email" id="student-email-input" value="${studentEmail}" placeholder="Email Address">
        </div>
        <div class="form-group">
            <label>Grade Level</label>
            <input type="text" id="student-grade-input" value="${studentGrade}" placeholder="Grade Level">
        </div>
        <div class="form-group">
            <label>Profile Image URL</label>
            <input type="text" id="student-img-input" value="${studentImg}" placeholder="Image URL">
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    // Clear the card content and add the form
    card.innerHTML = '';
    card.appendChild(form);
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newName = form.querySelector('#student-name-input').value;
        const newEmail = form.querySelector('#student-email-input').value;
        const newGrade = form.querySelector('#student-grade-input').value;
        const newImg = form.querySelector('#student-img-input').value;
        
        // Update the content
        card.innerHTML = `
            <div class="student-avatar">
                <img src="${newImg}" alt="${newName}">
                <span class="activity-indicator" title="Last active: Just now"></span>
            </div>
            <div class="student-info">
                <h3 class="student-name">${newName}</h3>
                <p class="student-email">${newEmail}</p>
                <p class="student-grade">${newGrade}</p>
            </div>
            <div class="student-actions">
                <button class="btn-message" data-id="${card.getAttribute('data-id')}">
                    <i class="fas fa-comment"></i> Message
                </button>
                <button class="btn-view-profile" data-id="${card.getAttribute('data-id')}">
                    <i class="fas fa-user"></i> Profile
                </button>
            </div>
        `;
        
        // Add the edit button back
        addEditButtonsToStudents();
        
        // Add event listeners to action buttons
        card.querySelector('.btn-message').addEventListener('click', function(e) {
            e.stopPropagation();
            const studentId = this.getAttribute('data-id');
            alert(`Message dialog for student ${studentId} would open here`);
        });
        
        card.querySelector('.btn-view-profile').addEventListener('click', function(e) {
            e.stopPropagation();
            const studentId = this.getAttribute('data-id');
            alert(`Navigate to profile for student ${studentId}`);
        });
        
        // In a real app, you would save this to the server here
        // console.log('Updated student:', { 
        //     newName, newEmail, newGrade, newImg 
        // });
        const studentId = card.getAttribute('data-id'); // This should be the actual Member document ID
        if (is_firebase_available() && studentId) {
            // Option 1: Update a denormalized student record within the Class.members array
            // This would require fetching the Class, finding the student in the members array by userId/studentId,
            // updating their details, and then saving the whole Class document back.
            // This is complex if studentId on the card is not the direct ID for the Members collection.
            console.log('Placeholder: Logic to update student in Class.members array would go here if applicable.');

            // Option 2: Update the main Members collection document for this student
            // This is more common if the student card has the student's main document ID.
            db.collection('Members').doc(studentId).update({
                first_name: newName.split(' ')[0], // Assuming newName is "First Last"
                last_name: newName.split(' ').slice(1).join(' '), // Assuming newName is "First Last"
                email: newEmail,
                grade: newGrade, // Ensure this field exists and matches in Members schema
                profilePicUrl: newImg,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                console.log(`Student ${studentId} updated successfully in Members collection!`);
            })
            .catch(error => {
                console.error(`Error updating student ${studentId} in Members collection:`, error);
                // Potentially try to update denormalized data in Class.members as a fallback if intended
            });
        } else {
            console.log('Firebase not available or student ID missing. Skipping database update.');
        }
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        card.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToStudents();
    });
} 

/**
 * Fetch upcoming events from Firebase
 */
function fetchUpcomingEventsFromFirebase(classId) {
    if (!is_firebase_available()) return;

    db.collection('Events')
        .where('classId', '==', classId)
        .orderBy('startDate', 'asc')
        .limit(3) // Only get the next 3 events
        .get()
        .then(querySnapshot => {
            const events = [];
            querySnapshot.forEach(doc => {
                const eventData = doc.data();
                eventData.id = doc.id;
                
                // Format date for display
                let eventDate = 'Unknown';
                if (eventData.startDate) {
                    const startDate = eventData.startDate.toDate ? 
                                     eventData.startDate.toDate() : 
                                     new Date(eventData.startDate);
                    
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    
                    if (startDate.toDateString() === today.toDateString()) {
                        eventDate = 'Today';
                    } else if (startDate.toDateString() === tomorrow.toDateString()) {
                        eventDate = 'Tomorrow';
                    } else {
                        // Format as day of week for this week, or date for later
                        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const dayDiff = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));
                        
                        if (dayDiff < 7) {
                            eventDate = daysOfWeek[startDate.getDay()];
                        } else {
                            eventDate = startDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
                        }
                    }
                }
                
                // Create standardized event object
                events.push({
                    id: doc.id,
                    title: eventData.title || 'Untitled Event',
                    date: eventDate,
                    time: eventData.time || formatTimeRange(eventData.startDate, eventData.endDate),
                    location: eventData.location || 'TBD',
                    type: eventData.type || 'event'
                });
            });
            
            updateUpcomingEvents(events);
        })
        .catch(error => {
            console.error('Error fetching events:', error);
            // Show empty state instead of using mock data
            updateUpcomingEvents([]);
        });
}

/**
 * Format time range from timestamps
 */
function formatTimeRange(startTime, endTime) {
    if (!startTime) return 'TBD';
    
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    
    let timeStr = start.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    
    if (endTime) {
        const end = endTime.toDate ? endTime.toDate() : new Date(endTime);
        timeStr += ' - ' + end.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
    }
    
    return timeStr;
}

/**
 * Fetch upcoming assignments from Firebase
 */
function fetchUpcomingAssignmentsFromFirebase(classId) {
    if (!is_firebase_available()) return;
    
    const today = new Date();
    
    db.collection('Assignments')
        .where('classId', '==', classId)
        .where('dueDate', '>=', today)
        .orderBy('dueDate', 'asc')
        .limit(3) // Only get the next 3 assignments
        .get()
        .then(querySnapshot => {
            const assignments = [];
            querySnapshot.forEach(doc => {
                const assignmentData = doc.data();
                assignmentData.id = doc.id;
                
                // Format time left
                let timeLeft = 'Unknown';
                if (assignmentData.dueDate) {
                    const dueDate = assignmentData.dueDate.toDate ? 
                                  assignmentData.dueDate.toDate() : 
                                  new Date(assignmentData.dueDate);
                    
                    const diffTime = Math.abs(dueDate - today);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 0) {
                        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                        timeLeft = diffHours <= 1 ? 'Due soon' : `${diffHours} hours left`;
                    } else if (diffDays === 1) {
                        timeLeft = '1 day left';
                    } else {
                        timeLeft = `${diffDays} days left`;
                    }
                }
                
                // Format due date
                let formattedDueDate = 'Unknown';
                if (assignmentData.dueDate) {
                    const dueDate = assignmentData.dueDate.toDate ? 
                                  assignmentData.dueDate.toDate() : 
                                  new Date(assignmentData.dueDate);
                                  
                    formattedDueDate = dueDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
                
                // Create standardized assignment object
                assignments.push({
                    id: doc.id,
                    title: assignmentData.title || 'Untitled Assignment',
                    due_date: formattedDueDate,
                    time_left: timeLeft,
                    type: assignmentData.type || 'homework',
                    status: assignmentData.status || 'not_started'
                });
            });
            
            updateUpcomingAssignments(assignments);
        })
        .catch(error => {
            console.error('Error fetching assignments:', error);
            // Show empty state instead of using mock data
            updateUpcomingAssignments([]);
        });
}

/**
 * Update upcoming events in the UI
 */
function updateUpcomingEvents(events) {
    const eventsList = document.getElementById('upcoming-events-list');
    
    if (events.length > 0) {
        eventsList.innerHTML = events.map(event => `
            <div class="event-item event-${event.type}">
                <div class="event-header">
                    <span class="event-type">${formatEventType(event.type)}</span>
                    <span class="event-date">${event.date}</span>
                </div>
                <div class="event-title">${event.title}</div>
                <div class="event-details">
                    <span><i class="fas fa-clock"></i> ${event.time}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                </div>
            </div>
        `).join('');
    } else {
        eventsList.innerHTML = '<div class="no-events">No upcoming events</div>';
    }
}

/**
 * Fetch recent activity from Firebase
 */
function fetchRecentActivityFromFirebase(classId) {
    if (!is_firebase_available()) return;
    
    // Get recent assignments
    const recentActivities = [];
    const today = new Date();
    
    // Promise-based approach to combine multiple queries
    Promise.all([
        // Get recently graded assignments
        db.collection('Grades')
            .where('classId', '==', classId)
            .orderBy('gradedAt', 'desc')
            .limit(2)
            .get(),
            
        // Get recent resources
        db.collection('Resources')
            .where('classId', '==', classId)
            .orderBy('createdAt', 'desc')
            .limit(2)
            .get(),
            
        // Get recent messages
        db.collection('Messages')
            .where('classId', '==', classId)
            .orderBy('sentAt', 'desc')
            .limit(2)
            .get()
    ])
    .then(([gradesSnapshot, resourcesSnapshot, messagesSnapshot]) => {
        // Process grades
        gradesSnapshot.forEach(doc => {
            const data = doc.data();
            const gradedTime = data.gradedAt ? 
                              data.gradedAt.toDate ? data.gradedAt.toDate() : new Date(data.gradedAt) : 
                              new Date();
            
            recentActivities.push({
                id: doc.id,
                text: `${data.assignmentTitle || 'Assignment'} graded (${data.percentage || data.score || '?'}%)`,
                time: formatRelativeTime(gradedTime, today),
                icon: 'fas fa-flask',
                type: 'grade'
            });
        });
        
        // Process resources
        resourcesSnapshot.forEach(doc => {
            const data = doc.data();
            const createdTime = data.createdAt ? 
                               data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt) : 
                               new Date();
            
            recentActivities.push({
                id: doc.id,
                text: `New resource added: ${data.title || 'Untitled Resource'}`,
                time: formatRelativeTime(createdTime, today),
                icon: getResourceIcon(data.type),
                type: 'resource'
            });
        });
        
        // Process messages
        messagesSnapshot.forEach(doc => {
            const data = doc.data();
            const sentTime = data.sentAt ? 
                            data.sentAt.toDate ? data.sentAt.toDate() : new Date(data.sentAt) : 
                            new Date();
            
            recentActivities.push({
                id: doc.id,
                text: `${data.senderName || 'Someone'} posted in ${getChannelName(data.channelId) || 'discussions'}`,
                time: formatRelativeTime(sentTime, today),
                icon: 'fas fa-comment-dots',
                type: 'discussion'
            });
        });
        
        // Sort by time (most recent first) and limit to 4
        recentActivities.sort((a, b) => {
            const timeA = parseRelativeTime(a.time);
            const timeB = parseRelativeTime(b.time);
            return timeA - timeB;
        });
        
        const limitedActivities = recentActivities.slice(0, 4);
        updateRecentActivity(limitedActivities);
    })
    .catch(error => {
        console.error('Error fetching recent activities:', error);
        updateRecentActivity([]);
    });
}

/**
 * Get icon for resource type
 */
function getResourceIcon(type) {
    const icons = {
        'slides': 'fas fa-file-powerpoint',
        'videos': 'fas fa-video',
        'handouts': 'fas fa-file-alt',
        'readings': 'fas fa-book',
        'practice': 'fas fa-tasks'
    };
    
    return icons[type] || 'fas fa-file';
}

/**
 * Get channel name from ID (placeholder - would need to fetch from channels array)
 */
function getChannelName(channelId) {
    // In a real implementation, you would look up the channel name from the channels array
    // This is just a placeholder
    return 'discussion channel';
}

/**
 * Parse relative time string into milliseconds for sorting
 */
function parseRelativeTime(timeString) {
    if (timeString.includes('just now') || timeString.includes('Just now')) {
        return 0;
    } else if (timeString.includes('minute')) {
        const minutes = parseInt(timeString);
        return minutes * 60 * 1000;
    } else if (timeString.includes('hour')) {
        const hours = parseInt(timeString);
        return hours * 60 * 60 * 1000;
    } else if (timeString.includes('day')) {
        const days = parseInt(timeString);
        return days * 24 * 60 * 60 * 1000;
    } else if (timeString.includes('week')) {
        const weeks = parseInt(timeString);
        return weeks * 7 * 24 * 60 * 60 * 1000;
    } else {
        return Number.MAX_SAFE_INTEGER; // For strings like "Long ago"
    }
}

/**
 * Format timestamp as relative time string
 */
function formatRelativeTime(date, now) {
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'Just now';
    } else if (diffMin < 60) {
        return diffMin + (diffMin === 1 ? ' minute ago' : ' minutes ago');
    } else if (diffHour < 24) {
        return diffHour + (diffHour === 1 ? ' hour ago' : ' hours ago');
    } else if (diffDay < 7) {
        return diffDay + (diffDay === 1 ? ' day ago' : ' days ago');
    } else {
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    }
}

/**
 * Fetch class stats from Firebase
 */
function fetchClassStatsFromFirebase(classId) {
    if (!is_firebase_available()) return;
    
    // Use Promise.all to run multiple queries in parallel
    Promise.all([
        // Count assignments
        db.collection('Assignments')
            .where('classId', '==', classId)
            .get(),
            
        // Count resources
        db.collection('Resources')
            .where('classId', '==', classId)
            .get(),
            
        // Count messages
        db.collection('Messages')
            .where('classId', '==', classId)
            .get(),
            
        // Get grades
        db.collection('Grades')
            .where('classId', '==', classId)
            .get()
    ])
    .then(([assignmentsSnapshot, resourcesSnapshot, messagesSnapshot, gradesSnapshot]) => {
        const stats = {
            assignments: assignmentsSnapshot.size,
            resources: resourcesSnapshot.size,
            discussions: messagesSnapshot.size,
            average_grade: calculateAverageGrade(gradesSnapshot)
        };
        
        updateClassStats(stats);
    })
    .catch(error => {
        console.error('Error fetching class stats:', error);
        // Show placeholder stats
        updateClassStats({
            assignments: 0,
            resources: 0,
            discussions: 0,
            average_grade: 'N/A'
        });
    });
}

/**
 * Calculate average grade from grades snapshot
 */
function calculateAverageGrade(gradesSnapshot) {
    if (gradesSnapshot.empty) return 'N/A';
    
    let totalPercentage = 0;
    let count = 0;
    
    gradesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.percentage) {
            totalPercentage += data.percentage;
            count++;
        } else if (data.score && data.possible) {
            const percentage = (data.score / data.possible) * 100;
            totalPercentage += percentage;
            count++;
        }
    });
    
    if (count === 0) return 'N/A';
    
    const averagePercentage = Math.round(totalPercentage / count);
    return `${averagePercentage}%`;
}

/**
 * Fetch assignments from Firebase for assignments tab
 */
function fetchAssignmentsFromFirebase(classId) {
    if (!is_firebase_available()) {
        document.getElementById('assignments-grid').innerHTML = '<div class="error-message">Unable to load assignments. Please check your connection.</div>';
        return;
    }
    
    // Show loading state
    document.getElementById('assignments-grid').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading assignments...</p>
        </div>
    `;
    
    db.collection('Assignments')
        .where('classId', '==', classId)
        .get()
        .then(querySnapshot => {
            const assignments = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                
                // Format dates and calculate time left
                let formattedDueDate = 'No due date';
                let timeLeft = '';
                
                if (data.dueDate) {
                    const dueDate = data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate);
                    const now = new Date();
                    
                    formattedDueDate = dueDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    const diffTime = Math.abs(dueDate - now);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (dueDate < now) {
                        timeLeft = 'Past due';
                    } else if (diffDays === 0) {
                        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                        timeLeft = diffHours <= 1 ? 'Due soon' : `${diffHours} hours left`;
                    } else if (diffDays === 1) {
                        timeLeft = '1 day left';
                    } else {
                        timeLeft = `${diffDays} days left`;
                    }
                }
                
                // Ensure all required fields exist
                const assignment = {
                    id: data.id,
                    title: data.title || 'Untitled Assignment',
                    description: data.description || 'No description available.',
                    due_date: formattedDueDate,
                    time_left: timeLeft,
                    type: data.type || 'homework',
                    status: data.status || 'not_started',
                    points: data.points || 0,
                    allowed_formats: data.allowed_formats || 'PDF',
                    resources: data.resources || []
                };
                
                // Add time limit if available
                if (data.time_limit) {
                    assignment.time_limit = data.time_limit;
                }
                
                assignments.push(assignment);
            });
            
            if (assignments.length > 0) {
                updateAssignmentsGrid(assignments);
                setupAssignmentFilters(assignments);
            } else {
                document.getElementById('assignments-grid').innerHTML = 
                    '<div class="no-items-message">No assignments found for this class.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching assignments:', error);
            document.getElementById('assignments-grid').innerHTML = 
                '<div class="error-message">Failed to load assignments. Please try again later.</div>';
        });
}

/**
 * Fetch resources from Firebase for resources tab
 */
function fetchResourcesFromFirebase(classId) {
    if (!is_firebase_available()) {
        document.getElementById('resources-grid').innerHTML = '<div class="error-message">Unable to load resources. Please check your connection.</div>';
        return;
    }
    
    // Show loading state
    document.getElementById('resources-grid').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading resources...</p>
        </div>
    `;
    
    db.collection('Resources')
        .where('classId', '==', classId)
        .get()
        .then(querySnapshot => {
            const resources = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                
                // Format dates if needed
                let dateAdded = 'Unknown date';
                if (data.createdAt) {
                    const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    dateAdded = createdDate.toLocaleDateString('en-US', {
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                } else if (data.date_added) {
                    dateAdded = data.date_added;
                }
                
                // Create consistent resource object
                resources.push({
                    id: data.id,
                    title: data.title || 'Untitled Resource',
                    description: data.description || 'No description available.',
                    type: data.type || 'handouts',
                    date_added: dateAdded,
                    file_type: data.file_type || '',
                    file_size: data.file_size || '',
                    duration: data.duration || '',
                    thumbnail: data.thumbnail || `https://via.placeholder.com/300x200/4361ee/ffffff?text=${data.type || 'Resource'}`
                });
            });
            
            if (resources.length > 0) {
                updateResourcesGrid(resources);
                setupResourceFilters(resources);
            } else {
                document.getElementById('resources-grid').innerHTML = 
                    '<div class="no-items-message">No resources found for this class.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching resources:', error);
            document.getElementById('resources-grid').innerHTML = 
                '<div class="error-message">Failed to load resources. Please try again later.</div>';
        });
}

/**
 * Fetch channel messages from Firebase
 */
function fetchChannelMessagesFromFirebase(classId, channelId) {
    // Show loading indicator
    document.getElementById('messages-container').innerHTML = '<div class="loading-message">Loading messages...</div>';
    
    // Set up channel switching
    setupChannelSwitching();
    
    // Set up message sending
    setupMessageSending(classId, channelId);
    
    if (!is_firebase_available()) {
        document.getElementById('messages-container').innerHTML = 
            '<div class="error-message">Unable to load messages. Please check your connection.</div>';
        return;
    }
    
    // Update current channel display
    updateCurrentChannelDisplay(channelId, getChannelNameFromId(channelId));
    
    // Fetch messages
    db.collection('Messages')
        .where('classId', '==', classId)
        .where('channelId', '==', channelId)
        .orderBy('sentAt', 'asc')
        .get()
        .then(querySnapshot => {
            const messages = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                // Format date and time
                let messageTime = 'Unknown time';
                let messageDate = 'Unknown date';
                
                if (data.sentAt) {
                    const sentDate = data.sentAt.toDate ? data.sentAt.toDate() : new Date(data.sentAt);
                    const now = new Date();
                    
                    messageTime = sentDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                    
                    // Format relative date (Today, Yesterday, or actual date)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    const messageDateOnly = new Date(sentDate);
                    messageDateOnly.setHours(0, 0, 0, 0);
                    
                    if (messageDateOnly.getTime() === today.getTime()) {
                        messageDate = 'Today';
                    } else if (messageDateOnly.getTime() === yesterday.getTime()) {
                        messageDate = 'Yesterday';
                    } else {
                        messageDate = sentDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: sentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                        });
                    }
                }
                
                messages.push({
                    id: doc.id,
                    senderId: data.senderId || 'unknown',
                    senderName: data.senderName || 'Unknown User',
                    senderProfilePic: data.senderProfilePic || 'https://via.placeholder.com/64',
                    content: data.content || '',
                    time: data.time || messageTime,
                    date: data.date || messageDate
                });
            });
            
            updateMessagesContainer(messages);
        })
        .catch(error => {
            console.error('Error fetching messages:', error);
            document.getElementById('messages-container').innerHTML = 
                '<div class="error-message">Failed to load messages. Please try again later.</div>';
        });
}

/**
 * Get channel name from ID 
 */
function getChannelNameFromId(channelId) {
    // Try to find the channel name in the DOM
    const channel = document.querySelector(`.channel[data-channel="${channelId}"], .channel[data-channel-id="${channelId}"]`);
    
    if (channel) {
        return channel.querySelector('.channel-name')?.textContent || channelId;
    }
    
    // Default channel names for common channels
    if (channelId === 'general') return 'General';
    if (channelId === 'announcements') return 'Announcements';
    if (channelId === 'help') return 'Help';
    
    return channelId;
}

/**
 * Fetch grades from Firebase
 */
function fetchGradesFromFirebase(classId) {
    if (!is_firebase_available()) {
        document.getElementById('grades-table-body').innerHTML = 
            '<tr><td colspan="6">Unable to load grades. Please check your connection.</td></tr>';
        document.getElementById('grade-chart-container').innerHTML = 
            '<div class="error-message">Unable to load grade chart. Please check your connection.</div>';
        return;
    }
    
    // Show loading states
    document.getElementById('grades-table-body').innerHTML = `
        <tr class="skeleton-row">
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
        </tr>
        <tr class="skeleton-row">
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
            <td class="skeleton"></td>
        </tr>
    `;
    
    // Fetch grades
    db.collection('Grades')
        .where('classId', '==', classId)
        // Add filter for current student if this is a student view
        // .where('studentId', '==', currentUserId)
        .orderBy('gradedAt', 'desc')
        .get()
        .then(querySnapshot => {
            const grades = [];
            const promises = [];
            
            querySnapshot.forEach(doc => {
                const gradeData = doc.data();
                
                // Get the assignment details for each grade
                const assignmentPromise = db.collection('Assignments')
                    .doc(gradeData.assignmentId)
                    .get()
                    .then(assignmentDoc => {
                        if (!assignmentDoc.exists) {
                            console.warn(`Assignment ${gradeData.assignmentId} not found for grade ${doc.id}`);
                            return null;
                        }
                        
                        const assignmentData = assignmentDoc.data();
                        
                        // Format due date
                        let dueDate = 'Unknown';
                        if (assignmentData.dueDate) {
                            const date = assignmentData.dueDate.toDate ? 
                                         assignmentData.dueDate.toDate() : 
                                         new Date(assignmentData.dueDate);
                                         
                            dueDate = date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        }
                        
                        // Calculate score and letter grade
                        const score = `${gradeData.score || 0}/${gradeData.possible || 0}`;
                        let letterGrade = gradeData.letterGrade || '';
                        
                        if (!letterGrade && gradeData.percentage) {
                            letterGrade = getLetterGrade(gradeData.percentage);
                        } else if (!letterGrade && gradeData.score && gradeData.possible) {
                            const percentage = (gradeData.score / gradeData.possible) * 100;
                            letterGrade = getLetterGrade(percentage);
                        }
                        
                        return {
                            id: doc.id,
                            assignment: assignmentData.title || 'Unknown Assignment',
                            type: assignmentData.type || 'unknown',
                            dueDate: dueDate,
                            status: gradeData.status || 'graded',
                            score: score,
                            grade: letterGrade
                        };
                    });
                
                promises.push(assignmentPromise);
            });
            
            // Wait for all assignment promises to resolve
            return Promise.all(promises);
        })
        .then(grades => {
            // Filter out any null values (failed assignment lookups)
            const validGrades = grades.filter(grade => grade !== null);
            
            if (validGrades.length > 0) {
                updateGradesTable(validGrades);
                updateGradeSummary(validGrades);
                renderGradeChart(validGrades);
            } else {
                document.getElementById('grades-table-body').innerHTML = 
                    '<tr><td colspan="6">No grades found for this class.</td></tr>';
                document.getElementById('grade-chart-container').innerHTML = 
                    '<div class="no-items-message">No grade data available to display.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching grades:', error);
            document.getElementById('grades-table-body').innerHTML = 
                '<tr><td colspan="6">Failed to load grades. Please try again later.</td></tr>';
            document.getElementById('grade-chart-container').innerHTML = 
                '<div class="error-message">Failed to load grade chart. Please try again later.</div>';
        });
}

/**
 * Fetch classmates from Firebase
 */
function fetchClassmatesFromFirebase(classId) {
    if (!is_firebase_available()) {
        document.getElementById('students-grid').innerHTML = 
            '<div class="error-message">Unable to load students. Please check your connection.</div>';
        return;
    }
    
    // Show loading state
    document.getElementById('students-grid').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading students...</p>
        </div>
    `;
    
    // Get the class to find its members
    db.collection('Classes').doc(classId).get()
        .then(classDoc => {
            if (!classDoc.exists) {
                throw new Error('Class not found');
            }
            
            const classData = classDoc.data();
            const members = classData.members || [];
            
            // Only include students (not teachers or other roles)
            const studentMembers = members.filter(member => member.role === 'student');
            
            if (studentMembers.length === 0) {
                throw new Error('No students in this class');
            }
            
            // Get the actual student data from the Members collection
            const studentPromises = studentMembers.map(member => 
                db.collection('Members').doc(member.userId).get()
            );
            
            return Promise.all(studentPromises);
        })
        .then(studentDocs => {
            const students = [];
            
            studentDocs.forEach(doc => {
                if (!doc.exists) return;
                
                const data = doc.data();
                
                // Build student object
                students.push({
                    id: doc.id,
                    name: data.first_name && data.last_name ? 
                         `${data.first_name} ${data.last_name}` : 
                         data.username || 'Unknown Student',
                    email: data.email || 'No email available',
                    profilePic: data.profilePicUrl || 'https://via.placeholder.com/64',
                    grade: data.grade || 'Unknown Grade',
                    lastActive: formatLastActive(data.lastActive)
                });
            });
            
            if (students.length > 0) {
                updateStudentsGrid(students);
                setupStudentSearch();
            } else {
                document.getElementById('students-grid').innerHTML = 
                    '<div class="no-items-message">No students found for this class.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching students:', error);
            document.getElementById('students-grid').innerHTML = 
                '<div class="error-message">Failed to load students. Please try again later.</div>';
        });
}

/**
 * Format last active time for display
 */
function formatLastActive(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const lastActive = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    const diffMs = now - lastActive;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'Just now';
    } else if (diffMin < 60) {
        return diffMin + (diffMin === 1 ? ' minute ago' : ' minutes ago');
    } else if (diffHour < 24) {
        return diffHour + (diffHour === 1 ? ' hour ago' : ' hours ago');
    } else if (diffDay < 7) {
        return diffDay + (diffDay === 1 ? ' day ago' : ' days ago');
    } else {
        return lastActive.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    }
}

/**
 * Initialize mind web from Firebase data
 */
function initMindWebFromFirebase(classId) {
    // Get container and clear loading indicator
    const container = document.getElementById('mindweb-container');
    container.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading mind web visualization...</p>
        </div>
    `;
    
    if (!is_firebase_available()) {
        container.innerHTML = '<div class="error-message">Unable to load mind web. Please check your connection.</div>';
        return;
    }
    
    // Fetch mind web data from Firebase
    db.collection('ClassMindWebs')
        .where('classId', '==', classId)
        .limit(1) // Get the first/primary mind web for this class
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                container.innerHTML = '<div class="no-items-message">No mind web found for this class.</div>';
                return;
            }
            
            const mindWebData = querySnapshot.docs[0].data();
            
            // Clear container
            container.innerHTML = '';
            
            // Create canvas element
            const canvas = document.createElement('canvas');
            canvas.id = 'mindweb-canvas';
            container.appendChild(canvas);
            
            // Set up canvas
            const ctx = canvas.getContext('2d');
            const width = container.clientWidth;
            const height = container.clientHeight;
            canvas.width = width;
            canvas.height = height;
            
            // Process nodes and edges from the data
            const nodes = mindWebData.nodes.map(node => ({
                id: node.id,
                label: node.label,
                x: node.position ? node.position.x * width / 1000 : Math.random() * width,
                y: node.position ? node.position.y * height / 1000 : Math.random() * height,
                radius: 40,
                color: getNodeColor(node.type)
            }));
            
            const edges = mindWebData.edges.map(edge => ({
                from: edge.source || edge.from,
                to: edge.target || edge.to
            }));
            
            // Draw mind web
            drawMindWeb(ctx, nodes, edges);
            
            // Set up controls
            setupMindWebControls(ctx, nodes, edges);
        })
        .catch(error => {
            console.error('Error fetching mind web data:', error);
            container.innerHTML = '<div class="error-message">Failed to load mind web. Please try again later.</div>';
        });
}

/**
 * Get color for node type
 */
function getNodeColor(type) {
    const colors = {
        'concept': '#4361ee',
        'topic': '#3a0ca3',
        'skill': '#7209b7',
        'process': '#f72585',
        'principle': '#4cc9f0'
    };
    
    return colors[type] || '#4361ee';
}

/**
 * Update messages container with messages
 */
function updateMessagesContainer(messages) {
    const messagesContainer = document.getElementById('messages-container');
    
    if (messages.length > 0) {
        messagesContainer.innerHTML = messages.map(message => `
            <div class="message ${message.senderId === getCurrentUserId() ? 'current-user-message' : ''}" data-id="${message.id}">
                <div class="message-avatar">
                    <img src="${message.senderProfilePic}" alt="${message.senderName}">
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender-name">${message.senderName}</span>
                        <span class="message-time">${message.date} at ${message.time}</span>
                    </div>
                    <div class="message-text">${message.content}</div>
                </div>
            </div>
        `).join('');
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } else {
        messagesContainer.innerHTML = '<div class="no-messages">No messages in this channel yet. Be the first to send a message!</div>';
    }
}

/**
 * Get current user ID (placeholder - in a real app would come from auth)
 */
function getCurrentUserId() {
    // In a real app, this would come from the authentication system
    // For demo purposes, return a placeholder
    return 'current-user';
}

/**
 * Set up channel switching functionality
 */
function setupChannelSwitching() {
    const channels = document.querySelectorAll('.channel');
    
    channels.forEach(channel => {
        channel.addEventListener('click', function() {
            // Update active channel
            channels.forEach(ch => ch.classList.remove('active'));
            this.classList.add('active');
            
            // Get channel id and name
            const channelId = this.getAttribute('data-channel-id') || this.getAttribute('data-channel');
            const channelName = this.querySelector('.channel-name')?.textContent || channelId;
            
            // Update current channel display
            updateCurrentChannelDisplay(channelId, channelName);
            
            // Fetch messages for this channel
            fetchChannelMessagesFromFirebase(getClassIdFromUrl(), channelId);
        });
    });
}

/**
 * Update current channel display
 */
function updateCurrentChannelDisplay(channelId, channelName) {
    const currentChannel = document.getElementById('current-channel');
    if (currentChannel) {
        currentChannel.textContent = channelName;
        currentChannel.setAttribute('data-channel-id', channelId);
    }
}

/**
 * Set up message sending functionality
 */
function setupMessageSending(classId, channelId) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message-btn');
    
    // Clear any existing event listeners
    sendButton.removeEventListener('click', sendMessageHandler);
    messageInput.removeEventListener('keypress', messageInputHandler);
    
    // Add event listeners
    sendButton.addEventListener('click', sendMessageHandler);
    messageInput.addEventListener('keypress', messageInputHandler);
    
    function sendMessageHandler() {
        sendMessage(classId, channelId);
    }
    
    function messageInputHandler(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(classId, channelId);
        }
    }
}

/**
 * Send a message
 */
function sendMessage(classId, channelId) {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    // Clear input
    messageInput.value = '';
    
    if (!is_firebase_available()) {
        console.error('Firebase is not available. Cannot send message.');
        return;
    }
    
    // Get current user info (placeholder)
    // In a real app, this would come from the authentication system
    const currentUser = {
        id: 'current-user',
        name: 'You',
        profilePic: 'https://via.placeholder.com/64'
    };
    
    // Create a new message
    const now = new Date();
    const messageData = {
        classId: classId,
        channelId: channelId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderProfilePic: currentUser.profilePic,
        content: content,
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        date: 'Just now'
    };
    
    // Show temporary message while saving
    const messagesContainer = document.getElementById('messages-container');
    const tempId = 'temp-' + Date.now();
    const messageElement = document.createElement('div');
    messageElement.className = 'message current-user-message sending';
    messageElement.setAttribute('data-id', tempId);
    messageElement.innerHTML = `
        <div class="message-avatar">
            <img src="${currentUser.profilePic}" alt="${currentUser.name}">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="sender-name">${currentUser.name}</span>
                <span class="message-time">Just now</span>
                <span class="sending-indicator">Sending...</span>
            </div>
            <div class="message-text">${content}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save to Firebase
    db.collection('Messages')
        .add(messageData)
        .then(docRef => {
            console.log('Message sent successfully with ID:', docRef.id);
            
            // Update the temporary element with the real ID and remove sending state
            messageElement.setAttribute('data-id', docRef.id);
            messageElement.classList.remove('sending');
            messageElement.querySelector('.sending-indicator').remove();
        })
        .catch(error => {
            console.error('Error sending message:', error);
            
            // Show error in the UI
            messageElement.classList.remove('sending');
            messageElement.classList.add('error');
            const indicator = messageElement.querySelector('.sending-indicator');
            if (indicator) {
                indicator.textContent = 'Failed to send';
                indicator.className = 'error-indicator';
            }
        });
}

/**
 * Create a new channel
 */
function createNewChannel(classId, channelName, description, isPrivate) {
    if (!is_firebase_available()) {
        console.error('Firebase is not available. Cannot create channel.');
        return;
    }
    
    const channelId = db.collection('Classes').doc().id; // Generate a unique ID
    
    // Create the channel data
    const newChannelData = {
        id: channelId,
        name: channelName,
        description: description,
        type: 'general', // Default type
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: getCurrentUserId(), // Get current user ID
        isPrivate: isPrivate,
        allowedMembers: []
    };
    
    // Show loading state in the UI
    const saveButton = document.querySelector('#create-channel-modal .save-btn');
    if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Creating...';
        saveButton.disabled = true;
    }

    // Update the class in Firebase
    db.collection('Classes').doc(classId).update({
        channels: firebase.firestore.FieldValue.arrayUnion(newChannelData),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log(`Channel ${channelName} created successfully!`);
        
        // Add to UI
        const channelsList = document.getElementById('channels-list');
        const newChannelElement = document.createElement('li');
        newChannelElement.className = 'channel';
        newChannelElement.setAttribute('data-channel', channelName); // For backwards compatibility
        newChannelElement.setAttribute('data-channel-id', channelId);
        newChannelElement.innerHTML = `
            <span class="channel-icon">${isPrivate ? '🔒' : '#'}</span>
            <span class="channel-name">${channelName}</span>
        `;
        channelsList.appendChild(newChannelElement);
        
        // Close the modal
        document.getElementById('create-channel-modal').classList.remove('active');
        
        // Clear the form
        document.getElementById('channel-name').value = '';
        document.getElementById('channel-description').value = '';
        document.getElementById('private-channel').checked = false;
        
        // Reset the save button
        if (saveButton) {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }
        
        // Add click handler and edit buttons
        newChannelElement.addEventListener('click', function() {
            document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
            this.classList.add('active');
            updateCurrentChannelDisplay(channelId, channelName);
            fetchChannelMessagesFromFirebase(classId, channelId);
        });
        
        // Re-apply edit buttons if in edit mode
        if (window.isEditMode) {
            addEditButtonsToChannels();
        }
        
        // Automatically switch to the new channel
        newChannelElement.click();
    })
    .catch(error => {
        console.error('Error creating channel:', error);
        
        // Show error in the UI
        alert('Failed to create channel. Please try again.');
        
        // Reset the save button
        if (saveButton) {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }
    });
} 