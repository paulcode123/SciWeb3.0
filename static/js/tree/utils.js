// Utility functions

// Helper to get color for node type
export function getColorForType(type) {
  const colors = {
    'motivator': '#ff1a75',
    'task': '#4285F4',
    'challenge': '#FF9900',
    'class': '#8E44AD',
    'assignment': '#27AE60',
    'test': '#E74C3C',
    'project': '#16A085',
    'essay': '#F1C40F',
    'image': '#3498DB',
    'idea': '#00bcd4',
    'keyidea': '#9c27b0',
    'question': '#ff5722',
    'problemtype': '#009688'
  };
  
  return colors[type] || '#7f8c8d';
}

// Get icon class based on node type
export function getIconClass(type) {
  const iconClasses = {
    'motivator': 'fas fa-star',
    'task': 'fas fa-tasks',
    'challenge': 'fas fa-mountain',
    'idea': 'fas fa-lightbulb',
    'class': 'fas fa-graduation-cap',
    'assignment': 'fas fa-book',
    'test': 'fas fa-clipboard-check',
    'project': 'fas fa-project-diagram',
    'essay': 'fas fa-file-alt',
    'image': 'fas fa-image',
    'keyidea': 'fas fa-atom',
    'question': 'fas fa-question-circle',
    'problemtype': 'fas fa-puzzle-piece'
  };
  
  return iconClasses[type] || 'fas fa-circle';
}

// Capitalize a string
export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Format date
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Utility to normalize node/edge IDs to string
export function normalizeId(id) {
  return String(id);
} 