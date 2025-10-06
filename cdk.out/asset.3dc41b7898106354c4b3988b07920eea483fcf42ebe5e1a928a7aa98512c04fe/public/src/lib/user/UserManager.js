/**
 * User manager that integrates identification with the therapeutic interface
 * Handles user flow from welcome to session initialization
 */

import { userIdentification } from './UserIdentification.js';
import { UserWelcome } from '../components/UserWelcome.js';

export class UserManager {
  constructor(socket) {
    this.socket = socket;
    this.userWelcome = null;
    this.currentUser = null;
    this.userContext = null;
    
    this.initializeUser();
  }

  /**
   * Initialize user identification flow
   */
  async initializeUser() {
    try {
      // Get user info
      const userInfo = userIdentification.getUserInfo();
      
      // Request user context from server
      this.socket.emit('getUserContext', { userId: userInfo.userId });
      
      // Listen for user context response
      this.socket.on('userContextResponse', (context) => {
        this.userContext = context;
        this.showWelcomeIfNeeded(userInfo, context);
      });

      // Listen for session initialization
      this.socket.on('sessionInitialized', (data) => {
        this.handleSessionInitialized(data);
      });

    } catch (error) {
      console.error('Error initializing user:', error);
      this.showWelcomeScreen();
    }
  }

  /**
   * Show welcome screen if needed
   */
  showWelcomeIfNeeded(userInfo, context) {
    // Always show welcome for first-time users
    // For returning users, show if they haven't been greeted this session
    const shouldShowWelcome = !userInfo.isReturningUser || !sessionStorage.getItem('welcomeShown');
    
    if (shouldShowWelcome) {
      this.showWelcomeScreen(context);
    } else {
      // Skip welcome and initialize session directly
      this.initializeSession(userInfo);
    }
  }

  /**
   * Show welcome screen
   */
  showWelcomeScreen(context = null) {
    // Create welcome component
    this.userWelcome = new UserWelcome(document.body);
    
    // Set completion callback
    this.userWelcome.onWelcomeComplete((data) => {
      this.handleWelcomeComplete(data);
    });
    
    // Show welcome screen
    this.userWelcome.show(context);
  }

  /**
   * Handle welcome completion
   */
  handleWelcomeComplete(data) {
    console.log('Welcome completed:', data);
    
    // Mark welcome as shown for this session
    sessionStorage.setItem('welcomeShown', 'true');
    
    // Initialize session with user info
    this.initializeSession(data.userInfo);
    
    // Show personalized greeting
    this.showPersonalizedGreeting(data.userInfo);
  }

  /**
   * Initialize therapeutic session
   */
  initializeSession(userInfo) {
    console.log('Initializing session for:', userInfo.displayName);
    
    // Send user info to server for session initialization
    this.socket.emit('initializeSession', {
      userId: userInfo.userId,
      userName: userInfo.userName,
      isAnonymous: userInfo.isAnonymous,
      displayName: userInfo.displayName
    });
  }

  /**
   * Handle session initialization response
   */
  handleSessionInitialized(data) {
    console.log('Session initialized:', data);
    
    this.currentUser = data.userInfo;
    
    // Update UI with session data
    this.updateUIWithSessionData(data);
    
    // Show any recommendations or insights
    if (data.recommendations && data.recommendations.length > 0) {
      this.showRecommendations(data.recommendations);
    }
  }

  /**
   * Show personalized greeting
   */
  showPersonalizedGreeting(userInfo) {
    const greeting = this.userContext?.personalizedGreeting || 
                    `Welcome${userInfo.userName ? ', ' + userInfo.userName : ''}! Let's begin your therapeutic session.`;
    
    // Show greeting in UI (you can customize this based on your UI)
    this.showNotification(greeting, 'welcome', 5000);
  }

  /**
   * Update UI with session data
   */
  updateUIWithSessionData(data) {
    // Update user display name in UI
    const userDisplayElements = document.querySelectorAll('.user-display-name');
    userDisplayElements.forEach(element => {
      element.textContent = data.userInfo.displayName;
    });

    // Update session count if shown
    const sessionCountElements = document.querySelectorAll('.session-count');
    sessionCountElements.forEach(element => {
      element.textContent = data.userContext?.user.totalSessions || 0;
    });

    // Set recommended wave theme
    if (data.recommendedWaveTheme) {
      this.setWaveTheme(data.recommendedWaveTheme);
    }

    // Update progress indicators
    if (data.userContext?.recentProgress) {
      this.updateProgressIndicators(data.userContext.recentProgress);
    }
  }

  /**
   * Show recommendations to user
   */
  showRecommendations(recommendations) {
    const recommendationText = recommendations.join('. ');
    this.showNotification(
      `💡 Recommendations: ${recommendationText}`, 
      'recommendation', 
      8000
    );
  }

  /**
   * Set wave theme based on recommendation
   */
  setWaveTheme(theme) {
    // Dispatch event for wave interface to pick up
    document.dispatchEvent(new CustomEvent('setWaveTheme', {
      detail: { theme }
    }));
  }

  /**
   * Update progress indicators in UI
   */
  updateProgressIndicators(progress) {
    // Update mood trend indicator
    const moodTrendElement = document.querySelector('.mood-trend');
    if (moodTrendElement) {
      moodTrendElement.textContent = progress.moodTrend;
      moodTrendElement.className = `mood-trend ${progress.moodTrend}`;
    }

    // Update consistency score
    const consistencyElement = document.querySelector('.consistency-score');
    if (consistencyElement) {
      consistencyElement.textContent = Math.round(progress.consistencyScore * 100) + '%';
    }
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <p>${message}</p>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add styles if not already added
    this.addNotificationStyles();

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto-hide after duration
    const hideTimeout = setTimeout(() => {
      this.hideNotification(notification);
    }, duration);

    // Handle close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      clearTimeout(hideTimeout);
      this.hideNotification(notification);
    });
  }

  /**
   * Hide notification
   */
  hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Add notification styles
   */
  addNotificationStyles() {
    if (document.querySelector('#notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        background: rgba(0, 20, 40, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        padding: 1rem;
        color: white;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      }

      .notification.show {
        transform: translateX(0);
      }

      .notification-welcome {
        border-left: 4px solid #64b5f6;
      }

      .notification-recommendation {
        border-left: 4px solid #ffa726;
      }

      .notification-content {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
      }

      .notification-content p {
        margin: 0;
        flex: 1;
        line-height: 1.4;
      }

      .notification-close {
        background: none;
        border: none;
        color: rgba(255,255,255,0.7);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 1rem;
        transition: color 0.3s ease;
      }

      .notification-close:hover {
        color: white;
      }

      @media (max-width: 600px) {
        .notification {
          right: 10px;
          left: 10px;
          max-width: none;
          transform: translateY(-100%);
        }

        .notification.show {
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get user context
   */
  getUserContext() {
    return this.userContext;
  }

  /**
   * Handle session completion
   */
  handleSessionComplete(sessionData) {
    // Send completion data to server
    this.socket.emit('sessionComplete', {
      userId: this.currentUser.userId,
      ...sessionData
    });
  }

  /**
   * Export user data for privacy compliance
   */
  exportUserData() {
    return userIdentification.exportUserData();
  }

  /**
   * Clear all user data
   */
  clearUserData() {
    userIdentification.clearUserData();
    sessionStorage.removeItem('welcomeShown');
    
    // Reload page to restart with fresh user
    window.location.reload();
  }
}

// Export for use in main application
export default UserManager;