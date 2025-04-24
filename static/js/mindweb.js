document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing MindWeb");
    
    // Initialize theme from localStorage or system preference
    initializeTheme();
    
    // Show the starter config modal on page load
    const starterConfigModal = new bootstrap.Modal(document.getElementById('starter-config-modal'));
    
    // Function to initialize theme based on localStorage or system preference
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (savedTheme !== 'light' && prefersDarkMode)) {
            document.body.classList.add('dark-mode');
            console.log("Applied dark theme to mindweb");
        }
        
        // Listen for theme changes from main.js
        window.addEventListener('storage', function(e) {
            if (e.key === 'theme') {
                if (e.newValue === 'dark') {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
                console.log("Theme updated via localStorage:", e.newValue);
            }
        });
    }
    
    // Function to extract mindweb ID from URL
    function getMindwebIdFromUrl() {
        const path = window.location.pathname;
        const match = path.match(/\/mindweb\/(\w+)/);
        return match ? match[1] : null;
    }
    
    // Initialize Cytoscape instance first
    const cy = cytoscape({
        container: document.getElementById('mindweb-container'),
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': 'data(color)',
                    'border-width': 2,
                    'border-color': '#666',
                    'shape': 'roundrectangle',
                    'width': 'label',
                    'height': 'label',
                    'padding': '12px',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': 'data(color)',
                    'target-arrow-color': 'data(color)',
                    'curve-style': 'bezier',
                    'line-style': 'data(lineStyle)',
                    'target-arrow-shape': 'data(showArrow) ? "triangle" : "none"',
                    'arrow-scale': 1.5,
                    'label': 'data(label)',
                    'text-background-color': '#fff',
                    'text-background-opacity': 0.8,
                    'text-background-padding': '3px',
                    'text-background-shape': 'roundrectangle',
                    'font-size': '12px',
                    'color': '#333'
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'border-width': 3,
                    'border-color': '#4285F4',
                    'box-shadow': '0 0 5px #4285F4'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'width': 3,
                    'line-color': '#4285F4',
                    'target-arrow-color': '#4285F4'
                }
            }
        ],
        layout: {
            name: 'cose',
            idealEdgeLength: 100,
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 30,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 400000,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
        },
        minZoom: 0.2,
        maxZoom: 3
    });

    // Function to load mindweb by ID - after cy is initialized
    function loadMindwebById(id) {
        const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
        const mindweb = savedMindwebs.find(mw => mw.id === id);
        
        if (mindweb) {
            loadMindweb(mindweb.data);
            console.log(`Loaded MindWeb #${id}: ${mindweb.name}`);
            showNotification(`Loaded MindWeb: "${mindweb.name}"`, 5000);
            
            // Always update the URL when loading a mindweb by ID
            updateUrlWithMindwebId(id);
            
            return true;
        }
        
        return false;
    }
    
    // Load MindWeb functionality
    function loadMindweb(savedData) {
        // Clear current graph
        cy.elements().remove();
        
        // Add nodes first with their positions
        if (savedData.nodes && savedData.nodes.length > 0) {
            const positions = {};
            if (savedData.positions) {
                savedData.positions.forEach(pos => {
                    positions[pos.id] = pos.position;
                });
            }
            
            // Add nodes
            savedData.nodes.forEach(node => {
                cy.add({
                    group: 'nodes',
                    data: node,
                    position: positions[node.id] || { x: Math.random() * cy.width(), y: Math.random() * cy.height() }
                });
            });
            
            // Add edges
            if (savedData.edges && savedData.edges.length > 0) {
                savedData.edges.forEach(edge => {
                    cy.add({
                        group: 'edges',
                        data: edge
                    });
                });
            }
            
            // Refresh tooltips
            cy.nodes().forEach(addTooltip);
        }
        
        // Run layout if no positions were saved
        if (!savedData.positions || savedData.positions.length === 0) {
            cy.layout({ name: 'cose' }).run();
        }
    }
    
    // Now check if we need to load a specific mindweb from URL or show the starter config
    const mindwebId = getMindwebIdFromUrl();
    if (mindwebId) {
        console.log("URL contains mindweb ID:", mindwebId);
        const loadSuccess = loadMindwebById(mindwebId);
        if (!loadSuccess) {
            console.log("Could not load mindweb with ID:", mindwebId);
            starterConfigModal.show();
        }
    } else {
        starterConfigModal.show();
    }
    
    // Handle Start MindWeb button click
    document.getElementById('start-mindweb-btn').addEventListener('click', function() {
        // Save the new configuration settings
        const startApproach = document.querySelector('input[name="start-approach"]:checked').value;
        const unconnectedNodes = document.getElementById('unconnected-nodes').value;
        const informationLevel = document.querySelector('input[name="information-level"]:checked').value;
        const detailLevel = document.querySelector('input[name="detail-level"]:checked').value;
        
        // Update the displayed goal (using a default since we removed the text input)
        const subject = document.querySelector('.card-header.bg-primary .small').textContent.replace('Subject:', '').trim();
        document.getElementById('study-goal-display').textContent = 'Goal: Learning ' + subject;
        
        // Save settings to localStorage for persistence
        const settings = {
            startApproach,
            unconnectedNodes,
            informationLevel,
            detailLevel,
            enableAiSuggestions: document.getElementById('enable-ai-suggestions').checked,
            suggestionFrequency: document.querySelector('input[name="suggestion-frequency"]:checked').value
        };
        localStorage.setItem('mindweb-settings', JSON.stringify(settings));
        
        // Hide the modal
        starterConfigModal.hide();
        
        // If AI suggestions are enabled, show the suggestions panel
        if (settings.enableAiSuggestions && settings.suggestionFrequency === 'auto') {
            setTimeout(() => generateAiSuggestions(), 1500);
        }
        
        // Update the AI greeting message based on settings
        updateAIGreeting(settings);
    });

    // Settings button to reopen the starter modal
    document.getElementById('settings-btn').addEventListener('click', function() {
        // Restore current settings to the form
        const settings = JSON.parse(localStorage.getItem('mindweb-settings') || '{}');
        
        // Restore start approach
        if (settings.startApproach) {
            document.querySelector(`input[name="start-approach"][value="${settings.startApproach}"]`).checked = true;
        }
        
        // Restore unconnected nodes value
        if (settings.unconnectedNodes) {
            document.getElementById('unconnected-nodes').value = settings.unconnectedNodes;
        }
        
        // Restore information level
        if (settings.informationLevel) {
            document.querySelector(`input[name="information-level"][value="${settings.informationLevel}"]`).checked = true;
        }
        
        // Restore detail level
        if (settings.detailLevel) {
            document.querySelector(`input[name="detail-level"][value="${settings.detailLevel}"]`).checked = true;
        }
        
        // Restore AI suggestions settings
        if (settings.enableAiSuggestions !== undefined) {
            document.getElementById('enable-ai-suggestions').checked = settings.enableAiSuggestions;
        }
        
        if (settings.suggestionFrequency) {
            document.querySelector(`input[name="suggestion-frequency"][value="${settings.suggestionFrequency}"]`).checked = true;
        }
        
        starterConfigModal.show();
    });

    // Handle AI suggestion checkbox toggle
    document.getElementById('enable-ai-suggestions').addEventListener('change', function() {
        const optionsDiv = document.getElementById('ai-suggestions-options');
        optionsDiv.style.display = this.checked ? 'block' : 'none';
    });

    // Suggestion Generation and Management
    function generateAiSuggestions() {
        const suggestionsPanel = document.getElementById('ai-suggestions-panel');
        const suggestionsList = document.getElementById('suggested-concepts-list');
        
        // Clear previous suggestions
        suggestionsList.innerHTML = '';
        
        // Get current mindweb nodes and subject
        const nodes = cy.nodes().map(n => n.data().label);
        const subject = document.querySelector('.card-header.bg-primary .small').textContent.replace('Subject:', '').trim();
        const settings = JSON.parse(localStorage.getItem('mindweb-settings') || '{}');
        
        // Show loading indicator
        suggestionsList.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-info" role="status"></div><span class="ms-2">Generating suggestions...</span></div>';
        suggestionsPanel.style.display = 'block';
        
        // In a real implementation, this would be an API call to generate suggestions
        // For now, we'll use mock data based on the subject
        setTimeout(() => {
            let suggestions = getMockSuggestions(subject, nodes, settings);
            suggestionsList.innerHTML = '';
            
            if (suggestions.length === 0) {
                suggestionsList.innerHTML = '<div class="text-center text-muted">No suggestions available</div>';
                return;
            }
            
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'list-group-item list-group-item-action ai-suggestion-item p-2';
                suggestionItem.setAttribute('draggable', 'true');
                suggestionItem.dataset.label = suggestion.label;
                suggestionItem.dataset.description = suggestion.description;
                suggestionItem.dataset.color = suggestion.color;
                
                suggestionItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${suggestion.label}</span>
                        <span class="badge" style="background-color: ${suggestion.color};">&nbsp;</span>
                    </div>
                    <small class="text-muted d-block text-truncate">${suggestion.description}</small>
                `;
                
                // Add drag event listeners
                suggestionItem.addEventListener('dragstart', handleSuggestionDragStart);
                
                suggestionsList.appendChild(suggestionItem);
            });
            
            // Add helpful instruction
            const instruction = document.createElement('div');
            instruction.className = 'text-center text-muted small mt-2';
            instruction.textContent = 'Drag concepts onto the map';
            suggestionsList.appendChild(instruction);
            
        }, 1500);
    }

    // Drag and drop functionality for suggestions
    function handleSuggestionDragStart(e) {
        const suggestion = e.target.closest('.ai-suggestion-item');
        const data = {
            label: suggestion.dataset.label,
            description: suggestion.dataset.description,
            color: suggestion.dataset.color
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));
        e.dataTransfer.effectAllowed = 'copy';
    }

    // Set up the drop area (mindweb container)
    const mindwebContainer = document.getElementById('mindweb-container');
    mindwebContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    mindwebContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        
        try {
            // Get the dropped data
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            
            // Get position relative to the cytoscape container
            const containerRect = mindwebContainer.getBoundingClientRect();
            const position = {
                x: e.clientX - containerRect.left,
                y: e.clientY - containerRect.top
            };
            
            // Create a new node at the drop position
            const nodeId = 'n' + Date.now();
            cy.add({
                group: 'nodes',
                data: {
                    id: nodeId,
                    label: data.label,
                    color: data.color,
                    description: data.description
                },
                position: position
            });
            
            // Select the new node
            const addedNode = cy.getElementById(nodeId);
            addTooltip(addedNode);
            
            // Show success notification
            showNotification(`Added concept: ${data.label}`, 2000);
        } catch (err) {
            console.error('Error handling dropped concept:', err);
        }
    });

    // Helper function to generate mock suggestions based on subject and existing nodes
    function getMockSuggestions(subject, existingNodes, settings) {
        const suggestions = [];
        const subjectLower = subject.toLowerCase();
        const difficultyLevel = settings.difficultyLevel || 'intermediate';
        const colors = ['#4285F4', '#EA4335', '#34A853', '#9C27B0', '#FF9900']; 
        
        // Avoid duplicating existing nodes
        const existingLabels = new Set(existingNodes.map(n => n.toLowerCase()));
        
        // Generate suggestions based on subject
        if (subjectLower.includes('mathematics')) {
            const mathConcepts = [
                { label: 'Derivative', description: 'Rate of change of a function with respect to a variable' },
                { label: 'Integral', description: 'Accumulation of quantities, such as areas under a curve' },
                { label: 'Function', description: 'Relation between inputs and outputs' },
                { label: 'Limit', description: 'Value a function approaches as input approaches some value' },
                { label: 'Vector', description: 'Quantity with both magnitude and direction' },
                { label: 'Matrix', description: 'Rectangular array of numbers, symbols, or expressions' }
            ];
            
            if (difficultyLevel === 'advanced' || difficultyLevel === 'expert') {
                mathConcepts.push(
                    { label: 'Differential Equation', description: 'Equation containing derivatives of a function' },
                    { label: 'Taylor Series', description: 'Representation of a function as infinite sum of terms' },
                    { label: 'Complex Number', description: 'Number with real and imaginary components' }
                );
            }
            
            for (const concept of mathConcepts) {
                if (!existingLabels.has(concept.label.toLowerCase())) {
                    suggestions.push({
                        ...concept,
                        color: colors[Math.floor(Math.random() * colors.length)]
                    });
                }
            }
        } else if (subjectLower.includes('biology')) {
            const bioConcepts = [
                { label: 'Cell', description: 'Basic structural and functional unit of all organisms' },
                { label: 'DNA', description: 'Molecule carrying genetic instructions for development and functioning' },
                { label: 'Evolution', description: 'Change in heritable characteristics of populations over generations' },
                { label: 'Ecosystem', description: 'Community of living organisms and their physical environment' },
                { label: 'Photosynthesis', description: 'Process by which plants convert light energy to chemical energy' }
            ];
            
            if (difficultyLevel === 'advanced' || difficultyLevel === 'expert') {
                bioConcepts.push(
                    { label: 'Epigenetics', description: 'Study of heritable phenotype changes not involving DNA changes' },
                    { label: 'Cellular Respiration', description: 'Set of metabolic reactions that convert nutrients to ATP' },
                    { label: 'Gene Expression', description: 'Process by which genetic information is used to create protein' }
                );
            }
            
            for (const concept of bioConcepts) {
                if (!existingLabels.has(concept.label.toLowerCase())) {
                    suggestions.push({
                        ...concept,
                        color: colors[Math.floor(Math.random() * colors.length)]
                    });
                }
            }
        } else if (subjectLower.includes('history')) {
            const historyConcepts = [
                { label: 'Renaissance', description: 'Period of European cultural, artistic, and economic rebirth' },
                { label: 'Industrial Revolution', description: 'Transition to new manufacturing processes in Europe and US' },
                { label: 'Cold War', description: 'Period of geopolitical tension between the USSR and US' },
                { label: 'Imperialism', description: 'Policy of extending a country\'s power through diplomacy or military force' },
                { label: 'Colonialism', description: 'Practice of acquiring political control over another territory' }
            ];
            
            for (const concept of historyConcepts) {
                if (!existingLabels.has(concept.label.toLowerCase())) {
                    suggestions.push({
                        ...concept,
                        color: colors[Math.floor(Math.random() * colors.length)]
                    });
                }
            }
        } else {
            // Generic concepts for other subjects
            const genericConcepts = [
                { label: 'Key Concept 1', description: 'Important foundational idea in this subject' },
                { label: 'Theory', description: 'System of ideas explaining something' },
                { label: 'Process', description: 'Series of actions to achieve a specific outcome' },
                { label: 'Application', description: 'Practical use of a principle or idea' },
                { label: 'Methodology', description: 'System of methods used in a particular area of study' }
            ];
            
            for (const concept of genericConcepts) {
                if (!existingLabels.has(concept.label.toLowerCase())) {
                    suggestions.push({
                        ...concept,
                        color: colors[Math.floor(Math.random() * colors.length)]
                    });
                }
            }
        }
        
        // Limit to 5 suggestions
        return suggestions.slice(0, 5);
    }

    // Update the AI greeting based on settings
    function updateAIGreeting(settings) {
        let greeting = "Hello! I'm your AI study guide. ";
        
        // Add start approach-specific message
        if (settings.startApproach === 'scratch') {
            greeting += "Let's start building your knowledge from scratch. ";
        } else if (settings.startApproach === 'recall') {
            greeting += "I'll help you organize what you already know. ";
        } else if (settings.startApproach === 'guided') {
            greeting += "I'll get you started with some concepts, and you can take it from there. ";
        }
        
        // Add information level message
        if (settings.informationLevel === 'none') {
            greeting += "I'll guide your thoughts but let you derive everything on your own. ";
        } else if (settings.informationLevel === 'bit') {
            greeting += "I'll give you hints when needed, but let you do most of the work. ";
        } else if (settings.informationLevel === 'some') {
            greeting += "I'll establish the fundamentals and guide you as you build on them. ";
        } else if (settings.informationLevel === 'alot') {
            greeting += "I'll provide lots of information for you to choose from. ";
        }
        
        // Add detail level message
        if (settings.detailLevel === 'sparse') {
            greeting += "We'll focus on main ideas only. ";
        } else if (settings.detailLevel === 'broad') {
            greeting += "We'll include technical details and formulas. ";
        } else if (settings.detailLevel === 'scholarly') {
            greeting += "We'll build a scholarly map with deep connections between concepts. ";
        }
        
        // Add hint about chat capabilities
        greeting += "You can ask me to suggest concepts or arrange your mindmap at any time.";
        
        // Update the greeting in the chat
        const aiMessages = document.getElementById('ai-messages');
        aiMessages.innerHTML = `<div class="ai-message"><p>${greeting}</p></div>`;
    }

    // Function to initialize the MindWeb application
    function initializeMindWeb() {
        // Add global event listeners
        document.getElementById('add-concept-btn').addEventListener('click', addNewConcept);
        document.getElementById('add-relationship-btn').addEventListener('click', startEdgeCreation);
        document.getElementById('delete-selected-btn').addEventListener('click', deleteSelected);
        document.getElementById('save-mindweb-btn').addEventListener('click', saveMindweb);
        document.getElementById('settings-btn').addEventListener('click', openSettings);
        document.getElementById('zoom-in-btn').addEventListener('click', () => cy.zoom(cy.zoom() * 1.2));
        document.getElementById('zoom-out-btn').addEventListener('click', () => cy.zoom(cy.zoom() * 0.8));
        document.getElementById('reset-view-btn').addEventListener('click', () => cy.fit());
        document.getElementById('ask-ai-btn').addEventListener('click', handleAiQuery);
        document.getElementById('ai-query').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                handleAiQuery();
            }
        });

        console.log("Initializing MindWeb application...");
        
        // Skip loading initial concepts or recent mindweb if we already loaded one from URL
        if (!getMindwebIdFromUrl() && cy.elements().length === 0) {
            // First check if we have initial concepts
            const initialConcepts = getSampleConceptsForTopic();
            if (initialConcepts.length > 0) {
                console.log("Adding initial sample concepts");
                cy.add(initialConcepts);
                cy.layout({ name: 'cose' }).run();
            } else {
                // Try to load most recent mindweb if no initial concepts
                console.log("No initial concepts, checking for saved MindWebs");
                loadMostRecentMindweb();
            }
        }
        
        // Set up the UI with a delay to ensure DOM is ready
        setTimeout(() => {
            try {
                console.log("Setting up UI components");
                // Check if the toolbar exists
                const toolbar = document.querySelector('#mindweb-toolbar');
                if (!toolbar) {
                    console.error("Toolbar not found in the document! UI setup may fail.");
                } else {
                    console.log("Toolbar found, initializing UI");
                }
                createLoadInterface();
                
                // Add Recent Mindwebs button
                createRecentMindwebsButton();
            } catch (e) {
                console.error("Error during UI setup:", e);
            }
        }, 1000);
    }

    // Create a button to show recent mindwebs
    function createRecentMindwebsButton() {
        const toolbar = document.querySelector('#mindweb-toolbar');
        if (!toolbar) return;
        
        // Check if button already exists
        if (document.getElementById('recent-mindwebs-btn')) return;
        
        const recentBtn = document.createElement('button');
        recentBtn.id = 'recent-mindwebs-btn';
        recentBtn.className = 'btn btn-info btn-sm';
        recentBtn.innerHTML = '<i class="fas fa-history"></i> Recent MindWebs';
        recentBtn.addEventListener('click', showRecentMindwebsModal);
        
        // Find where to insert the button (before the settings button)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            toolbar.insertBefore(recentBtn, settingsBtn);
        } else {
            toolbar.appendChild(recentBtn);
        }
    }
    
    // Show modal with recent mindwebs
    function showRecentMindwebsModal() {
        // Create modal if it doesn't exist yet
        if (!document.getElementById('recent-mindwebs-modal')) {
            const modalHtml = `
                <div class="modal fade" id="recent-mindwebs-modal" tabindex="-1" aria-labelledby="recentMindwebsModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="recentMindwebsModalLabel">Recent MindWebs</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div id="recent-mindwebs-list" class="list-group">
                                    <div class="text-center text-muted">Loading...</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer.firstElementChild);
        }
        
        // Update the list of recent mindwebs
        updateRecentMindwebsList();
        
        // Show the modal
        const recentMindwebsModal = new bootstrap.Modal(document.getElementById('recent-mindwebs-modal'));
        recentMindwebsModal.show();
    }
    
    // Update the list of recent mindwebs in the modal
    function updateRecentMindwebsList() {
        const recentList = document.getElementById('recent-mindwebs-list');
        if (!recentList) return;
        
        const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
        
        if (savedMindwebs.length === 0) {
            recentList.innerHTML = '<div class="text-center text-muted">No saved MindWebs found</div>';
            return;
        }
        
        // Sort by timestamp (newest first)
        savedMindwebs.sort((a, b) => b.timestamp - a.timestamp);
        
        let html = '';
        savedMindwebs.forEach(mindweb => {
            const date = new Date(mindweb.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const idDisplay = mindweb.id ? `#${mindweb.id}` : '';
            
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${mindweb.name} <small class="text-muted">${idDisplay}</small></h6>
                        <small class="text-muted">Saved on ${formattedDate}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary open-recent-mindweb" data-id="${mindweb.id || ''}" data-name="${mindweb.name}">Open</button>
                        <button class="btn btn-sm btn-danger delete-recent-mindweb" data-id="${mindweb.id || ''}" data-name="${mindweb.name}">Delete</button>
                    </div>
                </div>
            `;
        });
        
        recentList.innerHTML = html;
        
        // Add event listeners to the buttons
        recentList.querySelectorAll('.open-recent-mindweb').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                
                if (id) {
                    // Load the mindweb and update URL
                    loadMindwebById(id);
                    
                    // Close the modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('recent-mindwebs-modal'));
                    if (modal) modal.hide();
                } else {
                    // Handle mindwebs without IDs (legacy case)
                    const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
                    const mindweb = savedMindwebs.find(mw => mw.name === name);
                    
                    if (mindweb) {
                        loadMindweb(mindweb.data);
                        showNotification(`Loaded MindWeb: "${mindweb.name}"`, 3000);
                        
                        // Close the modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('recent-mindwebs-modal'));
                        if (modal) modal.hide();
                    }
                }
            });
        });
        
        // Add event listeners to the delete buttons
        recentList.querySelectorAll('.delete-recent-mindweb').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const name = this.getAttribute('data-name');
                if (confirm(`Are you sure you want to delete this MindWeb?`)) {
                    if (id) {
                        deleteMindwebById(id);
                    } else {
                        // Handle legacy mindwebs without IDs
                        const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
                        const updatedMindwebs = savedMindwebs.filter(mw => mw.name !== name);
                        localStorage.setItem('savedMindwebs', JSON.stringify(updatedMindwebs));
                    }
                    updateRecentMindwebsList();
                    showNotification(`MindWeb has been deleted.`, 3000);
                }
            });
        });
    }
    
    // Delete mindweb by ID
    function deleteMindwebById(id) {
        const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
        const updatedMindwebs = savedMindwebs.filter(mw => mw.id !== id);
        localStorage.setItem('savedMindwebs', JSON.stringify(updatedMindwebs));
        showNotification(`MindWeb has been deleted.`);
    }

    // Check for saved mindwebs and load the most recent one
    function loadMostRecentMindweb() {
        const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
        if (savedMindwebs.length > 0) {
            // Sort by timestamp (newest first)
            savedMindwebs.sort((a, b) => b.timestamp - a.timestamp);
            const mostRecent = savedMindwebs[0];
            
            // Only load if there are no existing nodes (empty mindweb)
            if (cy.nodes().length === 0) {
                loadMindweb(mostRecent.data);
                console.log(`Loaded most recent MindWeb: ${mostRecent.name}`);
                showNotification(`Loaded your most recent MindWeb: "${mostRecent.name}"`, 5000);
                
                // Update URL if the mindweb has an ID
                if (mostRecent.id) {
                    updateUrlWithMindwebId(mostRecent.id);
                }
            }
        }
    }

    // Update the URL with the mindweb ID
    function updateUrlWithMindwebId(id) {
        if (!id) return;
        
        const newUrl = `/mindweb/${id}`;
        history.pushState({mindwebId: id}, '', newUrl);
    }

    // Initialize EdgeHandles extension for easy edge creation
    const edgeHandles = cy.edgehandles({
        preview: true,
        hoverDelay: 150,
        handleNodes: 'node',
        handlePosition: function(node) {
            return 'middle top';
        },
        edgeParams: function(sourceNode, targetNode) {
            return {
                data: {
                    source: sourceNode.id(),
                    target: targetNode.id(),
                    label: '',
                    color: '#666',
                    lineStyle: 'solid',
                    showArrow: true
                }
            };
        },
        complete: function(sourceNode, targetNode, addedEdge) {
            openEdgeEditModal(addedEdge);
        }
    });

    // Modal elements
    const nodeEditModal = new bootstrap.Modal(document.getElementById('node-edit-modal'));
    const edgeEditModal = new bootstrap.Modal(document.getElementById('edge-edit-modal'));
    
    // Node creation button - basic implementation without animation
    document.getElementById('add-concept-btn').addEventListener('click', function() {
        const nodeId = 'n' + Date.now();
        const centerX = cy.width() / 2;
        const centerY = cy.height() / 2;
        
        // Create node with a slight random offset from center for better layout
        const randomOffsetX = (Math.random() * 100) - 50;
        const randomOffsetY = (Math.random() * 100) - 50;
        
        // Add node with standard properties without any animation
        cy.add({
            group: 'nodes',
            data: {
                id: nodeId,
                label: 'New Concept',
                color: '#4285F4',
                description: ''
            },
            position: {
                x: centerX + randomOffsetX,
                y: centerY + randomOffsetY
            }
        });
        
        const addedNode = cy.getElementById(nodeId);
        cy.elements().unselect();
        addedNode.select();
        openNodeEditModal(addedNode);
    });

    // Variables for 2-click relationship creation
    let addingRelationship = false;
    let sourceNode = null;

    // Relationship creation button
    document.getElementById('add-relationship-btn').addEventListener('click', function() {
        // Toggle relationship creation mode
        addingRelationship = !addingRelationship;
        
        if (addingRelationship) {
            // Disable edgehandles if enabled
            edgeHandles.disable();
            
            // Clear any previous source node
            sourceNode = null;
            
            // Add a click handler to the canvas for selecting nodes
            cy.on('tap', 'node', relationshipNodeClickHandler);
            
            // Show notification instead of adding to chat
            showNotification("Select the first concept (source) for your relationship.");
            
            // Change button appearance to show active state
            this.classList.add('active');
        } else {
            // Clean up when canceling relationship creation
            cy.off('tap', 'node', relationshipNodeClickHandler);
            sourceNode = null;
            this.classList.remove('active');
            showNotification("Relationship creation canceled.");
        }
    });

    // Basic relationship creation function without animation
    function relationshipNodeClickHandler(event) {
        const clickedNode = event.target;
        
        if (!sourceNode) {
            // First click - select source node
            sourceNode = clickedNode;
            showNotification("Now select the second concept (target) to create a relationship.");
            
            // Simply select the source node without animation
            cy.elements().unselect();
            sourceNode.select();
        } else {
            // Second click - select target node and create the relationship
            const targetNode = clickedNode;
            
            // Don't create self-loops
            if (sourceNode.id() === targetNode.id()) {
                showNotification("You cannot connect a concept to itself. Please select a different target concept.");
                return;
            }
            
            // Create the edge with basic properties - no animation
            const edgeId = 'e' + Date.now();
            const newEdge = cy.add({
                group: 'edges',
                data: {
                    id: edgeId,
                    source: sourceNode.id(),
                    target: targetNode.id(),
                    label: '',
                    color: '#666',
                    lineStyle: 'solid',
                    showArrow: true
                }
            });
            
            // Select the new edge
            cy.elements().unselect();
            newEdge.select();
            
            // Open the edge edit modal
            openEdgeEditModal(newEdge);
            
            // Reset relationship creation state
            sourceNode = null;
            addingRelationship = false;
            document.getElementById('add-relationship-btn').classList.remove('active');
            
            // Remove the click handler
            cy.off('tap', 'node', relationshipNodeClickHandler);
        }
    }

    // Delete selected elements - simplified for reliability
    document.getElementById('delete-selected-btn').addEventListener('click', function() {
        // Get selected elements directly
        const selected = cy.$(':selected');
        
        if (selected.length > 0) {
            // Simply remove the elements without animation
            cy.remove(selected);
            
            // Show a notification
            showNotification("Selected items deleted", 2000);
        } else {
            showNotification("Select a concept or relationship first to delete it.");
        }
    });

    // Enhanced save button with animation
    document.getElementById('save-mindweb-btn').addEventListener('click', function() {
        // Add a save animation to the button
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        this.disabled = true;
        
        // Create pulsing animation for nodes to indicate saving
        cy.nodes().animate({
            style: { 'background-opacity': 0.5 },
            duration: 500
        }).animate({
            style: { 'background-opacity': 1 },
            duration: 500
        });
        
        setTimeout(() => {
            const data = {
                nodes: cy.nodes().map(n => n.data()),
                edges: cy.edges().map(e => e.data()),
                positions: cy.nodes().map(n => ({ id: n.id(), position: n.position() }))
            };
            
            // Save to localStorage
            const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
            
            // Check if we're editing an existing mindweb (from URL)
            const currentMindwebId = getMindwebIdFromUrl();
            
            if (currentMindwebId) {
                // Find the current mindweb
                const existingIndex = savedMindwebs.findIndex(mw => mw.id === currentMindwebId);
                
                if (existingIndex >= 0) {
                    // We found the currently loaded mindweb
                    const existingMindweb = savedMindwebs[existingIndex];
                    const saveConfirm = confirm(`Update existing MindWeb "${existingMindweb.name}"?`);
                    
                    if (saveConfirm) {
                        // Update the existing mindweb
                        savedMindwebs[existingIndex] = { 
                            ...existingMindweb,
                            data: data, 
                            timestamp: Date.now()
                        };
                        
                        localStorage.setItem('savedMindwebs', JSON.stringify(savedMindwebs));
                        addAIMessage(`MindWeb "${existingMindweb.name}" has been updated.`);
                        showNotification(`MindWeb "${existingMindweb.name}" updated`, 3000);
                        updateSavedMindwebsList();
                        
                        // Reset button
                        this.innerHTML = '<i class="fas fa-save"></i> Save MindWeb';
                        this.disabled = false;
                        
                        // Show success animation
                        this.classList.add('save-success');
                        setTimeout(() => this.classList.remove('save-success'), 1000);
                        
                        return;
                    }
                    // If they click cancel, fall through to the normal save-as flow
                }
            }
            
            // Normal flow - prompt for a name for a new mindweb
            const savedName = prompt("Enter a name for this MindWeb:", "My MindWeb");
            
            if (savedName) {
                // Generate a two-digit ID for new mindwebs
                let newId = '';
                if (savedMindwebs.length > 0) {
                    // Find the highest ID and increment by 1
                    const maxId = Math.max(...savedMindwebs.map(mw => parseInt(mw.id || '0')));
                    newId = String(maxId + 1).padStart(2, '0');
                } else {
                    newId = '01';
                }
                
                // Check if name already exists
                const existingIndex = savedMindwebs.findIndex(mw => mw.name === savedName);
                if (existingIndex >= 0) {
                    if (confirm(`A MindWeb named "${savedName}" already exists. Do you want to replace it?`)) {
                        // Keep the existing ID if it has one
                        const existingId = savedMindwebs[existingIndex].id || newId;
                        savedMindwebs[existingIndex] = { 
                            name: savedName, 
                            data: data, 
                            timestamp: Date.now(),
                            id: existingId
                        };
                        
                        // Update URL with the mindweb ID
                        updateUrlWithMindwebId(existingId);
                    } else {
                        // Reset button if canceled
                        this.innerHTML = '<i class="fas fa-save"></i> Save MindWeb';
                        this.disabled = false;
                        return;
                    }
                } else {
                    savedMindwebs.push({ 
                        name: savedName, 
                        data: data, 
                        timestamp: Date.now(),
                        id: newId
                    });
                    
                    // Update URL with the new mindweb ID
                    updateUrlWithMindwebId(newId);
                }
                
                localStorage.setItem('savedMindwebs', JSON.stringify(savedMindwebs));
                addAIMessage(`MindWeb "${savedName}" has been saved to local storage with ID #${newId}.`);
                updateSavedMindwebsList();
                
                // Show success animation
                cy.nodes().animate({
                    style: { 'background-opacity': 0.7, 'scale': 1.05 },
                    duration: 400
                }).animate({
                    style: { 'background-opacity': 1, 'scale': 1 },
                    duration: 400
                });
            }
            
            // Reset button
            this.innerHTML = '<i class="fas fa-save"></i> Save MindWeb';
            this.disabled = false;
            
        }, 800); // Delay to show the animation
    });

    // Create UI for loading saved mindwebs
    function createLoadInterface() {
        console.log("Creating load interface...");
        
        // Track retry attempts (using a property on the function itself)
        createLoadInterface.retryCount = (createLoadInterface.retryCount || 0) + 1;
        
        // Give up after 3 attempts and create a fallback interface
        if (createLoadInterface.retryCount > 3) {
            console.log("Giving up on finding toolbar, creating fallback interface");
            createFallbackInterface();
            return;
        }
        
        // First, try to find the toolbar
        const toolbar = document.querySelector('#mindweb-toolbar');
        
        if (!toolbar) {
            console.error("Toolbar element #mindweb-toolbar not found - attempt " + createLoadInterface.retryCount);
            // Try again after a delay, but limit attempts
            if (createLoadInterface.retryCount < 3) {
                setTimeout(createLoadInterface, 1000);
            } else {
                createFallbackInterface();
            }
            return;
        }
        
        // If the interface already exists, don't create it again
        if (document.getElementById('load-mindweb-interface')) {
            console.log("Load interface already exists, skipping creation");
            return;
        }
        
        // Create the interface element
        const loadInterface = document.createElement('div');
        loadInterface.id = 'load-mindweb-interface';
        loadInterface.className = 'card mb-3';
        loadInterface.innerHTML = `
            <div class="card-header bg-secondary text-white">
                <h5 class="m-0">Saved MindWebs</h5>
            </div>
            <div class="card-body">
                <div id="saved-mindwebs-list" class="list-group mb-3">
                    <div class="text-center text-muted">No saved MindWebs found</div>
                </div>
            </div>
        `;
        
        // Add the interface near the toolbar or fallback to body
        if (toolbar.parentNode) {
            toolbar.parentNode.insertBefore(loadInterface, toolbar.nextSibling);
        } else {
            document.body.appendChild(loadInterface);
        }
        
        console.log("Load interface created and added to DOM");
        
        // Initially hide the interface
        loadInterface.style.display = 'none';
        
        console.log("Load interface setup complete");
    }
    
    // Create a fallback interface that doesn't depend on the toolbar
    function createFallbackInterface() {
        // If already created, don't duplicate
        if (document.getElementById('load-mindweb-interface') || 
            document.getElementById('fallback-mindweb-controls')) {
            return;
        }
        
        console.log("Creating fallback interface");
        
        // Create a floating control panel
        const controlPanel = document.createElement('div');
        controlPanel.id = 'fallback-mindweb-controls';
        controlPanel.style.position = 'fixed';
        controlPanel.style.bottom = '20px';
        controlPanel.style.right = '20px';
        controlPanel.style.zIndex = '1000';
        controlPanel.style.background = 'white';
        controlPanel.style.padding = '10px';
        controlPanel.style.borderRadius = '5px';
        controlPanel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        // Add buttons
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = 'Save MindWeb';
        saveBtn.className = 'btn btn-success mx-1';
        saveBtn.addEventListener('click', function() {
            const data = {
                nodes: cy.nodes().map(n => n.data()),
                edges: cy.edges().map(e => e.data()),
                positions: cy.nodes().map(n => ({ id: n.id(), position: n.position() }))
            };
            
            // Save to localStorage
            const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
            const savedName = prompt("Enter a name for this MindWeb:", "My MindWeb");
            
            if (savedName) {
                // Check if name already exists
                const existingIndex = savedMindwebs.findIndex(mw => mw.name === savedName);
                if (existingIndex >= 0) {
                    if (confirm(`A MindWeb named "${savedName}" already exists. Do you want to replace it?`)) {
                        savedMindwebs[existingIndex] = { name: savedName, data: data, timestamp: Date.now() };
                    } else {
                        return;
                    }
                } else {
                    savedMindwebs.push({ name: savedName, data: data, timestamp: Date.now() });
                }
                
                localStorage.setItem('savedMindwebs', JSON.stringify(savedMindwebs));
                showNotification(`MindWeb "${savedName}" has been saved to local storage.`);
                updateSavedMindwebsList();
            }
        });
        
        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = 'Load MindWeb';
        loadBtn.className = 'btn btn-primary mx-1';
        loadBtn.addEventListener('click', function() {
            const loadInterface = document.getElementById('load-mindweb-interface');
            if (loadInterface) {
                loadInterface.style.display = loadInterface.style.display === 'none' ? 'block' : 'none';
                updateSavedMindwebsList();
            } else {
                // Create the interface if it doesn't exist
                createLoadListInterface();
            }
        });
        
        // Add buttons to panel
        controlPanel.appendChild(saveBtn);
        controlPanel.appendChild(loadBtn);
        
        // Add to document
        document.body.appendChild(controlPanel);
        
        // Create the load list interface but keep it hidden
        createLoadListInterface();
    }
    
    // Create just the interface for listing saved mindwebs
    function createLoadListInterface() {
        // If already created, don't duplicate
        if (document.getElementById('load-mindweb-interface')) {
            return;
        }
        
        const loadInterface = document.createElement('div');
        loadInterface.id = 'load-mindweb-interface';
        loadInterface.className = 'card';
        loadInterface.style.position = 'fixed';
        loadInterface.style.top = '50%';
        loadInterface.style.left = '50%';
        loadInterface.style.transform = 'translate(-50%, -50%)';
        loadInterface.style.zIndex = '2000';
        loadInterface.style.maxWidth = '90%';
        loadInterface.style.width = '400px';
        loadInterface.style.maxHeight = '80%';
        loadInterface.style.overflowY = 'auto';
        loadInterface.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        
        loadInterface.innerHTML = `
            <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                <h5 class="m-0">Saved MindWebs</h5>
                <button type="button" class="close text-white" aria-label="Close">&times;</button>
            </div>
            <div class="card-body">
                <div id="saved-mindwebs-list" class="list-group mb-3">
                    <div class="text-center text-muted">No saved MindWebs found</div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(loadInterface);
        
        // Add event listener to close button
        loadInterface.querySelector('.close').addEventListener('click', function() {
            loadInterface.style.display = 'none';
        });
        
        // Hide initially
        loadInterface.style.display = 'none';
        
        // Update the list
        updateSavedMindwebsList();
    }

    // Update the list of saved mindwebs
    function updateSavedMindwebsList() {
        const savedMindwebsList = document.getElementById('saved-mindwebs-list');
        if (!savedMindwebsList) return;
        
        const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
        
        if (savedMindwebs.length === 0) {
            savedMindwebsList.innerHTML = '<div class="text-center text-muted">No saved MindWebs found</div>';
            return;
        }
        
        // Sort by timestamp (newest first)
        savedMindwebs.sort((a, b) => b.timestamp - a.timestamp);
        
        let html = '';
        savedMindwebs.forEach(mindweb => {
            const date = new Date(mindweb.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            const idDisplay = mindweb.id ? `#${mindweb.id}` : '';
            
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${mindweb.name} <small class="text-muted">${idDisplay}</small></h6>
                        <small class="text-muted">Saved on ${formattedDate}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary load-mindweb" data-id="${mindweb.id || ''}" data-name="${mindweb.name}">Load</button>
                        <button class="btn btn-sm btn-danger delete-mindweb" data-id="${mindweb.id || ''}" data-name="${mindweb.name}">Delete</button>
                    </div>
                </div>
            `;
        });
        
        savedMindwebsList.innerHTML = html;
        
        // Add event listeners to the buttons
        savedMindwebsList.querySelectorAll('.load-mindweb').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const id = this.getAttribute('data-id');
                
                if (id) {
                    // Use the dedicated function that also updates the URL
                    loadMindwebById(id);
                    document.getElementById('load-mindweb-interface').style.display = 'none';
                } else {
                    // Legacy case for mindwebs without IDs
                    const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
                    const mindweb = savedMindwebs.find(mw => mw.name === name);
                    
                    if (mindweb) {
                        loadMindweb(mindweb.data);
                        document.getElementById('load-mindweb-interface').style.display = 'none';
                        addAIMessage(`MindWeb "${name}" has been loaded.`);
                    }
                }
            });
        });
        
        savedMindwebsList.querySelectorAll('.delete-mindweb').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const id = this.getAttribute('data-id');
                if (confirm(`Are you sure you want to delete MindWeb "${name}"?`)) {
                    const savedMindwebs = JSON.parse(localStorage.getItem('savedMindwebs') || '[]');
                    const updatedMindwebs = id ? 
                        savedMindwebs.filter(mw => mw.id !== id) : 
                        savedMindwebs.filter(mw => mw.name !== name);
                    localStorage.setItem('savedMindwebs', JSON.stringify(updatedMindwebs));
                    updateSavedMindwebsList();
                    addAIMessage(`MindWeb "${name}" has been deleted.`);
                }
            });
        });
    }

    // Double click on a node to edit
    cy.on('dblclick', 'node', function(evt) {
        const node = evt.target;
        openNodeEditModal(node);
    });

    // Double click on an edge to edit
    cy.on('dblclick', 'edge', function(evt) {
        const edge = evt.target;
        openEdgeEditModal(edge);
    });

    // Node edit modal functionality - simplified without animations
    function openNodeEditModal(node) {
        const nodeData = node.data();
        
        document.getElementById('node-id').value = nodeData.id;
        document.getElementById('node-name').value = nodeData.label || '';
        document.getElementById('node-description').value = nodeData.description || '';
        document.getElementById('node-color').value = nodeData.color || '#4285F4';
        
        nodeEditModal.show();
    }

    // Save node changes without animation
    document.getElementById('save-node-btn').addEventListener('click', function() {
        const nodeId = document.getElementById('node-id').value;
        const nodeName = document.getElementById('node-name').value;
        const nodeDescription = document.getElementById('node-description').value;
        const nodeColor = document.getElementById('node-color').value;
        
        const node = cy.getElementById(nodeId);
        
        // Update data
        node.data('label', nodeName);
        node.data('description', nodeDescription);
        node.data('color', nodeColor);
        
        // Update color in the graph
        if (nodeColor) {
            node.style('background-color', nodeColor);
        }
        
        nodeEditModal.hide();
        
        // Refresh the tooltip with the new description
        addTooltip(node);
    });

    // Edge edit modal functionality - simplified without animations
    function openEdgeEditModal(edge) {
        const edgeData = edge.data();
        
        document.getElementById('edge-id').value = edgeData.id;
        document.getElementById('edge-label').value = edgeData.label || '';
        document.getElementById('edge-line-style').value = edgeData.lineStyle || 'solid';
        document.getElementById('edge-color').value = edgeData.color || '#666';
        document.getElementById('edge-arrow').checked = edgeData.showArrow !== false;
        
        edgeEditModal.show();
    }

    // Save edge changes without animation
    document.getElementById('save-edge-btn').addEventListener('click', function() {
        const edgeId = document.getElementById('edge-id').value;
        const edgeLabel = document.getElementById('edge-label').value;
        const edgeLineStyle = document.getElementById('edge-line-style').value;
        const edgeColor = document.getElementById('edge-color').value;
        const edgeArrow = document.getElementById('edge-arrow').checked;
        
        const edge = cy.getElementById(edgeId);
        edge.data('label', edgeLabel);
        edge.data('lineStyle', edgeLineStyle);
        edge.data('color', edgeColor);
        edge.data('showArrow', edgeArrow);
        
        edgeEditModal.hide();
    });

    // Zoom controls
    document.getElementById('zoom-in-btn').addEventListener('click', function() {
        cy.zoom({
            level: cy.zoom() * 1.2,
            renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
        });
    });

    document.getElementById('zoom-out-btn').addEventListener('click', function() {
        cy.zoom({
            level: cy.zoom() * 0.8,
            renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 }
        });
    });

    document.getElementById('reset-view-btn').addEventListener('click', function() {
        cy.fit();
    });

    // AI Assistant functionality
    const aiMessages = document.getElementById('ai-messages');
    const aiQuery = document.getElementById('ai-query');
    const askAiBtn = document.getElementById('ask-ai-btn');

    function addAIMessage(message) {
        const messageElem = document.createElement('div');
        messageElem.className = 'ai-message';
        messageElem.innerHTML = `<p>${message}</p>`;
        aiMessages.appendChild(messageElem);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    function addUserMessage(message) {
        const messageElem = document.createElement('div');
        messageElem.className = 'user-message';
        messageElem.innerHTML = `<p>${message}</p>`;
        aiMessages.appendChild(messageElem);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    askAiBtn.addEventListener('click', handleAiQuery);
    aiQuery.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleAiQuery();
        }
    });

    async function handleAiQuery() {
        const query = aiQuery.value.trim();
        if (query) {
            addUserMessage(query);
            aiQuery.value = '';

            // Check if the user is asking for suggestions
            const lowerQuery = query.toLowerCase();
            if (lowerQuery.includes('suggest') || lowerQuery.includes('suggestion') || 
                lowerQuery.includes('recommend') || lowerQuery.includes('idea') || 
                lowerQuery.includes('concept') || lowerQuery.includes('show me some')) {
                generateAiSuggestions();
                addAIMessage("Here are some suggested concepts related to your mindmap. You can drag them onto your map.");
                return;
            }
            
            // Check if the user wants to auto-arrange the mindmap
            if (lowerQuery.includes('arrange') || lowerQuery.includes('layout') || 
                lowerQuery.includes('organize') || lowerQuery.includes('tidy') || 
                lowerQuery.includes('clean up')) {
                cy.layout({ name: 'cose', animate: true }).run();
                addAIMessage("I've rearranged your mindmap to make it more organized.");
                return;
            }

            // Gather concept map data
            const nodes = cy.nodes().map(n => n.data());
            const edges = cy.edges().map(e => e.data());
            let subject = document.querySelector('.card-header.bg-primary h5');
            subject = subject ? subject.textContent : '';

            // Gather last 10 chat messages (user/assistant)
            const chatHistory = [];
            const chatElems = document.querySelectorAll('#ai-messages .ai-message, #ai-messages .user-message');
            for (let i = Math.max(0, chatElems.length - 10); i < chatElems.length; i++) {
                const elem = chatElems[i];
                if (elem.classList.contains('user-message')) {
                    chatHistory.push({ role: 'user', content: elem.innerText });
                } else if (elem.classList.contains('ai-message')) {
                    chatHistory.push({ role: 'assistant', content: elem.innerText });
                }
            }
            // Add the current user query as the latest message
            chatHistory.push({ role: 'user', content: query });

            const payload = {
                chat_history: chatHistory,
                concept_map: [...nodes, ...edges],
                subject: subject
            };

            try {
                const response = await fetch('/ai/challenge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    addAIMessage('AI service error: Invalid response from server.');
                    return;
                }
                if (!response.ok) {
                    if (data && data.error) {
                        addAIMessage('AI service error: ' + data.error);
                    } else {
                        addAIMessage('AI service error: Unexpected backend error.');
                    }
                    return;
                }
                // Display the AI's single Socratic message
                if (data.message) {
                    addAIMessage(data.message);
                } else {
                    addAIMessage('AI did not return a message.');
                }
            } catch (err) {
                addAIMessage('AI service unavailable. (Mock response): ' + getAIMockResponse(query, cy.nodes().length));
            }
        }
    }

    // Get mock AI responses
    function getAIMockResponse(query, nodeCount) {
        query = query.toLowerCase();
        
        if (query.includes('help') || query.includes('how')) {
            return "To create your concept map, add concepts using the 'Add Concept' button, then create relationships between them. You can edit any element by double-clicking on it. Ask me for suggestions or to arrange your map.";
        } else if (query.includes('empty') || nodeCount === 0) {
            return "Your concept map is empty. Start by adding some key concepts using the 'Add Concept' button on the left.";
        } else if (query.includes('relationship') || query.includes('connect')) {
            return "To create relationships between concepts, click the 'Add Relationship' button, then click and drag from one concept to another.";
        } else if (query.includes('save')) {
            return "Your work is automatically saved as you go. You can also click the 'Save MindWeb' button to manually save your progress.";
        } else if (query.includes('example') || query.includes('suggestion')) {
            return "I'm generating some suggested concepts for you. You can drag these into your map to add them. Try connecting related concepts and labeling the relationships.";
        } else if (query.includes('arrange') || query.includes('layout') || query.includes('organize')) {
            return "I've rearranged your mindmap to make it more organized. You can ask me anytime to 'arrange my map' to tidy it up.";
        } else {
            return "Keep building your concept map! The more connections you make, the better your understanding will be. Try adding more concepts related to what you've already added.";
        }
    }

    // Helper function to get sample concepts based on the test subject
    function getSampleConceptsForTopic() {
        // Get the subject from the page (now in the card-header span)
        let subject = '';
        const headerSpans = document.querySelectorAll('.card-header span');
        headerSpans.forEach(span => {
            if (span.textContent.startsWith('Subject: ')) {
                subject = span.textContent.replace('Subject: ', '');
            }
        });
        // Return different sample nodes based on the subject
        if (subject.includes('Mathematics')) {
            return [
                { group: 'nodes', data: { id: 'n1', label: 'Limit', color: '#4285F4', description: 'The value a function approaches as the input approaches some value' }, position: { x: 100, y: 100 } },
                { group: 'nodes', data: { id: 'n2', label: 'Derivative', color: '#EA4335', description: 'Rate of change of a function with respect to a variable' }, position: { x: 250, y: 100 } },
                { group: 'edges', data: { id: 'e1', source: 'n1', target: 'n2', label: 'used to find', color: '#666', lineStyle: 'solid', showArrow: true } }
            ];
        } else if (subject.includes('Biology')) {
            return [
                { group: 'nodes', data: { id: 'n1', label: 'Cell', color: '#4285F4', description: 'The basic structural and functional unit of all organisms' }, position: { x: 100, y: 100 } },
                { group: 'nodes', data: { id: 'n2', label: 'DNA', color: '#34A853', description: 'Molecule that carries genetic instructions' }, position: { x: 250, y: 100 } },
                { group: 'edges', data: { id: 'e1', source: 'n1', target: 'n2', label: 'contains', color: '#666', lineStyle: 'solid', showArrow: true } }
            ];
        } else if (subject.includes('History')) {
            return [
                { group: 'nodes', data: { id: 'n1', label: 'Renaissance', color: '#4285F4', description: 'Period of European cultural, artistic, and economic "rebirth"' }, position: { x: 100, y: 100 } },
                { group: 'nodes', data: { id: 'n2', label: 'Middle Ages', color: '#9C27B0', description: 'Period in European history from the 5th to the 15th century' }, position: { x: 250, y: 100 } },
                { group: 'edges', data: { id: 'e1', source: 'n2', target: 'n1', label: 'preceded', color: '#666', lineStyle: 'solid', showArrow: true } }
            ];
        } else {
            return []; // Empty for other subjects
        }
    }

    // Add tooltips to nodes to show descriptions
    cy.nodes().forEach(addTooltip);
    cy.on('add', 'node', function(evt) {
        addTooltip(evt.target);
    });

    function addTooltip(node) {
        const description = node.data('description');
        if (description) {
            makeTippy(node, description);
        }
    }

    function makeTippy(node, text) {
        const ref = node.popperRef();
        const dummyDomElem = document.createElement('div');
        
        const tip = tippy(dummyDomElem, {
            getReferenceClientRect: ref.getBoundingClientRect,
            trigger: 'manual',
            content: () => {
                const div = document.createElement('div');
                div.innerHTML = text;
                return div;
            },
            arrow: true,
            placement: 'bottom',
            hideOnClick: false,
            sticky: 'reference',
            interactive: true,
            appendTo: document.body
        });
        
        node.on('mouseover', () => tip.show());
        node.on('mouseout', () => tip.hide());
        
        return tip;
    }

    // Add a notification function for temporary instructions
    function showNotification(message, duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'mindweb-notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '80%';
        notification.style.textAlign = 'center';
        notification.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.16)';
        
        // Add to document
        document.body.appendChild(notification);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, duration);
    }
}); 