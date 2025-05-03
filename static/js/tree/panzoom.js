// Pan and zoom functionality

import { elements, showMessage } from './dom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';

// Pan and Zoom state
export let offsetX = 0;
export let offsetY = 0;
export let scale = 1;
export let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// Initialize pan and zoom
export function initialize() {
  // Initialize with default values
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  isPanning = false;
  updateZoomDisplay();
}

// Set up event listeners for pan and zoom
export function setupEventListeners() {
  // Zoom controls
  elements.zoomInBtn.addEventListener('click', function() {
    scale *= 1.2;
    scale = Math.min(Math.max(0.1, scale), 3);
    Nodes.updateNodePositions();
    showMessage(`Zoom: ${Math.round(scale * 100)}%`);
  });
  
  elements.zoomOutBtn.addEventListener('click', function() {
    scale *= 0.8;
    scale = Math.min(Math.max(0.1, scale), 3);
    Nodes.updateNodePositions();
    showMessage(`Zoom: ${Math.round(scale * 100)}%`);
  });
  
  // Add zoom with mouse wheel
  elements.treeCanvas.addEventListener('wheel', function(e) {
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
    Nodes.updateNodePositions();
    
    // Show zoom level
    showMessage(`Zoom: ${Math.round(scale * 100)}%`);
  });
  
  // Add panning with middle mouse button or spacebar + drag
  document.addEventListener('mousedown', function(e) {
    // Check if we clicked on a node or UI element - don't start panning if so
    if (e.target.closest('.node') || e.target.closest('.tree-toolbar') || 
        e.target.closest('.zoom-controls') ||
        e.target.closest('.node-hover-panel') || e.target.closest('.ai-sidebar') ||
        e.target.closest('.upload-form') || Nodes.isDragging || Nodes.isConnecting) {
      // Click was on a node or UI element, don't start panning
      return;
    }
    
    // Middle mouse button (button 1) or Alt+left click or left click on empty space
    if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 0) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      elements.treeCanvas.style.cursor = 'grabbing';
      document.querySelector('.tree-container').classList.add('panning');
    }
  });
  
  // Handle mouse move for panning
  document.addEventListener('mousemove', function(e) {
    if (isPanning) {
      const dx = (e.clientX - panStartX) / scale;
      const dy = (e.clientY - panStartY) / scale;
      offsetX -= dx;
      offsetY -= dy;
      panStartX = e.clientX;
      panStartY = e.clientY;
      Nodes.updateNodePositions();
      // Explicitly redraw edges during panning
      Edges.drawEdges();
    }
  });
  
  // Handle mouse up for panning
  document.addEventListener('mouseup', function(e) {
    if (isPanning) {
      isPanning = false;
      elements.treeCanvas.style.cursor = 'default';
      document.querySelector('.tree-container').classList.remove('panning');
    }
  });
  
  // Add keyboard shortcuts for panning and zooming
  document.addEventListener('keydown', function(e) {
    // Don't interfere if user is typing in an input field or textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Spacebar to toggle pan mode
    if (e.code === 'Space' && !isPanning && !Nodes.isConnecting && !Nodes.isDragging) {
      e.preventDefault();
      elements.treeCanvas.style.cursor = 'grab';
      // We don't need to set panStartX/Y here, mousemove will handle it
    }
    
    // Plus key to zoom in
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      scale *= 1.1;
      scale = Math.min(Math.max(0.1, scale), 3);
      Nodes.updateNodePositions();
      showMessage(`Zoom: ${Math.round(scale * 100)}%`);
    }
    
    // Minus key to zoom out
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      scale *= 0.9;
      scale = Math.min(Math.max(0.1, scale), 3);
      Nodes.updateNodePositions();
      showMessage(`Zoom: ${Math.round(scale * 100)}%`);
    }
    
    // 0 key to reset zoom and pan
    if (e.key === '0') {
      e.preventDefault();
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      Nodes.updateNodePositions();
      showMessage('View reset');
    }
  });
  
  document.addEventListener('keyup', function(e) {
    if (e.code === 'Space' && isPanning) {
      isPanning = false;
      elements.treeCanvas.style.cursor = 'default';
    }
  });
}

// Apply transformations to coordinates
export function transformX(x) {
  return (x - offsetX) * scale;
}

export function transformY(y) {
  return (y - offsetY) * scale;
}

// Reverse transformations (for mouse coordinates)
export function untransformX(x) {
  return (x / scale) + offsetX;
}

export function untransformY(y) {
  return (y / scale) + offsetY;
}

// Update zoom display
export function updateZoomDisplay() {
  elements.zoomLevelDisplay.textContent = `${Math.round(scale * 100)}%`;
}

// Helper function to get center of current view in world coordinates
export function getViewCenter() {
  // Get the center of the viewport in screen coordinates
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  
  // Convert to world coordinates
  const worldX = untransformX(viewportCenterX);
  const worldY = untransformY(viewportCenterY);
  
  return { x: worldX, y: worldY };
} 