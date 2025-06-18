document.addEventListener('DOMContentLoaded', function() {
    console.log('NHS Index page loaded');
    
    // Handle all button clicks and prevent default behavior
    document.addEventListener('click', function(e) {
        // Prevent default behavior for all NHS buttons
        if (e.target.classList.contains('nhs-btn')) {
            e.preventDefault();
        }
        
        // Handle specific button clicks
        if (e.target.id === 'view-events-calendar') {
            viewEventsCalendar();
        } else if (e.target.id === 'view-application-guidelines') {
            viewApplicationGuidelines();
        } else if (e.target.id === 'view-all-events') {
            viewAllEvents();
        }
    });
});

function viewEventsCalendar() {
    showNotification('Opening NHS Events Calendar...', 'info');
    
    // In a real application, this would open a calendar modal or navigate to events page
    setTimeout(() => {
        const events = [
            'May 5: NHS Induction Ceremony',
            'May 10: Community Clean-Up Day',
            'May 15: Final Exam Tutoring Marathon',
            'May 25: Senior NHS Member Recognition',
            'June 1: End of Year Celebration'
        ];
        
        const message = 'Upcoming NHS Events:\n\n' + events.join('\n');
        alert(message);
        showNotification('Events calendar loaded successfully!', 'success');
    }, 1000);
}

function viewApplicationGuidelines() {
    showNotification('Loading NHS Application Guidelines...', 'info');
    
    // In a real application, this would open a modal or PDF with guidelines
    setTimeout(() => {
        const guidelines = `
NHS Membership Requirements:

Academic Excellence:
• Minimum 3.5 GPA
• Strong performance in core subjects
• Consistent academic achievement

Character & Leadership:
• Demonstrated leadership experience
• Positive character references
• Involvement in school/community activities

Service Requirements:
• 25 hours of community service
• Ongoing commitment to service
• Documentation of service activities

Next Steps:
• Complete online application
• Submit academic transcripts
• Provide character references
• Attend information session
        `;
        
        alert(guidelines.trim());
        showNotification('Application guidelines loaded!', 'success');
    }, 1000);
}

function viewAllEvents() {
    showNotification('Loading complete events list...', 'info');
    
    // In a real application, this would show a detailed events page or modal
    setTimeout(() => {
        const allEvents = `
Complete NHS Events Calendar:

May 2025:
• May 5 - NHS Induction Ceremony (School Auditorium)
• May 10 - Community Clean-Up Day (City Park)
• May 15 - Final Exam Tutoring Marathon (School Library)
• May 20 - Blood Drive (School Gymnasium)
• May 25 - Senior NHS Member Recognition (School Cafeteria)

June 2025:
• June 1 - End of Year Celebration (Community Center)
• June 5 - Summer Service Planning Meeting (Library)
• June 10 - Scholarship Awards Ceremony (Auditorium)

Ongoing:
• Weekly Tutoring Sessions (Mon-Thu after school)
• Monthly Member Meetings (First Friday of each month)
• Community Service Opportunities (Various locations)
        `;
        
        alert(allEvents.trim());
        showNotification('Complete events calendar loaded!', 'success');
    }, 1000);
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