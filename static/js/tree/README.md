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
- **node_editor.js**: Provides a full-screen overlay for editing the node type library and lineup.

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

## node_editor.js

- Provides a full-screen overlay for editing the node type library and lineup.
- Accessed via a plus (+) icon in the left toolbar under the area select button.
- Features:
  - Hardcoded node type library (Motivator, Task, Challenge, Idea, Image, etc.).
  - Drag node types from the library into the lineup.
  - Create new node types and edit existing ones (name, color, icon, features, etc.).
  - Select any FontAwesome icon by name.
  - Edit features (name, description, icon, color, AI prompt) for each node type.
  - Save changes to the database by clicking the Save button.
  - Overlay blocks all interaction with the main tree page while open.

**How to use:**
- Click the plus (+) icon in the toolbar to open the node editor.
- Drag node types into the lineup or create new ones.
- Click a node type to edit its properties and features.
- Click Save to persist changes, or Cancel to discard.