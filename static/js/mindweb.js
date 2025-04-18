document.addEventListener('DOMContentLoaded', function() {
    // Initialize Cytoscape instance
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

    // Example initial concepts (can be empty or prefilled based on test_id)
    const initialConcepts = getSampleConceptsForTopic();
    if (initialConcepts.length > 0) {
        cy.add(initialConcepts);
        cy.layout({ name: 'cose' }).run();
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
    
    // Node creation button
    document.getElementById('add-concept-btn').addEventListener('click', function() {
        const nodeId = 'n' + Date.now();
        cy.add({
            group: 'nodes',
            data: {
                id: nodeId,
                label: 'New Concept',
                color: '#4285F4',
                description: ''
            },
            position: {
                x: cy.width() / 2,
                y: cy.height() / 2
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

    // Handler for node clicks during relationship creation
    function relationshipNodeClickHandler(event) {
        const clickedNode = event.target;
        
        if (!sourceNode) {
            // First click - select source node
            sourceNode = clickedNode;
            showNotification("Now select the second concept (target) to create a relationship.");
            
            // Highlight the selected source node
            cy.elements().unselect();
            sourceNode.select();
        } else {
            // Second click - select target node and create the relationship
            const targetNode = clickedNode;
            
            // Don't create self-loops (unless you want to allow them)
            if (sourceNode.id() === targetNode.id()) {
                showNotification("You cannot connect a concept to itself. Please select a different target concept.");
                return;
            }
            
            // Create the edge
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

    // Delete selected elements
    document.getElementById('delete-selected-btn').addEventListener('click', function() {
        const selected = cy.$(":selected");
        if (selected.length > 0) {
            cy.remove(selected);
        } else {
            showNotification("Select a concept or relationship first to delete it.");
        }
    });

    // Layout button
    document.getElementById('layout-btn').addEventListener('click', function() {
        cy.layout({ name: 'cose', animate: true }).run();
    });

    // Save button (mock - would connect to backend in real app)
    document.getElementById('save-mindweb-btn').addEventListener('click', function() {
        const data = {
            nodes: cy.nodes().map(n => n.data()),
            edges: cy.edges().map(e => e.data()),
            positions: cy.nodes().map(n => ({ id: n.id(), position: n.position() }))
        };
        
        // In real app, would send to server
        console.log('Saving mindweb data:', data);
        addAIMessage("Your MindWeb has been saved successfully!");
    });

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

    // Node edit modal functionality
    function openNodeEditModal(node) {
        const nodeData = node.data();
        
        document.getElementById('node-id').value = nodeData.id;
        document.getElementById('node-name').value = nodeData.label || '';
        document.getElementById('node-description').value = nodeData.description || '';
        document.getElementById('node-color').value = nodeData.color || '#4285F4';
        
        nodeEditModal.show();
    }

    // Save node changes
    document.getElementById('save-node-btn').addEventListener('click', function() {
        const nodeId = document.getElementById('node-id').value;
        const nodeName = document.getElementById('node-name').value;
        const nodeDescription = document.getElementById('node-description').value;
        const nodeColor = document.getElementById('node-color').value;
        
        const node = cy.getElementById(nodeId);
        node.data('label', nodeName);
        node.data('description', nodeDescription);
        node.data('color', nodeColor);
        
        nodeEditModal.hide();
    });

    // Edge edit modal functionality
    function openEdgeEditModal(edge) {
        const edgeData = edge.data();
        
        document.getElementById('edge-id').value = edgeData.id;
        document.getElementById('edge-label').value = edgeData.label || '';
        document.getElementById('edge-line-style').value = edgeData.lineStyle || 'solid';
        document.getElementById('edge-color').value = edgeData.color || '#666';
        document.getElementById('edge-arrow').checked = edgeData.showArrow !== false;
        
        edgeEditModal.show();
    }

    // Save edge changes
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
            return "To create your concept map, add concepts using the 'Add Concept' button, then create relationships between them. You can edit any element by double-clicking on it.";
        } else if (query.includes('empty') || nodeCount === 0) {
            return "Your concept map is empty. Start by adding some key concepts using the 'Add Concept' button on the left.";
        } else if (query.includes('relationship') || query.includes('connect')) {
            return "To create relationships between concepts, click the 'Add Relationship' button, then click and drag from one concept to another.";
        } else if (query.includes('save')) {
            return "Your work is automatically saved as you go. You can also click the 'Save MindWeb' button to manually save your progress.";
        } else if (query.includes('example') || query.includes('suggestion')) {
            return "Try connecting related concepts and labeling the relationships. For example, if you have 'Photosynthesis' and 'Plants', you might connect them with 'occurs in'.";
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