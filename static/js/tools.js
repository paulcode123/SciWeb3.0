// Tools Library JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Tools Library page loaded');
    initializeToolsLibrary();
});

function initializeToolsLibrary() {
    // Initialize floating animation timings
    initializeFloatingIcons();
    
    // Initialize tool interactions
    initializeToolInteractions();
    
    // Initialize modal functionality
    initializeModals();
    
    // Initialize search and filtering (if implemented)
    initializeFiltering();
}

function initializeFloatingIcons() {
    const floatingIcons = document.querySelectorAll('.floating-icons i');
    
    floatingIcons.forEach((icon, index) => {
        // Add random animation delays for more natural movement
        const randomDelay = Math.random() * 2;
        icon.style.animationDelay = `${randomDelay}s`;
        
        // Add hover effects
        icon.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.2) translateY(-10px)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        icon.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.transition = '';
        });
    });
}

function initializeToolInteractions() {
    // Handle tool card hover effects
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('coming-soon')) {
                this.style.transform = 'translateY(-12px)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
    
    // Handle quick access buttons
    const quickBtns = document.querySelectorAll('.quick-btn:not(.disabled)');
    
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.classList.contains('disabled')) {
                e.preventDefault();
                showNotification('This tool is coming soon!', 'info');
                return;
            }
            
            // Show loading overlay for navigation
            showLoading(true);
            
            // Allow natural navigation to occur
            setTimeout(() => {
                showLoading(false);
            }, 1000);
        });
    });
    
    // Handle disabled button clicks
    const disabledBtns = document.querySelectorAll('.tool-btn.disabled, .quick-btn.disabled');
    
    disabledBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('This tool is coming soon! Stay tuned for updates.', 'info');
        });
    });
}

function initializeModals() {
    const modal = document.getElementById('tool-info-modal');
    const modalClose = document.querySelector('.modal-close');
    
    // Close modal when clicking the X
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });
}

function showToolInfo(toolId) {
    const modal = document.getElementById('tool-info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    const toolInfo = getToolInformation(toolId);
    
    if (toolInfo) {
        modalTitle.textContent = toolInfo.title;
        modalBody.innerHTML = toolInfo.content;
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('tool-info-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function getToolInformation(toolId) {
    const toolData = {
        'physics': {
            title: 'Physics Lab - Interactive Learning',
            content: `
                <div class="tool-info-content">
                    <h4>What is Physics Lab?</h4>
                    <p>Physics Lab is an advanced interactive learning platform that combines real PhET simulations with AI-powered assistance to help students understand physics concepts through hands-on experimentation and visualization.</p>
                    
                    <h4>Key Features:</h4>
                    <ul>
                        <li><strong>PhET Simulations:</strong> Integration with University of Colorado's PhET simulations for authentic physics experiments</li>
                        <li><strong>AI Problem Solver:</strong> Upload photos, type, or speak physics problems and get step-by-step solutions</li>
                        <li><strong>Interactive Experiments:</strong> Manipulate variables and observe real-time physics phenomena</li>
                        <li><strong>Knowledge Web:</strong> Connect concepts and build understanding through visual learning maps</li>
                        <li><strong>Multi-modal Input:</strong> Text, voice, and image-based problem input support</li>
                        <li><strong>Real-time Chat:</strong> Ask physics questions and get instant AI explanations</li>
                    </ul>
                    
                    <h4>Available Simulations:</h4>
                    <div class="simulation-list">
                        <div class="sim-item">
                            <strong>Forces and Motion:</strong> Newton's Laws demonstrations
                        </div>
                        <div class="sim-item">
                            <strong>Energy Skate Park:</strong> Conservation of energy visualization
                        </div>
                        <div class="sim-item">
                            <strong>Wave Interference:</strong> Sound and light wave interactions
                        </div>
                        <div class="sim-item">
                            <strong>Electric Fields:</strong> Charge and field visualizations
                        </div>
                        <div class="sim-item">
                            <strong>Circuit Construction:</strong> Build and analyze electrical circuits
                        </div>
                        <div class="sim-item">
                            <strong>Photoelectric Effect:</strong> Quantum mechanics demonstrations
                        </div>
                    </div>
                    
                    <h4>Perfect For:</h4>
                    <ul>
                        <li>High school and college physics students</li>
                        <li>Visual learners who benefit from interactive demonstrations</li>
                        <li>Students preparing for AP Physics exams</li>
                        <li>Anyone curious about how the physical world works</li>
                    </ul>
                    
                    <div class="cta-section">
                        <a href="/physics" class="modal-cta-btn">
                            <i class="fas fa-rocket"></i>
                            Launch Physics Lab
                        </a>
                    </div>
                </div>
            `
        },
        'biology': {
            title: 'Biology Lab - Coming Soon',
            content: `
                <div class="tool-info-content">
                    <h4>What's Coming?</h4>
                    <p>Biology Lab will provide interactive simulations for cell biology, genetics, molecular processes, and ecosystem dynamics.</p>
                    
                    <h4>Planned Features:</h4>
                    <ul>
                        <li>Virtual microscopy with cell structure exploration</li>
                        <li>DNA replication and protein synthesis simulations</li>
                        <li>Genetic crosses and inheritance pattern modeling</li>
                        <li>Ecosystem interaction and population dynamics</li>
                        <li>Molecular biology technique simulations</li>
                    </ul>
                    
                    <p><strong>Expected Release:</strong> Coming in the next update!</p>
                </div>
            `
        }
    };
    
    return toolData[toolId] || null;
}

function initializeFiltering() {
    // Category card interactions
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.querySelector('h4').textContent.toLowerCase();
            filterToolsByCategory(category);
        });
    });
}

function filterToolsByCategory(category) {
    // This would filter tools by category - placeholder for future implementation
    console.log(`Filtering tools by category: ${category}`);
    showNotification(`Filtering by ${category} - feature coming soon!`, 'info');
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `tools-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 400px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        box-shadow: var(--tools-shadow-lg);
    `;
    
    // Set background color based on type
    const colors = {
        success: 'var(--tools-success)',
        error: 'var(--tools-danger)',
        warning: 'var(--tools-warning)',
        info: 'var(--tools-primary)'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Slide in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
    
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

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

// Additional CSS for modal content
const additionalStyles = `
.tool-info-content h4 {
    color: var(--tools-primary);
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
}

.tool-info-content ul {
    margin-bottom: 1.5rem;
    padding-left: 1.5rem;
}

.tool-info-content li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
}

.simulation-list {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.sim-item {
    background: rgba(59, 130, 246, 0.1);
    padding: 0.75rem;
    border-radius: 8px;
    border-left: 4px solid var(--tools-primary);
}

.cta-section {
    text-align: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--tools-border);
}

.modal-cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--tools-primary) 0%, var(--tools-secondary) 100%);
    color: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
}

.modal-cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.tools-notification {
    backdrop-filter: blur(10px);
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet); 