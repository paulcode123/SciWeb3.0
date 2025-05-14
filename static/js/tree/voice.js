// Voice recording functionality

import { elements, showMessage } from './dom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';
import * as PanZoom from './panzoom.js';
import { getAreaSelectState } from './main.js';

let isRecording = false;
let audioContext = null;
let mediaRecorder = null;
let audioChunks = [];
let analyser = null;
let dataArray = null;
let animationFrame = null;
let loadingTimeout = null;
let stream = null;

export function setupVoiceRecording() {
  if (elements.voiceRecordBtn) {
    elements.voiceRecordBtn.addEventListener('click', toggleVoiceRecording);
  }
}

function toggleVoiceRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  if (isRecording) return;
  
  try {
    // Request microphone access
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Set up audio recording
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    // Set up media recorder
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.addEventListener('dataavailable', event => {
      audioChunks.push(event.data);
    });
    
    // Start recording
    mediaRecorder.start();
    isRecording = true;
    elements.voiceRecordBtn.classList.add('recording');
    startWaveAnimation();
    
    // Start visualizing audio
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    showMessage('Voice recording started');
  } catch (err) {
    console.error('Error starting voice recording:', err);
    showMessage('Could not access microphone');
  }
}

function stopRecording() {
  if (!isRecording) return;
  
  isRecording = false;
  elements.voiceRecordBtn.classList.remove('recording');
  stopWaveAnimation();
  showLoadingAnimation();
  
  // Stop recording
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.addEventListener('stop', async () => {
      // Get audio blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      
      // Capture tree state
      const treeState = captureTreeState();
      
      // Send to server
      try {
        await processVoiceRecording(audioBlob, treeState);
      } catch (err) {
        console.error('Error processing voice recording:', err);
        showMessage('Error processing recording');
      }
      
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      audioContext = null;
      mediaRecorder = null;
      audioChunks = [];
    });
    
    mediaRecorder.stop();
  }
}

function captureTreeState() {
  // Capture only visible nodes if area select is active
  let nodeList = Nodes.nodes;
  const areaState = getAreaSelectState ? getAreaSelectState() : { active: false };
  if (areaState && areaState.active && areaState.selectedNodeIds) {
    nodeList = Nodes.nodes.filter(n => areaState.selectedNodeIds.includes(n.id));
  }
  const nodeData = nodeList.map(node => {
    return {
      id: node.id,
      type: node.type,
      title: node.title,
      content: node.content,
      position: {
        x: parseFloat(node.element.dataset.originalLeft),
        y: parseFloat(node.element.dataset.originalTop)
      }
    };
  });
  
  // Capture all edges in the tree
  const edgeData = Edges.edges.map(edge => {
    return {
      from: edge.from,
      to: edge.to
    };
  });
  
  return {
    nodes: nodeData,
    edges: edgeData,
    viewCenter: PanZoom.getViewCenter()
  };
}

