// Voice recording functionality with OpenAI Realtime API using WebRTC

import { elements, showMessage } from './dom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';
import * as PanZoom from './panzoom.js';
import { getAreaSelectState } from './main.js';

// State variables
let isRecording = false;
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationFrame = null;
let stream = null;
let treeState = null;
let peerConnection = null;
let openAIToken = null;
let nodeUpdateCounter = 0;
let pendingNodeUpdates = [];
let currentModifications = null;
let dataChannel = null;
let textBuffer = '';
let pingInterval = null;
let audioChunks = [];
let silenceCounter = 0;
let lastAudioSendTime = 0;
const AUDIO_SEND_INTERVAL = 200;
const SILENCE_FLUSH_THRESHOLD = 5;
let assistantAudioElement = null; // To play AI voice output
let isWaitingForAIResponse = false;
let isActiveSpeechDetected = false; // New state variable

// Learning Objective specific variables
let isLearningObjectiveMode = false;
let activeLearningObjectiveNode = null;
let learningObjectiveSessionActive = false;
let learningObjectiveMediaRecorder = null;
let learningObjectiveRecordingTimer = null;
let learningObjectiveAudioChunks = [];
const LEARNING_OBJECTIVE_MAX_RECORDING_TIME = 60000; // 1 minute in milliseconds

// Node feature interaction variables
let isNodeFeatureMode = false;
let activeFeatureNode = null;
let activeFeatureType = null;
let featureSessionActive = false;
let conversationHistory = [];
let lastAIResponse = '';
let lastUserResponse = '';
let conversationTurnsSinceLastAnalysis = 0;
let lastAnalysisTime = 0;

// Tool definitions for the AI
const mapManipulationTools = [
  {
    type: "function",
    name: "add_node_to_map",
    description: "Adds a new node (e.g., idea, task, concept) to the concept map. Infer position if not specified.",
    parameters: {
      type: "object",
      properties: {
        node_type: { type: "string", description: "The type of node (e.g., 'idea', 'task', 'question', 'challenge', 'motivator'). Default to 'idea' if unsure." },
        title: { type: "string", description: "The main title or label for the node." },
        content: { type: "string", description: "Optional detailed content or description for the node." },
        target_x: {type: "number", description: "Suggested X coordinate. If null, place near current view center or related nodes."},
        target_y: {type: "number", description: "Suggested Y coordinate. If null, place near current view center or related nodes."},
        // We can add source_node_id later if we want the AI to suggest connections upon creation
      },
      required: ["node_type", "title"]
    }
  },
  {
    type: "function",
    name: "connect_nodes",
    description: "Creates a visual connection (edge) between two existing nodes on the map.",
    parameters: {
      type: "object",
      properties: {
        source_node_id: { type: "string", description: "The ID of the node where the connection starts. Must be an existing node ID from the provided map context." },
        target_node_id: { type: "string", description: "The ID of the node where the connection ends. Must be an existing node ID from the provided map context." }
      },
      required: ["source_node_id", "target_node_id"]
    }
  },
  {
    type: "function",
    name: "remove_node_by_id",
    description: "Removes a specific node from the concept map using its ID.",
    parameters: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The ID of the node to be removed. Must be an existing node ID from the provided map context." }
      },
      required: ["node_id"]
    }
  },
  {
    type: "function",
    name: "remove_edge",
    description: "Removes a specific connection (edge) between two nodes on the map, identified by the IDs of the connected nodes.",
    parameters: {
      type: "object",
      properties: {
        source_node_id: { type: "string", description: "The ID of one node connected by the edge. Must be an existing node ID." },
        target_node_id: { type: "string", description: "The ID of the other node connected by the edge. Must be an existing node ID." }
      },
      required: ["source_node_id", "target_node_id"]
    }
  },
  {
    type: "function",
    name: "move_node",
    description: "Moves an existing node to a new position on the map.",
    parameters: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The ID of the node to move. Must be an existing node ID." },
        target_x: { type: "number", description: "The new X coordinate for the node." },
        target_y: { type: "number", description: "The new Y coordinate for the node." }
      },
      required: ["node_id", "target_x", "target_y"]
    }
  },
  {
    type: "function",
    name: "update_node_title",
    description: "Updates (renames) the title of an existing node.",
    parameters: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "The ID of the node to update. Must be an existing node ID." },
        new_title: { type: "string", description: "The new title for the node." }
      },
      required: ["node_id", "new_title"]
    }
  }
  // Future tools: update_node_details, etc.
];

// Learning Objective specialized tools - extended for knowledge probing and expansion
const learningObjectiveTools = [
  {
    type: "function",
    name: "add_node_to_map",
    description: "Adds a new node (e.g., key idea, question, concept) to the concept map near the learning objective. Position nodes close to the learning objective unless specified otherwise.",
    parameters: {
      type: "object",
      properties: {
        node_type: { 
          type: "string", 
          description: "The type of node. For learning objectives, prefer: 'keyidea' (for concrete knowledge the student has), 'question' (for areas to explore), or 'idea' (for general concepts)."
        },
        title: { type: "string", description: "The main title or label for the node." },
        content: { type: "string", description: "Optional detailed content or description for the node." },
        target_x: {type: "number", description: "Suggested X coordinate. If null, place near the learning objective node."},
        target_y: {type: "number", description: "Suggested Y coordinate. If null, place near the learning objective node."}
      },
      required: ["node_type", "title"]
    }
  },
  {
    type: "function",
    name: "connect_nodes",
    description: "Creates a visual connection (edge) between two existing nodes on the map.",
    parameters: {
      type: "object",
      properties: {
        source_node_id: { type: "string", description: "The ID of the node where the connection starts. Must be an existing node ID from the provided map context." },
        target_node_id: { type: "string", description: "The ID of the node where the connection ends. Must be an existing node ID from the provided map context." }
      },
      required: ["source_node_id", "target_node_id"]
    }
  }
];

// WebRTC connection configuration
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

// For converting audio data to base64 - moved to top level
function convertFloat32ToInt16(buffer) {
  const l = buffer.length;
  const buf = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf;
}

// New helper function to send accumulated audio - moved to top level
function sendAccumulatedAudio() {
  if (isWaitingForAIResponse) {
    // console.log("sendAccumulatedAudio: Waiting for AI response, buffering audio."); 
    // Audio will continue to accumulate in audioChunks and be sent when isWaitingForAIResponse is false.
    return; 
  }
  if (!isRecording) return;
  if (!dataChannel || dataChannel.readyState !== 'open') {
    if (audioChunks.length > 0) console.warn("sendAccumulatedAudio: Data channel not open, discarding.");
    audioChunks = []; return;
  }
  if (audioChunks.length === 0) { return; }

  const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Int16Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) { combined.set(chunk, offset); offset += chunk.length; }
  
  // Create a copy of the chunks to send and clear the global one for new data immediately
  const currentChunksToSend = audioChunks; // This line is actually not needed due to `combined`
  audioChunks = []; 

  const blob = new Blob([combined.buffer], { type: 'audio/pcm' });
  const reader = new FileReader();
  reader.onloadend = () => {
    if (!reader.result) { console.error("FileReader empty result in sendAccumulatedAudio."); return; }
    const base64data = reader.result.split(',')[1];
    if (!isRecording || !dataChannel || dataChannel.readyState !== 'open') {
      console.log("State changed before async send in sendAccumulatedAudio."); return;
    }
    try {
      // Corrected payload structure
      dataChannel.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64data // audio is now a direct base64 string
        // Removed is_final: false
      }));
      // console.log(`Sent accumulated audio buffer (size: ${combined.length})`);
    } catch (sendError) {
      console.error('Error sending accumulated audio:', sendError);
      if (!isRecording) return;
      if (!peerConnection || peerConnection.connectionState !== 'connected' || (dataChannel && dataChannel.readyState !== 'open')) {
        stopRecording({ sendFinalBuffer: false });
      }
    }
  };
  reader.onerror = (error) => { console.error('FileReader error in sendAccumulatedAudio:', error); };
  reader.readAsDataURL(blob);
}

// Function to set up voice recording
export function setupVoiceRecording() {
  if (elements.voiceRecordBtn) {
    elements.voiceRecordBtn.addEventListener('click', toggleVoiceRecording);
  }
}

