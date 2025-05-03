// Node creation and management functionality

import { elements, showMessage } from './dom.js';
import * as PanZoom from './panzoom.js';
import * as Edges from './edges.js';
import * as AI from './ai.js';
import * as Autosave from './autosave.js';
import * as Utils from './utils.js';

// Node state
export let nodes = [];
export let nextNodeId = 1;
export let selectedNode = null;
export let draggedNode = null;
export let isDragging = false;
export let isConnecting = false;
export const nodeTypes = ['motivator', 'task', 'challenge', 'idea', 'class', 'assignment', 'test', 'project', 'essay', 'image', 'keyidea', 'question', 'problemtype'];

// Function to update nextNodeId 
export function setNextNodeId(value) {
  nextNodeId = value;
}

// Set up node buttons
export function setupNodeButtons() {
  // Button event listeners for creating nodes
  document.querySelector('.btn-motivator')?.addEventListener('click', function() {
    const center = PanZoom.getViewCenter();
    createNode('motivator', 'Motivation', center.x, center.y);
  });
  
  document.querySelector('.btn-task')?.addEventListener('click', function() {
    const center = PanZoom.getViewCenter();
    createNode('task', 'Task', center.x, center.y);
  });
  
  document.querySelector('.btn-challenge')?.addEventListener('click', function() {
    const center = PanZoom.getViewCenter();
    createNode('challenge', 'Challenge', center.x, center.y);
  });
  
  // Add listener for the idea button
  document.querySelector('.btn-idea')?.addEventListener('click', function() {
    const center = PanZoom.getViewCenter();
    createNode('idea', 'Idea', center.x, center.y);
  });
  
  // School submenu event listeners
  document.querySelectorAll('.school-menu .submenu-button').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent bubbling to parent button
      const nodeType = this.dataset.type;
      const center = PanZoom.getViewCenter();
      
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
  
  // Learning submenu event listeners
  document.querySelectorAll('.learning-menu .submenu-button').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent bubbling to parent button
      const nodeType = this.dataset.type;
      const center = PanZoom.getViewCenter();
      
      let nodeTitle;
      switch(nodeType) {
        case 'keyidea':
          nodeTitle = 'Key Idea';
          break;
        case 'question':
          nodeTitle = 'Question';
          break;
        case 'problemtype':
          nodeTitle = 'Problem Type';
          break;
        default:
          nodeTitle = 'Learning Item';
      }
      
      createNode(nodeType, nodeTitle, center.x, center.y);
    });
  });
  
  // Open image upload form
  document.querySelector('.btn-image')?.addEventListener('click', function() {
    if (elements.uploadForm && elements.uploadOverlay) {
      elements.uploadForm.style.display = 'block';
      elements.uploadOverlay.style.display = 'block';
    }
  });
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
function makeDraggable(node) {
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
  // Click behavior when not dragging
  node.addEventListener('click', function(e) {
    if (!isDragging && !isConnecting && node.dataset.wasDragged !== 'true') {
      const type = node.dataset.type;
      const title = node.querySelector('.node-title').textContent;
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
      }
    }
    node.dataset.wasDragged = 'false';
  }, { capture: true });
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
  nodeElement.style.transform = '';
}

// Forward the scheduleAutosave function
export function scheduleAutosave() {
  Autosave.scheduleAutosave();
}

