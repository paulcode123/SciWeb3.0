document.addEventListener('DOMContentLoaded', function() {
    console.log('NHS Teachers Portal loaded');
    
    // Load pending credit reviews
    loadPendingCredits();
    
    // Handle credit review actions
    document.addEventListener('click', function(e) {
        if (e.target.closest('.approve-credit-btn')) {
            e.preventDefault();
            const button = e.target.closest('.approve-credit-btn');
            const creditId = button.dataset.creditId;
            if (creditId) {
                reviewCredit(creditId, 'approve');
            }
        } else if (e.target.closest('.reject-credit-btn')) {
            e.preventDefault();
            const button = e.target.closest('.reject-credit-btn');
            const creditId = button.dataset.creditId;
            if (creditId) {
                reviewCredit(creditId, 'reject');
            }
        } else if (e.target.closest('.approve-all-btn')) {
            e.preventDefault();
            approveAllPendingCredits();
        }
    });
    
    // Handle event creation form if exists
    const eventForm = document.getElementById('create-event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventCreation);
    }
});

async function loadPendingCredits() {
    try {
        const response = await fetch('/api/nhs/credits/list?status=pending&limit=20');
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.success && result.credits) {
            updatePendingCreditsTable(result.credits);
            updatePendingCount(result.credits.length);
        }
    } catch (error) {
        console.error('Error loading pending credits:', error);
    }
}

function updatePendingCreditsTable(credits) {
    const tableBody = document.querySelector('.nhs-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    credits.forEach(credit => {
        const row = document.createElement('tr');
        
        const serviceTypeMap = {
            'community': 'Community',
            'tutoring': 'Tutoring',
            'leadership': 'Leadership',
            'fundraising': 'Fundraising',
            'mentoring': 'Mentoring'
        };
        
        const serviceType = serviceTypeMap[credit.service_type] || credit.service_type;
        const badgeClass = {
            'community': 'nhs-badge-primary',
            'tutoring': 'nhs-badge-accent',
            'leadership': 'nhs-badge-gold',
            'fundraising': 'nhs-badge-warning',
            'mentoring': 'nhs-badge-info'
        }[credit.service_type] || 'nhs-badge-secondary';
        
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center;">
                    <img src="https://randomuser.me/api/portraits/women/1.jpg" alt="${credit.student_name || 'Student'}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 0.5rem;">
                    ${credit.student_name || 'Unknown Student'}
                </div>
            </td>
            <td>${credit.activity_title}</td>
            <td>${formatDate(credit.date)}</td>
            <td>${credit.hours}</td>
            <td><span class="nhs-badge ${badgeClass}">${serviceType}</span></td>
            <td>
                <button class="nhs-btn nhs-btn-success approve-credit-btn" data-credit-id="${credit.id}" style="font-size: 0.8rem; padding: 0.3rem 0.6rem; margin-right: 0.25rem;">Approve</button>
                <button class="nhs-btn nhs-btn-danger reject-credit-btn" data-credit-id="${credit.id}" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Reject</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updatePendingCount(count) {
    // Update the pending reviews stat
    const pendingStatCards = document.querySelectorAll('.nhs-stat-card');
    pendingStatCards.forEach(card => {
        const label = card.querySelector('.nhs-stat-label').textContent.toLowerCase();
        if (label.includes('pending')) {
            const valueElement = card.querySelector('.nhs-stat-value');
            valueElement.textContent = count;
        }
    });
    
    // Update any "47 submissions pending" text
    const pendingText = document.querySelector('.quick-actions p');
    if (pendingText && pendingText.textContent.includes('submissions pending')) {
        pendingText.textContent = `${count} submissions pending your review`;
    }
}

async function reviewCredit(creditId, action) {
    const comments = prompt(`Please provide comments for ${action}ing this credit:`);
    if (comments === null) return;
    
    try {
        const response = await fetch('/api/nhs/credits/review', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                credit_id: creditId,
                action: action,
                comments: comments
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(`Credit ${action}d successfully`, 'success');
            loadPendingCredits(); // Refresh the list
        } else {
            showNotification(result.error || `Failed to ${action} credit`, 'error');
        }
    } catch (error) {
        console.error('Error reviewing credit:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function approveAllPendingCredits() {
    const confirmation = confirm('Are you sure you want to approve all pending credits? This action cannot be undone.');
    if (!confirmation) return;
    
    const pendingCredits = document.querySelectorAll('.approve-credit-btn');
    if (pendingCredits.length === 0) {
        showNotification('No pending credits to approve', 'info');
        return;
    }
    
    let approvedCount = 0;
    let failedCount = 0;
    
    // Show progress
    showNotification(`Approving ${pendingCredits.length} credits...`, 'info');
    
    for (const button of pendingCredits) {
        const creditId = button.dataset.creditId;
        
        try {
            const response = await fetch('/api/nhs/credits/review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    credit_id: creditId,
                    action: 'approve',
                    comments: 'Bulk approved by teacher'
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                approvedCount++;
                // Remove the row
                const row = button.closest('tr');
                if (row) {
                    row.style.opacity = '0.3';
                }
            } else {
                failedCount++;
            }
        } catch (error) {
            failedCount++;
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Show results
    if (failedCount === 0) {
        showNotification(`Successfully approved ${approvedCount} credits`, 'success');
    } else {
        showNotification(`Approved ${approvedCount} credits, ${failedCount} failed`, 'warning');
    }
    
    // Refresh the table
    setTimeout(() => {
        loadPendingCredits();
    }, 1000);
}

async function handleEventCreation(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const eventData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/nhs/events/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification('Event created successfully', 'success');
            e.target.reset();
        } else {
            showNotification(result.error || 'Failed to create event', 'error');
        }
    } catch (error) {
        console.error('Error creating event:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 400px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    
    const colors = {
        success: '#2ECC71',
        error: '#E74C3C',
        warning: '#F39C12',
        info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
} 