// Toggle recording state
function toggleVoiceRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    // Stop any active voice modes first
    if (isNodeFeatureMode && activeFeatureNode) {
      stopNodeFeatureVoice();
    }
    if (isLearningObjectiveMode && activeLearningObjectiveNode) {
      toggleLearningObjectiveVoice(activeLearningObjectiveNode, false);
    }
    startRecording();
  }
}

// Stop node feature voice interaction
export function stopNodeFeatureVoice() {
  if (isNodeFeatureMode && isRecording) {
    stopRecording();
  }
  
  // Reset node feature mode variables
  isNodeFeatureMode = false;
  activeFeatureNode = null;
  activeFeatureType = null;
  featureSessionActive = false;
  
  // Reset conversation tracking
  conversationHistory = [];
  lastAIResponse = '';
  lastUserResponse = '';
  conversationTurnsSinceLastAnalysis = 0;
  lastAnalysisTime = 0;
  
  // Visual feedback
  showMessage('Node feature voice mode deactivated');
}

// Start node feature voice interaction using real-time WebRTC
export function startNodeFeatureVoice(node, featureType) {
  // If any recording is active, stop it first
  if (isRecording) {
    stopRecording();
  }
  if (isLearningObjectiveMode && learningObjectiveSessionActive) {
    // Stop learning objective mode properly
    toggleLearningObjectiveVoice(activeLearningObjectiveNode, false);
  }
    
  // Set node feature mode
  isNodeFeatureMode = true;
  activeFeatureNode = node;
  activeFeatureType = featureType;
  featureSessionActive = true;
  
  // Reset conversation tracking
  conversationHistory = [];
  lastAIResponse = '';
  lastUserResponse = '';
  conversationTurnsSinceLastAnalysis = 0;
  lastAnalysisTime = Date.now();
    
  // Visual feedback
  const nodeTitle = node.querySelector('.node-title').textContent;
  const featureMessages = {
    'breakdown': `Starting breakdown session for: ${nodeTitle}`,
    'ai-assist': `Starting AI assistance for: ${nodeTitle}`,
    'analyze': `Starting analysis session for: ${nodeTitle}`,
    'expand': `Starting expansion session for: ${nodeTitle}`,
    'study-plan': `Starting study plan session for: ${nodeTitle}`,
    'resources': `Starting resource session for: ${nodeTitle}`,
    'envision': `Starting vision session for: ${nodeTitle}`,
    'progress': `Starting progress session for: ${nodeTitle}`
  };
  
  const message = featureMessages[featureType] || `Starting session for: ${nodeTitle}`;
  showMessage(message);
  
  // Start real-time recording with node feature context
  startRecording();
}

// Toggle Learning Objective voice mode
export function toggleLearningObjectiveVoice(node, activate) {
  if (activate) {
    // If any recording is active, stop it first
    if (isRecording) {
      stopRecording();
    }
    
    // Set learning objective mode
    isLearningObjectiveMode = true;
    activeLearningObjectiveNode = node;
    learningObjectiveSessionActive = true;
    
    // Reset conversation tracking
    conversationHistory = [];
    lastAIResponse = '';
    lastUserResponse = '';
    conversationTurnsSinceLastAnalysis = 0;
    lastAnalysisTime = Date.now();
    
    // Visual feedback
    const nodeTitle = node.querySelector('.node-title').textContent;
    const message = `Starting learning exploration for: ${nodeTitle}`;
    showMessage(message);
    
    // Start real-time recording with learning objective context
    startRecording();
  } else {
    // Exit learning objective mode
    if (isLearningObjectiveMode && isRecording) {
      stopRecording();
    }
    
    // Clean up UI immediately
    if (activeLearningObjectiveNode) {
      activeLearningObjectiveNode.classList.remove('voice-active');
      const statusIndicator = activeLearningObjectiveNode.querySelector('.learning-objective-status');
      if (statusIndicator) {
        statusIndicator.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
      }
    }
    
    isLearningObjectiveMode = false;
    activeLearningObjectiveNode = null;
    learningObjectiveSessionActive = false;
    
    // Visual feedback
    showMessage('Learning Objective voice mode deactivated');
  }
}



// Note: Learning objective recording now uses the same real-time WebRTC approach as node features



// Note: Learning objective processing now handled by the same conversation analysis system



// Note: Learning objective response processing now handled by processBackendNodeSuggestions

// Helper function to get connected nodes for context
function getConnectedNodes(nodeId) {
  const connectedNodeIds = new Set();
  
  // Find all edges connected to this node
  Edges.edges.forEach(edge => {
    if (edge.from === nodeId) {
      connectedNodeIds.add(edge.to);
    } else if (edge.to === nodeId) {
      connectedNodeIds.add(edge.from);
    }
  });
  
  // Return node data for connected nodes
  return Nodes.nodes
    .filter(node => connectedNodeIds.has(node.id))
    .map(node => ({
      id: node.id,
      title: node.title,
      content: node.content,
      type: node.type
    }));
}

// Helper function to get node by ID
function getNodeById(nodeId) {
  if (!nodeId) return null;
  
  // First try to find in the Nodes.nodes array
  const nodeObj = Nodes.nodes.find(node => node.id === nodeId);
  if (nodeObj) {
    // Make sure the element property is set
    if (!nodeObj.element) {
      nodeObj.element = document.querySelector(`[data-id="${nodeId}"]`);
    }
    return nodeObj;
  }
  
  // Fallback: search by DOM element
  const element = document.querySelector(`[data-id="${nodeId}"]`);
  if (element) {
    // Create a minimal node object
    return {
      id: nodeId,
      element: element,
      title: element.querySelector('.node-title')?.textContent || '',
      content: element.querySelector('.node-content textarea')?.value || '',
      type: element.dataset.type || 'unknown'
    };
  }
  
  return null;
}

// Helper function to calculate position near a reference node
function calculatePositionNearNode(referenceNode) {
  if (!referenceNode) {
    console.log('No reference node provided, using view center');
    // Fallback to view center if no reference node
    const viewCenter = PanZoom.getViewCenter();
    return {
      x: viewCenter.x + (Math.random() * 300 - 150),
      y: viewCenter.y + (Math.random() * 300 - 150)
    };
  }
  
  let refElement = referenceNode.element;
  
  // If no element, try to find it
  if (!refElement && referenceNode.id) {
    refElement = document.querySelector(`[data-id="${referenceNode.id}"]`);
  }
  
  if (!refElement) {
    console.log('Reference node element not found, using view center');
    // Fallback to view center if element not found
    const viewCenter = PanZoom.getViewCenter();
    return {
      x: viewCenter.x + (Math.random() * 300 - 150),
      y: viewCenter.y + (Math.random() * 300 - 150)
    };
  }
  
  const refLeft = parseFloat(refElement.dataset.originalLeft || refElement.style.left);
  const refTop = parseFloat(refElement.dataset.originalTop || refElement.style.top);
  
  if (isNaN(refLeft) || isNaN(refTop)) {
    console.log('Reference node position data invalid, using view center');
    // Fallback if position data is invalid
    const viewCenter = PanZoom.getViewCenter();
    return {
      x: viewCenter.x + (Math.random() * 300 - 150),
      y: viewCenter.y + (Math.random() * 300 - 150)
    };
  }
  
  // Position in a circle around the reference node
                                const angle = Math.random() * Math.PI * 2;
  const distance = 150 + Math.random() * 100; // 150-250 pixels away
  
  const position = {
    x: refLeft + Math.cos(angle) * distance,
    y: refTop + Math.sin(angle) * distance
  };
  
  console.log(`Calculated position near reference node ${referenceNode.id}:`, position);
  return position;
}

// Note: Learning objective cleanup now handled by the unified cleanupResources function



