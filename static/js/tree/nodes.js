// Node creation and management functionality

import { elements, showMessage } from './dom.js';
import * as PanZoom from './panzoom.js';
import * as Edges from './edges.js';
import * as AI from './ai.js';
import * as Autosave from './autosave.js';
import * as Utils from './utils.js';
import * as Voice from './voice.js'; // Import voice module

// Node state
export let nodes = [];
export let nextNodeId = 1;
export let selectedNode = null;
export let draggedNode = null;
export let isDragging = false;
export let isConnecting = false;
export const nodeTypes = ['task', 'challenge', 'idea', 'class', 'assignment', 'test', 'project', 'essay', 'image', 'learningObjective', 'keyidea', 'question', 'problemtype', 'nhscredit'];

// Function to update nextNodeId 
export function setNextNodeId(value) {
  nextNodeId = value;
}

// Set up node buttons - REFACTORED to use nodeTypes array
export function setupNodeButtons() {
  // Unified setup for all node add buttons using nodeTypes
  nodeTypes.forEach(type => {
    // Main toolbar button
    const btn = document.querySelector(`.btn-${type}`);
    if (btn) {
      // Icon is set in HTML/CSS, background is handled by CSS
      btn.addEventListener('click', function() {
        const center = PanZoom.getViewCenter();
        // Generate a default title (e.g., 'Learning Objective' from 'learningObjective')
        const title = type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        createNode(type, title, center.x, center.y);
      });
    }

    // School submenu buttons (existing logic - keep as is if it works)
    // If school submenu items should also be part of nodeTypes and handled here,
    // this section might need adjustment or integration into the loop above.
    // For now, assuming .btn-class, .btn-assignment etc. are distinct from the main toolbar buttons
    // and this existing logic for submenu-button is separate.
  });

  // School submenu event listeners (keep this separate if it's a different UI pattern)
  document.querySelectorAll('.submenu-button').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent bubbling to parent button
      const nodeType = this.dataset.type;
      const center = PanZoom.getViewCenter();
      
      let nodeTitle;
      switch(nodeType) {
        // Keep existing title logic for submenu items
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
        // Add cases for any other submenu specific types if necessary
        default:
          // Use a generic title if type from submenu isn't specifically handled
          nodeTitle = nodeType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      }
      createNode(nodeType, nodeTitle, center.x, center.y);
    });
  });
  
  // Open image upload form (keep existing logic)
  document.querySelector('.btn-image')?.addEventListener('click', function() {
    if (elements.uploadForm && elements.uploadOverlay) {
      elements.uploadForm.style.display = 'block';
      elements.uploadOverlay.style.display = 'block';
    }
  });

  // Note: The .btn-nhscredit will be handled by the main nodeTypes.forEach loop
  // if it's intended as a main toolbar button. If it was special, adjust as needed.
  // The original separate listener for .btn-nhscredit is removed as it's now covered.
}

// Node creation function (refactored to use createCanonicalNode)
export function createNode(type, title, left, top, content = null, id = null) {
  return createCanonicalNode({ type, title, left, top, content, id, isTentative: false });
}

// Create a tentative node that needs approval (refactored)
export function createTentativeNode(type, title, left, top, confidence, dueDate = null) {
  const nodeObj = createCanonicalNode({
    type,
    title,
    left,
    top,
    content: null,
    id: null,
    isTentative: true
  });
  const node = nodeObj.element;
  node.dataset.confidence = confidence;

  // Add approval UI
  const approvalUI = document.createElement('div');
  approvalUI.className = 'node-approval';
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
    dueDateElement.textContent = `Due: ${Utils.formatDate(dueDate)}`;
    node.appendChild(dueDateElement);
  }

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

  return node;
}

