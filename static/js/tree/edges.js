// Edge management functionality

import { elements, toggleConnectionOverlay, showMessage } from './dom.js';
import * as Nodes from './nodes.js';
import * as Utils from './utils.js';
import * as PanZoom from './panzoom.js';

// Canvas and edges state
export let ctx;
export let edges = [];
export let connectionStart = null;
export let isConnecting = false;

// Initialize canvas for line drawing
export function setupCanvas() {
  ctx = elements.treeCanvas.getContext('2d');
  resizeCanvas();
}

// Function to reset edges array in place
export function resetEdges() {
  edges.splice(0, edges.length);
}

// Function to add an edge
export function addEdge(edge) {
  edges.push(edge);
}

// Resize canvas
export function resizeCanvas() {
  elements.treeCanvas.width = window.innerWidth;
  elements.treeCanvas.height = window.innerHeight;
  drawEdges();
}

// Draw edges between nodes
export function drawEdges() {
  // Make sure canvas covers the entire viewport
  elements.treeCanvas.width = window.innerWidth;
  elements.treeCanvas.height = window.innerHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, elements.treeCanvas.width, elements.treeCanvas.height);
  
  // Draw each edge
  edges.forEach(edge => {
    const fromNode = document.querySelector(`[data-id="${edge.from}"]`);
    const toNode = document.querySelector(`[data-id="${edge.to}"]`);
    
    if (fromNode && toNode) {
      // Get screen centers of nodes
      const fromRect = fromNode.getBoundingClientRect();
      const toRect   = toNode.getBoundingClientRect();
      const fromCenterX = fromRect.left + fromRect.width / 2;
      const fromCenterY = fromRect.top  + fromRect.height / 2;
      const toCenterX   = toRect.left   + toRect.width / 2;
      const toCenterY   = toRect.top    + toRect.height / 2;
      // Compute extra vertical offset 5% of the vertical length of the edge
      const extraY = toCenterY/10;
      const fromY = fromCenterY;
      const toY   = toCenterY + extraY;
      // Draw line from adjusted centers
      ctx.beginPath();
      ctx.moveTo(fromCenterX, fromY);
      ctx.lineTo(toCenterX,   toY);
      
      // Get node types for line color
      const fromType = fromNode.dataset.type;
      const toType = toNode.dataset.type;
      
      // Set line style based on node types and if it's tentative
      const gradient = ctx.createLinearGradient(
        fromCenterX, fromY,
        toCenterX,   toY
      );
      
      const fromColor = Utils.getColorForType(fromType);
      const toColor = Utils.getColorForType(toType);
      
      gradient.addColorStop(0, fromColor);
      gradient.addColorStop(1, toColor);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      
      // If it's a tentative edge, use dashed line
      if (edge.tentative) {
        ctx.setLineDash([5, 3]);
        ctx.globalAlpha = 0.6;
      } else {
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      }
      
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
    }
  });
}

// Start connection
export function startConnection(nodeId) {
  connectionStart = nodeId;
  isConnecting = true;
  toggleConnectionOverlay(true);
}

// End connection
export function endConnection() {
  connectionStart = null;
  isConnecting = false;
  toggleConnectionOverlay(false);
  drawEdges();
}

// Set up connection overlay click handler
export function setupConnectionOverlay() {
  elements.connectionOverlay.addEventListener('click', function(e) {
    const nodeElements = document.querySelectorAll('.node');
    let targetNode = null;
    
    for (const node of nodeElements) {
      const rect = node.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        targetNode = node;
        break;
      }
    }
    
    if (targetNode && targetNode.dataset.id !== connectionStart) {
      const newEdge = {
        from: connectionStart,
        to: targetNode.dataset.id
      };
      
      // Check if edge already exists
      const edgeExists = edges.some(edge => 
        edge.from === newEdge.from && edge.to === newEdge.to ||
        edge.from === newEdge.to && edge.to === newEdge.from
      );
      
      if (!edgeExists) {
        edges.push(newEdge);
        drawEdges();
        showMessage('Connection created!');
        Nodes.scheduleAutosave();
      }
    }
    
    endConnection();
  });
} 