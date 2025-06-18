document.addEventListener('DOMContentLoaded', function() {
    console.log('NHS Students Portal loaded');
    
    // Load student's NHS statistics and progress
    loadStudentStats();
    
    // Load recent activity
    loadRecentActivity();
    
    // Handle event signup buttons
    document.addEventListener('click', function(e) {
        if (e.target.id === 'event-signup-1' || e.target.id === 'event-signup-2') {
            const eventId = e.target.dataset.eventId;
            if (eventId) {
                signupForEvent(eventId, e.target);
            }
        } else if (e.target.id === 'event-calendar-1') {
            const eventId = e.target.dataset.eventId;
            addToCalendar(eventId, e.target);
        } else if (e.target.id === 'browse-opportunities') {
            browseOpportunities();
        }
    });
    
    // Animate progress ring on load
    setTimeout(() => {
        const progressFill = document.querySelector('.progress-ring-fill');
        if (progressFill) {
            const progress = 74; // 74% progress
            const circumference = 2 * Math.PI * 45; // radius = 45
            const offset = circumference - (progress / 100) * circumference;
            progressFill.style.strokeDashoffset = offset;
        }
    }, 500);
});

async function loadStudentStats() {
    try {
        const response = await fetch('/api/nhs/members/stats');
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.success && result.stats) {
            updateStudentDashboard(result.stats);
        }
    } catch (error) {
        console.error('Error loading student stats:', error);
    }
}

function updateStudentDashboard(stats) {
    // Update progress ring
    const progressRing = document.querySelector('.progress-ring-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressRing && progressText) {
        const goal = 25; // Default goal
        const approved = stats.approved_credits || 0;
        const percentage = Math.min(100, Math.round((approved / goal) * 100));
        
        // Update ring (283 is the circumference for r=45)
        const circumference = 283;
        const offset = circumference - (percentage / 100) * circumference;
        progressRing.style.strokeDashoffset = offset;
        
        // Update text
        progressText.textContent = `${percentage}%`;
    }
    
    // Update stat cards
    const statCards = document.querySelectorAll('.nhs-stat-card');
    
    statCards.forEach(card => {
        const label = card.querySelector('.nhs-stat-label').textContent.toLowerCase();
        const valueElement = card.querySelector('.nhs-stat-value');
        
        if (label.includes('credits earned')) {
            valueElement.textContent = stats.approved_credits || 0;
        } else if (label.includes('credits needed')) {
            const goal = 25;
            const remaining = Math.max(0, goal - (stats.approved_credits || 0));
            valueElement.textContent = remaining;
        } else if (label.includes('pending review')) {
            valueElement.textContent = stats.pending_credits || 0;
        } else if (label.includes('rank')) {
            valueElement.textContent = stats.rank || '--';
        }
    });
    
    // Update credits completed text
    const creditsText = document.querySelector('p');
    if (creditsText && creditsText.innerHTML.includes('/')) {
        const approved = stats.approved_credits || 0;
        creditsText.innerHTML = `<strong>${approved} / 25</strong> credits completed`;
    }
    
    // Update credit breakdown by category
    updateCreditBreakdown(stats.credits_by_type || {});
}

function updateCreditBreakdown(creditsByType) {
    const communityCard = document.querySelector('.credit-breakdown .community-service');
    const tutoringCard = document.querySelector('.credit-breakdown .tutoring');
    const leadershipCard = document.querySelector('.credit-breakdown .leadership');
    
    if (communityCard) {
        const approved = creditsByType.community?.approved || 0;
        communityCard.querySelector('.credits-count').textContent = `${approved} / 10`;
    }
    
    if (tutoringCard) {
        const approved = creditsByType.tutoring?.approved || 0;
        tutoringCard.querySelector('.credits-count').textContent = `${approved} / 5`;
    }
    
    if (leadershipCard) {
        const approved = creditsByType.leadership?.approved || 0;
        leadershipCard.querySelector('.credits-count').textContent = `${approved} / 10`;
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/nhs/credits/list?limit=5');
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.success && result.credits) {
            updateRecentActivityTable(result.credits);
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function updateRecentActivityTable(credits) {
    const tableBody = document.querySelector('.nhs-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    credits.forEach(credit => {
        const row = document.createElement('tr');
        
        const statusClass = {
            'pending': 'nhs-badge-warning',
            'approved': 'nhs-badge-success',
            'rejected': 'nhs-badge-danger'
        }[credit.status] || 'nhs-badge-secondary';
        
        const statusText = credit.status.charAt(0).toUpperCase() + credit.status.slice(1);
        
        const serviceTypeMap = {
            'community': 'Community Service',
            'tutoring': 'Tutoring',
            'leadership': 'Leadership',
            'fundraising': 'Fundraising',
            'mentoring': 'Mentoring'
        };
        
        row.innerHTML = `
            <td>${formatDate(credit.date)}</td>
            <td>${credit.activity_title}</td>
            <td>${serviceTypeMap[credit.service_type] || credit.service_type}</td>
            <td>${credit.hours}</td>
            <td><span class="nhs-badge ${statusClass}">${statusText}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function signupForEvent(eventId, button) {
    try {
        const response = await fetch('/api/nhs/events/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_id: eventId
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            
            // Update button text
            if (button) {
                button.textContent = 'Signed Up!';
                button.disabled = true;
                button.classList.remove('nhs-btn-primary');
                button.classList.add('nhs-btn-success');
            }
        } else {
            showNotification(result.error || 'Failed to sign up for event', 'error');
        }
    } catch (error) {
        console.error('Error signing up for event:', error);
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
    // Create notification element
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
    
    // Set background color based on type
    const colors = {
        success: '#2ECC71',
        error: '#E74C3C',
        warning: '#F39C12',
        info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Allow manual dismiss on click
    notification.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

function addToCalendar(eventId, button) {
    // Create a simple calendar event
    const eventDetails = {
        'nhs-meeting': {
            title: 'NHS Monthly Meeting',
            date: '2025-04-30',
            time: '15:30',
            location: 'Library Conference Room'
        }
    };
    
    const event = eventDetails[eventId];
    if (event) {
        // Create calendar URL (Google Calendar format)
        const startDate = new Date(`${event.date}T${event.time}:00`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
        
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&location=${encodeURIComponent(event.location)}`;
        
        // Open calendar in new tab
        window.open(googleCalendarUrl, '_blank');
        
        // Update button
        button.textContent = 'Added to Calendar!';
        button.disabled = true;
        button.classList.remove('nhs-btn-accent');
        button.classList.add('nhs-btn-success');
        
        showNotification('Event added to calendar!', 'success');
    }
}

function browseOpportunities() {
    // Show opportunities modal or redirect
    showNotification('Browsing volunteer opportunities...', 'info');
    
    // For now, just show a notification with some opportunities
    setTimeout(() => {
        const opportunities = [
            'Community Garden - Saturdays 9AM-12PM',
            'Peer Tutoring - Monday-Thursday after school',
            'Food Drive - Ongoing donations needed',
            'Senior Center Visits - Weekends',
            'Environmental Cleanup - Monthly events'
        ];
        
        const message = 'Available Opportunities:\n\n' + opportunities.join('\n');
        alert(message);
    }, 500);
} 