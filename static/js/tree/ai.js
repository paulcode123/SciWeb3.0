// AI assistant functionality

import { elements, showMessage } from './dom.js';
import * as Nodes from './nodes.js';
import * as Utils from './utils.js';

// AI State
const OPENAI_API_KEY = 'sk-YOUR_SAMPLE_API_KEY_HERE'; // Replace with your actual key if using a real backend
const nodeTypes = ['motivator', 'task', 'challenge', 'idea', 'class', 'assignment', 'test', 'project', 'essay', 'image'];

// Set up AI assistant
export function setupAIAssistant() {
  // Toggle AI sidebar
  elements.aiToggleBtn.addEventListener('click', toggleAISidebar);
  elements.aiCloseBtn.addEventListener('click', toggleAISidebar);
  
  // Send message on button click
  elements.aiSendBtn.addEventListener('click', sendAIMessage);
  
  // Send message on Enter key press
  elements.aiInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendAIMessage();
    }
  });
}

// Toggle AI sidebar
export function toggleAISidebar() {
  elements.aiSidebar.classList.toggle('visible');
  elements.aiToggleBtn.classList.toggle('hidden'); // Hide toggle when sidebar is open
}

// Add message to chat box
export function addMessageToChat(message, type) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', type === 'user' ? 'user-message' : 'ai-message');
  messageDiv.innerHTML = message; // Use innerHTML to allow for code blocks
  elements.aiChatBox.appendChild(messageDiv);
  elements.aiChatBox.scrollTop = elements.aiChatBox.scrollHeight; // Scroll to bottom
}

// Handle sending message to AI
export function sendAIMessage() {
  const userInput = elements.aiInput.value.trim();
  if (!userInput) return;
  
  addMessageToChat(userInput, 'user');
  elements.aiInput.value = '';
  
  // Show thinking indicator
  addMessageToChat('🧠 Thinking...', 'ai');
  
  // Process AI request
  askAI(userInput);
}

