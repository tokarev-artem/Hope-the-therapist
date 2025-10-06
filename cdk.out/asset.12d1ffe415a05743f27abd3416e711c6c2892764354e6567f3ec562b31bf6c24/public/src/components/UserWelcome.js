/**
 * User welcome component with optional name input
 * Provides personalization while maintaining privacy
 */

import { userIdentification } from '../lib/user/UserIdentification.js';

export class UserWelcome {
  constructor(container) {
    this.container = container;
    this.isVisible = false;
    this.onComplete = null;

    this.createWelcomeUI();
    this.bindEvents();
  }

  /**
   * Create the welcome UI elements
   */
  createWelcomeUI() {
    this.welcomeOverlay = document.createElement('div');
    this.welcomeOverlay.className = 'welcome-overlay';
    this.welcomeOverlay.innerHTML = `
      <div class="welcome-modal">
        <div class="welcome-header">
          <h2>Welcome to Your Therapeutic Space</h2>
          <p class="welcome-subtitle">A safe space for emotional support and mindfulness</p>
        </div>
        
        <div class="welcome-content">
          <div class="user-type-selection">
            <h3>How would you like to continue?</h3>
            
            <div class="option-card anonymous-option active" data-type="anonymous">
              <div class="option-icon">🔒</div>
              <div class="option-content">
                <h4>Continue Anonymously</h4>
                <p>Complete privacy - no personal information required</p>
                <small>Your progress will be saved locally on this device</small>
              </div>
            </div>
            
            <div class="option-card personalized-option" data-type="personalized">
              <div class="option-icon">👋</div>
              <div class="option-content">
                <h4>Add a Personal Touch</h4>
                <p>Share your first name for a more personalized experience</p>
                <small>Still completely private - just helps with greetings</small>
              </div>
            </div>
          </div>
          
          <div class="name-input-section" style="display: none;">
            <label for="user-name">What would you like to be called?</label>
            <input type="text" id="user-name" placeholder="Enter your first name" maxlength="50">
            <small>This is only used for personalization and is stored locally</small>
          </div>
          
          <div class="returning-user-info" style="display: none;">
            <div class="returning-user-card">
              <div class="returning-icon">👋</div>
              <div class="returning-content">
                <h4>Welcome back!</h4>
                <p>We found your previous sessions. Continue where you left off?</p>
                <div class="user-stats">
                  <span class="stat">
                    <strong id="session-count">0</strong> sessions
                  </span>
                  <span class="stat">
                    <strong id="last-session">Never</strong> last visit
                  </span>
                </div>
              </div>
            </div>
            
            <div class="returning-options">
              <button type="button" class="btn-secondary" id="start-fresh">Start Fresh</button>
              <button type="button" class="btn-primary" id="continue-progress">Continue Progress</button>
            </div>
          </div>
        </div>
        
        <div class="welcome-actions">
          <button type="button" class="btn-primary" id="begin-session">Begin Session</button>
        </div>
        
        <div class="privacy-notice">
          <p>🔒 Your privacy is our priority. All data is encrypted and stored securely.</p>
        </div>
      </div>
    `;

    // Add CSS styles
    this.addWelcomeStyles();

    this.container.appendChild(this.welcomeOverlay);
  }