// Start recording and connect to OpenAI Realtime API via WebRTC
async function startRecording() {
  if (isRecording) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000 // CHANGED TO 24kHz as per OpenAI error message expectation
    });
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const bufferSize = 1024;
    const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    const SILENCE_THRESHOLD = 0.01;
    lastAudioSendTime = Date.now();
    audioChunks = [];
    silenceCounter = 0;

    // Reset isActiveSpeechDetected at the start of new recording
    isActiveSpeechDetected = false; 

    scriptProcessor.onaudioprocess = (e) => {
      if (!isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i++) { sum += Math.abs(input[i]); }
      const avg = sum / input.length;
      if (avg > SILENCE_THRESHOLD) {
        silenceCounter = 0;
        const currentAudioChunk = convertFloat32ToInt16(input);
        audioChunks.push(currentAudioChunk);
        const now = Date.now();
        if (now - lastAudioSendTime >= AUDIO_SEND_INTERVAL) {
          sendAccumulatedAudio();
          lastAudioSendTime = now;
        }
      } else {
        silenceCounter++;
        if (silenceCounter > SILENCE_FLUSH_THRESHOLD && audioChunks.length > 0) {
          sendAccumulatedAudio();
          lastAudioSendTime = Date.now();
          silenceCounter = 0;
        }
      }
    };
    
    treeState = captureTreeState();
    const tokenResponse = await fetch('/ai/get_realtime_token', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!tokenResponse.ok) throw new Error("Failed to get OpenAI token: " + await tokenResponse.text());
    const tokenData = await tokenResponse.json();
    openAIToken = tokenData.token;
    console.log("Received OpenAI token, preparing WebRTC connection");
    await new Promise(resolve => setTimeout(resolve, 500));
    await setupWebRTCConnection(stream);
    isRecording = true;
    elements.voiceRecordBtn.classList.add('recording');
    startWaveAnimation();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    showMessage('Real-time voice processing started');
  } catch (err) {
    console.error('Error starting voice recording:', err);
    showMessage('Error: ' + err.message);
    cleanupResources();
  }
}

