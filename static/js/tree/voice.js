// Voice recording functionality

import { elements, showMessage } from './dom.js';
import * as PanZoom from './panzoom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';
import * as Utils from './utils.js';

// Voice recording state
let isRecording = false;
let recordingTime = 0;
let recordingTimer = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationFrame = null;

// Set up voice recording button
export function setupVoiceRecording() {
  if (elements.voiceRecordBtn) {
    elements.voiceRecordBtn.addEventListener('click', showVoiceRecordingOverlay);
  }
}

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
      <div class="result-node-icon"><i class="${Utils.getIconClass(node.type)}"></i></div>
      <div class="result-node-content">
        <div class="result-node-title">${node.title}</div>
        <div class="result-node-type">${Utils.capitalize(node.type)}</div>
        ${node.dueDate ? `<div class="result-node-due">Due: ${Utils.formatDate(node.dueDate)}</div>` : ''}
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
  const center = PanZoom.getViewCenter();
  
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
    Nodes.createNode(type, title, x, y);
  });
  
  // Connect the nodes in sequence if multiple nodes
  if (resultNodes.length > 1) {
    for (let i = 0; i < resultNodes.length - 1; i++) {
      const fromId = (Nodes.nextNodeId - resultNodes.length + i).toString();
      const toId = (Nodes.nextNodeId - resultNodes.length + i + 1).toString();
      
      Edges.edges.push({
        from: fromId,
        to: toId
      });
    }
    
    Edges.drawEdges();
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
  const center = PanZoom.getViewCenter();
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
      Nodes.approveTentativeNode(node);
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
    const tentativeNode = Nodes.createTentativeNode(nodeData.type, nodeData.title, x, y, nodeData.confidence, nodeData.dueDate);
    tentativeNodes.push(tentativeNode);
  });
  
  // Create tentative connections between nodes if multiple
  if (tentativeNodes.length > 1) {
    for (let i = 0; i < tentativeNodes.length - 1; i++) {
      const fromId = tentativeNodes[i].dataset.id;
      const toId = tentativeNodes[i + 1].dataset.id;
      
      // Add tentative edge
      Edges.edges.push({
        from: fromId,
        to: toId,
        tentative: true
      });
    }
    
    // Draw all edges with new tentative ones
    Edges.drawEdges();
  }
  
  // Show success message
  showMessage(`${tentativeNodes.length} node suggestions added from your recording`);
} 