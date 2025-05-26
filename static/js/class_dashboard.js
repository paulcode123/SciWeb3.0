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
 * Fetch class data from Flask API instead of Firebase directly
 */
function fetchClassDataFromFirebase(classId) {
    fetch(`/api/Classes/${classId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // The API returns {classId: classData}
            const classData = data[classId] || data;
            classData.id = classId;
            console.log('Class data loaded from API:', classData);
                    updateDashboardWithServerData(classData);
                    
                    // Load additional data
                    fetchUpcomingEventsFromFirebase(classId);
                    fetchUpcomingAssignmentsFromFirebase(classId);
            })
            .catch(error => {
            console.error('Error fetching class data from API:', error);
        // Show an error message to the user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = '<p>Unable to connect to the database. Please check your connection or contact support.</p>';
        document.querySelector('.dashboard-grid').prepend(errorMessage);
        })
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
 * Function to determine if API is available (replaces Firebase check)
 */
function is_firebase_available() {
    // Always return true since we're using Flask API instead of Firebase SDK
    return true;
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
 * Fetch class data from Firebase (replaced mock implementation)
 */
function fetchClassData(classId) {
    // This function is now replaced by fetchClassDataFromFirebase
    // which is already implemented and called from initDashboard
    console.log('fetchClassData called - delegating to fetchClassDataFromFirebase');
    fetchClassDataFromFirebase(classId);
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
 * Fetch upcoming events for the class (replaced with Firebase implementation)
 */
function fetchUpcomingEvents(classId) {
    // Use the Firebase implementation instead
    fetchUpcomingEventsFromFirebase(classId);
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
 * Fetch current unit information (now handled by Firebase class data)
 */
function fetchCurrentUnit(classId) {
    // This is now handled by the main class data fetch
    // The Firebase class data includes units array with current unit info
    console.log('fetchCurrentUnit called - handled by main class data fetch');
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
 * Fetch recent activity (replaced with Firebase implementation)
 */
function fetchRecentActivity(classId) {
    // Use the Firebase implementation instead
    fetchRecentActivityFromFirebase(classId);
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
 * Fetch class stats (replaced with Firebase implementation)
 */
function fetchClassStats(classId) {
    // Use the Firebase implementation instead
    fetchClassStatsFromFirebase(classId);
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
 * Fetch upcoming assignments (replaced with Firebase implementation)
 */
function fetchUpcomingAssignments(classId) {
    // Use the Firebase implementation instead
    fetchUpcomingAssignmentsFromFirebase(classId);
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
 * Fetch assignments for the assignments tab (replaced with Firebase implementation)
 */
function fetchAssignments(classId) {
    // Use the Firebase implementation instead
    fetchAssignmentsFromFirebase(classId);
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
 * Fetch resources for the resources tab (replaced with Firebase implementation)
 */
function fetchResources(classId) {
    // Use the Firebase implementation instead
    fetchResourcesFromFirebase(classId);
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
 * Fetch channel messages for discussions tab (replaced with Firebase implementation)
 */
function fetchChannelMessages(classId, channelId) {
    // Use the Firebase implementation instead
    fetchChannelMessagesFromFirebase(classId, channelId);
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
 * Fetch grades for the grades tab (replaced with Firebase implementation)
 */
function fetchGrades(classId) {
    // Use the Firebase implementation instead
    fetchGradesFromFirebase(classId);
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
 * Fetch classmates for the students tab (replaced with Firebase implementation)
 */
function fetchClassmates(classId) {
    // Use the Firebase implementation instead
    fetchClassmatesFromFirebase(classId);
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
 * Initialize the mind web visualization (replaced with Firebase implementation)
 */
function initMindWeb(classId) {
    // Use the Firebase implementation instead
    initMindWebFromFirebase(classId);
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
    
    // Add enhanced styles for the button and edit mode
    const style = document.createElement('style');
    style.textContent = `
        /* Edit Mode Toggle Button */
        .edit-mode-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #4361ee, #3a0ca3);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3);
            z-index: 1000;
            transition: all 0.3s ease;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .edit-mode-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(67, 97, 238, 0.4);
        }
        
        .edit-mode-toggle.active {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        
        .edit-mode-toggle.active:hover {
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
        }

        /* Floating Action Buttons */
        .fab-container {
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 999;
            display: none;
            flex-direction: column;
            gap: 12px;
        }

        .edit-mode .fab-container {
            display: flex;
        }

        .fab {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            position: relative;
        }

        .fab:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }

        .fab-add-assignment { background: linear-gradient(135deg, #4361ee, #3a0ca3); }
        .fab-add-resource { background: linear-gradient(135deg, #7209b7, #5a189a); }
        .fab-add-event { background: linear-gradient(135deg, #f72585, #e91e63); }
        .fab-add-note { background: linear-gradient(135deg, #4cc9f0, #0077b6); }

        .fab-tooltip {
            position: absolute;
            right: 65px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        .fab:hover .fab-tooltip {
            opacity: 1;
        }
        
        /* Enhanced Editable Elements */
        .editable {
            position: relative;
            transition: all 0.3s ease;
        }
        
        .editable:hover::after {
            content: "✏️ Click to edit";
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s ease;
            white-space: nowrap;
            z-index: 1000;
        }
        
        .edit-mode .editable:hover {
            outline: 2px dashed #4361ee;
            outline-offset: 4px;
            cursor: pointer;
            background-color: rgba(67, 97, 238, 0.05);
            border-radius: 8px;
        }
        
        .edit-mode .editable:hover::after {
            opacity: 1;
        }
        
        /* Delete Buttons */
        .delete-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: all 0.3s ease;
            z-index: 10;
        }

        .edit-mode .delete-btn {
            display: flex;
        }

        .delete-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }
        
        /* Enhanced Edit Forms */
        .edit-form {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            margin: 16px 0;
            border: 1px solid #e1e8ed;
            position: relative;
        }
        
        .edit-form::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(135deg, #4361ee, #3a0ca3);
            border-radius: 12px 12px 0 0;
        }

        .edit-form .form-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e1e8ed;
        }

        .edit-form .form-title {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
            margin: 0;
        }
        
        .edit-form .form-group {
            margin-bottom: 16px;
        }

        .edit-form label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #2c3e50;
            font-size: 14px;
        }

        .edit-form input, 
        .edit-form textarea, 
        .edit-form select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
            background-color: #fafbfc;
        }

        .edit-form input:focus, 
        .edit-form textarea:focus, 
        .edit-form select:focus {
            outline: none;
            border-color: #4361ee;
            background-color: white;
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
        }
        
        .edit-form textarea {
            min-height: 120px;
            resize: vertical;
            font-family: inherit;
        }
        
        .edit-form .button-group {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e1e8ed;
        }
        
        .edit-form button {
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            border: none;
            font-size: 14px;
        }
        
        .edit-form .save-btn {
            background: linear-gradient(135deg, #4361ee, #3a0ca3);
            color: white;
        }

        .edit-form .save-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
        }
        
        .edit-form .cancel-btn {
            background: white;
            color: #6c757d;
            border: 2px solid #e1e8ed;
        }

        .edit-form .cancel-btn:hover {
            background: #f8f9fa;
            border-color: #ced4da;
        }

        /* Confirmation Modal */
        .confirmation-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .confirmation-modal.active {
            display: flex;
        }

        .confirmation-content {
            background: white;
            padding: 32px;
            border-radius: 16px;
            box-shadow: 0 16px 48px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 90%;
            text-align: center;
        }

        .confirmation-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 16px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
        }

        .confirmation-title {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }

        .confirmation-message {
            color: #6c757d;
            margin-bottom: 24px;
            line-height: 1.5;
        }

        .confirmation-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .btn-confirm-delete {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .btn-confirm-delete:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .btn-cancel-delete {
            background: white;
            color: #6c757d;
            padding: 12px 24px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .btn-cancel-delete:hover {
            background: #f8f9fa;
            border-color: #ced4da;
        }

        /* Loading States */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.9);
            display: none;
            align-items: center;
            justify-content: center;
            border-radius: inherit;
            z-index: 100;
        }

        .loading-overlay.active {
            display: flex;
        }

        .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e1e8ed;
            border-top: 3px solid #4361ee;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Success/Error Feedback */
        .feedback-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            min-width: 300px;
        }

        .feedback-toast.show {
            transform: translateX(0);
        }

        .feedback-toast.success {
            background: linear-gradient(135deg, #27ae60, #2ecc71);
        }

        .feedback-toast.error {
            background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

                 .feedback-toast.warning {
             background: linear-gradient(135deg, #f39c12, #e67e22);
         }

         .feedback-toast.info {
             background: linear-gradient(135deg, #3498db, #2980b9);
         }

        /* Keyboard Shortcuts Hint */
        .keyboard-hint {
            position: fixed;
            bottom: 80px;
            left: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
        }

        .edit-mode .keyboard-hint {
            opacity: 1;
        }

        /* Office Hours Edit Styles */
        .office-hour-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .office-hour-input {
            flex: 1;
            padding: 8px 12px;
            border: 2px solid #e1e8ed;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }

        .office-hour-input:focus {
            outline: none;
            border-color: #4361ee;
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
        }

        .remove-hour-btn {
            padding: 8px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 36px;
            height: 36px;
        }

        .remove-hour-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
        }

        .add-hour-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .add-hour-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
        }

        /* Enhanced Card Styles for Edit Mode */
        .edit-mode .card, 
        .edit-mode .assignment-card,
        .edit-mode .resource-card,
        .edit-mode .event-item,
        .edit-mode .student-card {
            position: relative;
            transition: all 0.3s ease;
        }

        .edit-mode .card:hover,
        .edit-mode .assignment-card:hover,
        .edit-mode .resource-card:hover,
        .edit-mode .event-item:hover,
        .edit-mode .student-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
    `;
    document.head.appendChild(style);
    
    // Add floating action buttons
    createFloatingActionButtons(dashboardGrid);
    
    // Add confirmation modal
    createConfirmationModal();
    
    // Add keyboard shortcuts hint
    createKeyboardHint();
    
    // Add event listener to toggle edit mode
    editButton.addEventListener('click', function() {
        window.isEditMode = !window.isEditMode;
        this.classList.toggle('active');

        // Ensure header edit forms can overflow when editing
        const header = document.querySelector('.class-header');
        if (header) header.style.overflow = window.isEditMode ? 'visible' : 'hidden';

        if (window.isEditMode) {
            this.innerHTML = '<i class="fas fa-times"></i> Exit Edit Mode';
            document.body.classList.add('edit-mode');
            makeElementsEditable();
            addDeleteButtons();
            setupKeyboardShortcuts();
        } else {
            this.innerHTML = '<i class="fas fa-edit"></i> Edit Dashboard';
            document.body.classList.remove('edit-mode');
            removeEditableListeners();
            removeDeleteButtons();
            removeKeyboardShortcuts();
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
    teacherProfile._editHandler = editTeacherProfile;
    
    // Make syllabus editable
    const syllabusContent = document.getElementById('syllabus-content');
    syllabusContent.classList.add('editable');
    syllabusContent.addEventListener('click', createEditHandler('syllabus-content', 'textarea', 'Class Syllabus', true));
    
    // Make office hours editable
    const officeHoursList = document.getElementById('office-hours-list');
    officeHoursList.classList.add('editable');
    officeHoursList.addEventListener('click', editOfficeHours);
    officeHoursList._editHandler = editOfficeHours;
    
    // Make current unit editable
    const currentUnitContent = document.getElementById('current-unit-content');
    if (currentUnitContent) {
        currentUnitContent.classList.add('editable');
        currentUnitContent.addEventListener('click', editCurrentUnit);
        // Store the handler for later removal
        currentUnitContent._editHandler = editCurrentUnit;
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
    if (!unitContent) return;
    
    const originalContent = unitContent.innerHTML;
    
    // Parse the current unit data with better text extraction
    const titleElement = unitContent.querySelector('h4');
    const descriptionElement = unitContent.querySelector('p');
    const topicElement = unitContent.querySelector('.topic-value');
    
    const title = titleElement ? titleElement.textContent.trim() : '';
    const description = descriptionElement ? descriptionElement.textContent.trim() : '';
    const currentTopic = topicElement ? topicElement.textContent.trim() : '';
    
    console.log('Unit data extracted:', { title, description, currentTopic }); // Debug log
    
    // Create edit form
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    const progressElement = document.getElementById('unit-progress-percent');
    const currentProgress = progressElement ? progressElement.textContent.replace('%', '') : '0';
    
    form.innerHTML = `
        <div class="form-header">
            <h3 class="form-title">Edit Current Unit</h3>
        </div>
        <div class="form-group">
            <label>Unit Title</label>
            <input type="text" id="unit-title-input" placeholder="Unit Title">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea id="unit-description-input" placeholder="Unit Description"></textarea>
        </div>
        <div class="form-group">
            <label>Current Topic</label>
            <input type="text" id="unit-topic-input" placeholder="Current Topic">
        </div>
        <div class="form-group">
            <label>Progress (%)</label>
            <input type="number" id="unit-progress-input" min="0" max="100" step="1">
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    unitContent.innerHTML = '';
    unitContent.appendChild(form);
    
    // Set values via JavaScript properties instead of HTML attributes
    form.querySelector('#unit-title-input').value = title;
    form.querySelector('#unit-description-input').value = description;
    form.querySelector('#unit-topic-input').value = currentTopic;
    form.querySelector('#unit-progress-input').value = currentProgress;
    
    // Prevent clicks on form elements from bubbling up
    form.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newTitle = form.querySelector('#unit-title-input').value;
        const newDescription = form.querySelector('#unit-description-input').value;
        const newTopic = form.querySelector('#unit-topic-input').value;
        const newProgress = form.querySelector('#unit-progress-input').value;
        
        // Update the UI
        unitContent.innerHTML = `
            <h4>${escapeHtml(newTitle)}</h4>
            <p>${escapeHtml(newDescription)}</p>
            <div class="current-topic">
                <span class="topic-label">Current Topic:</span>
                <span class="topic-value">${escapeHtml(newTopic)}</span>
            </div>
        `;
        
        // Update progress bar
        document.getElementById('unit-progress-percent').textContent = `${newProgress}%`;
        document.querySelector('.progress-bar-fill').style.width = `${newProgress}%`;
        
        // Update via API (simplified - just updating the current unit display for now)
        // In a full implementation, you would need a specific API endpoint for unit updates
        console.log('Unit updated locally:', { newTitle, newDescription, newTopic, newProgress });
        
        // For now, we'll skip the backend update since it would require more complex API endpoints
        // In a production app, you'd want to add endpoints like:
        // PATCH /api/Classes/{classId}/units/{unitId} or similar
        
        // Re-add the editable class and event listener
        unitContent.classList.add('editable');
        unitContent.addEventListener('click', editCurrentUnit);
        unitContent._editHandler = editCurrentUnit;
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        unitContent.innerHTML = originalContent;
        
        // Re-add the editable class and event listener
        unitContent.classList.add('editable');
        unitContent.addEventListener('click', editCurrentUnit);
        unitContent._editHandler = editCurrentUnit;
    });
    
    // Prevent edit mode from being triggered again while editing
    unitContent.classList.remove('editable');
    if (unitContent._editHandler) {
        unitContent.removeEventListener('click', unitContent._editHandler);
    }
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
        
        // Update via API
        const assignmentId = item.dataset.id; // Assuming item has data-id attribute
        if (assignmentId) {
            fetch(`/api/Assignments/${assignmentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                title: newTitle,
                type: newType,
                    due_date: newDate,
                    status: newStatus
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Assignment ${assignmentId} updated successfully via API!`);
            })
            .catch(error => {
                console.error(`Error updating assignment ${assignmentId} via API:`, error);
            });
        } else {
            console.log('Assignment ID missing. Skipping database update.');
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
        
        // Update via API
        const assignmentIdCard = card.getAttribute('data-id');
        if (assignmentIdCard) {
            fetch(`/api/Assignments/${assignmentIdCard}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                title: newTitle,
                description: newDesc,
                type: newType,
                points: parseInt(newPoints),
                    due_date: newDate,
                    status: newStatus
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Assignment card ${assignmentIdCard} updated successfully via API!`);
            })
            .catch(error => {
                console.error(`Error updating assignment card ${assignmentIdCard} via API:`, error);
            });
        } else {
            console.log('Assignment ID missing. Skipping database update.');
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
        
        // Update via API
        const resourceId = card.getAttribute('data-id');
        if (resourceId) {
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

            fetch(`/api/Resources/${resourceId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                title: newTitle,
                description: newDesc,
                type: newType,
                thumbnail: newThumbnail,
                file_type: file_type,
                file_size: file_size,
                duration: duration,
                    date_added: newDate
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Resource ${resourceId} updated successfully via API!`);
            })
            .catch(error => {
                console.error(`Error updating resource ${resourceId} via API:`, error);
            });
        } else {
            console.log('Resource ID missing. Skipping database update.');
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
    if (!teacherProfile) return;
    
    const originalContent = teacherProfile.innerHTML;
    
    // Get current teacher data with null checks
    const imgElement = teacherProfile.querySelector('img');
    const nameElement = teacherProfile.querySelector('h4');
    const emailElement = teacherProfile.querySelector('p');
    
    const teacherImg = imgElement ? imgElement.src : 'https://via.placeholder.com/64';
    const teacherName = nameElement ? nameElement.textContent.trim() : '';
    const teacherEmail = emailElement ? emailElement.textContent.trim() : '';
    
    console.log('Teacher data extracted:', { teacherImg, teacherName, teacherEmail }); // Debug log
    
    // Create edit form
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-header">
            <h3 class="form-title">Edit Teacher Profile</h3>
        </div>
        <div class="form-group">
            <label>Profile Image URL</label>
            <input type="text" id="teacher-img-input" placeholder="Image URL">
        </div>
        <div class="form-group">
            <label>Teacher Name</label>
            <input type="text" id="teacher-name-input" placeholder="Teacher Name">
        </div>
        <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="teacher-email-input" placeholder="Email Address">
        </div>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    teacherProfile.innerHTML = '';
    teacherProfile.appendChild(form);
    
    // Set values via JavaScript properties instead of HTML attributes
    form.querySelector('#teacher-img-input').value = teacherImg;
    form.querySelector('#teacher-name-input').value = teacherName;
    form.querySelector('#teacher-email-input').value = teacherEmail;
    
    // Prevent clicks on form elements from bubbling up
    form.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Add event listeners
    form.querySelector('.save-btn').addEventListener('click', function() {
        const newImg = form.querySelector('#teacher-img-input').value;
        const newName = form.querySelector('#teacher-name-input').value;
        const newEmail = form.querySelector('#teacher-email-input').value;
        
        // Update the UI
        teacherProfile.innerHTML = `
            <img src="${escapeHtml(newImg)}" alt="${escapeHtml(newName)}" class="teacher-img">
            <h4>${escapeHtml(newName)}</h4>
            <p>${escapeHtml(newEmail)}</p>
        `;
        
        // Update via API
        const classId = getClassIdFromUrl();
        fetch(`/api/Classes/${classId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teacherProfilePic: newImg,
                teacherName: newName,
                teacherEmail: newEmail
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
            })
        .then(data => {
            console.log('Teacher profile updated successfully via API!');
            })
            .catch(error => {
            console.error('Error updating teacher profile via API:', error);
            });
        
        // Re-add the editable class and event listener
        teacherProfile.classList.add('editable');
        teacherProfile.addEventListener('click', editTeacherProfile);
        teacherProfile._editHandler = editTeacherProfile;
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        teacherProfile.innerHTML = originalContent;
        
        // Re-add the editable class and event listener
        teacherProfile.classList.add('editable');
        teacherProfile.addEventListener('click', editTeacherProfile);
        teacherProfile._editHandler = editTeacherProfile;
    });
    
    // Prevent edit mode from being triggered again while editing
    teacherProfile.classList.remove('editable');
    if (teacherProfile._editHandler) {
        teacherProfile.removeEventListener('click', teacherProfile._editHandler);
    }
}

/**
 * Edit office hours
 */
function editOfficeHours() {
    if (!window.isEditMode) return;
    
    const officeHoursList = document.getElementById('office-hours-list');
    if (!officeHoursList) return;
    
    const originalContent = officeHoursList.innerHTML;
    
    // Get current office hours
    const officeHours = [];
    officeHoursList.querySelectorAll('li').forEach(li => {
        if (li.textContent) {
        officeHours.push(li.textContent);
        }
    });
    
    // Create edit form
    const form = document.createElement('form');
    form.className = 'edit-form';
    
    form.innerHTML = `
        <div class="form-header">
            <h3 class="form-title">Edit Office Hours</h3>
        </div>
        <div class="office-hours-container">
        </div>
        <button type="button" class="add-hour-btn"><i class="fas fa-plus"></i> Add Office Hour</button>
        <div class="button-group">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="save-btn">Save</button>
        </div>
    `;
    
    officeHoursList.innerHTML = '';
    officeHoursList.appendChild(form);
    
    // Create and populate office hour fields
    const container = form.querySelector('.office-hours-container');
    officeHours.forEach((hour, index) => {
        const row = document.createElement('div');
        row.className = 'office-hour-row';
        row.dataset.index = index;
        
        row.innerHTML = `
            <input type="text" class="office-hour-input" placeholder="Day and Time">
            <button type="button" class="remove-hour-btn"><i class="fas fa-times"></i></button>
        `;
        
        // Set value via JavaScript property
        row.querySelector('.office-hour-input').value = hour;
        
        container.appendChild(row);
        
        // Add remove event listener
        row.querySelector('.remove-hour-btn').addEventListener('click', function() {
            row.remove();
        });
    });
    
    // Prevent clicks on form elements from bubbling up
    form.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
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
        
        // Focus the new input
        newRow.querySelector('.office-hour-input').focus();
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
        officeHoursList.innerHTML = updatedHours.map(hour => `<li>${escapeHtml(hour)}</li>`).join('');
        
        // In a real app, you would save this to the server here
        // console.log('Updated office hours:', updatedHours);
        
        // Update via API
        const classId = getClassIdFromUrl();
        fetch(`/api/Classes/${classId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teacherOfficeHours: updatedHours
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
            })
        .then(data => {
            console.log('Office hours updated successfully via API!');
            })
            .catch(error => {
            console.error('Error updating office hours via API:', error);
            });
        
        // Re-add the editable class and event listener
        officeHoursList.classList.add('editable');
        officeHoursList.addEventListener('click', editOfficeHours);
        officeHoursList._editHandler = editOfficeHours;
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        officeHoursList.innerHTML = originalContent;
        
        // Re-add the editable class and event listener
        officeHoursList.classList.add('editable');
        officeHoursList.addEventListener('click', editOfficeHours);
        officeHoursList._editHandler = editOfficeHours;
    });
    
    // Prevent edit mode from being triggered again while editing
    officeHoursList.classList.remove('editable');
    if (officeHoursList._editHandler) {
        officeHoursList.removeEventListener('click', officeHoursList._editHandler);
    }
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
        if (!element) return;
        
        const originalContent = element.innerHTML;
        
        // Better text extraction - for rich text elements, get innerHTML content
        // For simple text elements, get textContent
        let originalText = '';
        if (isRichText) {
            // For rich text, try to get the text from <p> tags or use textContent as fallback
            const pElement = element.querySelector('p');
            originalText = pElement ? pElement.textContent.trim() : element.textContent.trim();
        } else {
            originalText = element.textContent ? element.textContent.trim() : '';
        }
        
        console.log(`Text extracted from ${elementId}:`, originalText); // Debug log
        
        // Create edit form
        const form = document.createElement('form');
        form.className = 'edit-form';
        
        // Create form header
        const formHeader = document.createElement('div');
        formHeader.className = 'form-header';
        formHeader.innerHTML = `<h3 class="form-title">Edit ${placeholder}</h3>`;
        
        // Create form group
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = placeholder;
        
        let inputField;
        if (inputType === 'textarea') {
            inputField = document.createElement('textarea');
        } else {
            inputField = document.createElement('input');
            inputField.type = 'text';
        }
        
        inputField.placeholder = placeholder;
        inputField.value = originalText; // Set value via JavaScript property
        
        formGroup.appendChild(label);
        formGroup.appendChild(inputField);
        
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'cancel-btn';
        cancelButton.textContent = 'Cancel';
        
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'save-btn';
        saveButton.textContent = 'Save';
        
        buttonGroup.appendChild(cancelButton);
        buttonGroup.appendChild(saveButton);
        
        form.appendChild(formHeader);
        form.appendChild(formGroup);
        form.appendChild(buttonGroup);
        
        element.innerHTML = '';
        element.appendChild(form);
        
        // Prevent clicks on form elements from bubbling up
        form.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Focus the input field
        inputField.focus();
        
        // Add event listeners
        saveButton.addEventListener('click', function() {
            const newValue = inputField.value.trim();
            if (isRichText) {
                element.innerHTML = `<p>${escapeHtml(newValue)}</p>`;
            } else {
                element.textContent = newValue;
            }
            
            // Update via API
            const classId = getClassIdFromUrl();
            const fieldToUpdate = {};
            if (elementId === 'class-title') {
                fieldToUpdate['name'] = newValue;
            } else if (elementId === 'class-subtitle') {
                fieldToUpdate['description'] = newValue;
            } else if (elementId === 'syllabus-content') {
                fieldToUpdate['syllabus'] = newValue;
            }
            
            if (Object.keys(fieldToUpdate).length > 0) {
                fetch(`/api/Classes/${classId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fieldToUpdate)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log(`${elementId} updated successfully via API!`);
                })
                .catch(error => {
                    console.error(`Error updating ${elementId} via API:`, error);
                });
            } else {
                console.log('No field to update. Skipping database update.');
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
        
        // Update via API (simplified - just updating locally for now)
        // In a full implementation, you would need a specific API endpoint for channel updates
        console.log('Channel updated locally:', { 
            id: channelId, 
            name: newName, 
            isPrivate: newIsPrivate 
        });
        
        // For now, we'll skip the backend update since it would require more complex API endpoints
        // In a production app, you'd want to add endpoints like:
        // PATCH /api/Classes/{classId}/channels/{channelId} or similar
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
        
        // Update via API (simplified - just updating locally for now)
        // In a full implementation, you would need a specific API endpoint for channel updates
        console.log('Channel details updated locally:', { 
            name: newName, 
            description: newDesc 
        });
        
        // For now, we'll skip the backend update since it would require more complex API endpoints
        // In a production app, you'd want to add endpoints like:
        // PATCH /api/Classes/{classId}/channels/{channelId} or similar
        
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
        
        // Update via API
        const studentId = card.getAttribute('data-id');
        if (studentId) {
            fetch(`/api/Members/${studentId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                first_name: newName.split(' ')[0], // Assuming newName is "First Last"
                last_name: newName.split(' ').slice(1).join(' '), // Assuming newName is "First Last"
                email: newEmail,
                    grade: newGrade,
                    profilePicUrl: newImg
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Student ${studentId} updated successfully via API!`);
            })
            .catch(error => {
                console.error(`Error updating student ${studentId} via API:`, error);
            });
        } else {
            console.log('Student ID missing. Skipping database update.');
        }
    });
    
    form.querySelector('.cancel-btn').addEventListener('click', function() {
        card.innerHTML = originalContent;
        
        // Add the edit button back
        addEditButtonsToStudents();
    });
} 

/**
 * Fetch upcoming events from Flask API instead of Firebase directly
 */
function fetchUpcomingEventsFromFirebase(classId) {
    fetch(`/api/Events?classId=${classId}&limit=3&upcoming=true`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const events = data.events || [];
            
            // Format the events for UI compatibility
            const formattedEvents = events.map(eventData => {
                // Format date for display
                let eventDate = 'Unknown';
                if (eventData.startDate) {
                    const startDate = new Date(eventData.startDate);
                    
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
                return {
                    id: eventData.id,
                    title: eventData.title || 'Untitled Event',
                    date: eventDate,
                    time: eventData.time || formatTimeRange(eventData.startDate, eventData.endDate),
                    location: eventData.location || 'TBD',
                    type: eventData.type || 'event'
                };
            });
            
            updateUpcomingEvents(formattedEvents);
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
 * Fetch upcoming assignments from Flask API instead of Firebase directly
 */
function fetchUpcomingAssignmentsFromFirebase(classId) {
    const today = new Date();
    
    fetch(`/api/Assignments?classId=${classId}&upcoming=true&limit=3`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(assignments => {
            // Format the assignments for UI compatibility
            const formattedAssignments = assignments.map(assignmentData => {
                // Format time left
                let timeLeft = 'Unknown';
                if (assignmentData.dueDate) {
                    const dueDate = new Date(assignmentData.dueDate);
                    
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
                    const dueDate = new Date(assignmentData.dueDate);
                                  
                    formattedDueDate = dueDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
                
                // Create standardized assignment object
                return {
                    id: assignmentData.id,
                    title: assignmentData.title || 'Untitled Assignment',
                    due_date: formattedDueDate,
                    time_left: timeLeft,
                    type: assignmentData.type || 'homework',
                    status: assignmentData.status || 'not_started'
                };
            });
            
            updateUpcomingAssignments(formattedAssignments);
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
 * Fetch recent activity from Flask API instead of Firebase directly
 */
function fetchRecentActivityFromFirebase(classId) {
    fetch(`/api/Classes/${classId}/recent-activities`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const activities = data.activities || [];
            
            // Format the activities for UI compatibility
            const formattedActivities = activities.map(activity => {
                let formattedTime = 'Unknown time';
                if (activity.timestamp) {
                    const timestamp = new Date(activity.timestamp);
                    const now = new Date();
                    formattedTime = formatRelativeTime(timestamp, now);
                }
                
                return {
                    id: activity.id,
                    text: activity.text,
                    time: formattedTime,
                    icon: activity.icon || 'fas fa-info-circle',
                    type: activity.type || 'general'
                };
            });
            
            updateRecentActivity(formattedActivities);
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
 * Fetch class stats from Flask API instead of Firebase directly
 */
function fetchClassStatsFromFirebase(classId) {
    fetch(`/api/Classes/${classId}/stats`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const stats = data.stats || {
                assignments: 0,
                resources: 0,
                discussions: 0,
                average_grade: 'N/A'
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
 * Fetch assignments from Flask API instead of Firebase directly
 */
function fetchAssignmentsFromFirebase(classId) {
    // Show loading state
    document.getElementById('assignments-grid').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading assignments...</p>
        </div>
    `;
    
    fetch(`/api/Assignments?classId=${classId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(assignments => {
            if (assignments.length > 0) {
                // Format the assignments for UI compatibility
                const formattedAssignments = assignments.map(assignment => {
                    // Format dates and calculate time left
                    let formattedDueDate = 'No due date';
                    let timeLeft = '';
                    
                    if (assignment.dueDate) {
                        const dueDate = new Date(assignment.dueDate);
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
                    
                    return {
                        id: assignment.id,
                        title: assignment.title || 'Untitled Assignment',
                        description: assignment.description || 'No description available.',
                        due_date: formattedDueDate,
                        time_left: timeLeft,
                        type: assignment.type || 'homework',
                        status: assignment.status || 'not_started',
                        points: assignment.points || 0,
                        allowed_formats: assignment.allowed_formats || 'PDF',
                        resources: assignment.resources || [],
                        time_limit: assignment.time_limit
                    };
                });
                
                updateAssignmentsGrid(formattedAssignments);
                setupAssignmentFilters(formattedAssignments);
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
 * Fetch resources from Flask API instead of Firebase directly
 */
function fetchResourcesFromFirebase(classId) {
    // Show loading state
    document.getElementById('resources-grid').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading resources...</p>
        </div>
    `;
    
    // Use Flask API endpoint instead of Firebase SDK
    fetch(`/api/Resources?classId=${classId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const resources = data.resources || [];
            
            if (resources.length > 0) {
                // Format the resources for UI compatibility
                const formattedResources = resources.map(resource => ({
                    id: resource.id,
                    title: resource.title || 'Untitled Resource',
                    description: resource.description || 'No description available.',
                    type: resource.type || 'handouts',
                    date_added: resource.date_added || resource.createdAt || 'Unknown date',
                    file_type: resource.file_type || '',
                    file_size: resource.file_size || '',
                    duration: resource.duration || '',
                    thumbnail: resource.thumbnail || `https://via.placeholder.com/300x200/4361ee/ffffff?text=${resource.type || 'Resource'}`
                }));
                
                updateResourcesGrid(formattedResources);
                setupResourceFilters(formattedResources);
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
 * Fetch channel messages from Flask API instead of Firebase directly
 */
function fetchChannelMessagesFromFirebase(classId, channelId) {
    // Show loading indicator
    document.getElementById('messages-container').innerHTML = '<div class="loading-message">Loading messages...</div>';
    
    // Set up channel switching
    setupChannelSwitching();
    
    // Set up message sending
    setupMessageSending(classId, channelId);
    
    // Update current channel display
    updateCurrentChannelDisplay(channelId, getChannelNameFromId(channelId));
    
    // Fetch messages from API
    fetch(`/api/Messages?classId=${classId}&channelId=${channelId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const messages = data.messages || [];
            
            // Format the messages for UI compatibility
            const formattedMessages = messages.map(message => {
                // Format date and time
                let messageTime = 'Unknown time';
                let messageDate = 'Unknown date';
                
                if (message.sentAt) {
                    const sentDate = new Date(message.sentAt);
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
                
                return {
                    id: message.id,
                    senderId: message.senderId || 'unknown',
                    senderName: message.senderName || 'Unknown User',
                    senderProfilePic: message.senderProfilePic || 'https://via.placeholder.com/64',
                    content: message.content || '',
                    time: message.time || messageTime,
                    date: message.date || messageDate
                };
            });
            
            updateMessagesContainer(formattedMessages);
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
 * Fetch grades from Flask API instead of Firebase directly
 */
function fetchGradesFromFirebase(classId) {
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
    
    // Fetch grades from API
    fetch(`/api/Grades?classId=${classId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const grades = data.grades || [];
            
            if (grades.length > 0) {
                // Format the grades for UI compatibility
                const formattedGrades = grades.map(gradeData => {
                        // Format due date
                        let dueDate = 'Unknown';
                    if (gradeData.dueDate) {
                        const date = new Date(gradeData.dueDate);
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
                        id: gradeData.id,
                        assignment: gradeData.assignmentTitle || 'Unknown Assignment',
                        type: gradeData.assignmentType || 'unknown',
                            dueDate: dueDate,
                            status: gradeData.status || 'graded',
                            score: score,
                            grade: letterGrade
                        };
                    });
                
                updateGradesTable(formattedGrades);
                updateGradeSummary(formattedGrades);
                renderGradeChart(formattedGrades);
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
 * Fetch classmates from Flask API instead of Firebase directly
 */
function fetchClassmatesFromFirebase(classId) {
    // Show loading state
    document.getElementById('students-grid').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading students...</p>
        </div>
    `;
    
    fetch(`/api/Classes/${classId}/members?role=student`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const students = data.members || [];
            
            if (students.length > 0) {
                // Format the students for UI compatibility
                const formattedStudents = students.map(student => ({
                    id: student.id,
                    name: student.name || 'Unknown Student',
                    email: student.email || 'No email available',
                    profilePic: student.profilePic || 'https://via.placeholder.com/64',
                    grade: student.grade || 'Unknown Grade',
                    lastActive: formatLastActive(student.lastActive)
                }));
                
                updateStudentsGrid(formattedStudents);
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
 * Initialize mind web from Flask API instead of Firebase directly
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
    
    // Fetch mind web data from API
    fetch(`/api/Classes/${classId}/mindweb`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const mindWebData = data.mindweb;
            
            if (!mindWebData || !mindWebData.nodes) {
                container.innerHTML = '<div class="no-items-message">No mind web found for this class.</div>';
                return;
            }
            
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
 * Get current user ID from localStorage (same as profile and tree pages)
 */
function getCurrentUserId() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return userData.id || localStorage.getItem('userId');
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
 * Send a message using Flask API instead of Firebase directly
 */
function sendMessage(classId, channelId) {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    // Clear input
    messageInput.value = '';
    
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
        sentAt: now.toISOString(),
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
    
    // Save using API
    fetch('/api/Messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Message sent successfully with ID:', data.id);
        
        // Update the temporary element with the real ID and remove sending state
        messageElement.setAttribute('data-id', data.id);
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
 * Create a new channel via API
 */
function createNewChannel(classId, channelName, description, isPrivate) {
    // Generate a temporary ID for UI purposes
    const channelId = 'channel-' + Date.now();
    
    // Create the channel data
    const newChannelData = {
        name: channelName,
        description: description,
        type: 'general', // Default type
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

    // Create the channel via API
    fetch(`/api/Classes/${classId}/channels`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChannelData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`Channel ${channelName} created successfully!`);
        const actualChannelId = data.id || channelId;
        
        // Add to UI
        const channelsList = document.getElementById('channels-list');
        const newChannelElement = document.createElement('li');
        newChannelElement.className = 'channel';
        newChannelElement.setAttribute('data-channel', channelName); // For backwards compatibility
        newChannelElement.setAttribute('data-channel-id', actualChannelId);
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
            updateCurrentChannelDisplay(actualChannelId, channelName);
            fetchChannelMessagesFromFirebase(classId, actualChannelId);
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

/**
 * Create floating action buttons for adding content
 */
function createFloatingActionButtons(container) {
    const fabContainer = document.createElement('div');
    fabContainer.className = 'fab-container';
    
    const fabButtons = [
        {
            className: 'fab fab-add-assignment',
            icon: 'fas fa-clipboard-list',
            tooltip: 'Add Assignment',
            action: () => openAddModal('assignment')
        },
        {
            className: 'fab fab-add-resource',
            icon: 'fas fa-file-alt',
            tooltip: 'Add Resource',
            action: () => openAddModal('resource')
        },
        {
            className: 'fab fab-add-event',
            icon: 'fas fa-calendar-plus',
            tooltip: 'Add Event',
            action: () => openAddModal('event')
        },
        {
            className: 'fab fab-add-note',
            icon: 'fas fa-sticky-note',
            tooltip: 'Add Note',
            action: () => openAddModal('note')
        }
    ];
    
    fabButtons.forEach(fab => {
        const button = document.createElement('button');
        button.className = fab.className;
        button.innerHTML = `
            <i class="${fab.icon}"></i>
            <div class="fab-tooltip">${fab.tooltip}</div>
        `;
        button.addEventListener('click', fab.action);
        fabContainer.appendChild(button);
    });
    
    container.appendChild(fabContainer);
}

/**
 * Create confirmation modal for delete actions
 */
function createConfirmationModal() {
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.id = 'confirmation-modal';
    
    modal.innerHTML = `
        <div class="confirmation-content">
            <div class="confirmation-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="confirmation-title">Confirm Deletion</h3>
            <p class="confirmation-message">
                Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div class="confirmation-buttons">
                <button class="btn-cancel-delete">Cancel</button>
                <button class="btn-confirm-delete">Delete</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeConfirmationModal();
        }
    });
    
    modal.querySelector('.btn-cancel-delete').addEventListener('click', closeConfirmationModal);
}

/**
 * Create keyboard shortcuts hint
 */
function createKeyboardHint() {
    const hint = document.createElement('div');
    hint.className = 'keyboard-hint';
    hint.innerHTML = 'Press <strong>Esc</strong> to exit edit mode • <strong>Del</strong> to delete selected';
    
    document.body.appendChild(hint);
}

/**
 * Add delete buttons to all relevant content
 */
function addDeleteButtons() {
    // Add delete buttons to assignment cards
    addDeleteButtonsToCards('.assignment-card', 'assignment');
    addDeleteButtonsToCards('.assignment-item', 'assignment');
    
    // Add delete buttons to resource cards
    addDeleteButtonsToCards('.resource-card', 'resource');
    
    // Add delete buttons to event items
    addDeleteButtonsToCards('.event-item', 'event');
    
    // Add delete buttons to student cards (for removing from class)
    addDeleteButtonsToCards('.student-card', 'student');
    
    // Add delete buttons to channels
    addDeleteButtonsToCards('.channel', 'channel');
    
    // Add delete buttons to messages (if user owns them)
    addDeleteButtonsToCards('.message.current-user-message', 'message');
}

/**
 * Add delete buttons to specific card types
 */
function addDeleteButtonsToCards(selector, type) {
    const cards = document.querySelectorAll(selector);
    
    cards.forEach(card => {
        // Skip if delete button already exists
        if (card.querySelector('.delete-btn')) return;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.setAttribute('data-type', type);
        deleteBtn.setAttribute('data-id', card.getAttribute('data-id') || generateTempId());
        
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            const itemType = this.getAttribute('data-type');
            const itemId = this.getAttribute('data-id');
            const itemName = getItemName(card, itemType);
            
            showConfirmationModal(itemType, itemName, () => {
                deleteItem(itemType, itemId, card);
            });
        });
        
        card.style.position = 'relative';
        card.appendChild(deleteBtn);
    });
}

/**
 * Remove delete buttons
 */
function removeDeleteButtons() {
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
}

/**
 * Get item name for confirmation dialog
 */
function getItemName(card, type) {
    switch (type) {
        case 'assignment':
            return card.querySelector('.assignment-title')?.textContent || 'this assignment';
        case 'resource':
            return card.querySelector('.resource-title')?.textContent || 'this resource';
        case 'event':
            return card.querySelector('.event-title')?.textContent || 'this event';
        case 'student':
            return card.querySelector('.student-name')?.textContent || 'this student';
        case 'channel':
            return card.querySelector('.channel-name')?.textContent || 'this channel';
        case 'message':
            return 'this message';
        default:
            return 'this item';
    }
}

/**
 * Show confirmation modal
 */
function showConfirmationModal(itemType, itemName, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const title = modal.querySelector('.confirmation-title');
    const message = modal.querySelector('.confirmation-message');
    const confirmBtn = modal.querySelector('.btn-confirm-delete');
    
    title.textContent = `Delete ${capitalizeFirstLetter(itemType)}`;
    message.textContent = `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;
    
    // Remove existing listeners and add new one
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', function() {
        onConfirm();
        closeConfirmationModal();
    });
    
    modal.classList.add('active');
}

/**
 * Close confirmation modal
 */
function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.remove('active');
}

/**
 * Delete item with loading state and feedback
 */
function deleteItem(itemType, itemId, cardElement) {
    // Show loading state
    showLoadingOverlay(cardElement);
    
    // Simulate API call (replace with actual API endpoint)
    const apiEndpoint = getDeleteEndpoint(itemType, itemId);
    
    fetch(apiEndpoint, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Remove element with animation
        cardElement.style.transition = 'all 0.3s ease';
        cardElement.style.transform = 'translateX(-100%)';
        cardElement.style.opacity = '0';
        
        setTimeout(() => {
            cardElement.remove();
            showFeedbackToast('success', `${capitalizeFirstLetter(itemType)} deleted successfully`);
        }, 300);
    })
    .catch(error => {
        console.error(`Error deleting ${itemType}:`, error);
        hideLoadingOverlay(cardElement);
        showFeedbackToast('error', `Failed to delete ${itemType}. Please try again.`);
    });
}

/**
 * Get delete endpoint for item type
 */
function getDeleteEndpoint(itemType, itemId) {
    const classId = getClassIdFromUrl();
    
    switch (itemType) {
        case 'assignment':
            return `/api/Assignments/${itemId}`;
        case 'resource':
            return `/api/Resources/${itemId}`;
        case 'event':
            return `/api/Events/${itemId}`;
        case 'student':
            return `/api/Classes/${classId}/members/${itemId}`;
        case 'channel':
            return `/api/Classes/${classId}/channels/${itemId}`;
        case 'message':
            return `/api/Messages/${itemId}`;
        default:
            throw new Error(`Unknown item type: ${itemType}`);
    }
}

/**
 * Show loading overlay on element
 */
function showLoadingOverlay(element) {
    let overlay = element.querySelector('.loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        element.appendChild(overlay);
    }
    
    overlay.classList.add('active');
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay(element) {
    const overlay = element.querySelector('.loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Show feedback toast
 */
function showFeedbackToast(type, message) {
    // Remove existing toasts
    document.querySelectorAll('.feedback-toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `feedback-toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Remove keyboard shortcuts
 */
function removeKeyboardShortcuts() {
    document.removeEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    if (!window.isEditMode) return;
    
    switch (e.key) {
        case 'Escape':
            e.preventDefault();
            document.getElementById('toggle-edit-mode').click();
            break;
            
        case 'Delete':
        case 'Backspace':
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                // Delete currently selected/focused item
                const focusedElement = document.querySelector('.card:focus, .assignment-card:focus, .resource-card:focus');
                if (focusedElement) {
                    const deleteBtn = focusedElement.querySelector('.delete-btn');
                    if (deleteBtn) deleteBtn.click();
                }
            }
            break;
            
        case 'n':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Show add options (you can expand this)
                showFeedbackToast('info', 'Use the floating action buttons to add content');
            }
            break;
    }
}

/**
 * Open add modal for different content types
 */
function openAddModal(type) {
    switch (type) {
        case 'assignment':
            showFeedbackToast('info', 'Assignment creation modal would open here');
            // TODO: Implement assignment creation modal
            break;
        case 'resource':
            showFeedbackToast('info', 'Resource upload modal would open here');
            // TODO: Implement resource upload modal
            break;
        case 'event':
            showFeedbackToast('info', 'Event creation modal would open here');
            // TODO: Implement event creation modal
            break;
        case 'note':
            showFeedbackToast('info', 'Note creation modal would open here');
            // TODO: Implement note creation modal
            break;
    }
}

/**
 * Generate temporary ID for elements without IDs
 */
function generateTempId() {
    return 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 