// Setup WebRTC connection to OpenAI
async function setupWebRTCConnection(stream) {
  // Create a new RTCPeerConnection
  peerConnection = new RTCPeerConnection(rtcConfig);
  
  // Setup for AI audio output
  if (!assistantAudioElement) {
    assistantAudioElement = new Audio();
    assistantAudioElement.autoplay = true; // Try to autoplay
    // Optional: append to body for controls, or handle UI elsewhere
    // document.body.appendChild(assistantAudioElement); 
  }

  peerConnection.ontrack = (event) => {
    console.log('Received remote audio track from AI:', event);
    if (event.streams && event.streams[0]) {
        assistantAudioElement.srcObject = event.streams[0];
        assistantAudioElement.play().catch(e => console.error("Error playing assistant audio:", e));
    } else {
        console.warn("Remote track event did not contain streams.");
    }
  };

  // Add local audio track to the connection (for user's microphone)
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error("No audio track found in the media stream");
  }
  
  console.log(`Adding ${audioTracks.length} audio tracks to RTCPeerConnection`);
  audioTracks.forEach(track => {
    console.log(`Audio track: id=${track.id}, kind=${track.kind}, enabled=${track.enabled}, muted=${track.muted}`);
    // Make sure the track is enabled
    track.enabled = true;
    peerConnection.addTrack(track, stream);
  });
  
  // Create a data channel for receiving text responses
  dataChannel = peerConnection.createDataChannel('oai-events');
  
  // Handle data channel closed event
  dataChannel.onclose = () => {
    console.log('Data channel closed. Setting isWaitingForAIResponse = false.');
    isWaitingForAIResponse = false;
    isActiveSpeechDetected = false;
    if (isRecording) {
      console.log('Data channel closed while recording, stopping recording.');
      stopRecording({ sendFinalBuffer: false });
    }
  };
  
  // Handle data channel errors
  dataChannel.onerror = (error) => {
    console.error('Data channel error. Setting isWaitingForAIResponse = false.', error);
    isWaitingForAIResponse = false;
    isActiveSpeechDetected = false;
    showMessage('Data channel error occurred');
    // It's possible the channel is already closed or closing, so stopping might be redundant
    // but good to ensure state consistency if isRecording is still true.
    if (isRecording) {
        console.log("Data channel error, ensuring recording is stopped.");
        stopRecording({ sendFinalBuffer: false });
    }
  };
  
  dataChannel.onopen = () => {
    console.log('Data channel opened');
    
    // We now wait for the session.created event before sending prompts
    // This ensures the session is fully established before we start sending messages
  };
  
  dataChannel.onmessage = (event) => {
    try {
      console.log('Received data channel message:', event.data);
      let data;
      
      try {
        data = JSON.parse(event.data);
      } catch (jsonError) {
        console.error('Error parsing JSON from data channel:', jsonError);
        console.log('Raw message data:', event.data);
        return;
      }
      
      // Handle different message types from OpenAI Realtime API
      switch (data.type) {
        case 'session.created':
          console.log('Session created successfully:', data.session.id);
          if (dataChannel && dataChannel.readyState === 'open') {
            const currentMapState = captureTreeState(); // Capture state for initial context if needed
            
            // Create context-specific instructions and tools based on mode
            let initialInstructions, toolsToUse;
            
            if (isNodeFeatureMode && activeFeatureNode && activeFeatureType) {
              // Node feature specific instructions
              const nodeTitle = activeFeatureNode.querySelector('.node-title').textContent;
              const nodeType = activeFeatureNode.dataset.type;
              
              const featureInstructions = {
                'breakdown': `You are helping the user break down the ${nodeType}: "${nodeTitle}". Start by asking them to tell you more about this task - what it involves, what parts seem challenging, and what they've already thought about. Have a conversation to understand their needs before creating any nodes. Only create nodes when you have enough information and the user seems ready for concrete next steps.`,
                'ai-assist': `You are helping the user with the ${nodeType}: "${nodeTitle}". Start by asking them what specific challenges they're facing or what kind of help they need. Listen carefully to their response and ask follow-up questions to understand their situation. Only suggest approaches and create nodes after you understand what they're struggling with.`,
                'analyze': `You are helping the user analyze the challenge: "${nodeTitle}". Begin by asking them to describe the challenge in their own words - what makes it difficult, what they've tried, and what aspects they're most concerned about. Have a thoughtful conversation to understand the problem before breaking it down into components.`,
                'expand': `You are helping the user expand the idea: "${nodeTitle}". Start by asking them to share more about this idea - what got them thinking about it, what aspects interest them most, and where they'd like to take it. Engage in a conversation to understand their vision before creating related concepts.`,
                'study-plan': `You are helping the user create a study plan for: "${nodeTitle}". Begin by asking about their current knowledge level, learning goals, timeline, and preferred learning style. Have a conversation to understand their educational needs before creating any study structure.`,
                'resources': `You are helping the user find resources for: "${nodeTitle}". Start by asking what specific aspects they want to learn about, what type of resources they prefer (videos, books, articles, etc.), and what their current level of knowledge is. Understand their needs through conversation before suggesting resources.`,
                'envision': `You are helping the user envision success with: "${nodeTitle}". Begin by asking them to describe what success looks like to them, what motivates them about this goal, and what positive outcomes they're hoping for. Have an inspiring conversation before creating motivational nodes.`,
                'progress': `You are helping the user track progress on: "${nodeTitle}". Start by asking about what they've accomplished so far, what milestones matter to them, and how they like to measure progress. Understand their situation through conversation before creating tracking systems.`
              };
              
              initialInstructions = featureInstructions[activeFeatureType] || 
                `You are helping the user with the ${nodeType}: "${nodeTitle}". Listen to their needs and create helpful nodes to support their goals.`;
              
              initialInstructions += ` 

IMPORTANT: You are ONLY responsible for having a conversation. Do NOT create any nodes or modify the map in any way. Your only job is to be helpful, conversational, and gather information about the user's needs. The conversation will be analyzed separately to create relevant nodes.`;
              
              toolsToUse = []; // No tools - conversation only
            } else if (isLearningObjectiveMode && activeLearningObjectiveNode) {
              // Learning objective specific instructions
              const nodeTitle = activeLearningObjectiveNode.querySelector('.node-title').textContent;
              
              initialInstructions = `You are helping a student explore their understanding of the learning objective: "${nodeTitle}". 

Your role is to have an educational conversation to:
1. Understand what the student already knows about this topic
2. Identify gaps in their knowledge through gentle questioning
3. Help them articulate their understanding clearly
4. Ask follow-up questions to probe deeper into their knowledge
5. Encourage them to explain concepts in their own words
6. Guide them to make connections between ideas

Be encouraging, patient, and pedagogically sound. Ask one question at a time and listen carefully to their responses. Help them discover knowledge through themselves rather than directly teaching.

IMPORTANT: You are ONLY responsible for having a conversation. Do NOT create any nodes or modify the map in any way. Your only job is to facilitate learning through dialogue. The conversation will be analyzed separately to create relevant nodes based on the student's demonstrated knowledge and learning needs.`;
              
              toolsToUse = []; // No tools - conversation only
            } else {
              // Regular mode instructions
              initialInstructions = 
              `You are a helpful assistant integrated into a real-time concept mapping application. 
              Your primary role is to help the user build and modify their concept map by listening to their voice. 
              Use the available tools (functions) to add new nodes, connect existing nodes, or modify the map based on the user's commands. 
              When adding a node, carefully consider the most appropriate 'node_type' (such as 'idea', 'task', 'question', 'challenge', 'motivator', or other relevant types based on context) and specify it. If the type is unclear, you can default to 'idea', but strive to use diverse types when appropriate. 
              Also consider the current map state to determine appropriate placement if not specified. 
              The current map state is: ${JSON.stringify(currentMapState)}. 
              Always aim to use a function call for map manipulations rather than just describing the action in text. Be conservative when adding new nodes; wait for clear, explicit instructions or substantial concepts to emerge from the user's speech before creating a node. Avoid creating nodes for every minor detail or fleeting thought. If unsure, wait for more context rather than adding a node prematurely.`;
              
              toolsToUse = mapManipulationTools;
            }
            
            console.log("Sending initial session instructions and tool definitions.");
            try {
                dataChannel.send(JSON.stringify({
                    type: "session.update",
                    session: {
                        instructions: initialInstructions,
                        tools: toolsToUse,
                        tool_choice: "auto", // Let the AI decide when to use tools
                        input_audio_transcription: {
                            model: "whisper-1"
                        },
                        turn_detection: {
                            type: "server_vad",
                            threshold: 0.5,        // Lower = less sensitive (0.0 to 1.0)
                            prefix_padding_ms: 300, // Keep 300ms before speech starts
                            silence_duration_ms: 2000 // Wait 2 seconds of silence before ending turn
                        }
                    }
                }));
            } catch (e) {
                console.error("Error sending session.update with tools:", e);
            }
            // Trigger initial AI response for node feature conversation
            if (isNodeFeatureMode && activeFeatureNode && activeFeatureType) {
                console.log("Requesting initial AI response for node feature mode.");
                isWaitingForAIResponse = true;
                try {
                    dataChannel.send(JSON.stringify({ type: "response.create" }));
                } catch (error) {
                    console.error("Error sending initial response.create:", error);
                    isWaitingForAIResponse = false;
                }
            }
            // Trigger initial AI response for learning objective mode
            if (isLearningObjectiveMode && activeLearningObjectiveNode) {
                console.log("Requesting initial AI response for learning objective mode.");
                isWaitingForAIResponse = true;
                try {
                    dataChannel.send(JSON.stringify({ type: "response.create" }));
                } catch (error) {
                    console.error("Error sending initial response.create:", error);
                    isWaitingForAIResponse = false;
                }
            }
          }
          break;
        
        case 'session.updated':
            console.log('Server: Session has been updated:', data.session);
            // You could re-capture tree state here if instructions depended on it and were re-sent by another client, 
            // but for now, just logging is fine.
            break;
        
        case 'response.message.delta':
          if (data.delta && data.delta.content) {
            console.log('Received content delta (response.message.delta):', data.delta.content);
            processTextData(data.delta.content);
          }
          break;
          
        case 'response.message.completed':
          if (data.message && data.message.content) {
            console.log('Full response received (response.message.completed):', data.message.content);
          }
          break;
          
        case 'response.completed':
          console.log('Response completed');
          break;
          
        case 'response.error':
          console.error('Response error from AI. Setting isWaitingForAIResponse = false.', data.error);
          isWaitingForAIResponse = false;
          isActiveSpeechDetected = false; // Reset on error too
          showMessage('Response error: ' + data.error.message);
          break;
          
        case 'error':
          console.error('Error from OpenAI (dataChannel error event). Setting isWaitingForAIResponse = false.', data.error);
          isWaitingForAIResponse = false;
          isActiveSpeechDetected = false; // Reset on error too
          showMessage('Error from OpenAI: ' + data.error.message);
          break;
          
        case 'input_audio_transcription':
          console.log('Transcription:', data.transcription);
          
          // In node feature mode or learning objective mode, capture user transcription and send conversation for analysis
          if ((isNodeFeatureMode && activeFeatureNode && activeFeatureType) || 
              (isLearningObjectiveMode && activeLearningObjectiveNode)) {
            if (data.transcription) {
              console.log('CONVERSATION MODE: Capturing user transcription:', data.transcription);
              lastUserResponse = data.transcription;
              conversationHistory.push({
                role: 'user',
                message: data.transcription,
                timestamp: Date.now()
              });
              
              console.log('Conversation state after user speaks:', {
                lastAIResponse: lastAIResponse,
                lastUserResponse: lastUserResponse,
                conversationLength: conversationHistory.length,
                isNodeFeatureMode: isNodeFeatureMode,
                isLearningObjectiveMode: isLearningObjectiveMode,
                conversationHistory: conversationHistory
              });
              
              // Check if we should send for analysis after user speaks
              // We need to wait for the next AI response first before analyzing
              console.log('User spoke. Waiting for AI response before analysis.');
            }
          }
          break;
          
        case 'audio_buffer.serialized':
          // Audio response from OpenAI (we don't need to handle this)
          console.log('Received audio buffer');
          break;
          
        case 'audio.activity':
          // Voice activity detection events
          console.log('Voice activity event:', data.activity.type);
          break;
          
        case 'input_audio_buffer.speech_started':
          console.log('Speech detected in audio stream:', data);
          isActiveSpeechDetected = true; // SET TO TRUE
          break;
          
        case 'input_audio_buffer.speech_stopped':
          console.log('Server VAD: Speech stopped:', data);
          isActiveSpeechDetected = false; // SET TO FALSE
          break;

        case 'input_audio_buffer.committed':
          console.log('Server: Input audio committed:', data);
          break;

        case 'conversation.item.created':
          console.log('Server: Conversation item created:', data.item);
          if (data.item && data.item.role === 'user' && data.item.status === 'completed') {
            console.log("User's speech (audio item) has been fully committed.");
            
            // In node feature mode, handle conversation differently
            if (isNodeFeatureMode && activeFeatureNode && activeFeatureType) {
              // For node feature mode, just continue the conversation without map context
              const committedItemId = data.item.id;
              const aiInputContext = [
                { 
                  type: "item_reference", 
                  id: committedItemId 
                }
              ];

              if (dataChannel && dataChannel.readyState === 'open') {
                console.log("Sending response.create for node feature conversation.");
                isWaitingForAIResponse = true;
                try {
                  dataChannel.send(JSON.stringify({
                    type: "response.create",
                    response: {
                      input: aiInputContext
                    }
                  }));
                  textBuffer = ''; 
                } catch (e) {
                  console.error("Error sending response.create for node feature:", e);
                  isWaitingForAIResponse = false;
                }
              }
            } else {
              // Regular mode with map manipulation
            const currentTreeState = captureTreeState();
            const committedItemId = data.item.id;

            // Corrected aiInputContext structure
            const aiInputContext = [
              {
                type: "message",
                role: "system", 
                content: [
                  { type: "input_text", text: `Current concept map state: ${JSON.stringify(currentTreeState)}` }
                ]
              },
              // Reference the committed user audio item directly in the input array
              { 
                type: "item_reference", 
                id: committedItemId 
              }
            ];

            if (dataChannel && dataChannel.readyState === 'open') {
              console.log("Sending response.create to AI. Setting isWaitingForAIResponse = true.");
              isWaitingForAIResponse = true; // Set BEFORE sending response.create
              console.log("Sending response.create to AI with map context and user audio item reference (corrected structure).");
              try {
                dataChannel.send(JSON.stringify({
                  type: "response.create",
                  response: {
                    input: aiInputContext
                  }
                }));
                textBuffer = ''; 
              } catch (e) {
                console.error("Error sending response.create (corrected structure):", e);
                isWaitingForAIResponse = false; // Reset on error
                }
              }
            }
          } else if (data.item && data.item.role === 'assistant') {
            // console.log("Assistant item created/updated.");
          }
          break;

        case 'response.created':
          console.log('Server: Response generation created/started:', data.response);
          textBuffer = '';
          break;

        case 'rate_limits.updated':
          // console.log('Server: Rate limits updated:', data.rate_limits);
          break;

        case 'response.output_item.added':
          // console.log('Server: Response output item added:', data.item);
          break;

        case 'response.content_part.added':
          // console.log('Server: Response content part added:', data.part);
          break;

        case 'response.audio_transcript.delta':
          if (data.delta) {
            textBuffer += data.delta;
            // In node feature mode, we're just having a conversation, no JSON processing needed
            if (!isNodeFeatureMode) {
            // Simple check for potential JSON to pass to processTextData
            // Consider making processTextData more robust for streaming JSON or use response.done
            if (textBuffer.includes('{') && textBuffer.lastIndexOf('}') > textBuffer.indexOf('{')) {
                // console.log("Attempting to process textBuffer with potential JSON:", textBuffer);
                processTextData(textBuffer); 
              }
            }
          }
          break;
        
        case 'response.done': 
            console.log('Server: Response.done event. Setting isWaitingForAIResponse = false.', data.response);
            isWaitingForAIResponse = false; 
            isActiveSpeechDetected = false; // Also reset here, as a turn is complete

            // Unmute user microphone if recording is still active
            if (isRecording && stream) {
                stream.getAudioTracks().forEach(track => track.enabled = true);
                console.log("User microphone unmuted as AI finished speaking.");
            }

            if (data.response && data.response.output && data.response.output.length > 0) {
                const outputItem = data.response.output[0];
                if (outputItem.type === "function_call") {
                    const functionName = outputItem.name;
                    const callId = outputItem.call_id;
                    let args;
                    try {
                        args = JSON.parse(outputItem.arguments);
                    } catch (e) {
                        console.error("Error parsing function call arguments:", e, outputItem.arguments);
                        // Send error back to AI?
                        return;
                    }

                    console.log(`AI wants to call function: ${functionName} with ID: ${callId} and args:`, args);
                    let functionCallResult = { success: false, message: "Function not implemented or error occurred." };

                    if (functionName === "add_node_to_map") {
                        try {
                            // Recapture treeState for accurate positioning if AI doesn't provide X/Y
                            const currentTree = captureTreeState(); 
                            const defaultX = args.target_x !== undefined && args.target_x !== null ? args.target_x : currentTree.viewCenter.x + (Math.random() * 150 - 75);
                            const defaultY = args.target_y !== undefined && args.target_y !== null ? args.target_y : currentTree.viewCenter.y + (Math.random() * 150 - 75);
                            
                            const newNode = Nodes.createNode(
                                args.node_type || 'idea', // Default type if not provided
                                args.title,
                                defaultX,
                                defaultY,
                                args.content || '', // Default content if not provided
                                // Let createNode handle ID or use one from AI if you adapt definition
                            );
                            console.log("Node created locally:", newNode);
                            // Highlight new node (optional, example)
                            const nodeElement = document.querySelector(`[data-id="${newNode.id}"]`);
                            if (nodeElement) {
                                nodeElement.classList.add('appear');
                                setTimeout(() => nodeElement.classList.remove('appear'), 3000);
                            }
                            functionCallResult = { success: true, nodeId: newNode.id, title: newNode.title, message: "Node added successfully." };
                        } catch (error) {
                            console.error(`Error executing local function ${functionName}:`, error);
                            functionCallResult = { success: false, message: `Error in ${functionName}: ${error.message}` };
                        }
                    } else if (functionName === "connect_nodes") {
                        try {
                            const fromNode = Nodes.nodes.find(n => n.id === args.source_node_id);
                            const toNode = Nodes.nodes.find(n => n.id === args.target_node_id);
                            if (fromNode && toNode) {
                                const edgeExists = Edges.edges.some(e => 
                                    (e.from === fromNode.id && e.to === toNode.id) || 
                                    (e.from === toNode.id && e.to === fromNode.id)
                                );
                                if (!edgeExists) {
                                    Edges.edges.push({ from: fromNode.id, to: toNode.id });
                                    Edges.drawEdges();
                                    Nodes.scheduleAutosave(); // Assuming autosave handles edges too
                                    functionCallResult = { success: true, message: `Connected ${fromNode.title} to ${toNode.title}.` };
                                } else {
                                    functionCallResult = { success: false, message: "Edge already exists." };
                                }
                            } else {
                                functionCallResult = { success: false, message: "One or both nodes not found for connection." };
                            }
                        } catch (error) {
                            console.error(`Error executing local function ${functionName}:`, error);
                            functionCallResult = { success: false, message: `Error in ${functionName}: ${error.message}` };
                        }
                    } else if (functionName === "remove_node_by_id") {
                        try {
                            const nodeToRemove = Nodes.nodes.find(n => n.id === args.node_id);
                            if (nodeToRemove) {
                                Nodes.deleteNode(nodeToRemove.id); // Assumes Nodes.deleteNode handles redraw and autosave
                                functionCallResult = { success: true, message: `Node ${args.node_id} removed.` };
                            } else {
                                functionCallResult = { success: false, message: `Node with ID ${args.node_id} not found.` };
                            }
                        } catch (error) {
                            console.error(`Error executing local function ${functionName}:`, error);
                            functionCallResult = { success: false, message: `Error in ${functionName}: ${error.message}` };
                        }
                    } else if (functionName === "remove_edge") {
                        try {
                            const edgeIndex = Edges.edges.findIndex(e =>
                                (e.from === args.source_node_id && e.to === args.target_node_id) ||
                                (e.from === args.target_node_id && e.to === args.source_node_id)
                            );
                            if (edgeIndex > -1) {
                                Edges.edges.splice(edgeIndex, 1);
                                Edges.drawEdges();
                                Nodes.scheduleAutosave();
                                functionCallResult = { success: true, message: `Edge between ${args.source_node_id} and ${args.target_node_id} removed.` };
                            } else {
                                functionCallResult = { success: false, message: "Edge not found between the specified nodes." };
                            }
                        } catch (error) {
                            console.error(`Error executing local function ${functionName}:`, error);
                            functionCallResult = { success: false, message: `Error in ${functionName}: ${error.message}` };
                        }
                    } else if (functionName === "move_node") {
                        try {
                            const nodeToMove = Nodes.nodes.find(n => n.id === args.node_id);
                            const nodeElement = document.querySelector(`[data-id="${args.node_id}"]`);
                            if (nodeToMove && nodeElement) {
                                nodeElement.style.left = `${args.target_x}px`;
                                nodeElement.style.top = `${args.target_y}px`;
                                nodeElement.dataset.originalLeft = args.target_x;
                                nodeElement.dataset.originalTop = args.target_y;
                                // Update the node object if it stores position directly (assuming it does not for now based on captureTreeState)
                                Edges.drawEdges();
                                Nodes.scheduleAutosave();
                                functionCallResult = { success: true, message: `Node ${args.node_id} moved to (${args.target_x}, ${args.target_y}).` };
                            } else {
                                functionCallResult = { success: false, message: `Node with ID ${args.node_id} not found for moving.` };
                            }
                        } catch (error) {
                            console.error(`Error executing local function ${functionName}:`, error);
                            functionCallResult = { success: false, message: `Error in ${functionName}: ${error.message}` };
                        }
                    } else if (functionName === "update_node_title") {
                        try {
                            const nodeToUpdate = Nodes.nodes.find(n => n.id === args.node_id);
                            const nodeElement = document.querySelector(`[data-id="${args.node_id}"]`);
                            if (nodeToUpdate && nodeElement) {
                                nodeToUpdate.title = args.new_title;
                                const titleElement = nodeElement.querySelector('.node-title'); // Assuming '.node-title' is the class for the title display
                                if (titleElement) {
                                    titleElement.textContent = args.new_title;
                                } else {
                                     // Fallback if specific title element isn't found, update a common text area or log
                                    const contentArea = nodeElement.querySelector('.node-content textarea, .node-header-title'); 
                                    if(contentArea) contentArea.textContent = args.new_title; // Or .value depending on element
                                    console.warn(`Node title element (.node-title) not found for ${args.node_id}, direct text update might be incomplete.`);
                                }
                                Nodes.scheduleAutosave();
                                functionCallResult = { success: true, message: `Node ${args.node_id} title updated to "${args.new_title}".` };
                            } else {
                                functionCallResult = { success: false, message: `Node with ID ${args.node_id} not found for renaming.` };
                            }
                        } catch (error) {
                            console.error(`Error executing local function ${functionName}:`, error);
                            functionCallResult = { success: false, message: `Error in ${functionName}: ${error.message}` };
                        }
                    } else {
                        console.warn(`Function ${functionName} is not implemented locally.`);
                        functionCallResult = { success: false, message: `Function ${functionName} not implemented.` };
                    }

                    // Send the result back to the AI
                    if (dataChannel && dataChannel.readyState === 'open') {
                        try {
                            dataChannel.send(JSON.stringify({
                                type: "conversation.item.create",
                                item: {
                                    type: "function_call_output",
                                    call_id: callId,
                                    output: JSON.stringify(functionCallResult) 
                                }
                            }));
                            console.log(`Function call output for ${callId} sent.`);

                            // Introduce a delay before asking for the next response
                            const DELAY_AFTER_FUNC_OUTPUT = 250; // milliseconds
                            console.log(`Delaying for ${DELAY_AFTER_FUNC_OUTPUT}ms before sending next response.create.`);
                            
                            setTimeout(() => {
                                if (dataChannel && dataChannel.readyState === 'open') {
                                    console.log("Sending new response.create after delay. Setting isWaitingForAIResponse = true.");
                                    isWaitingForAIResponse = true; // Set BEFORE sending the new response.create
                                    try {
                                        dataChannel.send(JSON.stringify({ type: "response.create" }));
                                    } catch (e) {
                                        console.error("Error sending response.create after function output & delay:", e);
                                        isWaitingForAIResponse = false; // Reset on error
                                    }
                                } else {
                                    console.warn("Data channel closed or not ready during delayed response.create after function output.");
                                    isWaitingForAIResponse = false; // Ensure reset if channel closed during timeout
                                }
                            }, DELAY_AFTER_FUNC_OUTPUT);

                        } catch (e) {
                            console.error("Error sending function call output:", e);
                            // If sending func output fails, we probably shouldn't try to send response.create
                            // isWaitingForAIResponse is already false from the start of response.done
                        }
                    }
                } else {
                    // Handle regular text/audio responses (existing logic)
                    let finalFullText = '';
                    const textOutputPart = outputItem.type === 'text_content' ? outputItem : (outputItem.content && outputItem.content.find(c => c.type === 'text'));
                    if (textOutputPart) {
                        finalFullText = textOutputPart.text;
                    } else {
                        const audioOutputPart = outputItem.type === 'audio_content' ? outputItem : (outputItem.content && outputItem.content.find(c => c.type === 'audio'));
                        if (audioOutputPart && audioOutputPart.transcript) {
                            finalFullText = audioOutputPart.transcript;
                            console.log("Using full transcript from audio part in response.done");
                        }
                    }
                    if (finalFullText) {
                        console.log("Final text/transcript from AI (non-function call) in response.done:", finalFullText);
                        
                        // In conversation modes, capture AI response for analysis
                        if ((isNodeFeatureMode && activeFeatureNode && activeFeatureType) || 
                            (isLearningObjectiveMode && activeLearningObjectiveNode)) {
                            console.log('CONVERSATION MODE: Capturing AI response:', finalFullText);
                            lastAIResponse = finalFullText;
                            conversationHistory.push({
                                role: 'assistant',
                                message: finalFullText,
                                timestamp: Date.now()
                            });
                            
                            console.log('AI response captured. Conversation state:', {
                                lastAIResponse: lastAIResponse,
                                lastUserResponse: lastUserResponse,
                                conversationLength: conversationHistory.length,
                                conversationHistory: conversationHistory
                            });
                            
                            // Smart analysis timing - only analyze when there's meaningful new content
                            conversationTurnsSinceLastAnalysis++;
                            
                            const timeSinceLastAnalysis = Date.now() - lastAnalysisTime;
                            const shouldAnalyze = (
                                conversationHistory.length >= 4 && // At least 2 exchanges
                                conversationTurnsSinceLastAnalysis >= 2 && // At least 2 new turns
                                timeSinceLastAnalysis > 10000 // At least 10 seconds since last analysis
                            ) || (
                                conversationHistory.length >= 8 // Or if conversation is getting long
                            );
                            
                            if (shouldAnalyze) {
                                console.log('CONDITIONS MET: Sending conversation for analysis', {
                                    conversationLength: conversationHistory.length,
                                    turnsSinceLastAnalysis: conversationTurnsSinceLastAnalysis,
                                    timeSinceLastAnalysis: timeSinceLastAnalysis
                                });
                                sendConversationForAnalysis();
                            } else {
                                console.log('CONDITIONS NOT MET: Accumulating more conversation', {
                                    conversationLength: conversationHistory.length,
                                    turnsSinceLastAnalysis: conversationTurnsSinceLastAnalysis,
                                    timeSinceLastAnalysis: timeSinceLastAnalysis
                                });
                            }
                        } else {
                        // processTextData(finalFullText); // We are moving away from parsing JSON from text
                        }
                        
                        textBuffer = ''; 
                    } else {
                        console.log("No clear final text or full transcript in non-function call response.done output.");
                    }
                }
            } else if (data.response && data.response.status !== 'completed') {
                console.log("Response.done status was not 'completed':", data.response.status, data.response.status_details);
            } else {
                 console.log("Response.done event, but no output or not structured as expected.", data.response);
            }
            break;

        // New handlers for assistant audio output
        case 'output_audio_buffer.started':
            console.log('Server: Assistant audio output started:', data);
            // Mute user microphone
            if (isRecording && stream) {
                stream.getAudioTracks().forEach(track => track.enabled = false);
                console.log("User microphone muted while AI is speaking.");
            }
            // Our pc.ontrack should handle playing this audio if needed.
            break;

        case 'response.audio.delta': // This is for WEBSOCKETS mostly. For WebRTC, ontrack is key.
            // console.log('Server: Assistant audio delta received (raw bytes for WebSockets):', data.delta ? data.delta.length : 0);
            // We don't need to process these bytes directly for WebRTC playback via <audio> element.
            break;

        case 'response.output_item.done':
            console.log('Server: Response output item done:', data);
            // This event might signal completion of a part of a response, like a function call object.
            // For now, primary logic is in response.done, but good to acknowledge this event.
            break;

        default:
          console.log('Unhandled message type:', data.type, data);
      }
    } catch (err) {
      console.error('Error processing message:', err, event.data);
    }
  };
  
  // Handle WebRTC connection errors
  peerConnection.onerror = (error) => {
    console.error('WebRTC connection error:', error);
    showMessage('WebRTC connection error: ' + error.message);
  };
  
  // Handle connection state changes
  peerConnection.onconnectionstatechange = () => {
    console.log('WebRTC connection state:', peerConnection.connectionState);
    if (peerConnection.connectionState === 'failed' || 
        peerConnection.connectionState === 'disconnected' || 
        peerConnection.connectionState === 'closed') {
      console.log(`WebRTC connection state: ${peerConnection.connectionState}. Setting isWaitingForAIResponse = false.`);
      isWaitingForAIResponse = false;
      isActiveSpeechDetected = false;
      showMessage('WebRTC connection ' + peerConnection.connectionState);
      
      // Log more detailed diagnostic information
      console.log('WebRTC connection failed with details:', {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        signalingState: peerConnection.signalingState,
        dataChannelState: dataChannel ? dataChannel.readyState : 'no data channel'
      });
      
      // For disconnected state, we can try to reconnect after a short delay
      if (peerConnection.connectionState === 'disconnected' && isRecording) {
        console.log('Attempting to recover from disconnection...');
        
        // Option 1: Try to stabilize the connection without full restart
        if (dataChannel && dataChannel.readyState === 'open') {
          // If data channel is still open, we might be able to recover
          console.log('Data channel still open, attempting to continue');
          return; // Don't stop recording yet, try to recover
        }
        
        // If recovery fails, stop recording
        stopRecording({ sendFinalBuffer: false });
      } else if (isRecording) {
        console.log(`WebRTC connection became ${peerConnection.connectionState}. Stopping recording.`);
        stopRecording({ sendFinalBuffer: false });
      }
    }
  };
  
  // Handle ICE candidates
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await sendIceCandidate(event.candidate);
    }
  };
  
  // Create and set local description (offer)
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  const model = 'gpt-4o-mini-realtime-preview';
  const response = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
      'Authorization': `Bearer ${openAIToken}`
    },
    body: peerConnection.localDescription.sdp
  });
  
  if (!response.ok) {
    throw new Error('Failed to send offer to OpenAI: ' + await response.text());
  }
  
  // Get the SDP answer from OpenAI (response is plain text SDP)
  const sdpAnswer = await response.text();
  
  // Set the remote description (answer)
  await peerConnection.setRemoteDescription(new RTCSessionDescription({
    type: 'answer',
    sdp: sdpAnswer
  }));
  
  console.log('WebRTC connection established');
}

