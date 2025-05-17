// Import modules
import * as Dom from './dom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';
import * as PanZoom from './panzoom.js';
import * as Autosave from './autosave.js';
import * as AI from './ai.js';
import * as Voice from './voice.js';
import * as Utils from './utils.js';
import './node_editor.js';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize DOM elements
  Dom.initElements();

  // Set up the canvas
  Edges.setupCanvas();
  
  // Initialize pan & zoom functionality
  PanZoom.initialize();
  
  // Set up event listeners
  Dom.setupEventListeners();
  Nodes.setupNodeButtons();
  PanZoom.setupEventListeners();
  Voice.setupVoiceRecording();
  AI.setupAIAssistant();
  Edges.setupConnectionOverlay();
  
  // Load tree state
  Autosave.loadTreeState();
  
  // Handle intro overlay
  if (Dom.elements.introButton) {
    Dom.elements.introButton.addEventListener('click', function() {
      // Add closing animation class
      Dom.elements.introOverlay.classList.add('closing');
      
      // After animation completes, hide the overlay
      setTimeout(() => {
        Dom.elements.introOverlay.style.display = 'none';
        
        // Show welcome message
        Dom.showMessage('Welcome to Your Web! Start by adding a node.');
      }, 800);
    });
  }
  
  // Window resize event
  window.addEventListener('resize', Edges.resizeCanvas);
  
  // Toggle area select: start selection, or close if currently applied
  Dom.elements.areaSelectBtn.addEventListener('click', function() {
    // If the 'show all' bubble is visible, this means a filter is applied: close it
    if (Dom.elements.areaSelectBubble.style.display === 'block') {
      disableAreaSelectMode();
    } else {
      enableAreaSelectMode();
    }
  });
  Dom.elements.nodesContainer.addEventListener('mousedown', function(e) {
    if (!areaSelectMode) return;
    if (e.button !== 0) return;
    areaSelectStart = { x: e.clientX, y: e.clientY };
    areaSelectEnd = { x: e.clientX, y: e.clientY };
    Dom.elements.areaSelectRect.style.display = 'block';
    updateAreaSelectRect();
    function onMouseMove(ev) {
      areaSelectEnd = { x: ev.clientX, y: ev.clientY };
      updateAreaSelectRect();
    }
    function onMouseUp(ev) {
      areaSelectEnd = { x: ev.clientX, y: ev.clientY };
      updateAreaSelectRect();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      const rect = getRectCoords(areaSelectStart, areaSelectEnd);
      const worldRect = {
        left: PanZoom.untransformX(rect.left),
        top: PanZoom.untransformY(rect.top),
        right: PanZoom.untransformX(rect.right),
        bottom: PanZoom.untransformY(rect.bottom)
      };
      selectedNodeIds = Nodes.getNodesInRect(worldRect);
      Nodes.showOnlyNodes(selectedNodeIds);
      Dom.elements.areaSelectBubble.style.display = 'block';
      Dom.elements.areaSelectBubble.style.top = (rect.top - 40) + 'px';
      Dom.elements.areaSelectBubble.style.left = (rect.right + 20) + 'px';
      // Unclick the area select button and exit area select mode
      Dom.elements.areaSelectBtn.classList.remove('active');
      areaSelectMode = false;
      areaSelectStart = null;
      areaSelectEnd = null;
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  Dom.elements.areaSelectBubble.addEventListener('click', disableAreaSelectMode);
}); 

// Area selection state
let areaSelectMode = false;
let areaSelectStart = null;
let areaSelectEnd = null;
let selectedNodeIds = [];

function enableAreaSelectMode() {
  if (areaSelectMode) return;
  areaSelectMode = true;
  selectedNodeIds = [];
  document.body.classList.add('area-select-active');
  Dom.elements.areaSelectBtn.classList.add('active');
  Dom.elements.areaSelectRect.style.display = 'none';
  Dom.elements.areaSelectBubble.style.display = 'none';
  // Disable node dragging, panning, etc. (handled by event logic)
}

function disableAreaSelectMode() {
  areaSelectMode = false;
  areaSelectStart = null;
  areaSelectEnd = null;
  selectedNodeIds = [];
  document.body.classList.remove('area-select-active');
  Dom.elements.areaSelectBtn.classList.remove('active');
  Dom.elements.areaSelectRect.style.display = 'none';
  Dom.elements.areaSelectBubble.style.display = 'none';
  Nodes.showAllNodes();
}

function getRectCoords(start, end) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y)
  };
}

function screenToWorld(x, y) {
  return {
    x: PanZoom.untransformX(x),
    y: PanZoom.untransformY(y)
  };
}

function updateAreaSelectRect() {
  if (!areaSelectStart || !areaSelectEnd) return;
  const rect = getRectCoords(areaSelectStart, areaSelectEnd);
  Dom.elements.areaSelectRect.style.left = rect.left + 'px';
  Dom.elements.areaSelectRect.style.top = rect.top + 'px';
  Dom.elements.areaSelectRect.style.width = (rect.right - rect.left) + 'px';
  Dom.elements.areaSelectRect.style.height = (rect.bottom - rect.top) + 'px';
}

// Export for other modules
export function getAreaSelectState() {
  return { active: areaSelectMode, selectedNodeIds };
} 