// Mock OpenAI call and function parsing
export async function askAI(prompt) {
  // Remove thinking indicator
  elements.aiChatBox.removeChild(elements.aiChatBox.lastChild);
  
  // --- Mock API Call Simulation --- 
  // In a real app, you would make a fetch request here to your backend,
  // which would then call the OpenAI API.
  // For this example, we'll just parse commands directly.
  
  let response = "I couldn't understand that command. Try things like: \n`addNode(task, 'Finish homework')`\n`getNodeStructure()`\n`nodeInfo(1)`\n`editNode(1, 'New Title')`\n`deleteNode(1)`";
  // Update AI's understanding of node types
  response += `\nAvailable types: ${nodeTypes.join(', ')}`;
  let commandHandled = false;

  try {
    // Basic command parsing
    const commandMatch = prompt.match(/^(\w+)\((.*)\)$/);
    if (commandMatch) {
      const command = commandMatch[1];
      const argsStr = commandMatch[2];
      const args = argsStr.split(',').map(arg => arg.trim().replace(/['"]/g, '')); // Simple arg parsing

      switch (command) {
        case 'addNode':
          if (args.length >= 2) {
            const type = args[0];
            const name = args[1];
            // Validate type against known types
            if (!nodeTypes.includes(type)) {
              response = `Error: Invalid node type '${type}'. Available types: ${nodeTypes.join(', ')}`;
            } else {
              // Optional parentId (simplified) and info
              // const parentId = args.length > 2 ? args[2] : null;
              // const info = args.length > 3 ? args[3] : null;
              response = await aiAddNode(type, null, name, null);
              commandHandled = true;
            }
          } else {
            response = 'Error: `addNode` requires at least `type` and `name` arguments.';
          }
          break;
        case 'getNodeStructure':
          response = await aiGetNodeStructure();
          commandHandled = true;
          break;
        case 'nodeInfo':
          if (args.length >= 1) {
            response = await aiNodeInfo(args[0]);
            commandHandled = true;
          } else {
            response = 'Error: `nodeInfo` requires a `nodeId` argument.';
          }
          break;
        case 'editNode':
          if (args.length >= 2) {
            response = await aiEditNode(args[0], args[1]);
            commandHandled = true;
          } else {
            response = 'Error: `editNode` requires `nodeId` and `newInfo` (title) arguments.';
          }
          break;
        case 'deleteNode':
          if (args.length >= 1) {
            response = await aiDeleteNode(args[0]);
            commandHandled = true;
          } else {
            response = 'Error: `deleteNode` requires a `nodeId` argument.';
          }
          break;
      }
    }
  } catch (error) {
      console.error("AI Processing Error:", error);
      response = "An error occurred while processing your request.";
  }
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500)); 
  
  addMessageToChat(response, 'ai');
}

// Show AI feature chat interface for nodes
export function showAIFeatureChat(node, hoverPanel, featureType) {
  // Remove any existing AI chat interface
  const existingChat = document.querySelector('.ai-feature-chat');
  if (existingChat) {
    existingChat.remove();
  }

  // Create new AI chat interface
  const aiChat = document.createElement('div');
  aiChat.className = 'ai-feature-chat';
  aiChat.classList.add(`${featureType}-feature`);

  // Create chat header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'ai-feature-header';
  
  // Set header title based on feature type
  let headerTitle = '';
  switch(featureType) {
    case 'challenge':
      headerTitle = 'AI Challenge';
      break;
    case 'enrich':
      headerTitle = 'AI Enrichment';
      break;
    case 'explore':
      headerTitle = 'AI Explorer';
      break;
  }
  
  chatHeader.innerHTML = `
    <h4>${headerTitle}</h4>
    <button class="ai-feature-close"><i class="fas fa-times"></i></button>
  `;
  
  // Create chat content
  const chatContent = document.createElement('div');
  chatContent.className = 'ai-feature-content';
  
  // Add welcome message based on feature type
  let welcomeMessage = '';
  switch(featureType) {
    case 'challenge':
      welcomeMessage = `I can help challenge your knowledge about "${node.querySelector('.node-title').textContent}". What would you like me to quiz you on?`;
      break;
    case 'enrich':
      welcomeMessage = `I can help enrich your understanding of "${node.querySelector('.node-title').textContent}". What aspects would you like to explore further?`;
      break;
    case 'explore':
      welcomeMessage = `I can help you explore connections related to "${node.querySelector('.node-title').textContent}". What type of connections are you looking for?`;
      break;
  }
  
  // Add welcome message
  const welcomeMsg = document.createElement('div');
  welcomeMsg.className = 'ai-feature-message';
  welcomeMsg.textContent = welcomeMessage;
  chatContent.appendChild(welcomeMsg);
  
  // Create chat input area
  const inputArea = document.createElement('div');
  inputArea.className = 'ai-feature-input-area';
  inputArea.innerHTML = `
    <input type="text" class="ai-feature-input" placeholder="Type your question...">
    <button class="ai-feature-send"><i class="fas fa-paper-plane"></i></button>
  `;
  
  // Assemble the chat interface
  aiChat.appendChild(chatHeader);
  aiChat.appendChild(chatContent);
  aiChat.appendChild(inputArea);
  
  // Position the chat interface next to the hover panel
  const rect = hoverPanel.getBoundingClientRect();
  aiChat.style.top = rect.top + 'px';
  aiChat.style.left = (rect.right + 10) + 'px';
  
  // Add event listener for close button
  aiChat.querySelector('.ai-feature-close').addEventListener('click', function() {
    aiChat.remove();
  });
  
  // Add event listener for send button (no functionality, just UI)
  aiChat.querySelector('.ai-feature-send').addEventListener('click', function() {
    const input = aiChat.querySelector('.ai-feature-input');
    const message = input.value.trim();
    
    if (message) {
      // Add user message
      const userMsg = document.createElement('div');
      userMsg.className = 'ai-feature-message user-message';
      userMsg.textContent = message;
      chatContent.appendChild(userMsg);
      
      // Clear input
      input.value = '';
      
      // Simulate AI thinking
      const thinkingMsg = document.createElement('div');
      thinkingMsg.className = 'ai-feature-message thinking';
      thinkingMsg.textContent = 'Thinking...';
      chatContent.appendChild(thinkingMsg);
      
      // Scroll to bottom
      chatContent.scrollTop = chatContent.scrollHeight;
      
      // Simulate AI response after a delay
      setTimeout(() => {
        // Remove thinking message
        chatContent.removeChild(thinkingMsg);
        
        // Add AI response
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-feature-message';
        aiMsg.textContent = `This is a UI demo. In the real app, I would provide a helpful response about ${message} related to ${node.querySelector('.node-title').textContent}!`;
        chatContent.appendChild(aiMsg);
        
        // Scroll to bottom
        chatContent.scrollTop = chatContent.scrollHeight;
      }, 1000);
    }
  });
  
  // Add event listener for input keypress (Enter key)
  aiChat.querySelector('.ai-feature-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      aiChat.querySelector('.ai-feature-send').click();
    }
  });
  
  // Add the chat interface to the DOM
  document.body.appendChild(aiChat);
  
  // Focus the input
  setTimeout(() => {
    aiChat.querySelector('.ai-feature-input').focus();
  }, 100);
}

