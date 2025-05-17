// node_editor.js
// Full-screen Node Editor Overlay for SciWeb Tree

// --- Local Storage Persistence for Node Types ---
function getNodeTypes() {
  try {
    const data = localStorage.getItem('sciweb_node_types');
    if (data) return JSON.parse(data);
    return null;
  } catch (e) {
    return null;
  }
}

function saveNodeTypes(nodeTypes) {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem('sciweb_node_types', JSON.stringify(nodeTypes));
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

const NODE_LIBRARY = [
  {
    id: 'motivator',
    name: 'Motivator',
    description: 'Represents your main goal or inspiration.',
    color: '#FFD700',
    icon: 'fa-star',
    features: [
      { name: 'Inspire', description: 'Motivational feature', icon: 'fa-bolt', color: '#FF9800', prompt: 'What inspires you?' }
    ]
  },
  {
    id: 'task',
    name: 'Task',
    description: 'A specific task to complete.',
    color: '#4CAF50',
    icon: 'fa-tasks',
    features: [
      { name: 'Checklist', description: 'Track subtasks', icon: 'fa-check-square', color: '#2196F3', prompt: 'List subtasks.' }
    ]
  },
  {
    id: 'challenge',
    name: 'Challenge',
    description: 'A challenge or obstacle.',
    color: '#F44336',
    icon: 'fa-mountain',
    features: [
      { name: 'Overcome', description: 'How to overcome', icon: 'fa-arrow-up', color: '#E91E63', prompt: 'How will you overcome this?' }
    ]
  },
  {
    id: 'idea',
    name: 'Idea',
    description: 'A new idea or insight.',
    color: '#FFEB3B',
    icon: 'fa-lightbulb',
    features: [
      { name: 'Brainstorm', description: 'Expand on idea', icon: 'fa-brain', color: '#9C27B0', prompt: 'Expand on this idea.' }
    ]
  },
  {
    id: 'image',
    name: 'Image',
    description: 'A node for images.',
    color: '#00BCD4',
    icon: 'fa-image',
    features: []
  }
];

let nodeTypes = [...NODE_LIBRARY];
let editingNodeType = null;

function createNodeEditorOverlay() {
  // Remove if already exists
  const existing = document.getElementById('node-editor-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'node-editor-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(30, 30, 40, 0.98)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'row';
  overlay.style.overflow = 'hidden';

  // Sidebar: Node Library
  const sidebar = document.createElement('div');
  sidebar.className = 'node-editor-sidebar';
  sidebar.style.width = '320px';
  sidebar.style.background = '#23233a';
  sidebar.style.padding = '32px 16px 16px 16px';
  sidebar.style.overflowY = 'auto';
  sidebar.style.display = 'flex';
  sidebar.style.flexDirection = 'column';

  const libTitle = document.createElement('h2');
  libTitle.textContent = 'Node Library';
  libTitle.style.color = '#fff';
  libTitle.style.marginBottom = '16px';
  sidebar.appendChild(libTitle);

  const libList = document.createElement('div');
  libList.className = 'node-library-list';
  nodeTypes.forEach(nt => {
    const item = document.createElement('div');
    item.className = 'node-library-item';
    item.draggable = true;
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '12px';
    item.style.background = '#2d2d4d';
    item.style.borderRadius = '8px';
    item.style.padding = '10px';
    item.style.marginBottom = '10px';
    item.style.cursor = 'grab';
    item.innerHTML = `<i class="fas ${nt.icon}" style="color:${nt.color};font-size:1.5em;"></i> <span style="color:#fff;">${nt.name}</span>`;
    item.addEventListener('click', () => openNodeTypeEditor(nt));
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('application/node-type', nt.id);
    });
    libList.appendChild(item);
  });
  sidebar.appendChild(libList);

  // Add new node type button
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ New Node Type';
  addBtn.className = 'node-editor-add-btn';
  addBtn.style.marginTop = '16px';
  addBtn.style.padding = '10px 20px';
  addBtn.style.background = '#4CAF50';
  addBtn.style.color = '#fff';
  addBtn.style.border = 'none';
  addBtn.style.borderRadius = '6px';
  addBtn.style.fontSize = '1em';
  addBtn.style.cursor = 'pointer';
  addBtn.addEventListener('click', () => openNodeTypeEditor(null));
  sidebar.appendChild(addBtn);

  overlay.appendChild(sidebar);

  // Main: Node Lineup (droppable area)
  const main = document.createElement('div');
  main.className = 'node-editor-main';
  main.style.flex = '1';
  main.style.display = 'flex';
  main.style.flexDirection = 'column';
  main.style.alignItems = 'center';
  main.style.justifyContent = 'center';
  main.style.position = 'relative';

  const lineupTitle = document.createElement('h2');
  lineupTitle.textContent = 'Node Lineup';
  lineupTitle.style.color = '#fff';
  lineupTitle.style.marginBottom = '24px';
  main.appendChild(lineupTitle);

  const lineup = document.createElement('div');
  lineup.className = 'node-lineup';
  lineup.style.display = 'flex';
  lineup.style.gap = '24px';
  lineup.style.minHeight = '120px';
  lineup.style.alignItems = 'center';
  lineup.style.background = 'rgba(255,255,255,0.05)';
  lineup.style.borderRadius = '12px';
  lineup.style.padding = '32px';
  lineup.style.marginBottom = '32px';
  lineup.style.minWidth = '600px';
  lineup.style.overflowX = 'auto';
  lineup.ondragover = e => e.preventDefault();
  lineup.ondrop = e => {
    e.preventDefault();
    const nodeTypeId = e.dataTransfer.getData('application/node-type');
    const nodeType = nodeTypes.find(nt => nt.id === nodeTypeId);
    if (nodeType) {
      addToLineup(nodeType);
    }
  };
  main.appendChild(lineup);

  // Save/Cancel buttons
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '16px';
  btnRow.style.marginTop = '24px';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'node-editor-save-btn';
  saveBtn.style.background = '#2196F3';
  saveBtn.style.color = '#fff';
  saveBtn.style.padding = '12px 32px';
  saveBtn.style.fontSize = '1.1em';
  saveBtn.style.border = 'none';
  saveBtn.style.borderRadius = '6px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.onclick = () => saveNodeTypesToDB();

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'node-editor-cancel-btn';
  cancelBtn.style.background = '#444';
  cancelBtn.style.color = '#fff';
  cancelBtn.style.padding = '12px 32px';
  cancelBtn.style.fontSize = '1.1em';
  cancelBtn.style.border = 'none';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.onclick = () => overlay.remove();

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  main.appendChild(btnRow);

  overlay.appendChild(main);

  document.body.appendChild(overlay);

  // Render initial lineup (could be loaded from DB)
  renderLineup(lineup);
}

