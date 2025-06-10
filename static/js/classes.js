document.addEventListener('DOMContentLoaded', function() {
    console.log('Classes page loaded');
    
    // Initialize the page
    initializeClassesPage();
    
    // Event listeners
    document.getElementById('create-class-btn').addEventListener('click', showCreateClassModal);
    document.getElementById('join-class-btn').addEventListener('click', showJoinClassModal);
    
    // Form submissions
    document.getElementById('create-class-form').addEventListener('submit', handleCreateClass);
    document.getElementById('join-class-form').addEventListener('submit', handleJoinClass);
    
    // Filter and search
    document.getElementById('role-filter').addEventListener('change', filterClasses);
    document.getElementById('subject-filter').addEventListener('change', filterClasses);
    document.getElementById('class-search').addEventListener('input', filterClasses);
    
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
});

let allClasses = [];
let filteredClasses = [];

async function initializeClassesPage() {
    showLoadingState();
    await loadUserClasses();
    hideLoadingState();
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
            displayClasses(filteredClasses);
        } else {
            console.error('Error loading classes:', result.error);
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        showErrorState();
    }
}

function displayClasses(classes) {
    const grid = document.getElementById('classes-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (classes.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    grid.innerHTML = '';
    
    classes.forEach(classData => {
        const classCard = createClassCard(classData);
        grid.appendChild(classCard);
    });
}

function createClassCard(classData) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.classId = classData.id;
    
    const userRole = classData.user_role || 'student';
    const stats = classData.stats || { assignments: 0, resources: 0, discussions: 0 };
    
    card.innerHTML = `
        <div class="class-card-header">
            <div class="role-badge role-${userRole}">${userRole}</div>
            <h3 class="class-name">${classData.name}</h3>
            <div class="class-meta">
                <div class="meta-item">
                    <i class="fas fa-user-tie"></i>
                    <span>${classData.teacherName || classData.teacher || 'Unknown'}</span>
                </div>
                ${classData.period ? `
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>${classData.period}</span>
                </div>
                ` : ''}
            </div>
        </div>
        <div class="class-card-body">
            <p class="class-description">${classData.description || 'No description available'}</p>
            <div class="class-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.assignments || 0}</span>
                    <span class="stat-label">Assignments</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.resources || 0}</span>
                    <span class="stat-label">Resources</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${classData.studentCount || 0}</span>
                    <span class="stat-label">Students</span>
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

function filterClasses() {
    const roleFilter = document.getElementById('role-filter').value;
    const subjectFilter = document.getElementById('subject-filter').value;
    const searchQuery = document.getElementById('class-search').value.toLowerCase();
    
    filteredClasses = allClasses.filter(classData => {
        // Role filter
        if (roleFilter && classData.user_role !== roleFilter) {
            return false;
        }
        
        // Subject filter
        if (subjectFilter && classData.subject !== subjectFilter) {
            return false;
        }
        
        // Search filter
        if (searchQuery) {
            const searchFields = [
                classData.name,
                classData.description,
                classData.teacherName,
                classData.subject
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchQuery)) {
                return false;
            }
        }
        
        return true;
    });
    
    displayClasses(filteredClasses);
}

// Modal functions
function showCreateClassModal() {
    document.getElementById('create-class-modal').style.display = 'block';
}

function hideCreateClassModal() {
    document.getElementById('create-class-modal').style.display = 'none';
    document.getElementById('create-class-form').reset();
}

function showJoinClassModal() {
    document.getElementById('join-class-modal').style.display = 'block';
}

function hideJoinClassModal() {
    document.getElementById('join-class-modal').style.display = 'none';
    document.getElementById('join-class-form').reset();
}

function hideAllModals() {
    hideCreateClassModal();
    hideJoinClassModal();
}

// Form handlers
async function handleCreateClass(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Class created successfully!', 'success');
            hideCreateClassModal();
            
            // Add new class to the list
            allClasses.unshift(result.class_data);
            filterClasses();
        } else {
            showNotification(result.error || 'Failed to create class', 'error');
        }
    } catch (error) {
        console.error('Error creating class:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleJoinClass(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Joining...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/classes/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            hideJoinClassModal();
            
            // Reload classes to show the newly joined class
            await loadUserClasses();
        } else {
            showNotification(result.error || 'Failed to join class', 'error');
        }
    } catch (error) {
        console.error('Error joining class:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Class actions
function openClass(classId) {
    window.location.href = `/class_dashboard/${classId}`;
}

async function leaveClass(classId) {
    if (!confirm('Are you sure you want to leave this class?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/classes/${classId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            
            // Remove class from the list
            allClasses = allClasses.filter(c => c.id !== classId);
            filterClasses();
        } else {
            showNotification(result.error || 'Failed to leave class', 'error');
        }
    } catch (error) {
        console.error('Error leaving class:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function showClassSettings(classId) {
    // Placeholder for class settings modal
    showNotification('Class settings feature coming soon!', 'info');
}

// State management
function showLoadingState() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loading-state').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('classes-grid').style.display = 'none';
}

function showErrorState() {
    document.getElementById('loading-state').style.display = 'none';
    const grid = document.getElementById('classes-grid');
    grid.innerHTML = `
        <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--danger-color);">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Error Loading Classes</h3>
            <p>Unable to load your classes. Please check your internet connection and try again.</p>
            <button class="btn btn-primary" onclick="initializeClassesPage()">
                <i class="fas fa-refresh"></i>
                Retry
            </button>
        </div>
    `;
    grid.style.display = 'grid';
}

// Notification system
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
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

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
} 