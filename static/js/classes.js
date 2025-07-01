document.addEventListener('DOMContentLoaded', function() {
    console.log('Classes page loaded');
    
    // Initialize the page
    initializeClassesPage();
    
    // Event listeners
    setupEventListeners();
});

let allClasses = [];
let filteredClasses = [];
let currentView = 'grid';
let currentClassSettings = null;

function setupEventListeners() {
    // Header buttons
    document.getElementById('create-class-btn').addEventListener('click', showCreateClassModal);
    document.getElementById('join-class-btn').addEventListener('click', showJoinClassModal);
    
    // View toggle buttons
    document.getElementById('grid-view-btn').addEventListener('click', () => switchView('grid'));
    document.getElementById('list-view-btn').addEventListener('click', () => switchView('list'));
    
    // Form submissions
    document.getElementById('create-class-form').addEventListener('submit', handleCreateClass);
    document.getElementById('join-class-form').addEventListener('submit', handleJoinClass);
    
    // Filter and search
    document.getElementById('role-filter').addEventListener('change', filterClasses);
    document.getElementById('subject-filter').addEventListener('change', filterClasses);
    document.getElementById('status-filter').addEventListener('change', filterClasses);
    document.getElementById('class-search').addEventListener('input', debounce(filterClasses, 300));
    
    // Modal close events
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            hideAllModals();
        }
    });
    
    // Escape key closes modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllModals();
        }
    });
    
    // Settings tabs
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tab-btn')) {
            switchTab(e.target.dataset.tab);
        }
    });
}

async function initializeClassesPage() {
    showLoadingState();
    try {
        await loadUserClasses();
        await loadQuickStats();
        hideLoadingState();
    } catch (error) {
        console.error('Error initializing classes page:', error);
        showErrorState();
    }
}

async function loadUserClasses() {
    try {
        const response = await fetch('/api/classes');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.classes) {
            allClasses = result.classes;
            filteredClasses = [...allClasses];
            displayClasses();
        } else {
            console.error('Error loading classes:', result.error);
            allClasses = [];
            filteredClasses = [];
            displayClasses();
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        allClasses = [];
        filteredClasses = [];
        displayClasses();
    }
}

async function loadQuickStats() {
    try {
        const totalClasses = allClasses.length;
        const teachingClasses = allClasses.filter(c => c.user_role === 'teacher').length;
        const enrolledClasses = allClasses.filter(c => c.user_role === 'student').length;
        
        // Calculate pending assignments (mock for now)
        const pendingAssignments = Math.floor(Math.random() * 10);
        
        document.getElementById('total-classes').textContent = totalClasses;
        document.getElementById('teaching-classes').textContent = teachingClasses;
        document.getElementById('enrolled-classes').textContent = enrolledClasses;
        document.getElementById('pending-assignments').textContent = pendingAssignments;
    } catch (error) {
        console.error('Error loading quick stats:', error);
    }
}