function addToLineup(nodeType) {
  // Add a copy to the lineup (could be a separate array for lineup order)
  // For now, just append to nodeTypes if not present
  if (!nodeTypes.find(nt => nt.id === nodeType.id)) {
    nodeTypes.push({ ...nodeType });
    renderLineup(document.querySelector('.node-lineup'));
  }
}

function renderLineup(lineup) {
  lineup.innerHTML = '';
  nodeTypes.forEach(nt => {
    const item = document.createElement('div');
    item.className = 'lineup-node-type';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'center';
    item.style.background = '#23233a';
    item.style.borderRadius = '10px';
    item.style.padding = '18px 20px';
    item.style.minWidth = '120px';
    item.style.cursor = 'pointer';
    item.style.position = 'relative';
    item.innerHTML = `<i class="fas ${nt.icon}" style="color:${nt.color};font-size:2em;"></i><span style="color:#fff;margin-top:8px;">${nt.name}</span>`;
    item.onclick = () => openNodeTypeEditor(nt);
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove from lineup';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '6px';
    removeBtn.style.right = '8px';
    removeBtn.style.background = 'none';
    removeBtn.style.color = '#fff';
    removeBtn.style.border = 'none';
    removeBtn.style.fontSize = '1.2em';
    removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = e => {
      e.stopPropagation();
      nodeTypes = nodeTypes.filter(x => x.id !== nt.id);
      renderLineup(lineup);
    };
    item.appendChild(removeBtn);
    lineup.appendChild(item);
  });
}

