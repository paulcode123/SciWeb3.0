// Import modules
import * as Dom from './dom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';
import * as PanZoom from './panzoom.js';
import * as Autosave from './autosave.js';
import * as AI from './ai.js';
import * as Voice from './voice.js';
import * as Utils from './utils.js';

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
}); 