function displayClasses() {
    const gridContainer = document.getElementById('classes-grid');
    const listContainer = document.getElementById('classes-list');
    const emptyState = document.getElementById('empty-state');
    
    if (filteredClasses.length === 0) {
        gridContainer.style.display = 'none';
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    if (currentView === 'grid') {
        gridContainer.style.display = 'grid';
        listContainer.style.display = 'none';
        displayClassesGrid();
    } else {
        gridContainer.style.display = 'none';
        listContainer.style.display = 'block';
        displayClassesList();
    }
}

function displayClassesGrid() {
    const grid = document.getElementById('classes-grid');
    grid.innerHTML = '';
    
    filteredClasses.forEach(classData => {
        const classCard = createClassCard(classData);
        grid.appendChild(classCard);
    });
}

function displayClassesList() {
    const listBody = document.getElementById('list-body');
    listBody.innerHTML = '';
    
    filteredClasses.forEach(classData => {
        const listItem = createClassListItem(classData);
        listBody.appendChild(listItem);
    });
}

function createClassCard(classData) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.classId = classData.id;
    
    const userRole = classData.user_role || 'student';
    const stats = classData.stats || { assignments: 0, resources: 0, discussions: 0 };
    const recentActivities = classData.recentActivities || [];
    
    // Format last activity
    let lastActivity = 'No recent activity';
    if (recentActivities.length > 0) {
        const activity = recentActivities[0];
        lastActivity = activity.time || 'Recently';
    }
    
    card.innerHTML = `
        <div class="class-card-header">
            <div class="role-badge role-${userRole}">${userRole}</div>
            <h3 class="class-name">${escapeHtml(classData.name)}</h3>
            <div class="class-meta">
                <div class="meta-item">
                    <i class="fas fa-user-tie"></i>
                    <span>${escapeHtml(classData.teacherName || classData.teacher || 'Unknown')}</span>
                </div>
                ${classData.period ? `
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${escapeHtml(classData.period)}</span>
                </div>
                ` : ''}
                ${classData.subject ? `
                <div class="meta-item">
                    <i class="fas fa-book"></i>
                    <span>${escapeHtml(classData.subject)}</span>
                </div>
                ` : ''}
            </div>
        </div>
        <div class="class-card-body">
            <p class="class-description">${escapeHtml(classData.description || 'No description available')}</p>
            <div class="class-stats">
                <div class="stat-item">
                    <div class="stat-value">${stats.assignments || 0}</div>
                    <div class="stat-label">Assignments</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.resources || 0}</div>
                    <div class="stat-label">Resources</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${classData.studentCount || 0}</div>
                    <div class="stat-label">Students</div>
                </div>
            </div>
            <div class="class-actions">
                <button class="btn btn-primary" onclick="openClass('${classData.id}')">
                    <i class="fas fa-external-link-alt"></i>
                    Open
                </button>
                ${userRole === 'teacher' ? `
                <button class="btn btn-outline" onclick="showClassSettings('${classData.id}')">
                    <i class="fas fa-cog"></i>
                    Settings
                </button>
                ` : userRole === 'student' ? `
                <button class="btn btn-outline" onclick="leaveClass('${classData.id}')">
                    <i class="fas fa-sign-out-alt"></i>
                    Leave
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    return card;
}

function createClassListItem(classData) {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.dataset.classId = classData.id;
    
    const userRole = classData.user_role || 'student';
    
    item.innerHTML = `
        <div class="list-col" data-label="Class">
            <div class="list-class-info">
                <div class="list-class-name">${escapeHtml(classData.name)}</div>
                <div class="list-class-description">${escapeHtml(classData.description || 'No description')}</div>
            </div>
        </div>
        <div class="list-col" data-label="Teacher">${escapeHtml(classData.teacherName || classData.teacher || 'Unknown')}</div>
        <div class="list-col" data-label="Subject">${escapeHtml(classData.subject || 'N/A')}</div>
        <div class="list-col" data-label="Students">${classData.studentCount || 0}</div>
        <div class="list-col" data-label="Role">
            <span class="role-badge role-${userRole}">${userRole}</span>
        </div>
        <div class="list-col" data-label="Actions">
            <div class="list-actions">
                <button class="btn btn-primary" onclick="openClass('${classData.id}')">
                    <i class="fas fa-external-link-alt"></i>
                    Open
                </button>
                ${userRole === 'teacher' ? `
                <button class="btn btn-outline" onclick="showClassSettings('${classData.id}')">
                    <i class="fas fa-cog"></i>
                </button>
                ` : userRole === 'student' ? `
                <button class="btn btn-outline" onclick="leaveClass('${classData.id}')">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    return item;
}