  /**
   * Add CSS styles for the welcome UI
   */
  addWelcomeStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .welcome-overlay {
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
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .welcome-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      .welcome-modal {
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 20px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        color: white;
        text-align: center;
      }

      .welcome-header h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.8rem;
        background: linear-gradient(135deg, #64b5f6, #42a5f5);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .welcome-subtitle {
        color: rgba(255,255,255,0.8);
        margin: 0 0 2rem 0;
        font-size: 1rem;
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

      .option-content h4 {
        margin: 0 0 0.5rem 0;
        color: white;
        font-size: 1.1rem;
      }

      .option-content p {
        margin: 0 0 0.25rem 0;
        color: rgba(255,255,255,0.8);
        font-size: 0.9rem;
      }

      .option-content small {
        color: rgba(255,255,255,0.6);
        font-size: 0.8rem;
      }

      .name-input-section {
        margin: 1.5rem 0;
        text-align: left;
      }

      .name-input-section label {
        display: block;
        margin-bottom: 0.5rem;
        color: white;
        font-weight: 500;
      }

      .name-input-section input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        background: rgba(255,255,255,0.1);
        color: white;
        font-size: 1rem;
        transition: border-color 0.3s ease;
      }

      .name-input-section input:focus {
        outline: none;
        border-color: #64b5f6;
      }

      .name-input-section input::placeholder {
        color: rgba(255,255,255,0.5);
      }

      .name-input-section small {
        display: block;
        margin-top: 0.5rem;
        color: rgba(255,255,255,0.6);
        font-size: 0.8rem;
      }

      .returning-user-card {
        background: rgba(76,175,80,0.1);
        border: 2px solid rgba(76,175,80,0.3);
        border-radius: 12px;
        padding: 1rem;
        margin: 1rem 0;
        display: flex;
        align-items: center;
        text-align: left;
      }

      .returning-icon {
        font-size: 2rem;
        margin-right: 1rem;
      }

      .returning-content h4 {
        margin: 0 0 0.5rem 0;
        color: #81c784;
      }

      .returning-content p {
        margin: 0 0 0.5rem 0;
        color: rgba(255,255,255,0.8);
      }

      .user-stats {
        display: flex;
        gap: 1rem;
      }

      .stat {
        color: rgba(255,255,255,0.7);
        font-size: 0.9rem;
      }

      .stat strong {
        color: #81c784;
      }

      .returning-options {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
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

      .welcome-actions {
        margin: 2rem 0 1rem 0;
      }

      .privacy-notice {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        border-left: 4px solid #64b5f6;
      }

      .privacy-notice p {
        margin: 0;
        color: rgba(255,255,255,0.8);
        font-size: 0.9rem;
      }

      @media (max-width: 600px) {
        .welcome-modal {
          padding: 1.5rem;
          margin: 1rem;
        }
        
        .returning-options {
          flex-direction: column;
        }
        
        .user-stats {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Option selection
    this.welcomeOverlay.addEventListener('click', (e) => {
      if (e.target.closest('.option-card')) {
        this.selectOption(e.target.closest('.option-card'));
      }
    });

    // Begin session button
    this.welcomeOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'begin-session') {
        this.beginSession();
      }
    });

    // Returning user options
    this.welcomeOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'continue-progress') {
        this.continueProgress();
      } else if (e.target.id === 'start-fresh') {
        this.startFresh();
      }
    });

    // Enter key in name input
    this.welcomeOverlay.addEventListener('keypress', (e) => {
      if (e.target.id === 'user-name' && e.key === 'Enter') {
        this.beginSession();
      }
    });
  }

  /**
   * Select user option (anonymous or personalized)
   */
  selectOption(optionCard) {
    // Remove active class from all options
    this.welcomeOverlay.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('active');
    });

    // Add active class to selected option
    optionCard.classList.add('active');

    // Show/hide name input based on selection
    const nameSection = this.welcomeOverlay.querySelector('.name-input-section');
    const isPersonalized = optionCard.dataset.type === 'personalized';

    nameSection.style.display = isPersonalized ? 'block' : 'none';

    if (isPersonalized) {
      // Focus on name input
      setTimeout(() => {
        const nameInput = this.welcomeOverlay.querySelector('#user-name');
        nameInput.focus();
      }, 100);
    }
  }

  /**
   * Show welcome screen
   */
  show(userContext = null) {
    const userInfo = userIdentification.getUserInfo();

    if (userInfo.isReturningUser && userContext) {
      this.showReturningUser(userContext);
    } else {
      this.showNewUser();
    }

    this.welcomeOverlay.classList.add('visible');
    this.isVisible = true;
  }

  /**
   * Show UI for returning users
   */
  showReturningUser(userContext) {
    const returningSection = this.welcomeOverlay.querySelector('.returning-user-info');
    const optionSection = this.welcomeOverlay.querySelector('.user-type-selection');

    // Update stats
    this.welcomeOverlay.querySelector('#session-count').textContent = userContext.user.totalSessions || 0;

    const lastSession = userContext.user.lastSessionDate;
    if (lastSession) {
      const daysAgo = userContext.user.daysSinceLastSession;
      if (daysAgo === 0) {
        this.welcomeOverlay.querySelector('#last-session').textContent = 'Today';
      } else if (daysAgo === 1) {
        this.welcomeOverlay.querySelector('#last-session').textContent = 'Yesterday';
      } else {
        this.welcomeOverlay.querySelector('#last-session').textContent = `${daysAgo} days ago`;
      }
    }

    returningSection.style.display = 'block';
    optionSection.style.display = 'none';
  }

  /**
   * Show UI for new users
   */
  showNewUser() {
    const returningSection = this.welcomeOverlay.querySelector('.returning-user-info');
    const optionSection = this.welcomeOverlay.querySelector('.user-type-selection');

    returningSection.style.display = 'none';
    optionSection.style.display = 'block';
  }

  /**
   * Continue with existing progress
   */
  continueProgress() {
    this.completeWelcome({
      action: 'continue',
      userInfo: userIdentification.getUserInfo()
    });
  }

  /**
   * Start fresh (clear previous data)
   */
  startFresh() {
    userIdentification.clearUserData();
    this.completeWelcome({
      action: 'fresh',
      userInfo: userIdentification.getUserInfo()
    });
  }

  /**
   * Begin session with current settings
   */
  beginSession() {
    const selectedOption = this.welcomeOverlay.querySelector('.option-card.active');
    const isPersonalized = selectedOption?.dataset.type === 'personalized';

    if (isPersonalized) {
      const nameInput = this.welcomeOverlay.querySelector('#user-name');
      const name = nameInput.value.trim();
      if (name) {
        userIdentification.setUserName(name);
      }
    }

    this.completeWelcome({
      action: 'begin',
      userInfo: userIdentification.getUserInfo()
    });
  }

  /**
   * Complete welcome process
   */
  completeWelcome(data) {
    this.hide();
    if (this.onComplete) {
      this.onComplete(data);
    }
  }

  /**
   * Hide welcome screen
   */
  hide() {
    this.welcomeOverlay.classList.remove('visible');
    this.isVisible = false;

    // Remove from DOM after animation
    setTimeout(() => {
      if (this.welcomeOverlay.parentNode) {
        this.welcomeOverlay.parentNode.removeChild(this.welcomeOverlay);
      }
    }, 300);
  }

  /**
   * Set completion callback
   */
  onWelcomeComplete(callback) {
    this.onComplete = callback;
  }
}