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
  const introOverlay = document.querySelector('.intro-overlay');
  const introButton = document.querySelector('.intro-button');
  
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
  
  // Add autosave functionality
  let saveTimeout;
  const SAVE_DELAY = 2000; // 2 seconds delay before saving
  
  // Handle intro overlay
  if (introButton) {
    introButton.addEventListener('click', function() {
      // Add closing animation class
      introOverlay.classList.add('closing');
      
      // After animation completes, hide the overlay
      setTimeout(() => {
        introOverlay.style.display = 'none';
        
        // Show welcome message
        showMessage('Welcome to Your Web! Start by adding a node.');
      }, 800);
    });
  }
  
  // Pan and Zoom state
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  
  // AI State
  const OPENAI_API_KEY = 'sk-YOUR_SAMPLE_API_KEY_HERE'; // Replace with your actual key if using a real backend
  const nodeTypes = ['motivator', 'task', 'challenge', 'idea', 'class', 'assignment', 'test', 'project', 'essay', 'image'];
  
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
    // Check if we clicked on a node or UI element - don't start panning if so
    if (e.target.closest('.node') || e.target.closest('.tree-toolbar') || 
        e.target.closest('.mini-map') || e.target.closest('.zoom-controls') ||
        e.target.closest('.node-hover-panel') || e.target.closest('.ai-sidebar') ||
        e.target.closest('.upload-form') || isDragging || isConnecting) {
      // Click was on a node or UI element, don't start panning
      return;
    }
    
    // Middle mouse button (button 1) or Alt+left click or left click on empty space
    if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 0) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      treeCanvas.style.cursor = 'grabbing';
      document.querySelector('.tree-container').classList.add('panning');
    }
  });
  
  // Handle mouse move for panning and dragging
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
    
    if (isDragging && draggedNode) {
      // Mark node as dragged when it actually moves
      draggedNode.dataset.wasDragged = "true";
      
      // Ensure hover panel stays hidden while dragging
      const nodeId = draggedNode.dataset.id;
      const nodeObj = nodes.find(n => n.id === nodeId);
      if (nodeObj && nodeObj.hoverPanel && nodeObj.hoverPanel.classList.contains('visible')) {
        nodeObj.hoverPanel.classList.remove('visible');
      }
      
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
        const startCenter = {
          x: startRect.left + (startRect.width / 2),
          y: startRect.top + (startRect.height / 2)
        };
        
        // Draw temp line from center of startNode to mouse position
        ctx.beginPath();
        ctx.moveTo(startCenter.x, startCenter.y);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  });
  
  // Handle mouse up for panning and dragging
  document.addEventListener('mouseup', function(e) {
    if (isPanning) {
      isPanning = false;
      treeCanvas.style.cursor = 'default';
      document.querySelector('.tree-container').classList.remove('panning');
    }
    
    if (isDragging && draggedNode) {
      // Remove the dragging class to restore animations
      draggedNode.classList.remove('dragging');
      
      // Reset z-index
      draggedNode.style.zIndex = '5';
      
      // Reset drag state (keep wasDragged flag for a moment)
      setTimeout(() => {
        draggedNode = null;
        isDragging = false;
      }, 50);
    }
  });
  
  // Add keyboard shortcuts for panning and zooming
  document.addEventListener('keydown', function(e) {
    // Don't interfere if user is typing in an input field or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Spacebar to toggle pan mode
    if (e.code === 'Space' && !isPanning && !isConnecting && !isDragging) {
      e.preventDefault();
      treeCanvas.style.cursor = 'grab';
      // We don't need to set panStartX/Y here, mousemove will handle it
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
    
    // Create hover panel (initially hidden)
    const hoverPanel = document.createElement('div');
    hoverPanel.className = 'node-hover-panel';
    
    // Add node controls to hover panel
    const controls = document.createElement('div');
    controls.className = 'node-controls';
    
    // Delete button
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'node-control';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = 'Delete Node';
    deleteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      deleteNode(node.dataset.id);
    });
    controls.appendChild(deleteBtn);
    
    // Connect button
    const connectBtn = document.createElement('div');
    connectBtn.className = 'node-control';
    connectBtn.innerHTML = '↔';
    connectBtn.title = 'Connect to Another Node';
    connectBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      startConnection(node.dataset.id);
    });
    controls.appendChild(connectBtn);
    
    // Edit button
    const editBtn = document.createElement('div');
    editBtn.className = 'node-control';
    editBtn.innerHTML = '✎';
    editBtn.title = 'Edit Node Title';
    editBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showEditInterface(node, hoverPanel);
    });
    controls.appendChild(editBtn);
    
    // Due date button (only for task, assignment, test, project, essay nodes)
    if (['task', 'assignment', 'test', 'project', 'essay'].includes(type)) {
      const dueDateBtn = document.createElement('div');
      dueDateBtn.className = 'node-control';
      dueDateBtn.innerHTML = '📅';
      dueDateBtn.title = 'Set Due Date';
      dueDateBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showDueDateInterface(node, hoverPanel);
      });
      controls.appendChild(dueDateBtn);
      
      // If node already has a due date, display it in the info section
      if (node.dataset.dueDate) {
        const dueDate = new Date(node.dataset.dueDate);
        const formattedDate = dueDate.toLocaleDateString();
        
        // Add due date to node title if not already there
        if (!node.querySelector('.node-due-date')) {
          const dueDateElement = document.createElement('div');
          dueDateElement.className = 'node-due-date';
          dueDateElement.textContent = `Due: ${formattedDate}`;
          node.appendChild(dueDateElement);
        }
      }
    }
    
    // Add node info based on type
    const infoSection = document.createElement('div');
    infoSection.className = 'node-info';
    
    // Add different info based on node type
    switch(type) {
      case 'motivator':
        infoSection.innerHTML = `
          <h4>Motivator</h4>
          <p>A personal goal or motivation that drives your hard work.</p>
          <p>The Envision page helps you visualize and feel renewed energy and drive from your motivators.</p>
        `;
        break;
      case 'task':
        infoSection.innerHTML = `
          <h4>Task</h4>
          <p>A specific actionable item that needs to be completed.</p>
          <p>Connect tasks to classes or projects to organize your work.</p>
        `;
        break;
      case 'challenge':
        infoSection.innerHTML = `
          <h4>Challenge</h4>
          <p>A difficult problem or obstacle to overcome, or a question, dilemma, or consideration that you need to think about.</p>
          <p>Breaking down challenges with idea nodes helps make them manageable.</p>
        `;
        break;
      case 'class':
        infoSection.innerHTML = `
          <h4>Class</h4>
          <p>A course or subject you're studying.</p>
          <p>The Class page contains grades, resources, chats, and practice problems.</p>
        `;
        break;
      case 'assignment':
        infoSection.innerHTML = `
          <h4>Assignment</h4>
          <p>Coursework that needs to be completed.</p>
          <p>The Class page helps track your assignments and deadlines.</p>
        `;
        break;
      case 'test':
        infoSection.innerHTML = `
          <h4>Test</h4>
          <p>An exam or quiz to assess your knowledge.</p>
          <p>The MindWeb page helps you study by mapping out and expanding on your knowledge.</p>
        `;
        break;
      case 'project':
        infoSection.innerHTML = `
          <h4>Project</h4>
          <p>A larger task involving multiple people and components.</p>
          <p>The Collaboration page allows you to work with others on this project.</p>
        `;
        break;
      case 'essay':
        infoSection.innerHTML = `
          <h4>Essay</h4>
          <p>A written composition on a particular subject.</p>
          <p>Connect to class nodes to organize your writing assignments.</p>
        `;
        break;
      case 'image':
        infoSection.innerHTML = `
          <h4>Image</h4>
          <p>Visual content to support your learning.</p>
          <p>Connect images to related nodes for visual reference.</p>
        `;
        break;
      case 'idea':
        infoSection.innerHTML = `
          <h4>Idea</h4>
          <p>A concept, thought, or potential solution.</p>
          <p>Connect ideas to challenges, tasks, or other ideas to map out your thinking.</p>
        `;
        break;
    }
    
    // Add controls and info to hover panel
    hoverPanel.appendChild(controls);
    hoverPanel.appendChild(infoSection);
    
    // Add hover panel to the DOM
    document.body.appendChild(hoverPanel);
    
    // Track if the mouse is over the panel
    let isOverPanel = false;
    
    // Show hover panel on mouse enter
    node.addEventListener('mouseenter', function() {
      const rect = node.getBoundingClientRect();
      hoverPanel.style.left = rect.right + 10 + 'px';
      hoverPanel.style.top = rect.top + 'px';
      hoverPanel.classList.add('visible');
    });
    
    // Hide hover panel on mouse leave from node
    node.addEventListener('mouseleave', function(e) {
      // Get the element the mouse is moving to
      const toElement = e.relatedTarget;
      
      // Don't hide if moving to the hover panel or its children
      if (toElement && (toElement === hoverPanel || hoverPanel.contains(toElement))) {
        return;
      }
      
      // Give a short delay to allow pointer to reach panel if moving there
      setTimeout(() => {
        if (!isOverPanel) {
          hoverPanel.classList.remove('visible');
        }
      }, 50);
    });
    
    // Track mouse entering hover panel
    hoverPanel.addEventListener('mouseenter', function() {
      isOverPanel = true;
    });
    
    // Hide hover panel when mouse leaves the hover panel itself
    hoverPanel.addEventListener('mouseleave', function(e) {
      isOverPanel = false;
      
      // Get the element the mouse is moving to
      const toElement = e.relatedTarget;
      
      // Don't hide if moving back to the node
      if (toElement === node || node.contains(toElement)) {
        return;
      }
      
      hoverPanel.classList.remove('visible');
    });
    
    // Add node to the DOM
    nodesContainer.appendChild(node);
    
    // Make node draggable (click handlers for navigation are added here)
    makeDraggable(node);
    
    // Add to nodes array
    nodes.push({
      id: node.dataset.id,
      element: node,
      type: type,
      title: title,
      hoverPanel: hoverPanel
    });
    
    updateMiniMap();
    
    return node;
  }
  
  // Make a node draggable
  function makeDraggable(node) {
    // Track if node was actually moved during this interaction
    let wasDragged = false;
    
    node.addEventListener('mousedown', function(e) {
      if (isPanning || e.button !== 0) return; // Only left click for dragging
      
      // Reset drag flag at the start of potential drag
      wasDragged = false;
      
      // Hide any visible hover panel for this node
      const nodeId = node.dataset.id;
      const nodeObj = nodes.find(n => n.id === nodeId);
      if (nodeObj && nodeObj.hoverPanel) {
        nodeObj.hoverPanel.classList.remove('visible');
      }
      
      // Set a timeout to determine if this is a click or drag
      const dragTimeout = setTimeout(() => {
        isDragging = true;
        draggedNode = node;
        
        // Suspend animations during dragging by adding a class
        node.classList.add('dragging');
        
        // Calculate the offset in screen coordinates
        const rect = node.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        // Store current screen position to prevent jumping
        node.dataset.dragStartLeft = rect.left;
        node.dataset.dragStartTop = rect.top;
        
        // Bring to front
        node.style.zIndex = '100';
      }, 200); // Short delay to differentiate between click and drag
      
      // Store the timeout ID so we can clear it
      node.dataset.dragTimeout = dragTimeout;
      
      e.stopPropagation();
    });
    
    node.addEventListener('mousemove', function(e) {
      // If dragging has started, mark this node as having been dragged
      if (isDragging && draggedNode === node) {
        wasDragged = true;
      }
    });
    
    node.addEventListener('mouseup', function(e) {
      // Clear the timeout if this was a click rather than drag start
      const timeoutId = parseInt(node.dataset.dragTimeout);
      if (timeoutId) {
        clearTimeout(timeoutId);
        node.dataset.dragTimeout = null;
      }
      
      // Add data attribute to track if node was dragged
      node.dataset.wasDragged = wasDragged ? "true" : "false";
      
      // Reset wasDragged after short delay, so click handler can check it
      setTimeout(() => {
        wasDragged = false;
      }, 50);
    });
    
    // Handle click for navigation - override previous click handler
    node.addEventListener('click', function(e) {
      // Only handle click if not dragging, not connecting, and node wasn't just dragged
      if (!isDragging && !isConnecting && !wasDragged && node.dataset.wasDragged !== "true") {
        const type = node.dataset.type;
        const title = node.querySelector('.node-title').textContent;
        
        // Different navigation based on node type
        switch (type) {
          case 'motivator':
            window.location.href = `/envision/${node.dataset.id}`;
            break;
          case 'class':
            const encodedClassName = encodeURIComponent(title);
            window.location.href = `/class/${encodedClassName}`;
            break;
          case 'assignment':
            const encodedAssignmentName = encodeURIComponent(title);
            window.location.href = `/class/${encodedAssignmentName}`;
            break;
          case 'test':
            window.location.href = `/mindweb/${node.dataset.id}`;
            break;
          case 'project':
            window.location.href = `/collab/${node.dataset.id}`;
            break;
        }
      }
      
      // Reset the dragged flag
      node.dataset.wasDragged = "false";
    }, { capture: true }); // Use capture to ensure this runs before other click handlers
  }
  
  // Handle connection overlay click
  connectionOverlay.addEventListener('click', function(e) {
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
      const newEdge = {
        from: connectionStart,
        to: targetNode.dataset.id
      };
      
      // Check if edge already exists
      const edgeExists = edges.some(edge => 
        edge.from === newEdge.from && edge.to === newEdge.to ||
        edge.from === newEdge.to && edge.to === newEdge.from
      );
      
      if (!edgeExists) {
        edges.push(newEdge);
        drawEdges();
        showMessage('Connection created!');
        scheduleAutosave();
      }
    }
    
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
    // Find the node in our array
    const nodeToDelete = nodes.find(node => node.id === nodeId);
    
    // Remove from DOM
    const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
    if (nodeEl) {
      nodeEl.remove();
    }
    
    // Remove the hover panel
    if (nodeToDelete && nodeToDelete.hoverPanel) {
      nodeToDelete.hoverPanel.remove();
    }
    
    // Remove from nodes array
    nodes = nodes.filter(node => node.id !== nodeId);
    
    // Remove related edges
    edges = edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId);
    
    // Redraw edges
    drawEdges();
    updateMiniMap();
    
    showMessage('Node deleted!');
    scheduleAutosave();
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
        
        // Calculate center points accounting for any transformations
        // Use the visual center of the node, not just the bounding box center
        const fromCenter = {
          x: fromRect.left + (fromRect.width / 2),
          y: fromRect.top + (fromRect.height / 2)
        };
        
        const toCenter = {
          x: toRect.left + (toRect.width / 2),
          y: toRect.top + (toRect.height / 2)
        };
        
        // Draw line from center to center
        ctx.beginPath();
        ctx.moveTo(fromCenter.x, fromCenter.y);
        ctx.lineTo(toCenter.x, toCenter.y);
        
        // Get node types for line color
        const fromType = fromNode.dataset.type;
        const toType = toNode.dataset.type;
        
        // Set line style based on node types
        const gradient = ctx.createLinearGradient(fromCenter.x, fromCenter.y, toCenter.x, toCenter.y);
        
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
      'image': '#3498DB',
      'idea': '#00bcd4'
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
  
  // Add listener for the new idea button
  document.querySelector('.btn-idea').addEventListener('click', function() {
    const center = getViewCenter();
    createNode('idea', 'Idea', center.x, center.y);
  });
  
  // School submenu event listeners
  document.querySelectorAll('.submenu-button').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent bubbling to parent button
      const nodeType = this.dataset.type;
      const center = getViewCenter();
      
      let nodeTitle;
      switch(nodeType) {
        case 'assignment':
          nodeTitle = 'Assignment';
          break;
        case 'test':
          nodeTitle = 'Test';
          break;
        case 'project':
          nodeTitle = 'Project';
          break;
        case 'essay':
          nodeTitle = 'Essay';
          break;
        default:
          nodeTitle = 'School Item';
      }
      
      createNode(nodeType, nodeTitle, center.x, center.y);
    });
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
    // Update AI's understanding of node types
    response += `\nAvailable types: ${nodeTypes.join(', ')}`;
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
              // Validate type against known types
              if (!nodeTypes.includes(type)) {
                response = `Error: Invalid node type '${type}'. Available types: ${nodeTypes.join(', ')}`;
              } else {
                // Optional parentId (simplified) and info
                // const parentId = args.length > 2 ? args[2] : null;
                // const info = args.length > 3 ? args[3] : null;
                response = await aiAddNode(type, null, name, null);
                commandHandled = true;
              }
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

  // Show edit interface for a node
  function showEditInterface(node, hoverPanel) {
    // Create edit interface if it doesn't exist
    if (!hoverPanel.querySelector('.node-edit-interface')) {
      const editInterface = document.createElement('div');
      editInterface.className = 'node-edit-interface';
      
      // Get current node title
      const titleElement = node.querySelector('.node-title');
      const currentTitle = titleElement.textContent;
      
      // Create input field
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'node-edit-input';
      input.value = currentTitle;
      input.placeholder = 'Enter node title...';
      
      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'node-edit-buttons';
      
      // Save button
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = 'node-edit-save';
      saveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Update node title if not empty
        const newTitle = input.value.trim();
        if (newTitle) {
          titleElement.textContent = newTitle;
          
          // Update title in nodes array
          const nodeObj = nodes.find(n => n.id === node.dataset.id);
          if (nodeObj) {
            nodeObj.title = newTitle;
          }
          
          // Show success message
          showMessage('Node title updated!');
          
          // Schedule autosave when title is updated
          scheduleAutosave();
        }
        
        // Remove edit interface
        editInterface.remove();
      });
      
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'node-edit-cancel';
      cancelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Remove edit interface
        editInterface.remove();
      });
      
      // Add elements to interface
      buttonsContainer.appendChild(saveBtn);
      buttonsContainer.appendChild(cancelBtn);
      editInterface.appendChild(input);
      editInterface.appendChild(buttonsContainer);
      
      // Add interface to hover panel
      hoverPanel.appendChild(editInterface);
      
      // Focus input and select all text
      setTimeout(() => {
        input.focus();
        input.select();
      }, 10);
      
      // Add key event listeners for enter and escape
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          saveBtn.click(); // Trigger save on Enter
        } else if (e.key === 'Escape') {
          cancelBtn.click(); // Trigger cancel on Escape
        }
      });
    }
  }

  // Show due date interface for a node
  function showDueDateInterface(node, hoverPanel) {
    // Create due date interface if it doesn't exist
    if (!hoverPanel.querySelector('.node-duedate-interface')) {
      const dueDateInterface = document.createElement('div');
      dueDateInterface.className = 'node-edit-interface node-duedate-interface';
      
      // Create label
      const label = document.createElement('label');
      label.textContent = 'Set due date:';
      label.htmlFor = 'due-date-input';
      
      // Create input field
      const input = document.createElement('input');
      input.type = 'date';
      input.id = 'due-date-input';
      input.className = 'node-edit-input';
      
      // Set current value if exists
      if (node.dataset.dueDate) {
        const dueDate = new Date(node.dataset.dueDate);
        input.valueAsDate = dueDate;
      } else {
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        input.valueAsDate = tomorrow;
      }
      
      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'node-edit-buttons';
      
      // Save button
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.className = 'node-edit-save';
      saveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Get date value
        const selectedDate = input.valueAsDate;
        
        if (selectedDate) {
          // Store due date in node dataset
          node.dataset.dueDate = selectedDate.toISOString();
          
          // Update the node in the nodes array
          const nodeObj = nodes.find(n => n.id === node.dataset.id);
          if (nodeObj) {
            nodeObj.dueDate = selectedDate.toISOString();
          }
          
          // Add or update due date display in node
          let dueDateElement = node.querySelector('.node-due-date');
          
          if (!dueDateElement) {
            dueDateElement = document.createElement('div');
            dueDateElement.className = 'node-due-date';
            node.appendChild(dueDateElement);
          }
          
          dueDateElement.textContent = `Due: ${selectedDate.toLocaleDateString()}`;
          
          // Show success message
          showMessage('Due date set!');
          
          // Schedule autosave after setting due date
          scheduleAutosave();
        }
        
        // Remove due date interface
        dueDateInterface.remove();
      });
      
      // Cancel button
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'node-edit-cancel';
      cancelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dueDateInterface.remove();
      });
      
      // Remove button (if a due date exists)
      if (node.dataset.dueDate) {
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'node-edit-remove';
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          
          // Remove due date from node dataset
          delete node.dataset.dueDate;
          
          // Update the node in the nodes array
          const nodeObj = nodes.find(n => n.id === node.dataset.id);
          if (nodeObj) {
            delete nodeObj.dueDate;
          }
          
          // Remove due date display from node
          const dueDateElement = node.querySelector('.node-due-date');
          if (dueDateElement) {
            dueDateElement.remove();
          }
          
          // Show success message
          showMessage('Due date removed!');
          
          // Schedule autosave after removing due date
          scheduleAutosave();
          
          // Remove due date interface
          dueDateInterface.remove();
        });
        
        buttonsContainer.appendChild(removeBtn);
      }
      
      // Add save and cancel buttons
      buttonsContainer.appendChild(saveBtn);
      buttonsContainer.appendChild(cancelBtn);
      
      // Add elements to interface
      dueDateInterface.appendChild(label);
      dueDateInterface.appendChild(input);
      dueDateInterface.appendChild(buttonsContainer);
      
      // Add interface to hover panel
      hoverPanel.appendChild(dueDateInterface);
    }
  }

  // Function to save tree state
  async function saveTreeState() {
    // Get current user ID from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No user ID found');
      return;
    }

    // Prepare tree data - now properly capturing all node data from the DOM
    const treeData = {
      userId: userId,
      nodes: Array.from(document.querySelectorAll('.node')).map(nodeEl => {
        const nodeObj = nodes.find(n => n.id === nodeEl.dataset.id);
        return {
          id: nodeEl.dataset.id,
          type: nodeEl.dataset.type,
          title: nodeEl.querySelector('.node-title').textContent,
          position: {
            x: parseInt(nodeEl.dataset.originalLeft || nodeEl.style.left),
            y: parseInt(nodeEl.dataset.originalTop || nodeEl.style.top)
          },
          dueDate: nodeEl.dataset.dueDate || null,
          content: nodeObj?.type === 'image' ? nodeObj.content : null
        };
      }),
      edges: edges.map(edge => ({
        from: edge.from,
        to: edge.to
      })),
      updatedAt: new Date().toISOString()
    };

    console.log('Saving tree state:', userId, treeData);

    try {
      // Send to server
      const response = await fetch('/api/Trees/' + userId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(treeData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Failed to save tree state: ${response.status}`);
      }

      console.log('Tree state saved successfully');
    } catch (error) {
      console.error('Error saving tree state:', error);
      showMessage('Error saving your web. Please try again later.');
    }
  }

  // Function to schedule autosave
  function scheduleAutosave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveTreeState, SAVE_DELAY);
  }

  // Load tree state on page load
  async function loadTreeState() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No user ID found');
      return;
    }

    try {
      const response = await fetch('/api/Trees/' + userId);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No tree found for user, creating new tree...');
          // Create new tree for user with the userId as the document ID
          const newTree = {
            userId: userId,
            nodes: [],
            edges: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Create a new document with a specific ID rather than letting Firebase generate one
          const createResponse = await fetch('/api/Trees/' + userId, {
            method: 'PUT', // PUT will create the document if it doesn't exist
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newTree)
          });
          
          if (!createResponse.ok) {
            throw new Error('Failed to create new tree');
          }
          
          console.log('New tree created successfully');
          
          // Return empty tree data
          return {
            nodes: [],
            edges: []
          };
        } else {
          throw new Error(`Failed to load tree state: ${response.status}`);
        }
      }

      const treeData = await response.json();
      
      // Clear existing nodes and edges
      nodes.forEach(node => {
        if (node.element) node.element.remove();
        if (node.hoverPanel) node.hoverPanel.remove();
      });
      nodes = [];
      edges = [];
      
      // Get the actual tree data from the response
      let actualTreeData = treeData;
      // Check if the response has the document ID as a key (Firebase format)
      if (treeData[userId]) {
        actualTreeData = treeData[userId];
      }

      // Recreate nodes if they exist
      if (actualTreeData.nodes && actualTreeData.nodes.length > 0) {
        actualTreeData.nodes.forEach(nodeData => {
          createNode(
            nodeData.type,
            nodeData.title,
            nodeData.position.x,
            nodeData.position.y,
            nodeData.content
          );
        });
      }

      // Recreate edges if they exist
      if (actualTreeData.edges && actualTreeData.edges.length > 0) {
        edges = actualTreeData.edges;
        drawEdges();
      }

    } catch (error) {
      console.error('Error loading tree state:', error);
    }
  }

  // Load tree state on page load
  loadTreeState();

  // Modify existing functions to trigger autosave

  // Modify createNode function to properly track nodes
  const originalCreateNode = createNode;
  createNode = function(type, title, left, top, content = null) {
    const node = originalCreateNode.apply(this, arguments);
    
    // Ensure node is properly added to nodes array with all required data
    const nodeData = {
      id: node.dataset.id,
      element: node,
      type: type,
      title: title,
      content: content,
      position: {
        x: left,
        y: top
      }
    };
    
    // Update nodes array
    const existingNodeIndex = nodes.findIndex(n => n.id === node.dataset.id);
    if (existingNodeIndex !== -1) {
      nodes[existingNodeIndex] = nodeData;
    } else {
      nodes.push(nodeData);
    }

    scheduleAutosave();
    return node;
  };

  // Modify the edge creation logic in the connection overlay click handler
  connectionOverlay.addEventListener('click', function(e) {
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
      const newEdge = {
        from: connectionStart,
        to: targetNode.dataset.id
      };
      
      // Check if edge already exists
      const edgeExists = edges.some(edge => 
        edge.from === newEdge.from && edge.to === newEdge.to ||
        edge.from === newEdge.to && edge.to === newEdge.from
      );
      
      if (!edgeExists) {
        edges.push(newEdge);
        drawEdges();
        showMessage('Connection created!');
        scheduleAutosave();
      }
    }
    
    endConnection();
  });

  // Add autosave to node dragging
  document.addEventListener('mouseup', function(e) {
    if (draggedNode) {
      scheduleAutosave();
    }
    // ... existing mouseup code ...
  });

  // Note: The autosave functionality for showEditInterface and showDueDateInterface
  // has been incorporated directly into the original function definitions above
});