function switchView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${view}-view-btn`).classList.add('active');
    
    // Display classes in new view
    displayClasses();
}

function filterClasses() {
    const roleFilter = document.getElementById('role-filter').value;
    const subjectFilter = document.getElementById('subject-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const searchQuery = document.getElementById('class-search').value.toLowerCase().trim();
    
    filteredClasses = allClasses.filter(classData => {
        // Role filter
        if (roleFilter && classData.user_role !== roleFilter) {
            return false;
        }
        
        // Subject filter
        if (subjectFilter && classData.subject !== subjectFilter) {
            return false;
        }
        
        // Status filter (for future implementation)
        if (statusFilter && classData.status !== statusFilter) {
            return false;
        }
        
        // Search filter
        if (searchQuery) {
            const searchFields = [
                classData.name || '',
                classData.description || '',
                classData.teacherName || '',
                classData.teacher || '',
                classData.subject || '',
                classData.period || ''
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });
    
    displayClasses();
}

// Modal functions
function showCreateClassModal() {
    document.getElementById('create-class-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideCreateClassModal() {
    document.getElementById('create-class-modal').style.display = 'none';
    document.getElementById('create-class-form').reset();
    document.body.style.overflow = 'auto';
}

function showJoinClassModal() {
    document.getElementById('join-class-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideJoinClassModal() {
    document.getElementById('join-class-modal').style.display = 'none';
    document.getElementById('join-class-form').reset();
    document.body.style.overflow = 'auto';
}

function showClassSettings(classId) {
    const classData = allClasses.find(c => c.id === classId);
    if (!classData) {
        showNotification('Class not found', 'error');
        return;
    }
    
    currentClassSettings = classData;
    populateSettingsModal(classData);
    document.getElementById('class-settings-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideClassSettingsModal() {
    document.getElementById('class-settings-modal').style.display = 'none';
    currentClassSettings = null;
    document.body.style.overflow = 'auto';
}

function hideAllModals() {
    hideCreateClassModal();
    hideJoinClassModal();
    hideClassSettingsModal();
}

async function handleCreateClass(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    try {
        // Collect form data
        const formData = new FormData(form);
        const classData = {
            name: formData.get('name'),
            description: formData.get('description'),
            subject: formData.get('subject'),
            period: formData.get('period'),
            year_group: formData.get('year_group'),
            visibility: formData.get('visibility'),
            office_hours: formData.get('office_hours') ? formData.get('office_hours').split('\n').filter(h => h.trim()) : [],
            syllabus: formData.get('syllabus')
        };
        
        // Validate required fields
        if (!classData.name || !classData.description || !classData.subject) {
            throw new Error('Please fill in all required fields');
        }
        
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(classData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Class created successfully!', 'success');
            hideCreateClassModal();
            
            // Refresh classes list
            await loadUserClasses();
            await loadQuickStats();
            
            // Show the new class
            if (result.class_id) {
                setTimeout(() => {
                    openClass(result.class_id);
                }, 1000);
            }
        } else {
            throw new Error(result.error || 'Failed to create class');
        }
    } catch (error) {
        console.error('Error creating class:', error);
        showNotification(error.message || 'Failed to create class', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleJoinClass(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        const joinCode = formData.get('join_code').toUpperCase().trim();
        
        if (!joinCode || joinCode.length !== 6) {
            throw new Error('Please enter a valid 6-character class code');
        }
        
        const response = await fetch('/api/classes/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ join_code: joinCode })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(`Successfully joined ${result.class_data?.name || 'class'}!`, 'success');
            hideJoinClassModal();
            
            // Refresh classes list
            await loadUserClasses();
            await loadQuickStats();
            
            // Show the joined class
            if (result.class_data?.id) {
                setTimeout(() => {
                    openClass(result.class_data.id);
                }, 1000);
            }
        } else {
            throw new Error(result.error || 'Failed to join class');
        }
    } catch (error) {
        console.error('Error joining class:', error);
        showNotification(error.message || 'Failed to join class', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function openClass(classId) {
    // Navigate to class dashboard
    window.location.href = `/class_dashboard/${classId}`;
}

async function leaveClass(classId) {
    const classData = allClasses.find(c => c.id === classId);
    const className = classData?.name || 'this class';
    
    if (!confirm(`Are you sure you want to leave ${className}? You'll need a new class code to rejoin.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/classes/${classId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(`Successfully left ${className}`, 'success');
            
            // Refresh classes list
            await loadUserClasses();
            await loadQuickStats();
        } else {
            throw new Error(result.error || 'Failed to leave class');
        }
    } catch (error) {
        console.error('Error leaving class:', error);
        showNotification(error.message || 'Failed to leave class', 'error');
    }
}