// With the updated Realtime API, we no longer need to separately send ICE candidates
// The ICE candidates are handled automatically by the WebRTC stack
async function sendIceCandidate(candidate) {
  // The new API doesn't require sending ICE candidates separately
  // Keep this function for backward compatibility, but it's a no-op now
  console.log('ICE candidate generated (handled automatically):', candidate);
}

// Process text data from OpenAI to extract node operations
function processTextData(text) {
  textBuffer += text;
  
  // Try to extract JSON objects from the buffer
  try {
    // Look for JSON objects in the text
    const jsonStart = textBuffer.indexOf('{');
    const jsonEnd = textBuffer.lastIndexOf('}');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      // Extract the JSON string
      const jsonStr = textBuffer.substring(jsonStart, jsonEnd + 1);
      
      try {
        // Parse the JSON
        const update = JSON.parse(jsonStr);
        
        // Clear the buffer up to the end of the JSON
        textBuffer = textBuffer.substring(jsonEnd + 1);
        
        // Add the update to pending updates if it has the expected format
        if (update.action && update.data) {
          pendingNodeUpdates.push(update);
          
          // Schedule processing of node updates
          if (!currentModifications) {
            currentModifications = setTimeout(() => {
              processNodeUpdates();
              currentModifications = null;
            }, 100);
          }
        }
      } catch (err) {
        // Not valid JSON, wait for more data
      }
    }
  } catch (err) {
    console.error('Error processing text data:', err);
  }
}