// Set up the hover panel for a node
function setupNodeHoverPanel(node, nodeObject) {
  // Create hover panel
  const hoverPanel = document.createElement('div');
  hoverPanel.className = 'node-hover-panel';
  hoverPanel.dataset.for = node.dataset.id;
  
  // Create controls
  const controls = document.createElement('div');
  controls.className = 'node-controls';
  
  // Default controls
  controls.innerHTML = `
    <button class="node-control edit-title" title="Edit Title"><i class="fas fa-edit"></i></button>
    <button class="node-control set-due-date" title="Set Due Date"><i class="fas fa-calendar-alt"></i></button>
    <button class="node-control connect-node" title="Connect to Another Node"><i class="fas fa-link"></i></button>
    <button class="node-control delete-node" title="Delete Node"><i class="fas fa-trash-alt"></i></button>
  `;
  
  // Add special controls based on node type
  if (node.dataset.type === 'keyidea') {
    const learnMoreBtn = document.createElement('button');
    learnMoreBtn.className = 'learn-more-btn';
    learnMoreBtn.innerHTML = '<i class="fas fa-search"></i> Learn More';
    learnMoreBtn.addEventListener('click', function() {
      const searchQuery = node.querySelector('.node-title').textContent;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
    });
    
    const askQuestionBtn = document.createElement('button');
    askQuestionBtn.className = 'ask-question-btn';
    askQuestionBtn.innerHTML = '<i class="fas fa-question"></i> Ask Question';
    askQuestionBtn.addEventListener('click', function() {
      // Show AI chat window
      const aiSidebar = document.querySelector('.ai-sidebar');
      if (aiSidebar) {
        aiSidebar.classList.add('visible');
        const aiInput = document.getElementById('ai-input');
        if (aiInput) {
          const topic = node.querySelector('.node-title').textContent;
          aiInput.value = `Tell me more about ${topic}`;
          aiInput.focus();
        }
      }
    });
    
    controls.appendChild(learnMoreBtn);
    controls.appendChild(askQuestionBtn);
  }
  
  if (node.dataset.type === 'question') {
    const recontextualizeBtn = document.createElement('button');
    recontextualizeBtn.className = 'recontextualize-btn';
    recontextualizeBtn.innerHTML = '<i class="fas fa-sitemap"></i> Recontextualize';
    recontextualizeBtn.addEventListener('click', function() {
      // This would normally call AI functionality to add simpler questions
      // For UI demo, we'll just show a message
      showMessage('Recontextualizing question...');
    });
    
    controls.appendChild(recontextualizeBtn);
  }
  
  if (node.dataset.type === 'problemtype') {
    const practiceBtn = document.createElement('button');
    practiceBtn.className = 'practice-btn';
    practiceBtn.innerHTML = '<i class="fas fa-graduation-cap"></i> Practice';
    practiceBtn.addEventListener('click', function() {
      // This would normally open a practice module
      // For UI demo, we'll just show a message
      showMessage('Opening practice module...');
    });
    
    controls.appendChild(practiceBtn);
  }
  
  // Add event listeners to controls
  controls.querySelector('.edit-title').addEventListener('click', function() {
    showEditInterface(node, hoverPanel);
  });
  
  controls.querySelector('.set-due-date').addEventListener('click', function() {
    showDueDateInterface(node, hoverPanel);
  });
  
  controls.querySelector('.connect-node').addEventListener('click', function() {
    isConnecting = true;
    selectedNode = nodeObject;
    
    // Show overlay with instructions
    const overlay = document.querySelector('.connection-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.innerHTML = '<div>Select another node to connect to</div>';
    }
    
    // Show message
    showMessage('Select another node to connect to');
    
    // Close hover panel
    hoverPanel.classList.remove('visible');
  });
  
  controls.querySelector('.delete-node').addEventListener('click', function() {
    const nodeId = node.dataset.id;
    deleteNode(nodeId);
    hoverPanel.remove();
  });
  
  // Create info section
  const infoSection = document.createElement('div');
  infoSection.className = 'node-info collapsed';
  
  // Add info based on node type
  switch (node.dataset.type) {
    case 'motivator':
      infoSection.innerHTML = `
        <h4>Motivator</h4>
        <p>A higher-level goal, value, or purpose that drives your actions and decisions. Connect this to tasks, challenges, and ideas to see how they align with your core motivations.</p>
        <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
      `;
      break;
    case 'task':
      infoSection.innerHTML = `
        <h4>Task</h4>
        <p>A specific action item that you need to complete. Tasks can be connected to motivators (why you're doing them) or challenges (what problems they solve).</p>
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
    case 'idea':
      infoSection.innerHTML = `
        <h4>Idea</h4>
        <p>A concept, thought, or potential solution. Connect ideas to challenges, tasks, or other ideas to map out your thinking.</p>
        <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
      `;
      break;
    case 'keyidea':
      infoSection.innerHTML = `
        <h4>Key Idea</h4>
        <p>An important formula, theory, law, or established concept that forms a foundation for understanding. Use this node to document critical knowledge points.</p>
        <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
      `;
      break;
    case 'question':
      infoSection.innerHTML = `
        <h4>Question</h4>
        <p>A query that probes understanding of connected concepts. Questions help identify knowledge gaps and promote deeper learning through reflection.</p>
        <div class="node-info-toggle">Show more <i class="fas fa-chevron-down"></i></div>
      `;
      break;
    case 'problemtype':
      infoSection.innerHTML = `
        <h4>Problem Type</h4>
        <p>A category of related problems that share solution approaches or techniques. Practice problem types to build proficiency for tests and real-world applications.</p>
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
    // Find the next unused numeric ID
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
  if (type === 'image' && content) {
    const img = document.createElement('img');
    img.src = content;
    img.alt = title;
    node.appendChild(img);
  }
  elements.nodesContainer.appendChild(node);
  makeDraggable(node);
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
  console.log('DOM IDs:', domIds);
  console.log('Array IDs:', arrayIds);
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