function populateSettingsModal(classData) {
    // Set current join code
    const joinCodeInput = document.getElementById('current-join-code');
    if (joinCodeInput) {
        joinCodeInput.value = classData.settings?.joinCode || 'N/A';
    }
    
    // Populate general tab form
    const generalTab = document.getElementById('general-tab');
    generalTab.innerHTML = `
        <form id="update-class-form">
            <input type="hidden" id="update-class-id" name="class_id" value="${classData.id}">
            
            <div class="form-group">
                <label for="update-class-name">Class Name*</label>
                <input type="text" id="update-class-name" name="name" value="${escapeHtml(classData.name)}" required maxlength="100">
            </div>
            
            <div class="form-group">
                <label for="update-class-description">Description*</label>
                <textarea id="update-class-description" name="description" required rows="3" maxlength="500">${escapeHtml(classData.description || '')}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="update-class-subject">Subject*</label>
                    <select id="update-class-subject" name="subject" required>
                        <option value="">Select Subject</option>
                        <option value="Mathematics" ${classData.subject === 'Mathematics' ? 'selected' : ''}>Mathematics</option>
                        <option value="Science" ${classData.subject === 'Science' ? 'selected' : ''}>Science</option>
                        <option value="English" ${classData.subject === 'English' ? 'selected' : ''}>English</option>
                        <option value="History" ${classData.subject === 'History' ? 'selected' : ''}>History</option>
                        <option value="Computer Science" ${classData.subject === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
                        <option value="Art" ${classData.subject === 'Art' ? 'selected' : ''}>Art</option>
                        <option value="Music" ${classData.subject === 'Music' ? 'selected' : ''}>Music</option>
                        <option value="Physical Education" ${classData.subject === 'Physical Education' ? 'selected' : ''}>Physical Education</option>
                        <option value="Foreign Language" ${classData.subject === 'Foreign Language' ? 'selected' : ''}>Foreign Language</option>
                        <option value="Other" ${classData.subject === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="update-class-period">Period/Time</label>
                    <input type="text" id="update-class-period" name="period" value="${escapeHtml(classData.period || '')}" maxlength="50">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="update-class-year-group">Grade Level</label>
                    <input type="text" id="update-class-year-group" name="year_group" value="${escapeHtml(classData.yearGroup || '')}" maxlength="20">
                </div>
                <div class="form-group">
                    <label for="update-class-visibility">Visibility</label>
                    <select id="update-class-visibility" name="visibility">
                        <option value="school" ${classData.settings?.visibility === 'school' ? 'selected' : ''}>School Only</option>
                        <option value="public" ${classData.settings?.visibility === 'public' ? 'selected' : ''}>Public</option>
                        <option value="private" ${classData.settings?.visibility === 'private' ? 'selected' : ''}>Private (Invite Only)</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="update-office-hours">Office Hours</label>
                <textarea id="update-office-hours" name="office_hours" rows="3" maxlength="200">${escapeHtml((classData.teacherOfficeHours || []).join('\n'))}</textarea>
            </div>
            
            <div class="form-group">
                <label for="update-class-syllabus">Syllabus/Course Overview</label>
                <textarea id="update-class-syllabus" name="syllabus" rows="4" maxlength="1000">${escapeHtml(classData.syllabus || '')}</textarea>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="hideClassSettingsModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i>
                    Save Changes
                </button>
            </div>
        </form>
    `;
    
    // Add form submission handler
    document.getElementById('update-class-form').addEventListener('submit', handleUpdateClass);
    
    // Load members
    loadClassMembers(classData.id);
}