// Build prompt for GPT-4o model based on tree state
function buildPrompt(treeState) {
  return `You are an assistant that helps users build a knowledge web by listening to their voice and updating the web in real-time.
  
  The current tree state is: ${JSON.stringify(treeState)}.
  
  As the user speaks, extract concepts they mention and organize them into nodes and connections.
  Respond in JSON format only with the following structure:
  {
    "action": "add_node" | "remove_node" | "add_edge" | "remove_edge" | "update",
    "data": {
      // For add_node:
      "id": "unique_id", 
      "type": "idea" | "task" | "challenge" | "motivator" | etc,
      "title": "node title",
      "content": "optional content",
      "position": { "x": number, "y": number }
      
      // For add_edge:
      "from": "source_node_id",
      "to": "target_node_id"
      
      // For remove_node:
      "id": "node_id_to_remove"
      
      // For remove_edge:
      "from": "source_node_id",
      "to": "target_node_id"
    }
  }
  
  For positions, use relative locations to existing nodes mentioned in the conversation.
  Add explanatory nodes if needed to connect concepts. Only output valid JSON.`;
}

// Process pending node updates
function processNodeUpdates() {
  if (pendingNodeUpdates.length === 0) return;
  
  pendingNodeUpdates.forEach(update => {
    try {
      const { action, data } = update;
      
      switch (action) {
        case 'add_node':
          nodeUpdateCounter++;
          const nodeId = data.id || `voice_node_${nodeUpdateCounter}`;
          
          // Calculate position if not provided
          const position = data.position || {
            x: treeState.viewCenter.x + (Math.random() * 400 - 200),
            y: treeState.viewCenter.y + (Math.random() * 400 - 200)
          };
          
          // Create the node
          const nodeObject = Nodes.createNode(
            data.type,
            data.title,
            position.x,
            position.y,
            data.content,
            nodeId
          );
          
          // Highlight new node
          const nodeElement = document.querySelector(`[data-id="${nodeObject.id}"]`);
          if (nodeElement) {
            nodeElement.classList.add('appear');
            setTimeout(() => {
              nodeElement.classList.remove('appear');
            }, 3000);
          }
          break;
          
        case 'add_edge':
          // Find node IDs
          const fromNode = Nodes.nodes.find(n => n.id === data.from);
          const toNode = Nodes.nodes.find(n => n.id === data.to);
          
          if (fromNode && toNode) {
            // Check if edge already exists
            const edgeExists = Edges.edges.some(e => 
              (e.from === fromNode.id && e.to === toNode.id) || 
              (e.from === toNode.id && e.to === fromNode.id)
            );
            
            if (!edgeExists) {
              // Add the edge
              Edges.edges.push({
                from: fromNode.id,
                to: toNode.id
              });
              Edges.drawEdges();
            }
          }
          break;
          
        case 'remove_node':
          const nodeToRemove = Nodes.nodes.find(n => n.id === data.id);
          if (nodeToRemove) {
            Nodes.deleteNode(nodeToRemove.id);
          }
          break;
          
        case 'remove_edge':
          Edges.edges = Edges.edges.filter(e => 
            !(e.from === data.from && e.to === data.to) && 
            !(e.from === data.to && e.to === data.from)
          );
          Edges.drawEdges();
          break;
      }
      
      // Save the new state
      Nodes.scheduleAutosave();
    } catch (err) {
      console.error('Error applying node update:', err);
    }
  });
  
  // Clear pending updates
  pendingNodeUpdates = [];
}

