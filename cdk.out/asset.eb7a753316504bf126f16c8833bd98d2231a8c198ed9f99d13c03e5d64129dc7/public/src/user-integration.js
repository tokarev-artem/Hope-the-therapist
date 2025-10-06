/**
 * Simple user integration that works with existing main.js
 * Just add this script to test the user modal
 */

import SimpleUserModal from './lib/user/SimpleUserModal.js';

// Initialize user modal when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing user modal...');
  
  // Create user modal
  const userModal = new SimpleUserModal();
  
  // Set completion callback
  userModal.onComplete = (userData) => {
    console.log('User modal completed:', userData);
    
    // Show welcome message
    showWelcomeMessage(userData);
    
    // You can integrate this with your existing socket connection here
    // For example:
    // socket.emit('userIdentified', userData);
  };
  
  // Show modal after a short delay
  setTimeout(() => {
    userModal.show();
  }, 500);
});

/**
 * Show welcome message after modal completion
 */
function showWelcomeMessage(userData) {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(100, 181, 246, 0.9);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    max-width: 300px;
    backdrop-filter: blur(10px);
  `;
  
  const greeting = userData.userName 
    ? `Welcome, ${userData.userName}!` 
    : 'Welcome to your therapeutic space!';
    
  const message = userData.isNew 
    ? 'Ready to begin your journey?' 
    : 'Ready to continue your progress?';
  
  welcomeDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 0.5rem;">${greeting}</div>
    <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
  `;
  
  document.body.appendChild(welcomeDiv);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (welcomeDiv.parentNode) {
      welcomeDiv.style.opacity = '0';
      welcomeDiv.style.transform = 'translateX(100%)';
      welcomeDiv.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        if (welcomeDiv.parentNode) {
          welcomeDiv.parentNode.removeChild(welcomeDiv);
        }
      }, 300);
    }
  }, 5000);
}

// Export for testing
window.testUserModal = () => {
  const userModal = new SimpleUserModal();
  userModal.onComplete = (userData) => {
    console.log('Test completed:', userData);
    showWelcomeMessage(userData);
  };
  userModal.show();
};