function openNodeTypeEditor(nodeType) {
  // Modal for editing/creating node type
  let modal = document.getElementById('node-type-editor-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'node-type-editor-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.zIndex = '10000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  const form = document.createElement('form');
  form.className = 'node-type-editor-form';
  form.style.background = '#fff';
  form.style.borderRadius = '12px';
  form.style.padding = '32px 40px';
  form.style.display = 'flex';
  form.style.flexDirection = 'column';
  form.style.gap = '18px';
  form.style.minWidth = '400px';
  form.onsubmit = e => {
    e.preventDefault();
    const id = form.elements['id'].value.trim() || `custom_${Date.now()}`;
    const name = form.elements['name'].value.trim();
    const description = form.elements['description'].value.trim();
    const color = form.elements['color'].value;
    const icon = form.elements['icon'].value;
    const features = JSON.parse(form.elements['features'].value);
    const newType = { id, name, description, color, icon, features };
    // Update or add
    const idx = nodeTypes.findIndex(nt => nt.id === id);
    if (idx >= 0) nodeTypes[idx] = newType;
    else nodeTypes.push(newType);
    renderLineup(document.querySelector('.node-lineup'));
    modal.remove();
  };

  // Fields
  form.innerHTML = `
    <h2 style="margin-bottom:8px;">${nodeType ? 'Edit' : 'New'} Node Type</h2>
    <label>Name <input name="name" required value="${nodeType ? nodeType.name : ''}" style="width:100%;padding:6px;"></label>
    <label>Description <input name="description" value="${nodeType ? nodeType.description : ''}" style="width:100%;padding:6px;"></label>
    <label>Color <input name="color" type="color" value="${nodeType ? nodeType.color : '#888888'}" style="width:60px;height:32px;"></label>
    <label>Icon <input name="icon" value="${nodeType ? nodeType.icon : 'fa-star'}" style="width:100%;padding:6px;" list="fa-icons-list"></label>
    <datalist id="fa-icons-list">
      <option value="fa-star"><option value="fa-tasks"><option value="fa-mountain"><option value="fa-lightbulb"><option value="fa-image"><option value="fa-brain"><option value="fa-check-square"><option value="fa-bolt"><option value="fa-arrow-up">
    </datalist>
    <label>Features <button type="button" id="edit-features-btn" style="margin-left:8px;">Edit Features</button></label>
    <input name="features" type="hidden" value='${JSON.stringify(nodeType ? nodeType.features : [])}'>
    <input name="id" type="hidden" value="${nodeType ? nodeType.id : ''}">
    <div style="display:flex;gap:16px;margin-top:12px;">
      <button type="submit" style="background:#2196F3;color:#fff;padding:10px 24px;border:none;border-radius:6px;cursor:pointer;">Save</button>
      <button type="button" style="background:#aaa;color:#fff;padding:10px 24px;border:none;border-radius:6px;cursor:pointer;" onclick="this.closest('form').parentNode.remove()">Cancel</button>
    </div>
  `;

  // Feature editor
  form.querySelector('#edit-features-btn').onclick = () => openFeatureEditor(form);

  modal.appendChild(form);
  document.body.appendChild(modal);
}

function openFeatureEditor(form) {
  let modal = document.getElementById('feature-editor-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'feature-editor-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.zIndex = '10001';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  const features = JSON.parse(form.elements['features'].value);
  const container = document.createElement('div');
  container.style.background = '#fff';
  container.style.borderRadius = '12px';
  container.style.padding = '32px 40px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '18px';
  container.style.minWidth = '400px';

  const title = document.createElement('h3');
  title.textContent = 'Edit Features';
  container.appendChild(title);

  const list = document.createElement('div');
  features.forEach((f, i) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <input value="${f.name}" placeholder="Name" style="width:90px;">
      <input value="${f.description}" placeholder="Description" style="width:120px;">
      <input value="${f.icon}" placeholder="Icon" style="width:80px;" list="fa-icons-list">
      <input type="color" value="${f.color}" style="width:40px;">
      <input value="${f.prompt}" placeholder="Prompt" style="width:120px;">
      <button type="button">×</button>
    `;
    row.querySelector('button').onclick = () => {
      features.splice(i, 1);
      modal.remove();
      openFeatureEditor(form);
    };
    // Update on change
    row.querySelectorAll('input').forEach((input, idx) => {
      input.oninput = () => {
        if (idx === 0) f.name = input.value;
        if (idx === 1) f.description = input.value;
        if (idx === 2) f.icon = input.value;
        if (idx === 3) f.color = input.value;
        if (idx === 4) f.prompt = input.value;
        form.elements['features'].value = JSON.stringify(features);
      };
    });
    list.appendChild(row);
  });
  container.appendChild(list);

  // Add feature button
  const addBtn = document.createElement('button');
  addBtn.textContent = '+ Add Feature';
  addBtn.style.background = '#4CAF50';
  addBtn.style.color = '#fff';
  addBtn.style.padding = '8px 18px';
  addBtn.style.border = 'none';
  addBtn.style.borderRadius = '6px';
  addBtn.style.cursor = 'pointer';
  addBtn.onclick = () => {
    features.push({ name: '', description: '', icon: 'fa-star', color: '#888888', prompt: '' });
    modal.remove();
    openFeatureEditor(form);
  };
  container.appendChild(addBtn);

  // Done button
  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'Done';
  doneBtn.style.background = '#2196F3';
  doneBtn.style.color = '#fff';
  doneBtn.style.padding = '8px 18px';
  doneBtn.style.border = 'none';
  doneBtn.style.borderRadius = '6px';
  doneBtn.style.cursor = 'pointer';
  doneBtn.style.marginTop = '12px';
  doneBtn.onclick = () => {
    form.elements['features'].value = JSON.stringify(features);
    modal.remove();
  };
  container.appendChild(doneBtn);

  modal.appendChild(container);
  document.body.appendChild(modal);
}

function saveNodeTypesToDB() {
  // Save nodeTypes to DB (implement API call)
  saveNodeTypes(nodeTypes)
    .then(() => {
      alert('Node types saved!');
      document.getElementById('node-editor-overlay').remove();
    })
    .catch(err => alert('Error saving node types: ' + err));
}

// Add plus icon to nodes bar (left of tree page)
function addPlusIconToNodesBar() {
  const bar = document.querySelector('.tree-toolbar');
  if (!bar) return;
  // Find area select button
  const areaBtn = bar.querySelector('.btn-area-select');
  if (!areaBtn) return;
  // Insert after area select
  const plusBtn = document.createElement('button');
  plusBtn.className = 'tool-button btn-node-library';
  plusBtn.title = 'Edit Node Library';
  plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
  plusBtn.onclick = createNodeEditorOverlay;
  areaBtn.parentNode.insertBefore(plusBtn, areaBtn.nextSibling);
}

// On page load
window.addEventListener('DOMContentLoaded', () => {
  addPlusIconToNodesBar();
}); 