// Approve a tentative node, making it permanent (refactored)
export function approveTentativeNode(node) {
  const normId = Utils.normalizeId(node.dataset.id);
  const approvalUI = node.querySelector('.node-approval');
  if (approvalUI) approvalUI.remove();
  node.classList.remove('node-tentative');
  makeDraggable(node);
  const nodeObj = nodes.find(n => Utils.normalizeId(n.id) === normId);
  if (nodeObj) {
    nodeObj.element = node;
    nodeObj.type = node.dataset.type;
    nodeObj.title = node.querySelector('.node-title').textContent;
    nodeObj.hoverPanel = null;
  }
  Edges.edges.forEach(edge => {
    if (Utils.normalizeId(edge.from) === normId || Utils.normalizeId(edge.to) === normId) {
      edge.tentative = false;
    }
  });
  Edges.drawEdges();
  showMessage('Node approved');
  scheduleAutosave();
  const tentativeNodes = document.querySelectorAll('.node-tentative');
  if (tentativeNodes.length === 0) {
    const suggestionsBar = document.querySelector('.node-suggestions-bar');
    if (suggestionsBar) {
      suggestionsBar.remove();
    }
  }
}

// Edit a tentative node title
export function editTentativeNode(node) {
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
export function dismissTentativeNode(node) {
  const nodeId = node.dataset.id;
  
  // Remove any tentative edges connected to this node
  Edges.edges.splice(0, Edges.edges.length, ...Edges.edges.filter(edge => {
    return !(edge.from === nodeId || edge.to === nodeId);
  }));
  
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
  
  Edges.drawEdges();
}

// Make a node draggable
function makeDraggable(node, skipClickHandler = false) {
  let mouseMoveHandler, mouseUpHandler;
  let offsetWorldX = 0, offsetWorldY = 0, wasDragged = false;
  node.addEventListener('mousedown', function(e) {
    // Only left click
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    // Hide hover panel
    const nodeObj = nodes.find(n => n.id === node.dataset.id);
    nodeObj?.hoverPanel?.classList.remove('visible');
    // Calculate world offset for drag
    const origLeft = parseFloat(node.dataset.originalLeft);
    const origTop = parseFloat(node.dataset.originalTop);
    const startWorldX = PanZoom.untransformX(e.clientX);
    const startWorldY = PanZoom.untransformY(e.clientY);
    offsetWorldX = startWorldX - origLeft;
    offsetWorldY = startWorldY - origTop;
    wasDragged = false;
    // Start dragging immediately
    isDragging = true;
    draggedNode = node;
    node.classList.add('dragging');
    node.style.zIndex = '100';
    // Mouse move handler
    mouseMoveHandler = function(ev) {
      if (!isDragging || draggedNode !== node) return;
      const worldX = PanZoom.untransformX(ev.clientX) - offsetWorldX;
      const worldY = PanZoom.untransformY(ev.clientY) - offsetWorldY;
      node.dataset.originalLeft = worldX;
      node.dataset.originalTop = worldY;
      node.style.left = `${PanZoom.transformX(worldX)}px`;
      node.style.top = `${PanZoom.transformY(worldY)}px`;
      Edges.drawEdges();
      wasDragged = true;
    };
    // Mouse up handler
    mouseUpHandler = function(ev) {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      if (isDragging && draggedNode === node) {
        isDragging = false;
        draggedNode = null;
        node.classList.remove('dragging');
        node.style.zIndex = '';
        if (wasDragged) Autosave.scheduleAutosave();
      }
      node.dataset.wasDragged = wasDragged ? 'true' : 'false';
    };
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  });

  // Conditionally add the generic click handler
  if (!skipClickHandler) {
    node.addEventListener('click', function(e) {
      if (!isDragging && !isConnecting && node.dataset.wasDragged !== 'true') {
        const type = node.dataset.type;
        const title = node.querySelector('.node-title').textContent;
        // Existing switch for other node types
        switch (type) {
          case 'motivator':
            window.location.href = `/envision/${node.dataset.id}`;
            break;
          case 'class':
            window.location.href = `/class/${encodeURIComponent(title)}`;
            break;
          case 'assignment':
            window.location.href = `/class/${encodeURIComponent(title)}`;
            break;
          case 'test':
            window.location.href = `/mindweb/${node.dataset.id}`;
            break;
          case 'project':
            window.location.href = `/collab/${node.dataset.id}`;
            break;
          case 'nhscredit':
            window.location.href = '/nhs';
            break;
        }
      }
      // Reset wasDragged flag if it wasn't reset by mousedown/mouseup (e.g. programmatic click)
      // However, our LO click handler above also does this, so this might be redundant here if LO is the only one skipping.
      if (node.dataset.wasDragged === 'true') node.dataset.wasDragged = 'false'; 
    }, { capture: true }); // Keep capture true if other logic depends on it.
  }
}

// Delete a node
export function deleteNode(nodeId) {
  const normId = Utils.normalizeId(nodeId);
  const nodeToDelete = nodes.find(node => Utils.normalizeId(node.id) === normId);
  const nodeEl = document.querySelector(`[data-id="${normId}"]`);
  if (nodeEl) {
    nodeEl.remove();
  }
  if (nodeToDelete && nodeToDelete.hoverPanel) {
    nodeToDelete.hoverPanel.remove();
  }
  nodes = nodes.filter(node => Utils.normalizeId(node.id) !== normId);
  Edges.edges.splice(0, Edges.edges.length, ...Edges.edges.filter(edge => Utils.normalizeId(edge.from) !== normId && Utils.normalizeId(edge.to) !== normId));
  Edges.drawEdges();
  showMessage('Node deleted!');
  scheduleAutosave();
  // Debug: log all node IDs after deletion
  logNodeIdState();
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

// Update node positions based on pan and zoom
export function updateNodePositions() {
  nodes.forEach(node => {
    if (node.element) {
      updateSingleNodePosition(node.element);
    }
  });
  
  Edges.drawEdges();
  PanZoom.updateZoomDisplay();
}

// Function to update the screen position of a single node based on its world coordinates
export function updateSingleNodePosition(nodeElement) {
  const originalLeft = parseInt(nodeElement.dataset.originalLeft || 0);
  const originalTop = parseInt(nodeElement.dataset.originalTop || 0);

  const newLeft = PanZoom.transformX(originalLeft);
  const newTop = PanZoom.transformY(originalTop);

  nodeElement.style.left = `${newLeft}px`;
  nodeElement.style.top = `${newTop}px`;
  // Scale node and font size based on zoom
  const scale = PanZoom.scale;
  nodeElement.style.transform = `scale(${scale})`;
  // Adjust font size for all text inside the node
  nodeElement.style.fontSize = `${Math.max(12, 16 * scale)}px`;
}

// Forward the scheduleAutosave function
export function scheduleAutosave() {
  Autosave.scheduleAutosave();
}

// Set up the hover panel for a node
function setupNodeHoverPanel(node, nodeObject) {
  const hoverPanel = document.createElement('div');
  hoverPanel.className = 'node-hover-panel';

  // Capture the node ID at the time of handler creation
  const nodeId = node.dataset.id;

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
    deleteNode(nodeId);
  });
  controls.appendChild(deleteBtn);

  // Connect button
  const connectBtn = document.createElement('div');
  connectBtn.className = 'node-control';
  connectBtn.innerHTML = '↔';
  connectBtn.title = 'Connect to Another Node';
  connectBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    Edges.startConnection(nodeId);
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
  if (['task', 'assignment', 'test', 'project', 'essay'].includes(nodeObject.type)) {
    const dueDateBtn = document.createElement('div');
    dueDateBtn.className = 'node-control';
    dueDateBtn.innerHTML = '📅';
    dueDateBtn.title = 'Set Due Date';
    dueDateBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      showDueDateInterface(node, hoverPanel);
    });
    controls.appendChild(dueDateBtn);
  }

  // Add AI buttons for motivator nodes only
  if (nodeObject.type === 'motivator') {
    // Challenge AI button
    const challengeBtn = document.createElement('div');
    challengeBtn.className = 'node-control ai-feature-btn challenge-btn';
    challengeBtn.innerHTML = '<i class="fas fa-brain"></i>';
    challengeBtn.title = 'AI Challenge - Test your knowledge';
    challengeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      AI.showAIFeatureChat(node, hoverPanel, 'challenge');
    });
    controls.appendChild(challengeBtn);

    // Enrich AI button
    const enrichBtn = document.createElement('div');
    enrichBtn.className = 'node-control ai-feature-btn enrich-btn';
    enrichBtn.innerHTML = '<i class="fas fa-seedling"></i>';
    enrichBtn.title = 'AI Enrich - Expand on this node';
    enrichBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      AI.showAIFeatureChat(node, hoverPanel, 'enrich');
    });
    controls.appendChild(enrichBtn);

    // Explore AI button
    const exploreBtn = document.createElement('div');
    exploreBtn.className = 'node-control ai-feature-btn explore-btn';
    exploreBtn.innerHTML = '<i class="fas fa-compass"></i>';
    exploreBtn.title = 'AI Explore - Discover connections';
    exploreBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      AI.showAIFeatureChat(node, hoverPanel, 'explore');
    });
    controls.appendChild(exploreBtn);
  }

  // Add custom features section based on node type
  const featuresSection = document.createElement('div');
  featuresSection.className = 'node-features';
  
  switch(nodeObject.type) {
    case 'task':
      featuresSection.innerHTML = `
        <div class="node-feature-buttons">
          <button class="feature-button breakdown-btn">
            <i class="fas fa-sitemap"></i>
            <span>Break It Down</span>
          </button>
          <button class="feature-button ai-assist-btn">
            <i class="fas fa-robot"></i>
            <span>Do with AI</span>
          </button>
        </div>
      `;
      
      // Add event listeners for task features
      setTimeout(() => {
        const breakdownBtn = featuresSection.querySelector('.breakdown-btn');
        const aiAssistBtn = featuresSection.querySelector('.ai-assist-btn');
        
        if (breakdownBtn) {
          breakdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'breakdown');
          });
        }
        
        if (aiAssistBtn) {
          aiAssistBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'ai-assist');
          });
        }
      }, 0);
      break;
      
    case 'learningObjective':
      featuresSection.innerHTML = `
        <div class="learning-style-panel">
          <h4>Learning Style Settings</h4>
          <div class="learning-style-options">
            <label class="style-option">
              <input type="radio" name="learning-style-${nodeId}" value="visual" checked>
              <span class="option-content">
                <i class="fas fa-eye"></i>
                <span>Visual</span>
              </span>
            </label>
            <label class="style-option">
              <input type="radio" name="learning-style-${nodeId}" value="auditory">
              <span class="option-content">
                <i class="fas fa-headphones"></i>
                <span>Auditory</span>
              </span>
            </label>
            <label class="style-option">
              <input type="radio" name="learning-style-${nodeId}" value="kinesthetic">
              <span class="option-content">
                <i class="fas fa-hand-paper"></i>
                <span>Hands-on</span>
              </span>
            </label>
          </div>
          <div class="learning-preferences">
            <label class="preference-toggle">
              <input type="checkbox" class="pref-checkbox">
              <span>Use examples</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" class="pref-checkbox">
              <span>Step-by-step breakdown</span>
            </label>
            <label class="preference-toggle">
              <input type="checkbox" class="pref-checkbox">
              <span>Connect to prior knowledge</span>
            </label>
          </div>
        </div>
      `;
      break;
      
    case 'motivator':
      featuresSection.innerHTML = `
        <div class="motivator-features">
          <h4>Motivator Tools</h4>
          <div class="motivator-actions">
            <button class="feature-button vision-btn">
              <i class="fas fa-telescope"></i>
              <span>Envision Success</span>
            </button>
            <button class="feature-button progress-btn">
              <i class="fas fa-chart-line"></i>
              <span>Track Progress</span>
            </button>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        const visionBtn = featuresSection.querySelector('.vision-btn');
        const progressBtn = featuresSection.querySelector('.progress-btn');
        
        if (visionBtn) {
          visionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'envision');
          });
        }
        
        if (progressBtn) {
          progressBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'progress');
          });
        }
      }, 0);
      break;
      
    case 'challenge':
      featuresSection.innerHTML = `
        <div class="challenge-features">
          <div class="feature-button-row">
            <button class="feature-button analyze-btn">
              <i class="fas fa-search"></i>
              <span>Analyze Challenge</span>
            </button>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        const analyzeBtn = featuresSection.querySelector('.analyze-btn');
        if (analyzeBtn) {
          analyzeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'analyze');
          });
        }
      }, 0);
      break;
      
    case 'idea':
      featuresSection.innerHTML = `
        <div class="idea-features">
          <div class="feature-button-row">
            <button class="feature-button expand-btn">
              <i class="fas fa-expand-arrows-alt"></i>
              <span>Expand Idea</span>
            </button>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        const expandBtn = featuresSection.querySelector('.expand-btn');
        if (expandBtn) {
          expandBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'expand');
          });
        }
      }, 0);
      break;
      
    case 'assignment':
    case 'test':
    case 'project':
    case 'essay':
      featuresSection.innerHTML = `
        <div class="academic-features">
          <div class="feature-button-row">
            <button class="feature-button study-btn">
              <i class="fas fa-book-open"></i>
              <span>Study Plan</span>
            </button>
            <button class="feature-button resource-btn">
              <i class="fas fa-link"></i>
              <span>Resources</span>
            </button>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        const studyBtn = featuresSection.querySelector('.study-btn');
        const resourceBtn = featuresSection.querySelector('.resource-btn');
        
        if (studyBtn) {
          studyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'study-plan');
          });
        }
        
        if (resourceBtn) {
          resourceBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            Voice.startNodeFeatureVoice(node, 'resources');
          });
        }
      }, 0);
      break;
      
    default:
      featuresSection.innerHTML = `
        <div class="default-features">
          <p class="no-features">No special features available for this node type.</p>
        </div>
      `;
      break;
  }

  // Add controls and features to hover panel
  hoverPanel.appendChild(controls);
  hoverPanel.appendChild(featuresSection);
  document.body.appendChild(hoverPanel);

  // Hover logic
  let isOverPanel = false;
  node.addEventListener('mouseenter', function() {
    const rect = node.getBoundingClientRect();
    hoverPanel.style.left = rect.right + 10 + 'px';
    hoverPanel.style.top = rect.top + 'px';
    hoverPanel.classList.add('visible');
  });
  node.addEventListener('mouseleave', function(e) {
    const toElement = e.relatedTarget;
    if (toElement && (toElement === hoverPanel || hoverPanel.contains(toElement))) {
      return;
    }
    setTimeout(() => {
      if (!isOverPanel) {
        hoverPanel.classList.remove('visible');
      }
    }, 50);
  });
  hoverPanel.addEventListener('mouseenter', function() {
    isOverPanel = true;
  });
  hoverPanel.addEventListener('mouseleave', function(e) {
    isOverPanel = false;
    const toElement = e.relatedTarget;
    if (toElement === node || node.contains(toElement)) {
      return;
    }
    hoverPanel.classList.remove('visible');
  });

  nodeObject.hoverPanel = hoverPanel;
}

