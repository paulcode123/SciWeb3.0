document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const nodesContainer = document.querySelector('.nodes-container');
  const treeCanvas = document.querySelector('.tree-canvas');
  const uploadForm = document.querySelector('.upload-form');
  const uploadOverlay = document.querySelector('.upload-overlay');
  const connectionOverlay = document.querySelector('.connection-overlay');
  const statusMessage = document.querySelector('.status-message');
  const miniMap = document.querySelector('.mini-map');
  const miniMapToggle = document.querySelector('.mini-map-toggle');
  const miniMapViewport = document.querySelector('.mini-map-viewport');
  const zoomControls = document.querySelector('.zoom-controls');
  const zoomInBtn = document.querySelector('.zoom-in');
  const zoomOutBtn = document.querySelector('.zoom-out');
  const zoomLevelDisplay = document.querySelector('.zoom-level');
  const aiSidebar = document.querySelector('.ai-sidebar');
  const aiToggleBtn = document.querySelector('.ai-toggle-btn');
  const aiCloseBtn = document.querySelector('.ai-close-btn');
  const aiChatBox = document.querySelector('.ai-chat-box');
  const aiInput = document.querySelector('#ai-input');
  const aiSendBtn = document.querySelector('#ai-send-btn');
  
  // Canvas Setup
  const ctx = treeCanvas.getContext('2d');
  
  // State
  let nodes = [];
  let edges = [];
  let nextNodeId = 1;
  let selectedNode = null;
  let draggedNode = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let connectionStart = null;
  let isDragging = false;
  let isConnecting = false;
  let miniMapVisible = false;
  
  // Pan and Zoom state
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  
  // AI State
  const OPENAI_API_KEY = 'sk-YOUR_SAMPLE_API_KEY_HERE'; // Replace with your actual key if using a real backend
  const nodeTypes = ['motivator', 'task', 'challenge', 'class', 'assignment', 'test', 'project', 'essay', 'image'];
  
  // Initialize canvas for line drawing
  function resizeCanvas() {
    treeCanvas.width = window.innerWidth;
    treeCanvas.height = window.innerHeight;
    drawEdges();
    updateMiniMap();
  }

  // Initialize the canvas after state is defined
  resizeCanvas();

  // Window resize event
  window.addEventListener('resize', resizeCanvas);
  
  // Apply transformations to coordinates
  function transformX(x) {
    return (x - offsetX) * scale;
  }
  
  function transformY(y) {
    return (y - offsetY) * scale;
  }
  
  // Reverse transformations (for mouse coordinates)
  function untransformX(x) {
    return (x / scale) + offsetX;
  }
  
  function untransformY(y) {
    return (y / scale) + offsetY;
  }
  
  // Update node positions based on pan and zoom
  function updateNodePositions() {
    nodes.forEach(node => {
      const element = node.element;
      const originalLeft = parseInt(element.dataset.originalLeft || element.style.left);
      const originalTop = parseInt(element.dataset.originalTop || element.style.top);
      
      // Save original positions if not already saved
      if (!element.dataset.originalLeft) {
        element.dataset.originalLeft = originalLeft;
        element.dataset.originalTop = originalTop;
      }
      
      const newLeft = transformX(originalLeft);
      const newTop = transformY(originalTop);
      
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
      element.style.transform = `scale(${scale})`;
    });
    
    drawEdges();
    updateMiniMap();
    updateZoomDisplay();
  }
  
  // Update zoom display
  function updateZoomDisplay() {
    zoomLevelDisplay.textContent = `${Math.round(scale * 100)}%`;
  }
  
  // Update minimap
  function updateMiniMap() {
    if (!miniMapVisible) return;
    
    const worldWidth = 3000; // Estimated world size
    const worldHeight = 3000;
    
    const mapWidth = miniMap.offsetWidth;
    const mapHeight = miniMap.offsetHeight;
    
    // Calculate the viewport rectangle
    const viewportWidth = (window.innerWidth / (worldWidth * scale)) * mapWidth;
    const viewportHeight = (window.innerHeight / (worldHeight * scale)) * mapHeight;
    
    const viewportX = (offsetX / worldWidth) * mapWidth + mapWidth / 2 - viewportWidth / 2;
    const viewportY = (offsetY / worldHeight) * mapHeight + mapHeight / 2 - viewportHeight / 2;
    
    // Update the viewport
    miniMapViewport.style.width = `${viewportWidth}px`;
    miniMapViewport.style.height = `${viewportHeight}px`;
    miniMapViewport.style.left = `${viewportX}px`;
    miniMapViewport.style.top = `${viewportY}px`;
  }
  
  // Toggle minimap
  miniMapToggle.addEventListener('click', function() {
    miniMapVisible = !miniMapVisible;
    miniMap.classList.toggle('visible', miniMapVisible);
    miniMapToggle.classList.toggle('active', miniMapVisible);
    
    if (miniMapVisible) {
      updateMiniMap();
    }
  });
  
  // Zoom controls
  zoomInBtn.addEventListener('click', function() {
    scale *= 1.2;
    scale = Math.min(Math.max(0.1, scale), 3);
    updateNodePositions();
    showMessage(`Zoom: ${Math.round(scale * 100)}%`);
  });
  
  zoomOutBtn.addEventListener('click', function() {
    scale *= 0.8;
    scale = Math.min(Math.max(0.1, scale), 3);
    updateNodePositions();
    showMessage(`Zoom: ${Math.round(scale * 100)}%`);
  });
  
  // Add zoom with mouse wheel
  treeCanvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    
    // Get mouse position before zoom
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Convert to world coordinates
    const worldX = untransformX(mouseX);
    const worldY = untransformY(mouseY);
    
    // Calculate zoom factor based on wheel delta
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Apply zoom (with limits)
    scale *= zoomFactor;
    scale = Math.min(Math.max(0.1, scale), 3); // Limit zoom between 0.1x and 3x
    
    // Adjust offset to zoom towards mouse position
    offsetX = worldX - (mouseX / scale);
    offsetY = worldY - (mouseY / scale);
    
    // Update node positions
    updateNodePositions();
    
    // Show zoom level
    showMessage(`Zoom: ${Math.round(scale * 100)}%`);
  });
  
  // Add panning with middle mouse button or spacebar + drag
  document.addEventListener('mousedown', function(e) {
    // Middle mouse button (button 1) or Alt+left click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      treeCanvas.style.cursor = 'grabbing';
    }
  });
  
  document.addEventListener('mousemove', function(e) {
    if (isPanning) {
      const dx = (e.clientX - panStartX) / scale;
      const dy = (e.clientY - panStartY) / scale;
      
      offsetX -= dx;
      offsetY -= dy;
      
      panStartX = e.clientX;
      panStartY = e.clientY;
      
      updateNodePositions();
    }
  });
  
  document.addEventListener('mouseup', function(e) {
    if (isPanning) {
      isPanning = false;
      treeCanvas.style.cursor = 'default';
    }
  });
  
  // Add keyboard shortcuts for panning and zooming
  document.addEventListener('keydown', function(e) {
    // Don't interfere if user is typing in AI input
    if (e.target === aiInput) return;
    
    // Spacebar to toggle pan mode
    if (e.code === 'Space' && !isPanning && !isConnecting && !isDragging) {
      e.preventDefault();
      treeCanvas.style.cursor = 'grab';
      isPanning = true;
      panStartX = 0;
      panStartY = 0;
    }
    
    // Plus key to zoom in
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      scale *= 1.1;
      scale = Math.min(Math.max(0.1, scale), 3);
      updateNodePositions();
      showMessage(`Zoom: ${Math.round(scale * 100)}%`);
    }
    
    // Minus key to zoom out
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      scale *= 0.9;
      scale = Math.min(Math.max(0.1, scale), 3);
      updateNodePositions();
      showMessage(`Zoom: ${Math.round(scale * 100)}%`);
    }
    
    // 0 key to reset zoom and pan
    if (e.key === '0') {
      e.preventDefault();
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      updateNodePositions();
      showMessage('View reset');
    }
  });
  
  document.addEventListener('keyup', function(e) {
    if (e.code === 'Space' && isPanning) {
      isPanning = false;
      treeCanvas.style.cursor = 'default';
    }
  });

  // Node creation function
  function createNode(type, title, left, top, content = null) {
    const node = document.createElement('div');
    node.className = `node node-${type} appear`;
    node.dataset.id = nextNodeId++;
    node.dataset.type = type;
    
    // Store original position (in world coordinates)
    node.dataset.originalLeft = left;
    node.dataset.originalTop = top;
    
    // Apply transformation for display
    const displayLeft = transformX(left);
    const displayTop = transformY(top);
    
    // Position the node
    node.style.left = `${displayLeft}px`;
    node.style.top = `${displayTop}px`;
    node.style.transform = `scale(${scale})`;
    
    // Add node title
    const titleEl = document.createElement('div');
    titleEl.className = 'node-title';
    titleEl.textContent = title;
    node.appendChild(titleEl);
    
    // If it's an image node, add the image
    if (type === 'image' && content) {
      const img = document.createElement('img');
      img.src = content;
      img.alt = title;
      node.appendChild(img);
    }
    
    // Add node controls
    const controls = document.createElement('div');
    controls.className = 'node-controls';
    
    // Delete button
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'node-control';
    deleteBtn.innerHTML = '✕';
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteNode(node.dataset.id);
    });
    controls.appendChild(deleteBtn);
    
    // Connect button
    const connectBtn = document.createElement('div');
    connectBtn.className = 'node-control';
    connectBtn.innerHTML = '↔';
    connectBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      startConnection(node.dataset.id);
    });
    controls.appendChild(connectBtn);
    
    // Schedule button (only for task, test, assignment, project nodes)
    if (['task', 'test', 'assignment', 'project'].includes(type)) {
      const scheduleBtn = document.createElement('div');
      scheduleBtn.className = 'node-control';
      scheduleBtn.innerHTML = '📅';
      scheduleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showMessage('Task added to today\'s schedule!');
      });
      controls.appendChild(scheduleBtn);
    }
    
    // Open button (only for class nodes)
    if (type === 'class') {
      const openBtn = document.createElement('div');
      openBtn.className = 'node-control';
      openBtn.innerHTML = '➡️';
      openBtn.title = 'Open Class Page';
      openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Encode the title for the URL
        const encodedClassName = encodeURIComponent(title);
        window.location.href = `/class/${encodedClassName}`;
      });
      controls.appendChild(openBtn);
      
      // Also make the entire node clickable to open the class page
      node.style.cursor = 'pointer';
      node.addEventListener('dblclick', function(e) {
        if (!isDragging && !isConnecting) {
          // Encode the title for the URL
          const encodedClassName = encodeURIComponent(title);
          window.location.href = `/class/${encodedClassName}`;
        }
      });
    }

    // Open button (only for motivator nodes)
    if (type === 'motivator') {
      const openBtn = document.createElement('div');
      openBtn.className = 'node-control';
      openBtn.innerHTML = '🌟';
      openBtn.title = 'Open Envision Page';
      openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Use node ID as motivator ID for the URL
        window.location.href = `/envision/${node.dataset.id}`;
      });
      controls.appendChild(openBtn);
      
      // Also make the entire node clickable to open the envision page
      node.style.cursor = 'pointer';
      node.addEventListener('dblclick', function(e) {
        if (!isDragging && !isConnecting) {
          window.location.href = `/envision/${node.dataset.id}`;
        }
      });
    }
    
    // Open button (only for project nodes)
    if (type === 'project') {
      const openBtn = document.createElement('div');
      openBtn.className = 'node-control';
      openBtn.innerHTML = '📊';
      openBtn.title = 'Open Collaboration Page';
      openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Use node ID as project ID for the URL
        window.location.href = `/collab/${node.dataset.id}`;
      });
      controls.appendChild(openBtn);
      
      // Also make the entire node clickable to open the collab page
      node.style.cursor = 'pointer';
      node.addEventListener('dblclick', function(e) {
        if (!isDragging && !isConnecting) {
          window.location.href = `/collab/${node.dataset.id}`;
        }
      });
    }
    
    node.appendChild(controls);
    
    // Add node to the DOM
    nodesContainer.appendChild(node);
    
    // Make node draggable
    makeDraggable(node);
    
    // Add to nodes array
    nodes.push({
      id: node.dataset.id,
      element: node,
      type: type,
      title: title
    });
    
    updateMiniMap();
    
    return node;
  }
  
  // Make a node draggable
  function makeDraggable(node) {
    node.addEventListener('mousedown', function(e) {
      if (e.target.classList.contains('node-control')) return;
      if (isPanning || e.button !== 0) return; // Only left click for dragging
      
      isDragging = true;
      draggedNode = node;
      
      // Calculate the offset
      const rect = node.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      
      // Bring to front
      node.style.zIndex = '100';
      
      e.stopPropagation();
    });
  }
  
  // Handle mouse move (for dragging)
  document.addEventListener('mousemove', function(e) {
    if (isDragging && draggedNode) {
      // Calculate new position in screen coordinates
      const newScreenLeft = e.clientX - dragOffsetX;
      const newScreenTop = e.clientY - dragOffsetY;
      
      // Convert to world coordinates
      const newWorldLeft = untransformX(newScreenLeft);
      const newWorldTop = untransformY(newScreenTop);
      
      // Update the original position
      draggedNode.dataset.originalLeft = newWorldLeft;
      draggedNode.dataset.originalTop = newWorldTop;
      
      // Update displayed position
      draggedNode.style.left = `${newScreenLeft}px`;
      draggedNode.style.top = `${newScreenTop}px`;
      
      // Redraw edges
      drawEdges();
      updateMiniMap();
    }
    
    // Handle connection line drawing
    if (isConnecting && connectionStart) {
      drawEdges();
      
      const startNode = document.querySelector(`[data-id="${connectionStart}"]`);
      if (startNode) {
        const startRect = startNode.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2;
        const startY = startRect.top + startRect.height / 2;
        
        // Draw temp line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });
  
  // Handle mouse up (for dragging)
  document.addEventListener('mouseup', function(e) {
    if (isDragging && draggedNode) {
      draggedNode.style.zIndex = '5';
      draggedNode = null;
      isDragging = false;
    }
  });
  
  // Handle connection overlay click
  connectionOverlay.addEventListener('click', function(e) {
    // Find if we clicked on a node
    const nodeElements = document.querySelectorAll('.node');
    let targetNode = null;
    
    for (const node of nodeElements) {
      const rect = node.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        targetNode = node;
        break;
      }
    }
    
    if (targetNode && targetNode.dataset.id !== connectionStart) {
      // Add the edge
      edges.push({
        from: connectionStart,
        to: targetNode.dataset.id
      });
      
      // Draw the edges
      drawEdges();
      showMessage('Connection created!');
    }
    
    // End connecting mode
    endConnection();
  });
  
  // Start connection
  function startConnection(nodeId) {
    connectionStart = nodeId;
    isConnecting = true;
    connectionOverlay.style.display = 'block';
  }
  
  // End connection
  function endConnection() {
    connectionStart = null;
    isConnecting = false;
    connectionOverlay.style.display = 'none';
    drawEdges();
  }
  
  // Delete a node
  function deleteNode(nodeId) {
    // Remove from DOM
    const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
    if (nodeEl) {
      nodeEl.remove();
    }
    
    // Remove from nodes array
    nodes = nodes.filter(node => node.id !== nodeId);
    
    // Remove related edges
    edges = edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
    
    // Redraw edges
    drawEdges();
    updateMiniMap();
    
    showMessage('Node deleted!');
  }
  
  // Draw edges between nodes
  function drawEdges() {
    // Clear canvas
    ctx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
    
    // Draw each edge
    edges.forEach(edge => {
      const fromNode = document.querySelector(`[data-id="${edge.from}"]`);
      const toNode = document.querySelector(`[data-id="${edge.to}"]`);
      
      if (fromNode && toNode) {
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        
        // Get node types for line color
        const fromType = fromNode.dataset.type;
        const toType = toNode.dataset.type;
        
        // Set line style based on node types
        const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
        
        const fromColor = getColorForType(fromType);
        const toColor = getColorForType(toType);
        
        gradient.addColorStop(0, fromColor);
        gradient.addColorStop(1, toColor);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
  
  // Helper to get color for node type
  function getColorForType(type) {
    const colors = {
      'motivator': '#ff1a75',
      'task': '#4285F4',
      'challenge': '#FF9900',
      'class': '#8E44AD',
      'assignment': '#27AE60',
      'test': '#E74C3C',
      'project': '#16A085',
      'essay': '#F1C40F',
      'image': '#3498DB'
    };
    
    return colors[type] || '#7f8c8d';
  }
  
  // Show temporary status message
  function showMessage(message) {
    statusMessage.textContent = message;
    statusMessage.classList.add('show');
    
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 3000);
  }
  
  // Helper function to get center of current view in world coordinates
  function getViewCenter() {
    // Get the center of the viewport in screen coordinates
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    // Convert to world coordinates
    const worldX = untransformX(viewportCenterX);
    const worldY = untransformY(viewportCenterY);
    
    return { x: worldX, y: worldY };
  }
  
  // Button event listeners for creating nodes
  document.querySelector('.btn-motivator').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('motivator', 'Motivation', center.x, center.y);
  });
  
  document.querySelector('.btn-task').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('task', 'Task', center.x, center.y);
  });
  
  document.querySelector('.btn-challenge').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('challenge', 'Challenge', center.x, center.y);
  });
  
  document.querySelector('.btn-class').addEventListener('click', function() {
    const center = getViewCenter();
    const className = prompt('Enter class name (e.g., "AP Biology", "Math 101"):');
    if (className) {
      createNode('class', className, center.x, center.y);
    }
  });
  
  document.querySelector('.btn-assignment').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('assignment', 'Assignment', center.x, center.y);
  });
  
  document.querySelector('.btn-test').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('test', 'Test', center.x, center.y);
  });
  
  document.querySelector('.btn-project').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('project', 'Project', center.x, center.y);
  });
  
  document.querySelector('.btn-essay').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('essay', 'Essay', center.x, center.y);
  });
  
  // Open image upload form
  document.querySelector('.btn-image').addEventListener('click', function() {
    uploadForm.style.display = 'block';
    uploadOverlay.style.display = 'block';
  });
  
  // Close image upload form
  document.querySelector('.close-upload').addEventListener('click', function() {
    uploadForm.style.display = 'none';
    uploadOverlay.style.display = 'none';
  });
  
  // Handle image upload form submission
  document.querySelector('.upload-form form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const imageUrl = document.querySelector('#image-url').value;
    const imageTitle = document.querySelector('#image-title').value || 'Image';
    
    if (imageUrl) {
      const center = getViewCenter();
      createNode('image', imageTitle, center.x, center.y, imageUrl);
      
      // Close the form
      uploadForm.style.display = 'none';
      uploadOverlay.style.display = 'none';
      
      // Clear the form
      document.querySelector('#image-url').value = '';
      document.querySelector('#image-title').value = '';
      
      showMessage('Image added!');
    }
  });
  
  // Clear all nodes
  document.querySelector('.btn-clear').addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all nodes?')) {
      nodes.forEach(node => {
        node.element.remove();
      });
      
      nodes = [];
      edges = [];
      drawEdges();
      updateMiniMap();
      
      showMessage('All nodes cleared!');
    }
  });
  
  // Add reset view button functionality
  document.querySelector('.btn-save').addEventListener('click', function() {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    updateNodePositions();
    showMessage('View reset');
  });
  
  // --- AI Assistant Logic --- //
  
  // Toggle AI sidebar
  aiToggleBtn.addEventListener('click', toggleAISidebar);
  aiCloseBtn.addEventListener('click', toggleAISidebar);
  
  function toggleAISidebar() {
    aiSidebar.classList.toggle('visible');
    aiToggleBtn.classList.toggle('hidden'); // Hide toggle when sidebar is open
  }
  
  // Send message on button click
  aiSendBtn.addEventListener('click', sendAIMessage);
  
  // Send message on Enter key press
  aiInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendAIMessage();
    }
  });
  
  // Add message to chat box
  function addMessageToChat(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type === 'user' ? 'user-message' : 'ai-message');
    messageDiv.innerHTML = message; // Use innerHTML to allow for code blocks
    aiChatBox.appendChild(messageDiv);
    aiChatBox.scrollTop = aiChatBox.scrollHeight; // Scroll to bottom
  }
  
  // Handle sending message to AI
  function sendAIMessage() {
    const userInput = aiInput.value.trim();
    if (!userInput) return;
    
    addMessageToChat(userInput, 'user');
    aiInput.value = '';
    
    // Show thinking indicator (optional)
    addMessageToChat('🧠 Thinking...', 'ai');
    
    // Mock AI response
    askAI(userInput);
  }
  
  // Mock OpenAI call and function parsing
  async function askAI(prompt) {
    // Remove thinking indicator
    aiChatBox.removeChild(aiChatBox.lastChild);
    
    // --- Mock API Call Simulation --- 
    // In a real app, you would make a fetch request here to your backend,
    // which would then call the OpenAI API.
    // For this example, we'll just parse commands directly.
    
    let response = "I couldn't understand that command. Try things like: \n`addNode(task, 'Finish homework')`\n`getNodeStructure()`\n`nodeInfo(1)`\n`editNode(1, 'New Title')`\n`deleteNode(1)`";
    let commandHandled = false;

    try {
      // Basic command parsing
      const commandMatch = prompt.match(/^(\w+)\((.*)\)$/);
      if (commandMatch) {
        const command = commandMatch[1];
        const argsStr = commandMatch[2];
        const args = argsStr.split(',').map(arg => arg.trim().replace(/['"]/g, '')); // Simple arg parsing

        switch (command) {
          case 'addNode':
            if (args.length >= 2) {
              const type = args[0];
              const name = args[1];
              // Optional parentId (simplified) and info
              // const parentId = args.length > 2 ? args[2] : null;
              // const info = args.length > 3 ? args[3] : null;
              response = await aiAddNode(type, null, name, null);
              commandHandled = true;
            } else {
              response = 'Error: `addNode` requires at least `type` and `name` arguments.';
            }
            break;
          case 'getNodeStructure':
            response = await aiGetNodeStructure();
            commandHandled = true;
            break;
          case 'nodeInfo':
            if (args.length >= 1) {
              response = await aiNodeInfo(args[0]);
              commandHandled = true;
            } else {
              response = 'Error: `nodeInfo` requires a `nodeId` argument.';
            }
            break;
          case 'editNode':
            if (args.length >= 2) {
              response = await aiEditNode(args[0], args[1]);
              commandHandled = true;
            } else {
              response = 'Error: `editNode` requires `nodeId` and `newInfo` (title) arguments.';
            }
            break;
          case 'deleteNode':
            if (args.length >= 1) {
              response = await aiDeleteNode(args[0]);
              commandHandled = true;
            } else {
              response = 'Error: `deleteNode` requires a `nodeId` argument.';
            }
            break;
        }
      }
    } catch (error) {
        console.error("AI Processing Error:", error);
        response = "An error occurred while processing your request.";
    }
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    addMessageToChat(response, 'ai');
  }
  
  // --- AI Function Implementations --- //
  
  async function aiAddNode(type, parentId, name, info) {
    if (!nodeTypes.includes(type.toLowerCase())) {
      return `Error: Invalid node type '${type}'. Valid types are: ${nodeTypes.join(', ')}`;
    }
    
    const center = getViewCenter();
    const newNode = createNode(type.toLowerCase(), name, center.x, center.y);
    
    // Simplified parent connection (if parentId is provided)
    if (parentId) {
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode) {
            edges.push({ from: parentId, to: newNode.dataset.id });
            drawEdges();
            return `Node '${name}' (ID: ${newNode.dataset.id}) of type '${type}' created and linked to parent node ${parentId}.`;
        } else {
             return `Node '${name}' (ID: ${newNode.dataset.id}) created, but parent node ${parentId} not found.`;
        }
    } else {
        return `Node '${name}' (ID: ${newNode.dataset.id}) of type '${type}' created successfully.`;
    }
  }
  
  async function aiGetNodeStructure() {
    if (nodes.length === 0) {
      return "The tree is currently empty.";
    }
    
    let structure = "Current Tree Structure:\n";
    nodes.forEach(node => {
      structure += `- Node ${node.id}: Type=${node.type}, Title='${node.title}'\n`;
    });
    
    if (edges.length > 0) {
        structure += "\nConnections:\n";
        edges.forEach(edge => {
            structure += `- ${edge.from} -> ${edge.to}\n`;
        });
    } else {
        structure += "\nNo connections yet.";
    }
    
    return `<pre><code>${structure}</code></pre>`;
  }
  
  async function aiNodeInfo(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        return `Node Info (ID: ${nodeId}):\nType: ${node.type}\nTitle: ${node.title}`;
    } else {
        return `Error: Node with ID ${nodeId} not found.`;
    }
  }
  
  async function aiEditNode(nodeId, newInfo) {
    // Simplified: newInfo is just the new title
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        const titleEl = node.element.querySelector('.node-title');
        if (titleEl) {
            titleEl.textContent = newInfo;
            node.title = newInfo; // Update state
            return `Node ${nodeId} title updated to '${newInfo}'.`;
        } else {
            return `Error: Could not find title element for Node ${nodeId}.`;
        }
    } else {
        return `Error: Node with ID ${nodeId} not found.`;
    }
  }
  
  async function aiDeleteNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        deleteNode(nodeId); // Use existing function
        return `Node ${nodeId} deleted successfully.`;
    } else {
        return `Error: Node with ID ${nodeId} not found.`;
    }
  }
  
  // --- End AI Assistant Logic --- //
  
  // Create some initial example nodes
  setTimeout(() => {
    const motivator = createNode('motivator', 'Graduate College', 0, -200);
    const challenge = createNode('challenge', 'Final Exams', 150, 0);
    const test = createNode('test', 'Calculus Test', -150, 200);
    const project = createNode('project', 'Science Project', 250, 200);
    
    // Add some example edges
    edges.push({ from: motivator.dataset.id, to: challenge.dataset.id });
    edges.push({ from: challenge.dataset.id, to: test.dataset.id });
    edges.push({ from: challenge.dataset.id, to: project.dataset.id });
    
    drawEdges();
    updateMiniMap();
  }, 500);
  
  // Initial message
  showMessage('Welcome to the Tree Page! Add nodes by clicking the buttons on the left.');
  
  // Add navigation hints
  setTimeout(() => {
    showMessage('Tip: Use mouse wheel to zoom, middle-click or Alt+drag to pan');
  }, 4000);
  
  // Initialize zoom display
  updateZoomDisplay();
}); 