// Stop recording
function stopRecording(options = { sendFinalBuffer: true }) {
  // Check if we are in a state where stopping is relevant
  if (!isRecording && !elements.voiceRecordBtn.classList.contains('recording')) {
    // console.log("Stop recording called, but appears to be already stopped or never started.");
    return;
  }

  const wasActuallyRecording = isRecording; // Capture state before changing
  isRecording = false; // Primary flag to stop audio processing loop (onaudioprocess)

  console.log(`Stopping recording. Options: ${JSON.stringify(options)}. Was actively recording: ${wasActuallyRecording}`);

  elements.voiceRecordBtn.classList.remove('recording');
  stopWaveAnimation();
  // Note: showMessage can be delayed until after attempting to send the final signal or immediate cleanup

  // If we were recording and are supposed to send a final buffer
  if (options.sendFinalBuffer && wasActuallyRecording) {
    // The new strategy relies on periodic/silence-flush sends from sendAccumulatedAudio.
    // audioChunks are NOT explicitly flushed here anymore.
    // We only send the final signal with an empty payload.
    if (dataChannel && dataChannel.readyState === 'open') {
      console.log('Sending final signal (empty audio buffer).');
      try {
        // Corrected payload for final signal, REMOVING is_final
        dataChannel.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: "" // audio is direct empty string
          // is_final: true // REMOVED
        }));
        console.log('Sent final signal successfully.');
        showMessage('Voice recording stopped. Final signal sent.');
        setTimeout(cleanupResources, 250);
      } catch (err) {
        console.error('Error sending final signal:', err);
        showMessage('Voice recording stopped. Error sending final signal.');
        cleanupResources();
      }
    } else {
      const channelState = dataChannel ? dataChannel.readyState : 'null';
      console.log(`Cannot send final signal: dataChannel not open or not ready. State: ${channelState}`);
      showMessage(`Voice recording stopped. Data channel ${channelState}.`);
      cleanupResources();
    }
  } else {
    // Conditions for not sending final buffer:
    // 1. options.sendFinalBuffer was false
    // 2. We weren't actually recording (e.g., called stop on an already stopped instance)
    if (!wasActuallyRecording) {
      console.log("Stop recording: was not actively recording, so no final signal sent.");
    }
    if (wasActuallyRecording && !options.sendFinalBuffer){
        console.log("Stop recording: sendFinalBuffer option was false, no final signal sent.");
    }
    showMessage('Voice recording stopped.');
    cleanupResources(); // Cleanup immediately
  }
}