// Canonical node creation function
export function createCanonicalNode({ type, title, left, top, content = null, id = null, isTentative = false }) {
  let newId;
  if (id) {
    newId = Utils.normalizeId(id);
  } else {
    do {
      newId = Utils.normalizeId(nextNodeId++);
    } while (nodes.some(n => Utils.normalizeId(n.id) === newId) || document.querySelector(`[data-id="${newId}"]`));
  }
  if (nodes.some(n => Utils.normalizeId(n.id) === newId) || document.querySelector(`[data-id="${newId}"]`)) {
    console.warn('Duplicate node ID detected even after incrementing:', newId);
  }
  const node = document.createElement('div');
  node.className = `node node-${type}` + (isTentative ? ' node-tentative' : '');
  node.dataset.id = newId;
  node.dataset.type = type;
  if (isTentative) node.dataset.confidence = 1.0;
  node.dataset.originalLeft = left;
  node.dataset.originalTop = top;
  const displayLeft = PanZoom.transformX(left);
  const displayTop = PanZoom.transformY(top);
  node.style.left = `${displayLeft}px`;
  node.style.top = `${displayTop}px`;
  const titleEl = document.createElement('div');
  titleEl.className = 'node-title';
  titleEl.textContent = title;
  const iconEl = document.createElement('div');
  iconEl.className = 'node-icon';
  iconEl.innerHTML = `<i class="${Utils.getIconClass(type)}"></i>`;
  node.appendChild(iconEl);
  node.appendChild(titleEl);

  // Learning Objective specific enhancements
  if (type === 'learningObjective') {
    // Add microphone status indicator
    const micStatusEl = document.createElement('div');
    micStatusEl.className = 'learning-objective-status';
    micStatusEl.innerHTML = '<i class="fas fa-microphone-slash"></i>'; // Initial state: voice off
    node.appendChild(micStatusEl);

    // Add click listener to toggle Learning Objective voice mode
    // Ensure this listener does not interfere with drag or other general node clicks
    node.addEventListener('click', function(e) {
      // Prevent click from propagating if it was part of a drag operation
      if (node.dataset.wasDragged === 'true') {
        node.dataset.wasDragged = 'false'; // Reset for next click
        return;
      }
      // Also, don't trigger if a control inside the hover panel was clicked or if connecting
      if (e.target.closest('.node-control') || isConnecting) {
        return;
      }

      e.stopPropagation(); // Stop propagation to prevent other general click handlers like makeDraggable's
      
      const isActive = node.classList.contains('voice-active');
      Voice.toggleLearningObjectiveVoice(node, !isActive);
      
      // Update mic icon based on new state
      micStatusEl.innerHTML = !isActive ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
      node.classList.toggle('voice-active', !isActive);
    }, false); // Use non-capture phase to ensure it runs after drag check but can be stopped.
  }

  if (type === 'image' && content) {
    const img = document.createElement('img');
    img.src = content;
    img.alt = title;
    node.appendChild(img);
  }
  elements.nodesContainer.appendChild(node);
  const scale = PanZoom.scale;
  node.style.transform = `scale(${scale})`;
  node.style.fontSize = `${Math.max(12, 16 * scale)}px`;
  
  // Modify makeDraggable to NOT handle click for learningObjective, as it has its own.
  makeDraggable(node, type === 'learningObjective'); 

  const nodeObject = {
    id: newId,
    element: node,
    hoverPanel: null,
    type: type,
    title: title,
    content: content
  };
  if (!isTentative) {
    setupNodeHoverPanel(node, nodeObject);
  }
  nodes.push(nodeObject);
  scheduleAutosave();
  logNodeIdState();
  return nodeObject;
}

