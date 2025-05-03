// Autosave and persistence functionality

import { showMessage } from './dom.js';
import * as Nodes from './nodes.js';
import * as Edges from './edges.js';
import * as Utils from './utils.js';

// Autosave state
let saveTimeout;
const SAVE_DELAY = 2000; // 2 seconds delay before saving

// Function to schedule autosave
export function scheduleAutosave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveTreeState, SAVE_DELAY);
}

// Function to save tree state
export async function saveTreeState() {
  // Get current user ID from localStorage
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.error('No user ID found');
    return;
  }

  // Prepare tree data - now properly capturing all node data from the DOM
  const treeData = {
    userId: userId,
    nodes: Array.from(document.querySelectorAll('.node')).map(nodeEl => {
      const nodeObj = Nodes.nodes.find(n => n.id === nodeEl.dataset.id);
      return {
        id: nodeEl.dataset.id,
        type: nodeEl.dataset.type,
        title: nodeEl.querySelector('.node-title').textContent,
        position: {
          x: parseInt(nodeEl.dataset.originalLeft || nodeEl.style.left),
          y: parseInt(nodeEl.dataset.originalTop || nodeEl.style.top)
        },
        dueDate: nodeEl.dataset.dueDate || null,
        content: nodeObj?.type === 'image' ? nodeObj.content : null
      };
    }),
    edges: Edges.edges.map(edge => ({
      from: edge.from,
      to: edge.to
    })),
    updatedAt: new Date().toISOString()
  };

  console.log('Saving tree state:', userId, treeData);

  try {
    // Send to server
    const response = await fetch('/api/Trees/' + userId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(treeData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', response.status, errorText);
      throw new Error(`Failed to save tree state: ${response.status}`);
    }

    console.log('Tree state saved successfully');
  } catch (error) {
    console.error('Error saving tree state:', error);
    showMessage('Error saving your web. Please try again later.');
  }
}

// Load tree state on page load
export async function loadTreeState() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.error('No user ID found');
    return;
  }

  try {
    const response = await fetch('/api/Trees/' + userId);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('No tree found for user, creating new tree...');
        // Create new tree for user with the userId as the document ID
        const newTree = {
          userId: userId,
          nodes: [],
          edges: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create a new document with a specific ID rather than letting Firebase generate one
        const createResponse = await fetch('/api/Trees/' + userId, {
          method: 'PUT', // PUT will create the document if it doesn't exist
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newTree)
        });
        
        if (!createResponse.ok) {
          throw new Error('Failed to create new tree');
        }
        
        console.log('New tree created successfully');
        
        // Return empty tree data
        return {
          nodes: [],
          edges: []
        };
      } else {
        throw new Error(`Failed to load tree state: ${response.status}`);
      }
    }

    const treeData = await response.json();
    
    // Clear existing nodes and edges
    Nodes.nodes.forEach(node => {
      if (node.element) node.element.remove();
      if (node.hoverPanel) node.hoverPanel.remove();
    });
    // Don't reassign the array, clear it in place instead
    Nodes.nodes.splice(0, Nodes.nodes.length);
    Edges.resetEdges();
    
    // Get the actual tree data from the response
    let actualTreeData = treeData;
    // Check if the response has the document ID as a key (Firebase format)
    if (treeData[userId]) {
      actualTreeData = treeData[userId];
    }

    // Recreate nodes if they exist
    if (actualTreeData.nodes && actualTreeData.nodes.length > 0) {
      let maxId = 0;
      actualTreeData.nodes.forEach(nodeData => {
        const nodeObject = Nodes.createNode(
          nodeData.type,
          nodeData.title,
          nodeData.position.x,
          nodeData.position.y,
          nodeData.content,
          nodeData.id // pass the saved id
        );
        
        // Set due date if it exists in the saved data
        if (nodeData.dueDate) {
          const nodeElement = nodeObject.element;
          nodeElement.dataset.dueDate = nodeData.dueDate;
          let dueDateElement = nodeElement.querySelector('.node-due-date');
          if (!dueDateElement) {
            dueDateElement = document.createElement('div');
            dueDateElement.className = 'node-due-date';
            nodeElement.appendChild(dueDateElement);
          }
          dueDateElement.textContent = `Due: ${Utils.formatDate(nodeData.dueDate)}`;
        }
        
        const idNum = parseInt(nodeData.id, 10);
        if (!isNaN(idNum) && idNum > maxId) {
          maxId = idNum;
        }
      });
      // Set nextNodeId to avoid ID collisions
      Nodes.setNextNodeId(maxId + 1);
    }

    // Recreate edges if they exist
    if (actualTreeData.edges && actualTreeData.edges.length > 0) {
      // Push each edge to the array instead of reassigning
      actualTreeData.edges.forEach(edge => {
        Edges.addEdge(edge);
      });
    }

    // Always draw edges after loading nodes and edges (or lack thereof)
    Edges.drawEdges();

  } catch (error) {
    console.error('Error loading tree state:', error);
  }
} 