// Send conversation for node analysis
async function sendConversationForAnalysis() {
  if ((!isNodeFeatureMode || !activeFeatureNode || !activeFeatureType) && 
      (!isLearningObjectiveMode || !activeLearningObjectiveNode)) return;
  
  try {
    // Get node context
    let nodeData;
    let analysisType;
    
    if (isNodeFeatureMode && activeFeatureNode && activeFeatureType) {
      nodeData = {
        id: activeFeatureNode.dataset.id,
        title: activeFeatureNode.querySelector('.node-title').textContent,
        type: activeFeatureNode.dataset.type,
        content: activeFeatureNode.querySelector('.node-content textarea')?.value || ''
      };
      analysisType = 'node_feature';
    } else if (isLearningObjectiveMode && activeLearningObjectiveNode) {
      nodeData = {
        id: activeLearningObjectiveNode.dataset.id,
        title: activeLearningObjectiveNode.querySelector('.node-title').textContent,
        type: activeLearningObjectiveNode.dataset.type,
        content: activeLearningObjectiveNode.querySelector('.node-content textarea')?.value || ''
      };
      analysisType = 'learning_objective';
    }
    
    // Get comprehensive tree context
    const connectedNodes = getConnectedNodes(nodeData.id);
    const currentMapState = captureTreeState();
    
    // Get detailed node information including content and relationships
    const allNodesDetailed = Nodes.nodes.map(node => ({
      id: node.id,
      title: node.title,
      content: node.content,
      type: node.type,
      position: {
        x: parseFloat(node.element?.dataset.originalLeft || node.element?.style.left || 0),
        y: parseFloat(node.element?.dataset.originalTop || node.element?.style.top || 0)
      }
    }));
    
    // Get all edges for relationship context
    const allEdges = Edges.edges.map(edge => ({
      from: edge.from,
      to: edge.to,
      fromTitle: Nodes.nodes.find(n => n.id === edge.from)?.title || 'Unknown',
      toTitle: Nodes.nodes.find(n => n.id === edge.to)?.title || 'Unknown'
    }));
    
    // Prepare comprehensive conversation data
    const conversationData = {
      node_data: nodeData,
      analysis_type: analysisType,
      feature_type: isNodeFeatureMode ? activeFeatureType : null,
      connected_nodes: connectedNodes,
      map_state: {
        ...currentMapState,
        all_nodes: allNodesDetailed,
        all_edges: allEdges,
        total_nodes: allNodesDetailed.length,
        total_edges: allEdges.length
      },
      conversation_history: conversationHistory, // Send full conversation now
      analysis_context: {
        turns_since_last_analysis: conversationTurnsSinceLastAnalysis,
        conversation_length: conversationHistory.length,
        last_analysis_time: lastAnalysisTime
      }
    };
    
    console.log('Sending conversation for analysis:', conversationData);
    
    // Send to backend for analysis
    const response = await fetch('/ai/analyze_conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversationData)
    });
    
    console.log('Backend response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Backend analysis result:', result);
      
      // Process any nodes the backend suggests
      if (result.suggested_nodes && result.suggested_nodes.length > 0) {
        console.log(`Processing ${result.suggested_nodes.length} suggested nodes:`, result.suggested_nodes);
        await processBackendNodeSuggestions(result.suggested_nodes, nodeData.id);
      } else {
        console.log('No nodes suggested by backend');
      }
      
      console.log('Conversation analysis complete');
    } else {
      const errorText = await response.text();
      console.error('Error sending conversation for analysis:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('Error in sendConversationForAnalysis:', error);
  }
  
  // Update analysis tracking
  console.log('Analysis complete. Updating tracking variables.');
  lastAnalysisTime = Date.now();
  conversationTurnsSinceLastAnalysis = 0;
}

// Process node suggestions from backend
async function processBackendNodeSuggestions(suggestedNodes, originalNodeId) {
  for (const nodeInfo of suggestedNodes) {
    try {
      console.log(`Processing backend suggestion (${nodeInfo.action}):`, nodeInfo);
      
      if (nodeInfo.action === 'create') {
        // Calculate position near the original node
        const originalNode = getNodeById(originalNodeId);
        const position = calculatePositionNearNode(originalNode);
        
        // Create the new node
        const newNode = Nodes.createNode(
          nodeInfo.node_type || 'idea',
          nodeInfo.title,
          position.x,
          position.y,
          nodeInfo.content || ''
        );
        
        if (newNode && newNode.id) {
          console.log(`Created new node: ${newNode.title} (${newNode.id})`);
          
          // Add visual feedback for new node
          const nodeElement = document.querySelector(`[data-id="${newNode.id}"]`);
          if (nodeElement) {
            nodeElement.classList.add('appear');
            setTimeout(() => nodeElement.classList.remove('appear'), 3000);
          }
          
          // Create connections as specified
          for (const connectionId of nodeInfo.connections || [originalNodeId]) {
            const targetNode = getNodeById(connectionId);
            if (targetNode) {
              const edgeExists = Edges.edges.some(e => 
                (e.from === newNode.id && e.to === connectionId) || 
                (e.from === connectionId && e.to === newNode.id)
              );
              
              if (!edgeExists) {
                Edges.edges.push({ from: newNode.id, to: connectionId });
                console.log(`Created edge from ${newNode.id} to ${connectionId}`);
              }
            }
          }
        }
        
      } else if (nodeInfo.action === 'update' && nodeInfo.node_id) {
        // Update existing node
        const existingNode = getNodeById(nodeInfo.node_id);
        if (existingNode) {
          console.log(`Updating existing node: ${nodeInfo.node_id}`);
          
          // Update title if provided
          if (nodeInfo.title && nodeInfo.title !== existingNode.title) {
            existingNode.title = nodeInfo.title;
            const titleElement = existingNode.element?.querySelector('.node-title');
            if (titleElement) {
              titleElement.textContent = nodeInfo.title;
            }
            console.log(`Updated title to: ${nodeInfo.title}`);
          }
          
          // Update content if provided
          if (nodeInfo.content && nodeInfo.content !== existingNode.content) {
            existingNode.content = nodeInfo.content;
            const contentElement = existingNode.element?.querySelector('.node-content textarea');
            if (contentElement) {
              contentElement.value = nodeInfo.content;
            }
            console.log(`Updated content`);
          }
          
          // Add visual feedback for updated node
          if (existingNode.element) {
            existingNode.element.classList.add('updated');
            setTimeout(() => existingNode.element.classList.remove('updated'), 2000);
          }
          
          // Handle new connections
          for (const connectionId of nodeInfo.connections || []) {
            const targetNode = getNodeById(connectionId);
            if (targetNode) {
              const edgeExists = Edges.edges.some(e => 
                (e.from === nodeInfo.node_id && e.to === connectionId) || 
                (e.from === connectionId && e.to === nodeInfo.node_id)
              );
              
              if (!edgeExists) {
                Edges.edges.push({ from: nodeInfo.node_id, to: connectionId });
                console.log(`Created edge from updated node ${nodeInfo.node_id} to ${connectionId}`);
              }
            }
          }
        } else {
          console.warn(`Node to update not found: ${nodeInfo.node_id}`);
        }
      }
      
    } catch (error) {
      console.error('Error processing node suggestion:', error, nodeInfo);
    }
  }
  
  // Redraw edges and save
  Edges.drawEdges();
  Nodes.scheduleAutosave();
  
  console.log('Backend node suggestions processed');
}

// Clean up all resources
function cleanupResources() {
  // Clear the ping interval
  // if (pingInterval) {
  //   clearInterval(pingInterval);
  //   pingInterval = null;
  // }

  // Close WebRTC connection
  if (peerConnection) {
    // Close data channel
    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }
    
    // Close peer connection
    peerConnection.close();
    peerConnection = null;
  }
      
  // Stop audio stream
      if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('Audio track stopped');
    });
        stream = null;
      }
  
  // Clean up other resources
  if (audioContext) {
    audioContext.close().then(() => console.log('Audio context closed'));
      audioContext = null;
  }
  analyser = null;
    
  // Clear any pending timers
  if (currentModifications) {
    clearTimeout(currentModifications);
    currentModifications = null;
  }
  
  // Reset state variables
  openAIToken = null;
  textBuffer = '';
  audioChunks = [];
  silenceCounter = 0;
  
  // Clean up Learning Objective mode UI
  if (isLearningObjectiveMode && activeLearningObjectiveNode) {
    // Reset UI
    activeLearningObjectiveNode.classList.remove('voice-active');
    const statusIndicator = activeLearningObjectiveNode.querySelector('.learning-objective-status');
    if (statusIndicator) {
      statusIndicator.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
    }
  }
  
  // Reset Learning Objective mode variables
  isLearningObjectiveMode = false;
  activeLearningObjectiveNode = null;
  learningObjectiveSessionActive = false;
  
  // Reset node feature mode variables
  isNodeFeatureMode = false;
  activeFeatureNode = null;
  activeFeatureType = null;
  featureSessionActive = false;
  
  // Reset conversation tracking
  conversationHistory = [];
  lastAIResponse = '';
  lastUserResponse = '';
  conversationTurnsSinceLastAnalysis = 0;
  lastAnalysisTime = 0;
  
  console.log('Resources cleaned up');
}

// Capture the current state of the tree
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

// Start wave animation for recording visualization
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

// Stop wave animation
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