// Debug utility to log all node IDs in DOM and array, and check for duplicates
export function logNodeIdState() {
  const domIds = Array.from(document.querySelectorAll('.node')).map(n => n.dataset.id);
  const arrayIds = nodes.map(n => n.id);
  // console.log('DOM IDs:', domIds);
  // console.log('Array IDs:', arrayIds);
  // Check for duplicates in DOM
  const domDuplicates = domIds.filter((id, idx) => domIds.indexOf(id) !== idx);
  if (domDuplicates.length > 0) {
    console.warn('Duplicate node IDs in DOM:', domDuplicates);
  }
  // Check for duplicates in array
  const arrayDuplicates = arrayIds.filter((id, idx) => arrayIds.indexOf(id) !== idx);
  if (arrayDuplicates.length > 0) {
    console.warn('Duplicate node IDs in nodes array:', arrayDuplicates);
  }
}

// Debug utility to assert node state consistency
export function assertNodeState() {
  nodes.forEach(n => {
    if (!n.element || !n.id) {
      console.error('Node missing element or id:', n);
    }
    if (!document.body.contains(n.element)) {
      console.warn('Node element not in DOM:', n);
    }
  });
}

// Show only nodes with given IDs, hide others
export function showOnlyNodes(nodeIds) {
  nodes.forEach(n => {
    if (nodeIds.includes(n.id)) {
      n.element.style.display = '';
    } else {
      n.element.style.display = 'none';
    }
  });
  Edges.drawEdges();
}

// Show all nodes
export function showAllNodes() {
  nodes.forEach(n => {
    n.element.style.display = '';
  });
  Edges.drawEdges();
}

// Get node IDs within a rectangle (in world coordinates)
export function getNodesInRect(rect) {
  return nodes.filter(n => {
    const x = parseFloat(n.element.dataset.originalLeft);
    const y = parseFloat(n.element.dataset.originalTop);
    return (
      x >= rect.left && x <= rect.right &&
      y >= rect.top && y <= rect.bottom
    );
  }).map(n => n.id);
} 