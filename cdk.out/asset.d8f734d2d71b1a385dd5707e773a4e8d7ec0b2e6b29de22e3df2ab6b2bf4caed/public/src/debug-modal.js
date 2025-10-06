/**
 * Debug version of the user modal for troubleshooting
 * This version includes extensive logging and error handling
 */

export function createDebugModal() {
  console.log('🔧 Creating debug modal...');

  // Check if modal already exists
  if (document.getElementById('debug-user-modal')) {
    console.log('⚠️ Modal already exists, removing old one');
    document.getElementById('debug-user-modal').remove();
  }

  // Create modal HTML directly
  const modalHTML = `
    <div id="debug-user-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 20, 40, 0.95);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    ">
      <div style="
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 20px;
        padding: 2rem;
        max-width: 450px;
        width: 90%;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        color: white;
        text-align: center;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      ">
        <h2 style="
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">Welcome to Your Therapeutic Space</h2>
        
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 2rem 0;">
          A safe space for emotional support and mindfulness
        </p>
        
        <div id="modal-content">
          <div style="margin: 1rem 0;">
            <h3>How would you like to continue?</h3>
            
            <div class="option-card" data-type="anonymous" style="
              background: rgba(100,181,246,0.1);
              border: 2px solid #64b5f6;
              border-radius: 12px;
              padding: 1rem;
              margin: 1rem 0;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              text-align: left;
            ">
              <div style="font-size: 2rem; margin-right: 1rem;">🔒</div>
              <div>
                <h4 style="margin: 0 0 0.5rem 0; color: white;">Continue Anonymously</h4>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 0.9rem;">
                  Complete privacy - no personal information required
                </p>
              </div>
            </div>
            
            <div class="option-card" data-type="named" style="
              background: rgba(255,255,255,0.05);
              border: 2px solid rgba(255,255,255,0.1);
              border-radius: 12px;
              padding: 1rem;
              margin: 1rem 0;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              text-align: left;
            ">
              <div style="font-size: 2rem; margin-right: 1rem;">👋</div>
              <div>
                <h4 style="margin: 0 0 0.5rem 0; color: white;">Add Your Name</h4>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 0.9rem;">
                  Share your first name for a personalized experience
                </p>
              </div>
            </div>
            
            <div id="name-input" style="display: none; margin: 1rem 0; text-align: left;">
              <input type="text" id="user-name" placeholder="Enter your first name" style="
                width: 100%;
                padding: 0.75rem;
                border: 2px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                background: rgba(255,255,255,0.1);
                color: white;
                font-size: 1rem;
                box-sizing: border-box;
              ">
              <small style="
                display: block;
                margin-top: 0.5rem;
                color: rgba(255,255,255,0.6);
                font-size: 0.8rem;
              ">This helps personalize your experience</small>
            </div>
          </div>
        </div>
        
        <button id="continue-btn" style="
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 2rem 0 1rem 0;
        ">Continue</button>
        
        <div style="
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          border-left: 4px solid #64b5f6;
          color: rgba(255,255,255,0.8);
          font-size: 0.9rem;
        ">
          🔒 Your privacy is protected. All data is stored securely.
        </div>
      </div>
    </div>
  `;

  // Add to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log('✅ Modal HTML added to page');

  // Get modal element
  const modal = document.getElementById('debug-user-modal');
  if (!modal) {
    console.error('❌ Failed to find modal element after creation');
    return null;
  }

  // Show modal
  setTimeout(() => {
    modal.style.opacity = '1';
    const modalContent = modal.querySelector('div > div');
    if (modalContent) {
      modalContent.style.transform = 'scale(1)';
    }
    console.log('✅ Modal shown');
  }, 100);

  // Add event listeners
  let selectedType = 'anonymous';

  // Option selection
  modal.addEventListener('click', (e) => {
    const optionCard = e.target.closest('.option-card');
    if (optionCard) {
      console.log('🎯 Option selected:', optionCard.dataset.type);

      // Remove active styles from all cards
      modal.querySelectorAll('.option-card').forEach(card => {
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.borderColor = 'rgba(255,255,255,0.1)';
      });

      // Add active styles to selected card
      optionCard.style.background = 'rgba(100,181,246,0.1)';
      optionCard.style.borderColor = '#64b5f6';

      selectedType = optionCard.dataset.type;

      // Show/hide name input
      const nameInput = modal.querySelector('#name-input');
      if (nameInput) {
        nameInput.style.display = selectedType === 'named' ? 'block' : 'none';

        if (selectedType === 'named') {
          setTimeout(() => {
            const input = modal.querySelector('#user-name');
            if (input) input.focus();
          }, 100);
        }
      }
    }
  });

  // Continue button
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'continue-btn') {
      console.log('🚀 Continue button clicked');

      let userName = null;
      if (selectedType === 'named') {
        const nameInput = modal.querySelector('#user-name');
        userName = nameInput?.value.trim() || null;
        console.log('👤 User name:', userName || 'None provided');
      }

      // Generate user ID
      const userId = generateUserId();
      console.log('🆔 Generated user ID:', userId);

      // Save to localStorage
      const userData = {
        userId,
        userName,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      try {
        localStorage.setItem('therapeuticWaveUser', JSON.stringify(userData));
        console.log('💾 User data saved to localStorage');
      } catch (error) {
        console.error('❌ Failed to save user data:', error);
      }

      // Hide modal
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.remove();
        console.log('✅ Modal removed');
      }, 300);

      // Show success message
      showSuccessMessage(userData);

      // Call completion callback if provided
      if (window.onModalComplete) {
        window.onModalComplete(userData);
      }
    }
  });

  // Enter key in name input
  modal.addEventListener('keypress', (e) => {
    if (e.target.id === 'user-name' && e.key === 'Enter') {
      modal.querySelector('#continue-btn').click();
    }
  });

  console.log('✅ Event listeners added');
  return modal;
}

function generateUserId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showSuccessMessage(userData) {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(76, 175, 80, 0.9);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    max-width: 300px;
    backdrop-filter: blur(10px);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  const greeting = userData.userName
    ? `Welcome, ${userData.userName}!`
    : 'Welcome!';

  message.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 0.5rem;">${greeting}</div>
    <div style="font-size: 0.9rem; opacity: 0.9;">Ready to begin your therapeutic journey?</div>
    <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.5rem;">ID: ${userData.userId.substring(0, 8)}...</div>
  `;

  document.body.appendChild(message);

  setTimeout(() => {
    message.style.transform = 'translateX(0)';
  }, 100);

  setTimeout(() => {
    message.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 300);
  }, 5000);

  console.log('✅ Success message shown');
}

// Make it available globally for testing
window.createDebugModal = createDebugModal;