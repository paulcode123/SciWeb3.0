/**
 * Interactive Tutorial System for MyWeb
 * Provides step-by-step guidance through the interface
 */

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 10;
        this.isActive = false;
        this.stepCallbacks = new Map();
        this.originalNodeCreation = null;
        this.completedActions = new Set();
        
        this.steps = [
            'welcome',
            'toolbar', 
            'motivator',
            'edit-motivator',
            'learning-objective',
            'edit-learning',
            'voice-intro',
            'voice-demo',
            'connections',
            'complete'
        ];
        
        this.init();
    }
    
    init() {
        // Check if tutorial should be active
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tutorial') === 'true') {
            this.isActive = true;
            this.setupTutorial();
        }
    }
    
    setupTutorial() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }
    
    start() {
        console.log('Starting tutorial...');
        this.showStep(0);
        this.updateProgress();
        this.setupEventListeners();
        
        // Add tutorial-specific styles to body
        document.body.classList.add('tutorial-active');
        
        // Show tutorial overlay
        const tutorialOverlay = document.querySelector('.tutorial-overlay');
        if (tutorialOverlay) {
            tutorialOverlay.style.display = 'flex';
        }
    }
    
    setupEventListeners() {
        // Listen for toolbar button clicks
        document.addEventListener('click', (e) => {
            this.handleClick(e);
        });
        

        
        // Listen for hover on nodes to show edit option
        document.addEventListener('mouseover', (e) => {
            this.handleHover(e);
        });
        
        // Update spotlight on window resize
        window.addEventListener('resize', () => {
            if (this.currentSpotlightSelector) {
                this.setSpotlight(this.currentSpotlightSelector, this.currentSpotlightPosition, this.currentSpotlightSize);
            }
        });

        // Watch for actual node title changes
        this.setupNodeTitleObserver();
    }
    
    handleClick(e) {
        const step = this.steps[this.currentStep];
        
        // Handle motivator button click
        if (step === 'motivator' && e.target.closest('.btn-motivator')) {
            // Don't prevent default - let the system create the node
            this.completedActions.add('motivator-clicked');
            this.completedActions.add('motivator-placed');
            setTimeout(() => this.nextStep(), 500); // Small delay to let node appear
        }
        
        // Handle learning objective button click
        if (step === 'learning-objective' && e.target.closest('.btn-learningObjective')) {
            // Don't prevent default - let the system create the node
            this.completedActions.add('learning-clicked');
            this.completedActions.add('learning-placed');
            setTimeout(() => this.nextStep(), 500); // Small delay to let node appear
        }
        
        // Handle voice button click
        if (step === 'voice-intro' && e.target.closest('.btn-voice-record')) {
            // Don't prevent default - let the voice system activate
            this.completedActions.add('voice-activated');
            setTimeout(() => this.nextStep(), 1000); // Give time for voice modal to appear
        }
    }
    

    
    handleHover(e) {
        // Tutorial no longer auto-simulates - user must actually interact
        // We'll listen for actual title changes through DOM observation
    }

    setupNodeTitleObserver() {
        // Watch for changes in node titles
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const target = mutation.target;
                    
                    // Check if this is a node title that changed
                    const nodeTitle = target.closest ? target.closest('.node-title') : 
                                    (target.classList && target.classList.contains('node-title') ? target : null);
                    
                    if (nodeTitle) {
                        const node = nodeTitle.closest('.node');
                        const step = this.steps[this.currentStep];
                        
                        // Check if user renamed the motivator node
                        if (step === 'edit-motivator' && node && node.classList.contains('node-motivator')) {
                            const newTitle = nodeTitle.textContent.trim();
                            if (newTitle && newTitle !== 'My Goal' && !this.completedActions.has('motivator-edited')) {
                                this.completedActions.add('motivator-edited');
                                this.showQuickSuccessMessage('Great! You renamed your motivator.');
                                setTimeout(() => this.nextStep(), 1500);
                            }
                        }
                        
                        // Check if user renamed the learning objective node
                        if (step === 'edit-learning' && node && node.classList.contains('node-learningObjective')) {
                            const newTitle = nodeTitle.textContent.trim();
                            if (newTitle && newTitle !== 'Learn Something New' && !this.completedActions.has('learning-edited')) {
                                this.completedActions.add('learning-edited');
                                this.showQuickSuccessMessage('Perfect! You customized your learning objective.');
                                setTimeout(() => this.nextStep(), 1500);
                            }
                        }
                    }
                }
            });
        });

        // Start observing the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Store observer for cleanup if needed
        this.titleObserver = observer;
    }
    
    createTutorialNode(type, clientX, clientY) {
        const container = document.querySelector('.nodes-container');
        const containerRect = container.getBoundingClientRect();
        
        // Convert client coordinates to container coordinates
        const x = clientX - containerRect.left;
        const y = clientY - containerRect.top;
        
        const node = document.createElement('div');
        node.className = `node node-${type} tutorial-node`;
        node.style.left = `${x - 90}px`; // Center the node (width/2)
        node.style.top = `${y - 30}px`;  // Center the node (height/2)
        
        // Add node content based on type
        if (type === 'motivator') {
            node.innerHTML = `
                <div class="node-icon"><i class="fas fa-star"></i></div>
                <div class="node-title">My Goal</div>
            `;
        } else if (type === 'learningObjective') {
            node.innerHTML = `
                <div class="node-icon"><i class="fas fa-bullseye"></i></div>
                <div class="node-title">Learn Something New</div>
            `;
        }
        
        // Add appear animation
        node.style.opacity = '0';
        node.style.transform = 'scale(0.8)';
        container.appendChild(node);
        
        // Animate in
        setTimeout(() => {
            node.style.transition = 'all 0.3s ease';
            node.style.opacity = '1';
            node.style.transform = 'scale(1)';
        }, 100);
        
        // Add celebration effect
        this.addCelebrationEffect(node);
        
        // Update spotlight if this step needs it
        setTimeout(() => {
            const step = this.steps[this.currentStep];
            if (step === 'edit-motivator' && type === 'motivator') {
                this.setSpotlight('.node-motivator', 'right', 100);
            } else if (step === 'voice-intro' && type === 'learningObjective') {
                this.setSpotlight('.node-learningObjective', 'right', 100);
            }
        }, 500);
        
        return node;
    }
    
    simulateNodeEditOnHover(node) {
        // First, show a simulated hover panel
        const hoverPanel = document.createElement('div');
        hoverPanel.className = 'tutorial-hover-panel';
        hoverPanel.innerHTML = `
            <div class="hover-option rename-option">
                <i class="fas fa-edit"></i> Rename
            </div>
        `;
        hoverPanel.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            padding: 8px;
            z-index: 1000;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        
        node.appendChild(hoverPanel);
        
        // Animate in the hover panel
        setTimeout(() => {
            hoverPanel.style.opacity = '1';
            hoverPanel.style.transform = 'translateX(-50%) translateY(-5px)';
        }, 100);
        
        // After showing the hover panel, simulate clicking rename
        setTimeout(() => {
            // Flash the rename option
            const renameOption = hoverPanel.querySelector('.rename-option');
            renameOption.style.background = 'rgba(102, 126, 234, 0.2)';
            
            // Then show the editing interface
            setTimeout(() => {
                this.showEditInterface(node);
                hoverPanel.remove();
            }, 800);
        }, 1000);
    }
    
    showEditInterface(node) {
        const title = node.querySelector('.node-title');
        if (title) {
            // Create edit interface
            const editInterface = document.createElement('div');
            editInterface.className = 'tutorial-edit-interface';
            editInterface.innerHTML = `
                <input type="text" value="${title.textContent}" class="edit-input">
                <button class="save-btn">Save</button>
            `;
            editInterface.style.cssText = `
                position: absolute;
                top: -50px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                display: flex;
                gap: 8px;
                align-items: center;
            `;
            
            node.appendChild(editInterface);
            
            const input = editInterface.querySelector('.edit-input');
            input.focus();
            input.select();
            
            // Simulate typing the new name
            setTimeout(() => {
                input.value = 'Get Better at Math';
                
                // Flash the save button and simulate save
                setTimeout(() => {
                    const saveBtn = editInterface.querySelector('.save-btn');
                    saveBtn.style.background = '#4CAF50';
                    
                    setTimeout(() => {
                        // Update the actual title
                        title.textContent = 'Get Better at Math';
                        editInterface.remove();
                        
                        // Add success glow
                        node.style.boxShadow = '0 0 20px rgba(46, 204, 113, 0.6)';
                        setTimeout(() => {
                            node.style.boxShadow = '';
                        }, 1000);
                    }, 500);
                }, 800);
            }, 1200);
        }
    }
    

    
    addCelebrationEffect(element) {
        // Create celebration particles
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'celebration-particle';
            particle.style.cssText = `
                position: absolute;
                width: 6px;
                height: 6px;
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
            `;
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 40 + Math.random() * 20;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            
            element.appendChild(particle);
            
            // Animate particle
            particle.animate([
                { 
                    transform: 'translate(0, 0) scale(0)',
                    opacity: 1
                },
                { 
                    transform: `translate(${endX}px, ${endY}px) scale(1)`,
                    opacity: 0
                }
            ], {
                duration: 800,
                easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }).onfinish = () => particle.remove();
        }
    }
    
    highlightCanvas() {
        const container = document.querySelector('.tree-container');
        if (container) {
            container.style.border = '3px dashed #667eea';
            container.style.borderRadius = '10px';
            container.style.background = 'rgba(102, 126, 234, 0.05)';
            
            setTimeout(() => {
                container.style.border = '';
                container.style.borderRadius = '';
                container.style.background = '';
            }, 2000);
        }
    }
    
    highlightElement(selector, duration = 3000) {
        const element = document.querySelector(selector);
        if (element) {
            const spotlight = document.querySelector('.tutorial-spotlight');
            const rect = element.getBoundingClientRect();
            
            // Position spotlight
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            spotlight.style.setProperty('--spotlight-x', `${(centerX / window.innerWidth) * 100}%`);
            spotlight.style.setProperty('--spotlight-y', `${(centerY / window.innerHeight) * 100}%`);
            spotlight.classList.add('active');
            
            // Add glow to element
            element.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.8)';
            element.style.transform = 'scale(1.05)';
            element.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                spotlight.classList.remove('active');
                element.style.boxShadow = '';
                element.style.transform = '';
            }, duration);
        }
    }
    

    
    showStep(stepIndex) {
        // Hide all steps
        document.querySelectorAll('.tutorial-step').forEach(step => {
            step.classList.remove('active');
            if (step.classList.contains('active')) {
                step.classList.add('exiting');
                setTimeout(() => {
                    step.style.display = 'none';
                    step.classList.remove('exiting');
                }, 400);
            } else {
                step.style.display = 'none';
            }
        });
        
        // Show current step
        const currentStepElement = document.querySelector(`[data-step="${this.steps[stepIndex]}"]`);
        if (currentStepElement) {
            setTimeout(() => {
                currentStepElement.style.display = 'block';
                currentStepElement.classList.add('active');
                
                // Handle step-specific actions
                this.handleStepActions(this.steps[stepIndex]);
            }, 100);
        }
        
        this.currentStep = stepIndex;
        this.updateProgress();
    }
    
    handleStepActions(stepName) {
        const overlay = document.querySelector('.tutorial-overlay');
        
        // Remove any existing spotlight classes
        overlay.classList.remove('has-spotlight', 'spotlight-left', 'spotlight-right', 'spotlight-center');
        
        switch (stepName) {
            case 'welcome':
                this.setSpotlight(null); // No spotlight for welcome
                break;
            case 'toolbar':
                this.setSpotlight('.tree-toolbar', 'left');
                this.highlightElement('.tree-toolbar', 5000);
                break;
            case 'motivator':
                this.setSpotlight('.btn-motivator', 'left', 80);
                this.highlightElement('.btn-motivator', 10000);
                break;
            case 'edit-motivator':
                // Spotlight on the created motivator node
                setTimeout(() => {
                    const motivatorNode = document.querySelector('.node-motivator');
                    if (motivatorNode) {
                        this.setSpotlight('.node-motivator', 'right', 100);
                        this.highlightElement('.node-motivator', 10000);
                    }
                }, 500);
                break;
            case 'learning-objective':
                this.setSpotlight('.btn-learningObjective', 'left', 80);
                this.highlightElement('.btn-learningObjective', 10000);
                break;
            case 'edit-learning':
                // Spotlight on the created learning objective node
                setTimeout(() => {
                    const learningNode = document.querySelector('.node-learningObjective');
                    if (learningNode) {
                        this.setSpotlight('.node-learningObjective', 'right', 100);
                        this.highlightElement('.node-learningObjective', 10000);
                    }
                }, 500);
                break;
            case 'voice-intro':
                this.setSpotlight('.btn-voice-record', 'right', 80);
                this.highlightElement('.btn-voice-record', 10000);
                break;
            case 'voice-demo':
                this.setSpotlight('.btn-voice-record', 'right', 80);
                this.highlightElement('.btn-voice-record', 5000);
                break;
            case 'connections':
            case 'complete':
                this.setSpotlight(null); // No spotlight for final steps
                break;
        }
    }
    
    setSpotlight(selector, position = 'center', size = 120) {
        const overlay = document.querySelector('.tutorial-overlay');
        
        if (!selector) {
            // Remove spotlight
            overlay.classList.remove('has-spotlight', 'spotlight-left', 'spotlight-right', 'spotlight-center');
            overlay.style.removeProperty('--spotlight-x');
            overlay.style.removeProperty('--spotlight-y');
            overlay.style.removeProperty('--spotlight-size');
            
            // Clear tracking variables
            this.currentSpotlightSelector = null;
            this.currentSpotlightPosition = null;
            this.currentSpotlightSize = null;
            return;
        }
        
        const element = document.querySelector(selector);
        if (!element) return;
        
        // Track current spotlight state
        this.currentSpotlightSelector = selector;
        this.currentSpotlightPosition = position;
        this.currentSpotlightSize = size;
        
        // Get element position relative to viewport
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Convert to percentage for CSS custom properties
        const spotlightX = (centerX / window.innerWidth) * 100;
        const spotlightY = (centerY / window.innerHeight) * 100;
        
        // Apply spotlight
        overlay.classList.add('has-spotlight', `spotlight-${position}`);
        overlay.style.setProperty('--spotlight-x', `${spotlightX}%`);
        overlay.style.setProperty('--spotlight-y', `${spotlightY}%`);
        overlay.style.setProperty('--spotlight-size', `${size}px`);
    }
    
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.complete();
        }
    }
    
    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
    
    skip() {
        this.complete();
    }
    
    complete() {
        // Add completion animation
        const overlay = document.querySelector('.tutorial-overlay');
        if (overlay) {
            overlay.style.animation = 'tutorial-fade-out 0.8s ease-in forwards';
            
            setTimeout(() => {
                overlay.style.display = 'none';
                document.body.classList.remove('tutorial-active');
                

                
                // Show regular intro overlay
                const introOverlay = document.querySelector('.intro-overlay');
                if (introOverlay) {
                    introOverlay.style.display = 'flex';
                }
                
                // Remove tutorial URL parameter
                const url = new URL(window.location);
                url.searchParams.delete('tutorial');
                window.history.replaceState({}, '', url);
                
                this.isActive = false;
            }, 800);
        }
        
        // Show completion message
        this.showSuccessMessage();
    }
    
    showQuickSuccessMessage(text) {
        const message = document.createElement('div');
        message.className = 'tutorial-quick-success';
        message.innerHTML = `
            <div class="quick-success-content">
                <i class="fas fa-check-circle"></i>
                <span>${text}</span>
            </div>
        `;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4ecdc4, #44a08d);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            z-index: 25000;
            animation: quick-success-slide 0.4s ease-out;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'quick-success-slide-out 0.4s ease-in forwards';
            setTimeout(() => message.remove(), 400);
        }, 2000);
    }

    showSuccessMessage() {
        const message = document.createElement('div');
        message.className = 'tutorial-success-message';
        message.innerHTML = `
            <div class="success-content">
                <div class="success-icon">🎉</div>
                <h3>Tutorial Complete!</h3>
                <p>You're now ready to build your knowledge web!</p>
            </div>
        `;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4ecdc4, #44a08d);
            color: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            z-index: 25000;
            text-align: center;
            animation: success-appear 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'success-disappear 0.5s ease-in forwards';
            setTimeout(() => message.remove(), 500);
        }, 3000);
    }
    
    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        const currentStepElement = document.querySelector('.current-step');
        const totalStepsElement = document.querySelector('.total-steps');
        
        if (progressFill) {
            const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
            progressFill.style.width = `${progress}%`;
        }
        
        if (currentStepElement) {
            currentStepElement.textContent = this.currentStep + 1;
        }
        
        if (totalStepsElement) {
            totalStepsElement.textContent = this.totalSteps;
        }
    }
}

// Additional CSS animations via JavaScript
const additionalStyles = `
@keyframes tutorial-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
}

@keyframes success-appear {
    from { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.8);
    }
    to { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1);
    }
}

@keyframes success-disappear {
    from { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1);
    }
    to { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.8);
    }
}

@keyframes voice-indicator-appear {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

@keyframes quick-success-slide {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes quick-success-slide-out {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

.tutorial-node {
    z-index: 1001 !important;
}

.tutorial-active .tree-container {
    cursor: default !important;
}

.tutorial-active .tool-button:not(.btn-motivator):not(.btn-learningObjective):not(.btn-voice-record) {
    opacity: 0.5;
    pointer-events: none;
}

.tutorial-active .btn-motivator.highlight,
.tutorial-active .btn-learningObjective.highlight {
    animation: tutorial-button-glow 1.5s infinite;
}

@keyframes tutorial-button-glow {
    0%, 100% { 
        box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
    }
    50% { 
        box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
    }
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Create global tutorial instance
const tutorial = new TutorialSystem();

// Export for global access
window.tutorial = tutorial;

export default tutorial; 