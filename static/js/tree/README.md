# SciWeb Tree Application - Modular Structure

This directory contains the modular version of the tree.js application, which has been split into logical modules for improved maintainability, readability, and organization.

## Module Structure

- **main.js**: Application entry point that imports and initializes all modules.
- **dom.js**: DOM element references, UI interactions, and message displays.
- **nodes.js**: Node creation, deletion, editing, and interaction functionality.
- **edges.js**: Edge/connection management and drawing.
- **panzoom.js**: Pan and zoom functionality for the canvas.
- **autosave.js**: Save/load tree state functionality.
- **ai.js**: AI assistant features, sidebar, and chat.
- **voice.js**: Voice recording and speech-to-node functionality.
- **utils.js**: Shared utility functions like color mapping, formatting, etc.

## Cursor Rule

Below is a reference guide for what code is in which file:

### main.js
- Imports all modules
- DOMContentLoaded event listener
- Initialization calls for all modules

### dom.js
- DOM element references in the `elements` object
- UI toggle functions (show/hide panels, overlays, etc)
- Status message display
- Form event handlers

### nodes.js
- Node state (nodes array, nextNodeId, etc.)
- `createNode()` function
- `deleteNode()` function
- Node editing interfaces
- Node drag functionality
- Tentative node creation/approval/dismissal
- Node position updates

### edges.js
- Canvas setup and manipulation
- Edge state (edges array, connectionStart, etc.)
- `drawEdges()` function
- Connection creation interfaces

### panzoom.js
- Pan and zoom state (scale, offset)
- Coordinate transformation functions (transform/untransform)
- Pan and zoom event handlers
- Keyboard shortcuts for navigation

### autosave.js
- Save/load tree state functionality
- Debounce logic for saving
- API calls for persistence

### ai.js
- AI assistant sidebar functionality
- Chat interface and message handling
- AI command parsing
- AI feature chat for nodes (challenge, enrich, explore)

### voice.js
- Minimalist voice recording button
- Recording wave animation inside the button
- (Optional) Speech-to-node functionality

### utils.js
- `getColorForType()`