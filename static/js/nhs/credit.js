document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    console.log('NHS Credit Tracker page loaded');
    
    // Get the credit ID from the page
    const creditIdElement = document.querySelector('.credit-id');
    const creditId = creditIdElement ? creditIdElement.textContent.replace('#', '') : null;
    
    if (creditId) {
        console.log(`Loaded NHS credit tracker #${creditId}`);
    }

    // Handle credit submission form
    const creditForm = document.getElementById('credit-form');
    if (creditForm) {
        creditForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                service_type: document.getElementById('service-type').value,
                activity_title: document.getElementById('activity-title').value,
                date: document.getElementById('date').value,
                hours: parseFloat(document.getElementById('hours').value),
                location: document.getElementById('location').value,
                description: document.getElementById('description').value,
                supervisor: document.getElementById('supervisor').value,
                supervisor_email: document.getElementById('supervisor-email').value,
                certification: document.getElementById('certification').checked
            };
            
            // Validate certification checkbox
            if (!formData.certification) {
                showNotification('Please confirm the certification checkbox', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = creditForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;
            
            try {
                // Submit to API
                const response = await fetch('/api/nhs/credits/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    showNotification('Credit submitted successfully! Your submission is pending review.', 'success');
                    creditForm.reset();
                    
                    // Refresh recent submissions if on same page
                    loadRecentSubmissions();
                    
                    // Update stats if function exists
                    if (typeof updateStatsDisplay === 'function') {
                        updateStatsDisplay();
                    }
                } else {
                    showNotification(result.error || 'Failed to submit credit', 'error');
                }
            } catch (error) {
                console.error('Error submitting credit:', error);
                showNotification('Network error. Please try again.', 'error');
            } finally {
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Handle credit review actions (for teachers) and other button clicks
    document.addEventListener('click', function(e) {
        // Prevent default behavior for all NHS buttons
        if (e.target.classList.contains('nhs-btn')) {
            e.preventDefault();
        }
        
        if (e.target.classList.contains('approve-credit-btn')) {
            const creditId = e.target.dataset.creditId;
            reviewCredit(creditId, 'approve');
        } else if (e.target.classList.contains('reject-credit-btn')) {
            const creditId = e.target.dataset.creditId;
            reviewCredit(creditId, 'reject');
        } else if (e.target.id === 'view-all-submissions') {
            viewAllSubmissions();
        } else if (e.target.id === 'view-full-requirements') {
            viewFullRequirements();
        } else if (e.target.id === 'browse-all-opportunities') {
            browseAllOpportunities();
        }
    });
    
    // Load recent submissions on page load
    loadRecentSubmissions();
    
    // Load stats on page load
    loadNHSStats();
});

async function reviewCredit(creditId, action) {
    const comments = prompt(`Please provide comments for ${action}ing this credit:`);
    if (comments === null) return; // User cancelled
    
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
            loadRecentSubmissions(); // Refresh the list
        } else {
            showNotification(result.error || `Failed to ${action} credit`, 'error');
        }
    } catch (error) {
        console.error('Error reviewing credit:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

async function loadRecentSubmissions() {
    try {
        const response = await fetch('/api/nhs/credits/list?limit=10');
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.success && result.credits) {
            updateSubmissionsTable(result.credits);
        }
    } catch (error) {
        console.error('Error loading recent submissions:', error);
    }
}

function updateSubmissionsTable(credits) {
    const tableBody = document.querySelector('.nhs-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    credits.slice(0, 5).forEach(credit => {
        const row = document.createElement('tr');
        
        const statusClass = {
            'pending': 'nhs-badge-warning',
            'approved': 'nhs-badge-success',
            'rejected': 'nhs-badge-danger'
        }[credit.status] || 'nhs-badge-secondary';
        
        const statusText = credit.status.charAt(0).toUpperCase() + credit.status.slice(1);
        
        row.innerHTML = `
            <td>${formatDate(credit.date)}</td>
            <td>${credit.activity_title}</td>
            <td>${credit.hours}</td>
            <td><span class="nhs-badge ${statusClass}">${statusText}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function loadNHSStats() {
    try {
        const response = await fetch('/api/nhs/members/stats');
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.success && result.stats) {
            updateStatsDisplay(result.stats);
        }
    } catch (error) {
        console.error('Error loading NHS stats:', error);
    }
}

function updateStatsDisplay(stats) {
    // Update stat cards
    const statCards = document.querySelectorAll('.nhs-stat-card');
    
    statCards.forEach(card => {
        const label = card.querySelector('.nhs-stat-label').textContent.toLowerCase();
        const valueElement = card.querySelector('.nhs-stat-value');
        
        if (label.includes('completed') || label.includes('earned')) {
            valueElement.textContent = stats.approved_credits || 0;
        } else if (label.includes('remaining') || label.includes('needed')) {
            const goal = 25; // Default goal
            const remaining = Math.max(0, goal - (stats.approved_credits || 0));
            valueElement.textContent = remaining;
        } else if (label.includes('pending')) {
            valueElement.textContent = stats.pending_credits || 0;
        }
    });
    
    // Update progress ring if it exists
    updateProgressRing(stats);
}

function updateProgressRing(stats) {
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

function viewAllSubmissions() {
    showNotification('Loading complete submission history...', 'info');
    
    setTimeout(() => {
        const submissions = `
NHS Credit Submission History:

Recent Submissions:
• Apr 20, 2025 - City Food Bank Volunteer (3.0 hrs) - Pending
• Apr 15, 2025 - Biology Tutoring (2.0 hrs) - Approved
• Apr 10, 2025 - Earth Day Planning Committee (1.5 hrs) - Approved
• Apr 5, 2025 - Senior Center Visit (2.5 hrs) - Rejected

Previous Submissions:
• Mar 28, 2025 - Math Tutoring Session (1.5 hrs) - Approved
• Mar 20, 2025 - Library Book Drive (2.0 hrs) - Approved
• Mar 15, 2025 - Science Fair Judging (3.0 hrs) - Approved
• Mar 10, 2025 - Community Garden Work (2.5 hrs) - Approved

Total Approved Credits: 12.0 / 25
Pending Review: 3.0 hrs
        `;
        
        alert(submissions.trim());
        showNotification('Complete submission history loaded!', 'success');
    }, 1000);
}

function viewFullRequirements() {
    showNotification('Loading NHS credit requirements...', 'info');
    
    setTimeout(() => {
        const requirements = `
NHS Service Credit Requirements:

Annual Requirements (25 Total Credits):
• Community Service: 10 hours minimum
• School Service/Tutoring: 5 hours minimum  
• Additional Service: 10 hours (any category)

Credit Categories:
• Community Service: Environmental, social services, charity work
• School Service: Tutoring, mentoring, school events
• Leadership: Officer roles, committee leadership
• Fundraising: Organizing charitable fundraisers
• Mentoring: Peer support programs

Credit Values:
• Standard Service: 1 hour = 1 credit
• Leadership Roles: May earn 1.25x credits
• Event Organization: May earn 1.5x credits

Documentation Required:
• Supervisor contact information
• Activity description and outcomes
• Date, time, and location
• Verification from supervising adult

Approval Process:
• Submit within 30 days of activity
• NHS advisor reviews within 1 week
• Appeals process available for rejections
        `;
        
        alert(requirements.trim());
        showNotification('Full requirements loaded!', 'success');
    }, 1000);
}

function browseAllOpportunities() {
    showNotification('Loading volunteer opportunities...', 'info');
    
    setTimeout(() => {
        const opportunities = `
Available NHS Service Opportunities:

Community Service:
• Community Garden - Saturdays 9AM-12PM (Contact: Mrs. Peterson)
• Food Bank Volunteer - Weekends (Contact: City Food Bank)
• Senior Center Visits - Flexible schedule (Contact: Ms. Davis)
• Environmental Cleanup - Monthly events (Contact: Parks Dept)
• Habitat for Humanity - Weekend builds (Contact: Local chapter)

School Service:
• Peer Tutoring - Mon-Thu after school (Contact: Mr. Johnson)
• Library Assistant - Flexible hours (Contact: Ms. Rodriguez)
• New Student Mentoring - Ongoing (Contact: Counseling Office)
• Science Fair Judging - March event (Contact: Science Dept)
• Graduation Ceremony Help - May event (Contact: Main Office)

Leadership Opportunities:
• NHS Committee Positions - Apply now
• Event Planning Committee - Ongoing
• Fundraising Coordinator - Seasonal
• Community Outreach Leader - Year-round

How to Get Started:
1. Contact the listed supervisor
2. Discuss your availability and interests
3. Complete any required training
4. Begin logging your service hours
        `;
        
        alert(opportunities.trim());
        showNotification('Opportunities loaded! Contact supervisors to get started.', 'success');
    }, 1000);
} 