async function processVoiceRecording(audioBlob, treeState) {
  try {
    // Create form data for the audio file
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('tree_state', JSON.stringify(treeState));
    
    // Updated URL to match the correct Blueprint prefix
    const response = await fetch('/ai/voice_to_nodes', {
      method: 'POST',
      body: formData
      // Do NOT set Content-Type header - browser will set it with proper boundary
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Process the result to update the tree
    updateTreeWithResults(result, treeState.viewCenter);
  } catch (err) {
    console.error('Error processing voice recording:', err);
    showMessage('Error processing recording');
  } finally {
    // Make sure the loading animation stops and the icon returns
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    const loading = elements.voiceRecordBtn.querySelector('.voice-loading');
    const icon = elements.voiceRecordBtn.querySelector('i');
    
    if (loading) {
      if (loading._anim) cancelAnimationFrame(loading._anim);
      loading.style.display = 'none';
    }
    
    if (icon) {
      icon.style.display = '';
    }
  }
}

function updateTreeWithResults(result, viewCenter) {
  if (result && result.nodes) {
    console.log('Voice processing result:', result);
    console.log('Existing nodes:', Nodes.nodes.map(n => ({ id: n.id, title: n.title })));
    console.log('Trying to add', result.nodes.length, 'nodes and', (result.edges ? result.edges.length : 0), 'edges');
    
    showMessage(`Adding ${result.nodes.length} nodes from your recording`);
    
    // Track created nodes to establish connections later
    const createdNodeIds = new Map();
    
    // Add all new nodes
    result.nodes.forEach(nodeInfo => {
      // Calculate position based on view center if not provided
      const position = nodeInfo.position || {
        x: viewCenter.x + (Math.random() * 400 - 200),
        y: viewCenter.y + (Math.random() * 400 - 200)
      };
      
      // Create the node
      const nodeObject = Nodes.createNode(
        nodeInfo.type,
        nodeInfo.title,
        position.x,
        position.y,
        nodeInfo.content,
        nodeInfo.id
      );
      
      // Track the mapping between requested ID and created ID
      createdNodeIds.set(nodeInfo.id, nodeObject.id);
    });
    
    // Add all new edges if specified
    if (result.edges) {
      result.edges.forEach(edge => {
        // Try to get IDs for the nodes - they could be new nodes or existing nodes
        let fromId = createdNodeIds.get(edge.from);
        let toId = createdNodeIds.get(edge.to);
        
        // If fromId is not found in the new nodes, check if it refers to an existing node
        if (!fromId) {
          // Check if this directly matches an existing node ID
          const existingNode = Nodes.nodes.find(node => node.id === edge.from);
          if (existingNode) {
            fromId = existingNode.id;
          }
        }
        
        // Same for toId
        if (!toId) {
          const existingNode = Nodes.nodes.find(node => node.id === edge.to);
          if (existingNode) {
            toId = existingNode.id;
          }
        }
        
        // If we found both source and target nodes, create the edge
        if (fromId && toId) {
          // Check if this edge already exists
          const edgeExists = Edges.edges.some(e => 
            (e.from === fromId && e.to === toId) || 
            (e.from === toId && e.to === fromId)
          );
          
          if (!edgeExists) {
            // Add the edge
            Edges.edges.push({
              from: fromId,
              to: toId
            });
            console.log(`Added edge from ${fromId} to ${toId}`);
          }
        } else {
          console.warn('Could not create edge - missing node ID:', { 
            requestedFrom: edge.from, 
            requestedTo: edge.to, 
            resolvedFrom: fromId, 
            resolvedTo: toId 
          });
        }
      });
      
      // Redraw all edges
      Edges.drawEdges();
    }
    
    // Add highlighted effect to all new nodes
    result.nodes.forEach(nodeInfo => {
      const id = createdNodeIds.get(nodeInfo.id);
      const nodeElement = document.querySelector(`[data-id="${id}"]`);
      if (nodeElement) {
        nodeElement.classList.add('appear');
        setTimeout(() => {
          nodeElement.classList.remove('appear');
        }, 3000);
      }
    });
    
    // Save the new state
    Nodes.scheduleAutosave();
  } else {
    showMessage('No new nodes generated from recording');
  }
}

function startWaveAnimation() {
  // Create or select the wave canvas inside the button
  let canvas = elements.voiceRecordBtn.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    canvas.style.position = 'absolute';
    canvas.style.left = '5px';
    canvas.style.top = '5px';
    elements.voiceRecordBtn.appendChild(canvas);
  }
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // If we have real audio data, use it
    if (analyser && dataArray) {
      analyser.getByteTimeDomainData(dataArray);
      
      ctx.save();
      ctx.translate(20, 20);
      ctx.beginPath();
      
      const sliceWidth = 40 / dataArray.length;
      let x = -20;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * 2 - 1) * 10;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#7c4dff';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    } else {
      // Fallback to simulated waveform
      const time = Date.now() / 400;
      ctx.save();
      ctx.translate(20, 20);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const x = i - 20;
        const y = Math.sin((i / 6) + time) * 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#7c4dff';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    }
    
    animationFrame = requestAnimationFrame(draw);
  }
  draw();
}

function stopWaveAnimation() {
  let canvas = elements.voiceRecordBtn.querySelector('canvas');
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  if (canvas) {
    canvas.style.display = 'none';
  }
}

function showLoadingAnimation() {
  // Hide icon and wave
  let icon = elements.voiceRecordBtn.querySelector('i');
  let canvas = elements.voiceRecordBtn.querySelector('canvas');
  if (icon) icon.style.display = 'none';
  if (canvas) canvas.style.display = 'none';

  // Create or select loading canvas
  let loading = elements.voiceRecordBtn.querySelector('.voice-loading');
  if (!loading) {
    loading = document.createElement('canvas');
    loading.className = 'voice-loading';
    loading.width = 40;
    loading.height = 40;
    loading.style.position = 'absolute';
    loading.style.left = '5px';
    loading.style.top = '5px';
    elements.voiceRecordBtn.appendChild(loading);
  }
  loading.style.display = 'block';
  const ctx = loading.getContext('2d');
  let start = null;
  function drawLoading(ts) {
    if (!start) start = ts;
    const progress = ((ts - start) / 1000) % 1;
    ctx.clearRect(0, 0, 40, 40);
    ctx.save();
    ctx.translate(20, 20);
    ctx.rotate(progress * 2 * Math.PI);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 1.5);
    ctx.strokeStyle = '#7c4dff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#7c4dff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
    loading._anim = requestAnimationFrame(drawLoading);
  }
  drawLoading(performance.now());
  // No timeout here; loading will be stopped manually after map update
} 