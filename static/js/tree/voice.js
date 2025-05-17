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
    startRecording();
  }
}

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
            const initialInstructions = 
              `You are a helpful assistant integrated into a real-time concept mapping application. 
              Your primary role is to help the user build and modify their concept map by listening to their voice. 
              Use the available tools (functions) to add new nodes, connect existing nodes, or modify the map based on the user's commands. 
              When adding a node, carefully consider the most appropriate 'node_type' (such as 'idea', 'task', 'question', 'challenge', 'motivator', or other relevant types based on context) and specify it. If the type is unclear, you can default to 'idea', but strive to use diverse types when appropriate. 
              Also consider the current map state to determine appropriate placement if not specified. 
              The current map state is: ${JSON.stringify(currentMapState)}. 
              Always aim to use a function call for map manipulations rather than just describing the action in text. Be conservative when adding new nodes; wait for clear, explicit instructions or substantial concepts to emerge from the user's speech before creating a node. Avoid creating nodes for every minor detail or fleeting thought. If unsure, wait for more context rather than adding a node prematurely.`;
            
            console.log("Sending initial session instructions and tool definitions.");
            try {
                dataChannel.send(JSON.stringify({
                    type: "session.update",
                    session: {
                        instructions: initialInstructions,
                        tools: mapManipulationTools,
                        tool_choice: "auto" // Let the AI decide when to use tools
                    }
                }));
            } catch (e) {
                console.error("Error sending session.update with tools:", e);
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
            const currentTreeState = captureTreeState();
            const committedItemId = data.item.id;

            // Corrected aiInputContext structure
            const aiInputContext = [
              {
                type: "message",
                role: "system", 
                content: [
                  { type: "input_text", text: `Current concept map state: ${JSON.stringify(currentTreeState)}` }
                  // The main system instructions about tools are already set via session.update earlier.
                  // We could add a briefer reminder here if needed, or rely on the session-level instructions.
                ]
              },
              // Reference the committed user audio item directly in the input array
              { 
                type: "item_reference", 
                id: committedItemId 
              }
              // If you wanted to also send the transcript as text (redundant if AI transcribes item_reference):
              // {
              //   type: "message",
              //   role: "user",
              //   content: [ { type: "input_text", text: user_transcript_if_available } ]
              // }
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
            // Simple check for potential JSON to pass to processTextData
            // Consider making processTextData more robust for streaming JSON or use response.done
            if (textBuffer.includes('{') && textBuffer.lastIndexOf('}') > textBuffer.indexOf('{')) {
                // console.log("Attempting to process textBuffer with potential JSON:", textBuffer);
                processTextData(textBuffer); 
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
                        // processTextData(finalFullText); // We are moving away from parsing JSON from text
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
      console.log('Sending final signal (empty audio buffer with is_final: true).');
      try {
        // Corrected payload for final signal, assuming is_final is still top-level here
        dataChannel.send(JSON.stringify({
          type: "input_audio_buffer.append",
          audio: "", // audio is direct empty string
          is_final: true
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