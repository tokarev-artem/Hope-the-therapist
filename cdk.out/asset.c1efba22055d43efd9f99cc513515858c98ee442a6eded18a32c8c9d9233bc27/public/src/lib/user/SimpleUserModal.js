/**
 * Simple user identification modal that works with the existing app structure
 * Lightweight implementation that shows immediately on page load
 */

export class SimpleUserModal {
  constructor() {
    this.userId = null;
    this.userName = null;
    this.isVisible = false;
    this.onComplete = null;
    
    this.loadExistingUser();
    this.createModal();
  }

  /**
   * Load existing user from localStorage
   */
  loadExistingUser() {
    try {
      const stored = localStorage.getItem('therapeuticWaveUser');
      if (stored) {
        const userData = JSON.parse(stored);
        this.userId = userData.userId;
        this.userName = userData.userName;
        console.log('Found existing user:', this.userName || 'Anonymous');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  /**
   * Create and inject modal HTML
   */
  createModal() {
    // Create modal HTML
    const modalHTML = `
      <div id="user-modal" class="user-modal-overlay">
        <div class="user-modal">
          <div class="modal-header">
            <h2>Welcome to Your Therapeutic Space</h2>
            <p>A safe space for emotional support and mindfulness</p>
          </div>
          
          <div class="modal-content">
            ${this.userId ? this.getReturningUserHTML() : this.getNewUserHTML()}
          </div>
          
          <div class="modal-actions">
            <button id="modal-continue" class="btn-primary">Continue</button>
          </div>
          
          <div class="privacy-note">
            🔒 Your privacy is protected. All data is stored securely.
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add styles
    this.addStyles();
    
    // Bind events
    this.bindEvents();
  }

  /**
   * Get HTML for new users
   */
  getNewUserHTML() {
    return `
      <div class="user-options">
        <h3>How would you like to continue?</h3>
        
        <div class="option-card active" data-type="anonymous">
          <div class="option-icon">🔒</div>
          <div class="option-text">
            <h4>Continue Anonymously</h4>
            <p>Complete privacy - no personal information required</p>
          </div>
        </div>
        
        <div class="option-card" data-type="named">
          <div class="option-icon">👋</div>
          <div class="option-text">
            <h4>Add Your Name</h4>
            <p>Share your first name for a personalized experience</p>
          </div>
        </div>
        
        <div class="name-input" style="display: none;">
          <input type="text" id="user-name" placeholder="Enter your first name" maxlength="30">
          <small>This helps personalize your experience</small>
        </div>
      </div>
    `;
  }

  /**
   * Get HTML for returning users
   */
  getReturningUserHTML() {
    return `
      <div class="returning-user">
        <div class="welcome-back">
          <div class="welcome-icon">👋</div>
          <div class="welcome-text">
            <h3>Welcome back${this.userName ? ', ' + this.userName : ''}!</h3>
            <p>Ready to continue your therapeutic journey?</p>
          </div>
        </div>
        
        <div class="user-actions">
          <button type="button" class="btn-secondary" id="start-fresh">Start Fresh</button>
          <button type="button" class="btn-primary" id="continue-session">Continue</button>
        </div>
      </div>
    `;
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .user-modal-overlay {
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
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .user-modal-overlay.show {
        opacity: 1;
        visibility: visible;
      }

      .user-modal {
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 20px;
        padding: 2rem;
        max-width: 450px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        color: white;
        text-align: center;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }

      .user-modal-overlay.show .user-modal {
        transform: scale(1);
      }

      .modal-header h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.8rem;
        background: linear-gradient(135deg, #64b5f6, #42a5f5);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .modal-header p {
        color: rgba(255,255,255,0.8);
        margin: 0 0 2rem 0;
      }

      .option-card {
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
      }

      .option-card:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(100,181,246,0.5);
        transform: translateY(-2px);
      }

      .option-card.active {
        border-color: #64b5f6;
        background: rgba(100,181,246,0.1);
      }

      .option-icon {
        font-size: 2rem;
        margin-right: 1rem;
        flex-shrink: 0;
      }

      .option-text h4 {
        margin: 0 0 0.5rem 0;
        color: white;
      }

      .option-text p {
        margin: 0;
        color: rgba(255,255,255,0.8);
        font-size: 0.9rem;
      }

      .name-input {
        margin: 1rem 0;
        text-align: left;
      }

      .name-input input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        background: rgba(255,255,255,0.1);
        color: white;
        font-size: 1rem;
        transition: border-color 0.3s ease;
        box-sizing: border-box;
      }

      .name-input input:focus {
        outline: none;
        border-color: #64b5f6;
      }

      .name-input input::placeholder {
        color: rgba(255,255,255,0.5);
      }

      .name-input small {
        display: block;
        margin-top: 0.5rem;
        color: rgba(255,255,255,0.6);
        font-size: 0.8rem;
      }

      .returning-user {
        text-align: center;
      }

      .welcome-back {
        background: rgba(76,175,80,0.1);
        border: 2px solid rgba(76,175,80,0.3);
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1rem 0;
        display: flex;
        align-items: center;
      }

      .welcome-icon {
        font-size: 2.5rem;
        margin-right: 1rem;
      }

      .welcome-text {
        text-align: left;
      }

      .welcome-text h3 {
        margin: 0 0 0.5rem 0;
        color: #81c784;
      }

      .welcome-text p {
        margin: 0;
        color: rgba(255,255,255,0.8);
      }

      .user-actions {
        display: flex;
        gap: 1rem;
        margin: 1.5rem 0;
      }

      .btn-primary, .btn-secondary {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        flex: 1;
      }

      .btn-primary {
        background: linear-gradient(135deg, #64b5f6, #42a5f5);
        color: white;
      }

      .btn-primary:hover {
        background: linear-gradient(135deg, #42a5f5, #2196f3);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(66,165,245,0.4);
      }

      .btn-secondary {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 2px solid rgba(255,255,255,0.2);
      }

      .btn-secondary:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.3);
      }

      .modal-actions {
        margin: 2rem 0 1rem 0;
      }

      .privacy-note {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        border-left: 4px solid #64b5f6;
        color: rgba(255,255,255,0.8);
        font-size: 0.9rem;
      }

      @media (max-width: 600px) {
        .user-modal {
          padding: 1.5rem;
          margin: 1rem;
        }
        
        .user-actions {
          flex-direction: column;
        }
        
        .welcome-back {
          flex-direction: column;
          text-align: center;
        }
        
        .welcome-icon {
          margin: 0 0 1rem 0;
        }
        
        .welcome-text {
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    const modal = document.getElementById('user-modal');
    
    // Option selection
    modal.addEventListener('click', (e) => {
      if (e.target.closest('.option-card')) {
        this.selectOption(e.target.closest('.option-card'));
      }
    });

    // Continue button
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'modal-continue') {
        this.handleContinue();
      }
    });

    // Returning user actions
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'continue-session') {
        this.handleContinueSession();
      } else if (e.target.id === 'start-fresh') {
        this.handleStartFresh();
      }
    });

    // Enter key in name input
    modal.addEventListener('keypress', (e) => {
      if (e.target.id === 'user-name' && e.key === 'Enter') {
        this.handleContinue();
      }
    });
  }

  /**
   * Select option (anonymous or named)
   */
  selectOption(optionCard) {
    // Remove active class from all options
    document.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('active');
    });

    // Add active class to selected option
    optionCard.classList.add('active');

    // Show/hide name input
    const nameInput = document.querySelector('.name-input');
    const isNamed = optionCard.dataset.type === 'named';
    
    if (nameInput) {
      nameInput.style.display = isNamed ? 'block' : 'none';
      
      if (isNamed) {
        setTimeout(() => {
          const input = document.getElementById('user-name');
          if (input) input.focus();
        }, 100);
      }
    }
  }

  /**
   * Handle continue button
   */
  handleContinue() {
    const selectedOption = document.querySelector('.option-card.active');
    const isNamed = selectedOption?.dataset.type === 'named';
    
    let userName = null;
    if (isNamed) {
      const nameInput = document.getElementById('user-name');
      userName = nameInput?.value.trim() || null;
    }

    // Generate user ID if new user
    if (!this.userId) {
      this.userId = this.generateUserId();
    }

    // Save user data
    this.saveUser(userName);
    
    // Complete modal
    this.complete({
      userId: this.userId,
      userName: userName,
      isNew: !this.userName,
      action: 'continue'
    });
  }

  /**
   * Handle continue session for returning users
   */
  handleContinueSession() {
    this.complete({
      userId: this.userId,
      userName: this.userName,
      isNew: false,
      action: 'continue'
    });
  }

  /**
   * Handle start fresh for returning users
   */
  handleStartFresh() {
    // Clear existing data
    localStorage.removeItem('therapeuticWaveUser');
    
    // Generate new user ID
    this.userId = this.generateUserId();
    this.userName = null;
    
    this.complete({
      userId: this.userId,
      userName: null,
      isNew: true,
      action: 'fresh'
    });
  }

  /**
   * Generate unique user ID
   */
  generateUserId() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save user data to localStorage
   */
  saveUser(userName) {
    const userData = {
      userId: this.userId,
      userName: userName,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('therapeuticWaveUser', JSON.stringify(userData));
      console.log('User saved:', userName || 'Anonymous');
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  /**
   * Show modal
   */
  show() {
    const modal = document.getElementById('user-modal');
    if (modal) {
      this.isVisible = true;
      setTimeout(() => modal.classList.add('show'), 100);
    }
  }

  /**
   * Hide modal
   */
  hide() {
    const modal = document.getElementById('user-modal');
    if (modal) {
      modal.classList.remove('show');
      this.isVisible = false;
      
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
  }

  /**
   * Complete modal and call callback
   */
  complete(userData) {
    this.hide();
    
    if (this.onComplete) {
      this.onComplete(userData);
    }
  }

  /**
   * Set completion callback
   */
  onComplete(callback) {
    this.onComplete = callback;
  }
}

// Export for use
export default SimpleUserModal;