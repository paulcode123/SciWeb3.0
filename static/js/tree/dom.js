// DOM element references and UI-related functionality

// Object to store all DOM elements
export const elements = {};

// Initialize and store DOM elements
export function initElements() {
  elements.nodesContainer = document.querySelector('.nodes-container');
  elements.treeCanvas = document.querySelector('.tree-canvas');
  elements.uploadForm = document.querySelector('.upload-form');
  elements.uploadOverlay = document.querySelector('.upload-overlay');
  elements.connectionOverlay = document.querySelector('.connection-overlay');
  elements.statusMessage = document.querySelector('.status-message');
  elements.zoomControls = document.querySelector('.zoom-controls');
  elements.zoomInBtn = document.querySelector('.zoom-in');
  elements.zoomOutBtn = document.querySelector('.zoom-out');
  elements.zoomLevelDisplay = document.querySelector('.zoom-level');
  elements.aiSidebar = document.querySelector('.ai-sidebar');
  elements.aiToggleBtn = document.querySelector('.ai-toggle-btn');
  elements.aiCloseBtn = document.querySelector('.ai-close-btn');
  elements.aiChatBox = document.querySelector('.ai-chat-box');
  elements.aiInput = document.querySelector('#ai-input');
  elements.aiSendBtn = document.querySelector('#ai-send-btn');
  elements.introOverlay = document.querySelector('.intro-overlay');
  elements.introButton = document.querySelector('.intro-button');
  elements.voiceRecordingOverlay = document.querySelector('.voice-recording-overlay');
  elements.voiceRecordBtn = document.querySelector('.btn-voice-record');
}

// Set up event listeners for DOM elements
export function setupEventListeners() {
  // Close image upload form
  elements.uploadForm?.querySelector('.close-upload')?.addEventListener('click', function() {
    elements.uploadForm.style.display = 'none';
    elements.uploadOverlay.style.display = 'none';
  });
  
  // Handle image upload form submission
  elements.uploadForm?.querySelector('form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const imageUrl = document.querySelector('#image-url').value;
    const imageTitle = document.querySelector('#image-title').value || 'Image';
    
    if (imageUrl) {
      const center = PanZoom.getViewCenter();
      Nodes.createNode('image', imageTitle, center.x, center.y, imageUrl);
      
      // Close the form
      elements.uploadForm.style.display = 'none';
      elements.uploadOverlay.style.display = 'none';
      
      // Clear the form
      document.querySelector('#image-url').value = '';
      document.querySelector('#image-title').value = '';
      
      showMessage('Image added!');
    }
  });
}

// Show temporary status message
export function showMessage(message) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.add('show');
  
  setTimeout(() => {
    elements.statusMessage.classList.remove('show');
  }, 3000);
}

// Toggle elements
export function toggleUploadForm(show) {
  if (elements.uploadForm && elements.uploadOverlay) {
    elements.uploadForm.style.display = show ? 'block' : 'none';
    elements.uploadOverlay.style.display = show ? 'block' : 'none';
  }
}

export function toggleConnectionOverlay(show) {
  if (elements.connectionOverlay) {
    elements.connectionOverlay.style.display = show ? 'block' : 'none';
  }
}

// Import references needed for event listeners
import * as PanZoom from './panzoom.js';
import * as Nodes from './nodes.js'; 