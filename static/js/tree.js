document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const nodesContainer = document.querySelector('.nodes-container');
  const treeCanvas = document.querySelector('.tree-canvas');
  const uploadForm = document.querySelector('.upload-form');
  const uploadOverlay = document.querySelector('.upload-overlay');
  const connectionOverlay = document.querySelector('.connection-overlay');
  const statusMessage = document.querySelector('.status-message');
  const miniMap = document.querySelector('.mini-map');
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
  const voiceRecordingOverlay = document.querySelector('.voice-recording-overlay');
  const voiceRecordBtn = document.querySelector('.btn-voice-record');
  
  // Add event listener to the voice record button
  if (voiceRecordBtn) {
    voiceRecordBtn.addEventListener('click', showVoiceRecordingOverlay);
  }
  
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
  let isRecording = false;
  let recordingTime = 0;
  let recordingTimer = null;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;
  let animationFrame = null;
  
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
  
  // Function to update the screen position of a single node based on its world coordinates
  function updateSingleNodePosition(nodeElement) {
    const originalLeft = parseInt(nodeElement.dataset.originalLeft || 0);
    const originalTop = parseInt(nodeElement.dataset.originalTop || 0);

    const newLeft = transformX(originalLeft);
    const newTop = transformY(originalTop);

    nodeElement.style.left = `${newLeft}px`;
    nodeElement.style.top = `${newTop}px`;
    nodeElement.style.transform = '';
  }
  
  // Update node positions based on pan and zoom
  function updateNodePositions() {
    nodes.forEach(node => {
      updateSingleNodePosition(node.element);
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
    
    // Get visible viewport area
    const viewportWidth = window.innerWidth / scale;
    const viewportHeight = window.innerHeight / scale;
    const viewportX = offsetX * -1;
    const viewportY = offsetY * -1;
    
    // Scale down to mini-map size
    const miniMapScale = 0.1;
    const scaledWidth = viewportWidth * miniMapScale;
    const scaledHeight = viewportHeight * miniMapScale;
    const scaledX = viewportX * miniMapScale;
    const scaledY = viewportY * miniMapScale;
    
    // Update mini-map viewport representation
    miniMapViewport.style.width = `${viewportWidth}px`;
    miniMapViewport.style.height = `${viewportHeight}px`;
    miniMapViewport.style.left = `${viewportX}px`;
    miniMapViewport.style.top = `${viewportY}px`;
  }
  
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
      // Explicitly redraw edges during panning
      drawEdges();
    }
    if (isDragging && draggedNode) {
      draggedNode.dataset.wasDragged = "true";
      const nodeId = draggedNode.dataset.id;
      const nodeObj = nodes.find(n => n.id === nodeId);
      if (nodeObj && nodeObj.hoverPanel && nodeObj.hoverPanel.classList.contains('visible')) {
        nodeObj.hoverPanel.classList.remove('visible');
      }
      // Mouse position in world coordinates
      const mouseWorldX = untransformX(e.clientX);
      const mouseWorldY = untransformY(e.clientY);
      // Set node's world position so the offset is preserved
      const newWorldLeft = mouseWorldX - (draggedNode._dragWorldOffsetX || 0);
      const newWorldTop = mouseWorldY - (draggedNode._dragWorldOffsetY || 0);
      draggedNode.dataset.originalLeft = newWorldLeft;
      draggedNode.dataset.originalTop = newWorldTop;
      updateSingleNodePosition(draggedNode);
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
      // Remove the dragging class to restore transitions
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
    node.className = `node node-${type}`;
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
    
    // Add node title
    const titleEl = document.createElement('div');
    titleEl.className = 'node-title';
    titleEl.textContent = title;
    
    // Add node icon based on type
    const iconEl = document.createElement('div');
    iconEl.className = 'node-icon';
    
    // Choose the appropriate icon based on node type
    let iconClass = '';
    switch(type) {
      case 'motivator':
        iconClass = 'fas fa-star';
        break;
      case 'task':
        iconClass = 'fas fa-tasks';
        break;
      case 'challenge':
        iconClass = 'fas fa-mountain';
        break;
      case 'idea':
        iconClass = 'fas fa-lightbulb';
        break;
      case 'class':
        iconClass = 'fas fa-graduation-cap';
        break;
      case 'assignment':
        iconClass = 'fas fa-book';
        break;
      case 'test':
        iconClass = 'fas fa-clipboard-check';
        break;
      case 'project':
        iconClass = 'fas fa-project-diagram';
        break;
      case 'essay':
        iconClass = 'fas fa-file-alt';
        break;
      case 'image':
        iconClass = 'fas fa-image';
        break;
    }
    
    iconEl.innerHTML = `<i class="${iconClass}"></i>`;
    
    // Add the icon element to the node
    node.appendChild(iconEl);
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
    
    // Add AI buttons for new features
    // Challenge AI button
    const challengeBtn = document.createElement('div');
    challengeBtn.className = 'node-control ai-feature-btn challenge-btn';
    challengeBtn.innerHTML = '<i class="fas fa-brain"></i>';
    challengeBtn.title = 'AI Challenge - Test your knowledge';
    challengeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showAIFeatureChat(node, hoverPanel, 'challenge');
    });
    controls.appendChild(challengeBtn);

    // Enrich AI button
    const enrichBtn = document.createElement('div');
    enrichBtn.className = 'node-control ai-feature-btn enrich-btn';
    enrichBtn.innerHTML = '<i class="fas fa-seedling"></i>';
    enrichBtn.title = 'AI Enrich - Expand on this node';
    enrichBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showAIFeatureChat(node, hoverPanel, 'enrich');
    });
    controls.appendChild(enrichBtn);

    // Explore AI button
    const exploreBtn = document.createElement('div');
    exploreBtn.className = 'node-control ai-feature-btn explore-btn';
    exploreBtn.innerHTML = '<i class="fas fa-compass"></i>';
    exploreBtn.title = 'AI Explore - Discover connections';
    exploreBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showAIFeatureChat(node, hoverPanel, 'explore');
    });
    controls.appendChild(exploreBtn);
    
    // Add node info based on type
    const infoSection = document.createElement('div');
    infoSection.className = 'node-info collapsed';
    
    // Add different info based on node type
    switch(type) {
      case 'motivator':
        infoSection.innerHTML = `
          <h4>Motivator</h4>
          <p>A personal goal or motivation that drives your hard work. The Envision page helps you visualize and feel renewed energy and drive from your motivators.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'task':
        infoSection.innerHTML = `
          <h4>Task</h4>
          <p>A specific actionable item that needs to be completed. Connect tasks to classes or projects to organize your work.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'challenge':
        infoSection.innerHTML = `
          <h4>Challenge</h4>
          <p>A difficult problem or obstacle to overcome, or a question, dilemma, or consideration that you need to think about. Breaking down challenges with idea nodes helps make them manageable.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'class':
        infoSection.innerHTML = `
          <h4>Class</h4>
          <p>A course or subject you're studying. The Class page contains grades, resources, chats, and practice problems.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'assignment':
        infoSection.innerHTML = `
          <h4>Assignment</h4>
          <p>Coursework that needs to be completed. The Class page helps track your assignments and deadlines.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'test':
        infoSection.innerHTML = `
          <h4>Test</h4>
          <p>An exam or quiz to assess your knowledge. The MindWeb page helps you study by mapping out and expanding on your knowledge.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'project':
        infoSection.innerHTML = `
          <h4>Project</h4>
          <p>A larger task involving multiple people and components. The Collaboration page allows you to work with others on this project.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'essay':
        infoSection.innerHTML = `
          <h4>Essay</h4>
          <p>A written composition on a particular subject. Connect to class nodes to organize your writing assignments.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'image':
        infoSection.innerHTML = `
          <h4>Image</h4>
          <p>Visual content to support your learning. Connect images to related nodes for visual reference.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
      case 'idea':
        infoSection.innerHTML = `
          <h4>Idea</h4>
          <p>A concept, thought, or potential solution. Connect ideas to challenges, tasks, or other ideas to map out your thinking.</p>
          <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
        `;
        break;
    }
    
    // Add event listener for info toggle
    const infoToggle = infoSection.querySelector('.node-info-toggle');
    infoToggle.addEventListener('click', function() {
      if (infoSection.classList.contains('collapsed')) {
        infoSection.classList.remove('collapsed');
        infoSection.classList.add('expanded');
        this.innerHTML = 'Show less <i class="fas fa-chevron-up"></i>';
      } else {
        infoSection.classList.remove('expanded');
        infoSection.classList.add('collapsed');
        this.innerHTML = 'Show more <i class="fas fa-chevron-down"></i>';
      }
    });
    
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
    let wasDragged = false;
    let dragWorldOffsetX = 0;
    let dragWorldOffsetY = 0;

    node.addEventListener('mousedown', function(e) {
      if (isPanning || e.button !== 0) return;
      wasDragged = false;
      const nodeId = node.dataset.id;
      const nodeObj = nodes.find(n => n.id === nodeId);
      if (nodeObj && nodeObj.hoverPanel) {
        nodeObj.hoverPanel.classList.remove('visible');
      }
      // Calculate offset in world coordinates
      const nodeWorldLeft = parseFloat(node.dataset.originalLeft);
      const nodeWorldTop = parseFloat(node.dataset.originalTop);
      const mouseWorldX = untransformX(e.clientX);
      const mouseWorldY = untransformY(e.clientY);
      node._dragWorldOffsetX = mouseWorldX - nodeWorldLeft;
      node._dragWorldOffsetY = mouseWorldY - nodeWorldTop;
      const dragTimeout = setTimeout(() => {
        isDragging = true;
        draggedNode = node;
        node.classList.add('dragging');
        node.style.zIndex = '100';
      }, 200);
      node.dataset.dragTimeout = dragTimeout;
      e.stopPropagation();
    });

    node.addEventListener('mousemove', function(e) {
      if (isDragging && draggedNode === node) {
        wasDragged = true;
      }
    });

    node.addEventListener('mouseup', function(e) {
      const timeoutId = parseInt(node.dataset.dragTimeout);
      if (timeoutId) {
        clearTimeout(timeoutId);
        node.dataset.dragTimeout = null;
      }
      node.dataset.wasDragged = wasDragged ? "true" : "false";
      setTimeout(() => {
        wasDragged = false;
      }, 50);
    });

    node.addEventListener('click', function(e) {
      if (!isDragging && !isConnecting && !wasDragged && node.dataset.wasDragged !== "true") {
        const type = node.dataset.type;
        const title = node.querySelector('.node-title').textContent;
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
      node.dataset.wasDragged = "false";
    }, { capture: true });
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
    // Make sure canvas covers the entire viewport
    treeCanvas.width = window.innerWidth;
    treeCanvas.height = window.innerHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
    
    // Draw each edge
    edges.forEach(edge => {
      const fromNode = document.querySelector(`[data-id="${edge.from}"]`);
      const toNode = document.querySelector(`[data-id="${edge.to}"]`);
      
      if (fromNode && toNode) {
        // Get the visual position of each node
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        
        // Calculate center points
        const fromCenter = {
          x: fromRect.left + (fromRect.width / 2),
          y: fromRect.top + (fromRect.height / 2)
        };
        
        const toCenter = {
          x: toRect.left + (toRect.width / 2),
          y: toRect.top + (toRect.height / 2)
        };
        
        // Get scroll position for adjustments
        const scrollY = window.scrollY || window.pageYOffset;
        
        // Apply vertical adjustment based on the current pan amount
        const verticalPanAmount = Math.abs(offsetY) * 0.05; // Small adjustment factor
        const adjustmentY = verticalPanAmount * (offsetY < 0 ? -1 : 1);
        
        // Draw line from center to center with adjustment
        ctx.beginPath();
        ctx.moveTo(fromCenter.x, fromCenter.y);
        ctx.lineTo(toCenter.x, toCenter.y + adjustmentY);
        
        // Get node types for line color
        const fromType = fromNode.dataset.type;
        const toType = toNode.dataset.type;
        
        // Set line style based on node types
        const gradient = ctx.createLinearGradient(
          fromCenter.x, fromCenter.y, 
          toCenter.x, toCenter.y + adjustmentY
        );
        
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
    if (isDragging && draggedNode && draggedNode.dataset.wasDragged === "true") {
      scheduleAutosave(); 
    }
  });

  // Note: The autosave functionality for showEditInterface and showDueDateInterface
  // has been incorporated directly into the original function definitions above

  // Function to show AI feature chat interface
  function showAIFeatureChat(node, hoverPanel, featureType) {
    // Remove any existing AI chat interface
    const existingChat = document.querySelector('.ai-feature-chat');
    if (existingChat) {
      existingChat.remove();
    }

    // Create new AI chat interface
    const aiChat = document.createElement('div');
    aiChat.className = 'ai-feature-chat';
    aiChat.classList.add(`${featureType}-feature`);

    // Create chat header
    const chatHeader = document.createElement('div');
    chatHeader.className = 'ai-feature-header';
    
    // Set header title based on feature type
    let headerTitle = '';
    switch(featureType) {
      case 'challenge':
        headerTitle = 'AI Challenge';
        break;
      case 'enrich':
        headerTitle = 'AI Enrichment';
        break;
      case 'explore':
        headerTitle = 'AI Explorer';
        break;
    }
    
    chatHeader.innerHTML = `
      <h4>${headerTitle}</h4>
      <button class="ai-feature-close"><i class="fas fa-times"></i></button>
    `;
    
    // Create chat content
    const chatContent = document.createElement('div');
    chatContent.className = 'ai-feature-content';
    
    // Add welcome message based on feature type
    let welcomeMessage = '';
    switch(featureType) {
      case 'challenge':
        welcomeMessage = `I can help challenge your knowledge about "${node.querySelector('.node-title').textContent}". What would you like me to quiz you on?`;
        break;
      case 'enrich':
        welcomeMessage = `I can help enrich your understanding of "${node.querySelector('.node-title').textContent}". What aspects would you like to explore further?`;
        break;
      case 'explore':
        welcomeMessage = `I can help you explore connections related to "${node.querySelector('.node-title').textContent}". What type of connections are you looking for?`;
        break;
    }
    
    // Add welcome message
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'ai-feature-message';
    welcomeMsg.textContent = welcomeMessage;
    chatContent.appendChild(welcomeMsg);
    
    // Create chat input area
    const inputArea = document.createElement('div');
    inputArea.className = 'ai-feature-input-area';
    inputArea.innerHTML = `
      <input type="text" class="ai-feature-input" placeholder="Type your question...">
      <button class="ai-feature-send"><i class="fas fa-paper-plane"></i></button>
    `;
    
    // Assemble the chat interface
    aiChat.appendChild(chatHeader);
    aiChat.appendChild(chatContent);
    aiChat.appendChild(inputArea);
    
    // Position the chat interface next to the hover panel
    const rect = hoverPanel.getBoundingClientRect();
    aiChat.style.top = rect.top + 'px';
    aiChat.style.left = (rect.right + 10) + 'px';
    
    // Add event listener for close button
    aiChat.querySelector('.ai-feature-close').addEventListener('click', function() {
      aiChat.remove();
    });
    
    // Add event listener for send button (no functionality, just UI)
    aiChat.querySelector('.ai-feature-send').addEventListener('click', function() {
      const input = aiChat.querySelector('.ai-feature-input');
      const message = input.value.trim();
      
      if (message) {
        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'ai-feature-message user-message';
        userMsg.textContent = message;
        chatContent.appendChild(userMsg);
        
        // Clear input
        input.value = '';
        
        // Simulate AI thinking
        const thinkingMsg = document.createElement('div');
        thinkingMsg.className = 'ai-feature-message thinking';
        thinkingMsg.textContent = 'Thinking...';
        chatContent.appendChild(thinkingMsg);
        
        // Scroll to bottom
        chatContent.scrollTop = chatContent.scrollHeight;
        
        // Simulate AI response after a delay
        setTimeout(() => {
          // Remove thinking message
          chatContent.removeChild(thinkingMsg);
          
          // Add AI response
          const aiMsg = document.createElement('div');
          aiMsg.className = 'ai-feature-message';
          aiMsg.textContent = `This is a UI demo. In the real app, I would provide a helpful response about ${message} related to ${node.querySelector('.node-title').textContent}!`;
          chatContent.appendChild(aiMsg);
          
          // Scroll to bottom
          chatContent.scrollTop = chatContent.scrollHeight;
        }, 1000);
      }
    });
    
    // Add event listener for input keypress (Enter key)
    aiChat.querySelector('.ai-feature-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        aiChat.querySelector('.ai-feature-send').click();
      }
    });
    
    // Add the chat interface to the DOM
    document.body.appendChild(aiChat);
    
    // Focus the input
    setTimeout(() => {
      aiChat.querySelector('.ai-feature-input').focus();
    }, 100);
  }

  // Voice Recording UI Functions
  // Create voice recording overlay if it doesn't exist
  function createVoiceRecordingOverlay() {
    if (document.querySelector('.voice-recording-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'voice-recording-overlay';
    
    overlay.innerHTML = `
      <div class="voice-recording-container">
        <div class="voice-recording-header">
          <h3><i class="fas fa-microphone-alt"></i> Voice to Web</h3>
          <button class="voice-close-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="voice-recording-content">
          <div class="voice-instructions">
            <p>Speak about your ideas, tasks, or concepts. I'll create nodes automatically from your speech.</p>
            <p class="voice-tips">Try phrases like <span>"I'm motivated by getting good grades"</span> or <span>"I have a task to finish my essay"</span></p>
          </div>
          <div class="voice-visualization">
            <canvas class="voice-waveform" width="500" height="150"></canvas>
            <div class="voice-time">00:00</div>
          </div>
          <div class="voice-controls">
            <button class="voice-record-btn">
              <i class="fas fa-microphone"></i>
              <span>Start Recording</span>
            </button>
            <button class="voice-stop-btn disabled">
              <i class="fas fa-stop"></i>
              <span>Stop</span>
            </button>
          </div>
        </div>
        <div class="voice-processing hidden">
          <div class="processing-animation">
            <div class="processing-spinner"></div>
          </div>
          <div class="processing-text">
            <p>Processing your ideas...</p>
            <p class="processing-subtext">Converting speech to nodes</p>
          </div>
        </div>
        <div class="voice-results hidden">
          <h4>Here's what I understood:</h4>
          <div class="results-nodes">
            <!-- Dynamic content will be added here -->
          </div>
          <div class="results-buttons">
            <button class="results-add-all">Add All Nodes</button>
            <button class="results-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const closeBtn = overlay.querySelector('.voice-close-btn');
    const recordBtn = overlay.querySelector('.voice-record-btn');
    const stopBtn = overlay.querySelector('.voice-stop-btn');
    const resultsAddAll = overlay.querySelector('.results-add-all');
    const resultsCancel = overlay.querySelector('.results-cancel');
    
    closeBtn.addEventListener('click', hideVoiceRecordingOverlay);
    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    resultsAddAll.addEventListener('click', addAllNodes);
    resultsCancel.addEventListener('click', cancelResults);
    
    return overlay;
  }
  
  // Show voice recording overlay
  function showVoiceRecordingOverlay() {
    const overlay = document.querySelector('.voice-recording-overlay') || createVoiceRecordingOverlay();
    overlay.classList.add('visible');
    
    // Reset UI state
    overlay.querySelector('.voice-recording-content').classList.remove('hidden');
    overlay.querySelector('.voice-processing').classList.add('hidden');
    overlay.querySelector('.voice-results').classList.add('hidden');
    
    overlay.querySelector('.voice-record-btn').classList.remove('disabled');
    overlay.querySelector('.voice-record-btn span').textContent = 'Start Recording';
    overlay.querySelector('.voice-record-btn i').className = 'fas fa-microphone';
    
    overlay.querySelector('.voice-stop-btn').classList.add('disabled');
    
    // Reset timer
    overlay.querySelector('.voice-time').textContent = '00:00';
    recordingTime = 0;
  }
  
  // Hide voice recording overlay
  function hideVoiceRecordingOverlay() {
    const overlay = document.querySelector('.voice-recording-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }
      
      // Stop animation
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    }
  }
  
  // Start recording simulation
  function startRecording() {
    if (isRecording) return;
    
    const overlay = document.querySelector('.voice-recording-overlay');
    const recordBtn = overlay.querySelector('.voice-record-btn');
    const stopBtn = overlay.querySelector('.voice-stop-btn');
    
    // Update UI
    recordBtn.classList.add('disabled');
    recordBtn.querySelector('span').textContent = 'Recording...';
    recordBtn.querySelector('i').className = 'fas fa-microphone-slash';
    
    stopBtn.classList.remove('disabled');
    
    isRecording = true;
    recordingTime = 0;
    
    // Start timer
    recordingTimer = setInterval(() => {
      recordingTime++;
      const minutes = Math.floor(recordingTime / 60);
      const seconds = recordingTime % 60;
      overlay.querySelector('.voice-time').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
    
    // Initialize audio visualization (simulated)
    initAudioVisualization();
  }
  
  // Stop recording simulation
  function stopRecording() {
    if (!isRecording) return;
    
    const overlay = document.querySelector('.voice-recording-overlay');
    const recordBtn = overlay.querySelector('.voice-record-btn');
    const stopBtn = overlay.querySelector('.voice-stop-btn');
    
    // Update UI
    recordBtn.classList.remove('disabled');
    recordBtn.querySelector('span').textContent = 'Start Recording';
    recordBtn.querySelector('i').className = 'fas fa-microphone';
    
    stopBtn.classList.add('disabled');
    
    isRecording = false;
    
    // Stop timer
    clearInterval(recordingTimer);
    recordingTimer = null;
    
    // Stop visualization
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    
    // Show processing UI
    overlay.querySelector('.voice-recording-content').classList.add('hidden');
    overlay.querySelector('.voice-processing').classList.remove('hidden');
    
    // Simulate processing delay
    setTimeout(() => {
      // Hide the overlay while showing suggestions
      hideVoiceRecordingOverlay();
      
      // Show preview nodes directly on the web
      showNodeSuggestions();
    }, 3000);
  }
  
  // Initialize audio visualization (simulated)
  function initAudioVisualization() {
    const canvas = document.querySelector('.voice-waveform');
    const canvasCtx = canvas.getContext('2d');
    
    // Create simulated audio context and analyzer
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw function for visualization
    function draw() {
      animationFrame = requestAnimationFrame(draw);
      
      // Simulate audio data
      for (let i = 0; i < dataArray.length; i++) {
        // Random values with natural wave-like pattern
        const time = Date.now() / 1000;
        const value = 128 + 64 * Math.sin(time * 5 + i * 0.2) + Math.random() * 30;
        dataArray[i] = Math.min(255, Math.max(0, value));
      }
      
      // Clear canvas
      canvasCtx.fillStyle = 'rgba(30, 30, 40, 0.2)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw visualization
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        
        // Gradient for bars
        const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#7c4dff');
        gradient.addColorStop(1, '#2979ff');
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    }
    
    draw();
  }
  
  // Show processing results
  function showProcessingResults() {
    const overlay = document.querySelector('.voice-recording-overlay');
    
    // Hide processing UI
    overlay.querySelector('.voice-processing').classList.add('hidden');
    
    // Populate results with sample nodes
    const resultsContainer = overlay.querySelector('.results-nodes');
    resultsContainer.innerHTML = '';
    
    // Sample detected nodes (in a real implementation, these would come from the OpenAI API)
    const sampleNodes = [
      { type: 'motivator', title: 'Getting good grades', confidence: 0.92 },
      { type: 'task', title: 'Finish history essay', confidence: 0.87, dueDate: '2023-12-10' },
      { type: 'challenge', title: 'Understanding calculus concepts', confidence: 0.79 },
      { type: 'idea', title: 'Connect history to modern politics', confidence: 0.85 }
    ];
    
    sampleNodes.forEach(node => {
      const nodeElement = document.createElement('div');
      nodeElement.className = `result-node result-${node.type}`;
      
      // Format confidence as percentage
      const confidencePercent = Math.round(node.confidence * 100);
      
      let nodeContent = `
        <div class="result-node-icon"><i class="${getIconClass(node.type)}"></i></div>
        <div class="result-node-content">
          <div class="result-node-title">${node.title}</div>
          <div class="result-node-type">${capitalize(node.type)}</div>
          ${node.dueDate ? `<div class="result-node-due">Due: ${formatDate(node.dueDate)}</div>` : ''}
        </div>
        <div class="result-node-confidence" title="${confidencePercent}% confidence">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
          </div>
        </div>
        <div class="result-node-actions">
          <button class="result-edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="result-remove-btn" title="Remove"><i class="fas fa-times"></i></button>
        </div>
      `;
      
      nodeElement.innerHTML = nodeContent;
      resultsContainer.appendChild(nodeElement);
      
      // Add event listeners
      nodeElement.querySelector('.result-edit-btn').addEventListener('click', () => editResultNode(nodeElement));
      nodeElement.querySelector('.result-remove-btn').addEventListener('click', () => removeResultNode(nodeElement));
    });
    
    // Show results UI
    overlay.querySelector('.voice-results').classList.remove('hidden');
  }
  
  // Edit result node
  function editResultNode(nodeElement) {
    const titleElement = nodeElement.querySelector('.result-node-title');
    const currentTitle = titleElement.textContent;
    
    // Create simple inline editor
    const editor = document.createElement('input');
    editor.type = 'text';
    editor.className = 'result-node-editor';
    editor.value = currentTitle;
    
    // Replace title with editor
    titleElement.innerHTML = '';
    titleElement.appendChild(editor);
    
    // Focus editor
    editor.focus();
    editor.select();
    
    // Save on enter or blur
    function saveEdit() {
      const newTitle = editor.value.trim();
      if (newTitle) {
        titleElement.textContent = newTitle;
      } else {
        titleElement.textContent = currentTitle;
      }
    }
    
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        titleElement.textContent = currentTitle;
      }
    });
    
    editor.addEventListener('blur', saveEdit);
  }
  
  // Remove result node
  function removeResultNode(nodeElement) {
    nodeElement.classList.add('removing');
    setTimeout(() => {
      nodeElement.remove();
    }, 300);
  }
  
  // Add all nodes from results
  function addAllNodes() {
    const overlay = document.querySelector('.voice-recording-overlay');
    const resultNodes = overlay.querySelectorAll('.result-node:not(.removing)');
    
    // Show processing message
    showMessage('Adding nodes from voice recording...');
    
    // Get view center
    const center = getViewCenter();
    
    // Calculate positions in a circle around center
    const radius = 200;
    const angleStep = (2 * Math.PI) / resultNodes.length;
    
    // Add each node
    resultNodes.forEach((resultNode, index) => {
      const type = resultNode.className.split('result-')[1].split(' ')[0];
      const title = resultNode.querySelector('.result-node-title').textContent;
      
      // Calculate position in a circle
      const angle = angleStep * index;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      
      // Create the node
      createNode(type, title, x, y);
    });
    
    // Connect the nodes in sequence if multiple nodes
    if (resultNodes.length > 1) {
      for (let i = 0; i < resultNodes.length - 1; i++) {
        const fromId = (nextNodeId - resultNodes.length + i).toString();
        const toId = (nextNodeId - resultNodes.length + i + 1).toString();
        
        edges.push({
          from: fromId,
          to: toId
        });
      }
      
      drawEdges();
    }
    
    // Hide overlay
    hideVoiceRecordingOverlay();
    
    // Show success message
    showMessage(`Added ${resultNodes.length} nodes from your recording!`);
  }
  
  // Cancel results
  function cancelResults() {
    const overlay = document.querySelector('.voice-recording-overlay');
    
    // Reset to recording UI
    overlay.querySelector('.voice-results').classList.add('hidden');
    overlay.querySelector('.voice-recording-content').classList.remove('hidden');
    
    // Reset timer display
    overlay.querySelector('.voice-time').textContent = '00:00';
    recordingTime = 0;
  }
  
  // Helper functions
  function getIconClass(type) {
    const iconClasses = {
      'motivator': 'fas fa-star',
      'task': 'fas fa-tasks',
      'challenge': 'fas fa-mountain',
      'idea': 'fas fa-lightbulb',
      'class': 'fas fa-graduation-cap',
      'assignment': 'fas fa-book',
      'test': 'fas fa-clipboard-check',
      'project': 'fas fa-project-diagram',
      'essay': 'fas fa-file-alt',
      'image': 'fas fa-image'
    };
    
    return iconClasses[type] || 'fas fa-circle';
  }
  
  function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  // Sample detected nodes (in a real implementation, these would come from the OpenAI API)
  const sampleNodes = [
    { type: 'motivator', title: 'Getting good grades', confidence: 0.92 },
    { type: 'task', title: 'Finish history essay', confidence: 0.87, dueDate: '2023-12-10' },
    { type: 'challenge', title: 'Understanding calculus concepts', confidence: 0.79 },
    { type: 'idea', title: 'Connect history to modern politics', confidence: 0.85 }
  ];
  
  // Show node suggestions directly on the web
  function showNodeSuggestions() {
    // Get view center
    const center = getViewCenter();
    const tentativeNodes = [];
    
    // Show global approval UI
    const approvalBar = document.createElement('div');
    approvalBar.className = 'node-suggestions-bar';
    approvalBar.innerHTML = `
      <div class="suggestions-info">
        <i class="fas fa-lightbulb"></i>
        <span>Voice suggestions ready! Review and approve nodes.</span>
      </div>
      <div class="suggestions-actions">
        <button class="approve-all-btn"><i class="fas fa-check-double"></i> Approve All</button>
        <button class="dismiss-all-btn"><i class="fas fa-times"></i> Dismiss All</button>
      </div>
    `;
    document.body.appendChild(approvalBar);
    
    // Add event listeners for global actions
    approvalBar.querySelector('.approve-all-btn').addEventListener('click', () => {
      // Approve all tentative nodes
      document.querySelectorAll('.node-tentative').forEach(node => {
        approveTentativeNode(node);
      });
      approvalBar.remove();
    });
    
    approvalBar.querySelector('.dismiss-all-btn').addEventListener('click', () => {
      // Remove all tentative nodes
      document.querySelectorAll('.node-tentative').forEach(node => {
        node.remove();
      });
      approvalBar.remove();
      showMessage('All suggestions dismissed');
    });
    
    // Calculate positions in a smart arrangement
    // In a real implementation, OpenAI would help position them intelligently
    const radius = 200;
    const angleStep = (2 * Math.PI) / sampleNodes.length;
    
    // Create tentative nodes
    sampleNodes.forEach((nodeData, index) => {
      // Calculate position in a circle
      const angle = angleStep * index;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      
      // Create tentative node
      const tentativeNode = createTentativeNode(nodeData.type, nodeData.title, x, y, nodeData.confidence, nodeData.dueDate);
      tentativeNodes.push(tentativeNode);
    });
    
    // Create tentative connections between nodes if multiple
    if (tentativeNodes.length > 1) {
      for (let i = 0; i < tentativeNodes.length - 1; i++) {
        const fromId = tentativeNodes[i].dataset.id;
        const toId = tentativeNodes[i + 1].dataset.id;
        
        // Add tentative edge
        edges.push({
          from: fromId,
          to: toId,
          tentative: true
        });
      }
      
      // Draw all edges with new tentative ones
      drawEdges();
    }
    
    // Show success message
    showMessage(`${tentativeNodes.length} node suggestions added from your recording`);
  }
  
  // Create a tentative node that needs approval
  function createTentativeNode(type, title, left, top, confidence, dueDate = null) {
    // Create node but mark as tentative
    const node = document.createElement('div');
    node.className = `node node-${type} node-tentative`;
    node.dataset.id = nextNodeId++;
    node.dataset.type = type;
    node.dataset.confidence = confidence;
    
    // Store original position (in world coordinates)
    node.dataset.originalLeft = left;
    node.dataset.originalTop = top;
    
    // Apply transformation for display
    const displayLeft = transformX(left);
    const displayTop = transformY(top);
    
    // Position the node
    node.style.left = `${displayLeft}px`;
    node.style.top = `${displayTop}px`;
    
    // Add node title
    const titleEl = document.createElement('div');
    titleEl.className = 'node-title';
    titleEl.textContent = title;
    
    // Add node icon based on type
    const iconEl = document.createElement('div');
    iconEl.className = 'node-icon';
    
    // Add icon class based on type
    iconEl.innerHTML = `<i class="${getIconClass(type)}"></i>`;
    
    // Add approval UI
    const approvalUI = document.createElement('div');
    approvalUI.className = 'node-approval';
    
    // Format confidence as percentage
    const confidencePercent = Math.round(confidence * 100);
    
    approvalUI.innerHTML = `
      <div class="node-confidence">
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
        </div>
        <span>${confidencePercent}%</span>
      </div>
      <div class="approval-actions">
        <button class="approve-btn" title="Approve"><i class="fas fa-check"></i></button>
        <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="dismiss-btn" title="Dismiss"><i class="fas fa-times"></i></button>
      </div>
    `;
    
    // Add due date if provided
    if (dueDate) {
      node.dataset.dueDate = dueDate;
      const dueDateElement = document.createElement('div');
      dueDateElement.className = 'node-due-date';
      dueDateElement.textContent = `Due: ${formatDate(dueDate)}`;
      node.appendChild(dueDateElement);
    }
    
    // Add elements to node
    node.appendChild(iconEl);
    node.appendChild(titleEl);
    node.appendChild(approvalUI);
    
    // Add event listeners for approval actions
    node.querySelector('.approve-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      approveTentativeNode(node);
    });
    
    node.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      editTentativeNode(node);
    });
    
    node.querySelector('.dismiss-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      dismissTentativeNode(node);
    });
    
    // Add node to the DOM
    nodesContainer.appendChild(node);
    
    // Don't add to nodes array yet since it's tentative
    
    updateMiniMap();
    
    return node;
  }
  
  // Approve a tentative node, making it permanent
  function approveTentativeNode(node) {
    // Remove approval UI
    const approvalUI = node.querySelector('.node-approval');
    approvalUI.remove();
    
    // Remove tentative class
    node.classList.remove('node-tentative');
    
    // Make node draggable
    makeDraggable(node);
    
    // Add to nodes array
    nodes.push({
      id: node.dataset.id,
      element: node,
      type: node.dataset.type,
      title: node.querySelector('.node-title').textContent
    });
    
    // Update any tentative edges that connect to this node
    edges.forEach(edge => {
      if (edge.from === node.dataset.id || edge.to === node.dataset.id) {
        edge.tentative = false;
      }
    });
    
    drawEdges();
    showMessage('Node approved');
    
    // Schedule autosave
    scheduleAutosave();
    
    // Check if all nodes are approved
    const tentativeNodes = document.querySelectorAll('.node-tentative');
    if (tentativeNodes.length === 0) {
      // Remove the suggestions bar if all nodes are approved
      const suggestionsBar = document.querySelector('.node-suggestions-bar');
      if (suggestionsBar) {
        suggestionsBar.remove();
      }
    }
  }
  
  // Edit a tentative node title
  function editTentativeNode(node) {
    const titleEl = node.querySelector('.node-title');
    const currentTitle = titleEl.textContent;
    
    // Create edit field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'node-edit-input';
    input.value = currentTitle;
    
    // Replace title with input
    titleEl.innerHTML = '';
    titleEl.appendChild(input);
    
    // Focus the input
    input.focus();
    input.select();
    
    // Handle input completion
    function saveEdit() {
      const newTitle = input.value.trim();
      if (newTitle) {
        titleEl.textContent = newTitle;
      } else {
        titleEl.textContent = currentTitle;
      }
    }
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        titleEl.textContent = currentTitle;
      }
    });
    
    input.addEventListener('blur', saveEdit);
  }
  
  // Dismiss a tentative node
  function dismissTentativeNode(node) {
    const nodeId = node.dataset.id;
    
    // Remove any tentative edges connected to this node
    edges = edges.filter(edge => {
      return !(edge.from === nodeId || edge.to === nodeId);
    });
    
    // Remove node from DOM
    node.classList.add('removing');
    setTimeout(() => {
      node.remove();
      
      // Check if all nodes are dismissed
      const tentativeNodes = document.querySelectorAll('.node-tentative');
      if (tentativeNodes.length === 0) {
        // Remove the suggestions bar if all nodes are dismissed
        const suggestionsBar = document.querySelector('.node-suggestions-bar');
        if (suggestionsBar) {
          suggestionsBar.remove();
        }
      }
    }, 300);
    
    drawEdges();
  }
  
  // Draw edges between nodes
  function drawEdges() {
    // Make sure canvas covers the entire viewport
    treeCanvas.width = window.innerWidth;
    treeCanvas.height = window.innerHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
    
    // Draw each edge
    edges.forEach(edge => {
      const fromNode = document.querySelector(`[data-id="${edge.from}"]`);
      const toNode = document.querySelector(`[data-id="${edge.to}"]`);
      
      if (fromNode && toNode) {
        // Get the visual position of each node
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        
        // Calculate center points
        const fromCenter = {
          x: fromRect.left + (fromRect.width / 2),
          y: fromRect.top + (fromRect.height / 2)
        };
        
        const toCenter = {
          x: toRect.left + (toRect.width / 2),
          y: toRect.top + (toRect.height / 2)
        };
        
        // Get scroll position for adjustments
        const scrollY = window.scrollY || window.pageYOffset;
        
        // Apply enhanced vertical adjustment for edges (1.5x the normal rate)
        const verticalPanAmount = Math.abs(offsetY) * 0; // Increased from 0.05 to 0.075 (1.5x)
        const adjustmentY = verticalPanAmount * (offsetY < 0 ? -1 : 1);
        
        // Draw line from center to center with enhanced adjustment
        ctx.beginPath();
        ctx.moveTo(fromCenter.x, fromCenter.y);
        ctx.lineTo(toCenter.x, toCenter.y + adjustmentY);
        
        // Get node types for line color
        const fromType = fromNode.dataset.type;
        const toType = toNode.dataset.type;
        
        // Set line style based on node types and if it's tentative
        const gradient = ctx.createLinearGradient(
          fromCenter.x, fromCenter.y, 
          toCenter.x, toCenter.y + adjustmentY
        );
        
        const fromColor = getColorForType(fromType);
        const toColor = getColorForType(toType);
        
        gradient.addColorStop(0, fromColor);
        gradient.addColorStop(1, toColor);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        
        // If it's a tentative edge, use dashed line
        if (edge.tentative) {
          ctx.setLineDash([5, 3]);
          ctx.globalAlpha = 0.6;
        } else {
          ctx.setLineDash([]);
          ctx.globalAlpha = 1.0;
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([]);
      }
    });
  }
});