async function handleUpdateClass(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        const classId = formData.get('class_id');
        const updateData = {
            name: formData.get('name'),
            description: formData.get('description'),
            subject: formData.get('subject'),
            period: formData.get('period'),
            year_group: formData.get('year_group'),
            visibility: formData.get('visibility'),
            office_hours: formData.get('office_hours') ? formData.get('office_hours').split('\n').filter(h => h.trim()) : [],
            syllabus: formData.get('syllabus')
        };
        
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Class updated successfully!', 'success');
            
            // Refresh classes list
            await loadUserClasses();
            
            // Update current settings
            const updatedClass = allClasses.find(c => c.id === classId);
            if (updatedClass) {
                currentClassSettings = updatedClass;
            }
        } else {
            throw new Error(result.error || 'Failed to update class');
        }
    } catch (error) {
        console.error('Error updating class:', error);
        showNotification(error.message || 'Failed to update class', 'error');
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function loadClassMembers(classId) {
    try {
        const classData = allClasses.find(c => c.id === classId);
        const members = classData?.members || [];
        
        const membersList = document.getElementById('class-members-list');
        membersList.innerHTML = '';
        
        if (members.length === 0) {
            membersList.innerHTML = '<p class="text-muted">No members found.</p>';
            return;
        }
        
        members.forEach(member => {
            const memberItem = document.createElement('div');
            memberItem.className = 'member-item';
            
            const initials = member.userId ? member.userId.substring(0, 2).toUpperCase() : '??';
            
            memberItem.innerHTML = `
                <div class="member-info">
                    <div class="member-avatar">${initials}</div>
                    <div class="member-details">
                        <h4>${member.userId}</h4>
                        <p>${member.role} • Joined ${formatDate(member.joinedAt)}</p>
                    </div>
                </div>
                <div class="member-actions">
                    ${member.role !== 'teacher' ? `
                    <button class="btn btn-outline btn-sm" onclick="removeMember('${classId}', '${member.userId}')">
                        <i class="fas fa-user-minus"></i>
                        Remove
                    </button>
                    ` : ''}
                </div>
            `;
            
            membersList.appendChild(memberItem);
        });
    } catch (error) {
        console.error('Error loading class members:', error);
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function regenerateJoinCode() {
    if (!currentClassSettings) return;
    
    if (!confirm('Are you sure you want to regenerate the join code? The old code will no longer work.')) {
        return;
    }
    
    try {
        // This would be implemented as an API endpoint
        showNotification('Join code regeneration not yet implemented', 'info');
    } catch (error) {
        console.error('Error regenerating join code:', error);
        showNotification('Failed to regenerate join code', 'error');
    }
}

async function archiveClass() {
    if (!currentClassSettings) return;
    
    if (!confirm(`Are you sure you want to archive ${currentClassSettings.name}? This will hide it from active classes.`)) {
        return;
    }
    
    try {
        // This would be implemented as an API endpoint
        showNotification('Class archiving not yet implemented', 'info');
    } catch (error) {
        console.error('Error archiving class:', error);
        showNotification('Failed to archive class', 'error');
    }
}

async function deleteClass() {
    if (!currentClassSettings) return;
    
    const className = currentClassSettings.name;
    
    if (!confirm(`Are you sure you want to DELETE ${className}? This action cannot be undone and will permanently remove all class data.`)) {
        return;
    }
    
    const confirmText = prompt(`Type "${className}" to confirm deletion:`);
    if (confirmText !== className) {
        showNotification('Class name did not match. Deletion cancelled.', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/classes/${currentClassSettings.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(`${className} has been deleted`, 'success');
            hideClassSettingsModal();
            
            // Refresh classes list
            await loadUserClasses();
            await loadQuickStats();
        } else {
            throw new Error(result.error || 'Failed to delete class');
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        showNotification(error.message || 'Failed to delete class', 'error');
    }
}

// State management functions
function showLoadingState() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('classes-grid').style.display = 'none';
    document.getElementById('classes-list').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loading-state').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('classes-grid').style.display = 'none';
    document.getElementById('classes-list').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
}

function showErrorState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('classes-grid').style.display = 'none';
    document.getElementById('classes-list').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch (error) {
        return 'Unknown';
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Allow manual dismiss on click
    notification.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
} 