// AI command functions
async function aiAddNode(type, parentId, name, info) {
  try {
    // Get center of view
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Create the node
    Nodes.createNode(type, name, center.x, center.y);
    
    return `Successfully created a ${type} node named "${name}"`;
  } catch (error) {
    console.error("Error creating node:", error);
    return "Failed to create node due to an error.";
  }
}

async function aiGetNodeStructure() {
  try {
    const nodeStructure = Nodes.nodes.map(node => {
      return {
        id: node.id,
        type: node.type,
        title: node.title
      };
    });
    
    return `Current nodes: ${JSON.stringify(nodeStructure, null, 2)}`;
  } catch (error) {
    console.error("Error getting node structure:", error);
    return "Failed to get node structure due to an error.";
  }
}

async function aiNodeInfo(nodeId) {
  try {
    const node = Nodes.nodes.find(n => n.id === nodeId);
    if (!node) {
      return `No node found with ID ${nodeId}`;
    }
    
    return `Node ${nodeId}: ${JSON.stringify(node, null, 2)}`;
  } catch (error) {
    console.error("Error getting node info:", error);
    return "Failed to get node info due to an error.";
  }
}

async function aiEditNode(nodeId, newTitle) {
  try {
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (!nodeElement) {
      return `No node found with ID ${nodeId}`;
    }
    
    const titleElement = nodeElement.querySelector('.node-title');
    if (titleElement) {
      const oldTitle = titleElement.textContent;
      titleElement.textContent = newTitle;
      
      // Update title in nodes array
      const nodeObj = Nodes.nodes.find(n => n.id === nodeId);
      if (nodeObj) {
        nodeObj.title = newTitle;
      }
      
      // Schedule autosave
      Nodes.scheduleAutosave();
      
      return `Successfully updated node ${nodeId} title from "${oldTitle}" to "${newTitle}"`;
    } else {
      return `Failed to find title element for node ${nodeId}`;
    }
  } catch (error) {
    console.error("Error editing node:", error);
    return "Failed to edit node due to an error.";
  }
}

async function aiDeleteNode(nodeId) {
  try {
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (!nodeElement) {
      return `No node found with ID ${nodeId}`;
    }
    
    // Delete the node
    Nodes.deleteNode(nodeId);
    
    return `Successfully deleted node ${nodeId}`;
  } catch (error) {
    console.error("Error deleting node:", error);
    return "Failed to delete node due to an error.";
  }
} 