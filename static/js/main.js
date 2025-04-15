// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Dark mode toggle
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  
  // Check for saved theme preference or use device preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.innerHTML = '☀️';
  } else if (savedTheme === 'light') {
    body.classList.remove('dark-mode');
    themeToggle.innerHTML = '🌙';
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    body.classList.add('dark-mode');
    themeToggle.innerHTML = '☀️';
  } else {
    themeToggle.innerHTML = '🌙';
  }
  
  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
      themeToggle.innerHTML = '☀️';
      localStorage.setItem('theme', 'dark');
    } else {
      themeToggle.innerHTML = '🌙';
      localStorage.setItem('theme', 'light');
    }
  });
  
  // Create particles for hero section
  const particles = document.querySelector('.particles');
  if (particles) {
    createParticles();
  }
  
  // Initialize scroll animations
  initScrollAnimations();
});

// Create particles in the hero section
function createParticles() {
  const particles = document.querySelector('.particles');
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random position
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    
    // Random size
    const size = Math.random() * 5 + 2;
    
    // Random opacity
    const opacity = Math.random() * 0.5 + 0.3;
    
    // Set particle properties
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.opacity = opacity;
    
    // Random animation delay
    const delay = Math.random() * 5;
    particle.style.animationDelay = `${delay}s`;
    
    // Add floating animation
    particle.classList.add('floating');
    
    particles.appendChild(particle);
  }
}

// Initialize scroll animations
function initScrollAnimations() {
  // Get all elements with scroll-animation class
  const scrollElements = document.querySelectorAll('.scroll-animation, .timeline-item');
  
  const elementInView = (el, percentageScroll = 100) => {
    const elementTop = el.getBoundingClientRect().top;
    return (
      elementTop <= 
      ((window.innerHeight || document.documentElement.clientHeight) * (percentageScroll/100))
    );
  };
  
  const displayScrollElement = (element) => {
    element.classList.add('visible');
  };
  
  const hideScrollElement = (element) => {
    element.classList.remove('visible');
  };
  
  const handleScrollAnimation = () => {
    scrollElements.forEach((el) => {
      if (elementInView(el, 85)) {
        displayScrollElement(el);
      } else {
        hideScrollElement(el);
      }
    });
  };
  
  // Add scroll event listener
  window.addEventListener('scroll', () => {
    handleScrollAnimation();
  });
  
  // Trigger once on page load
  handleScrollAnimation();
}

// Add a little welcome animation
setTimeout(() => {
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    heroTitle.classList.add('pulsate');
  }
}, 2000); 