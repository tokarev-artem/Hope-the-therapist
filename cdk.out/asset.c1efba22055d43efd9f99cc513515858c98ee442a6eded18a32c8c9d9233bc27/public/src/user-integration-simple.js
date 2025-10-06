/**
 * Simple user integration that connects to your existing main.js
 * This will create user records and session data in DynamoDB
 */

// Simple user identification without complex modal
class SimpleUserIntegration {
  constructor(socket) {
    this.socket = socket;
    this.userId = null;
    this.userName = null;
    this.sessionId = null;
    this.sessionStartTime = null;
    
    this.initializeUser();
    this.setupSocketListeners();
  }

  /**
   * Initialize user identification
   */
  initializeUser() {
    // Check for existing user in localStorage
    const stored = localStorage.getItem('therapeuticWaveUser');
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        this.userId = userData.userId;
        this.userName = userData.userName;
        console.log('Found existing user:', this.userName || 'Anonymous');
        this.showWelcomeBack();
      } catch (error) {
        console.error('Error loading user data:', error);
        this.createNewUser();
      }
    } else {
      this.createNewUser();
    }
  }

  /**
   * Create a new user
   */
  createNewUser() {
    // Generate user ID
    this.userId = this.generateUserId();
    
    // Ask for name (optional)
    const userName = prompt('Welcome! What would you like to be called? (Optional - leave blank for anonymous)');
    this.userName = userName && userName.trim() ? userName.trim() : null;
    
    // Save user data
    this.saveUserData();
    
    // Send to server to create user record
    this.socket.emit('createUser', {
      userId: this.userId,
      userName: this.userName,
      isAnonymous: !this.userName
    });
    
    this.showWelcomeMessage();
  }

  /**
   * Save user data to localStorage
   */
  saveUserData() {
    const userData = {
      userId: this.userId,
      userName: this.userName,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('therapeuticWaveUser', JSON.stringify(userData));
      console.log('User data saved');
    } catch (error) {
      console.error('Error saving user data:', error);
    }
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
   * Show welcome message for new users
   */
  showWelcomeMessage() {
    const greeting = this.userName 
      ? `Welcome, ${this.userName}! Ready to begin your therapeutic journey?`
      : 'Welcome! Ready to begin your therapeutic session?';
    
    this.showNotification(greeting, 'welcome');
  }

  /**
   * Show welcome back message for returning users
   */
  showWelcomeBack() {
    const greeting = this.userName 
      ? `Welcome back, ${this.userName}! Ready to continue your progress?`
      : 'Welcome back! Ready to continue your therapeutic journey?';
    
    this.showNotification(greeting, 'welcome-back');
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'welcome-back' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(100, 181, 246, 0.9)'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 350px;
      backdrop-filter: blur(10px);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 0.5rem;">${message}</div>
      <div style="font-size: 0.8rem; opacity: 0.8;">User ID: ${this.userId.substring(0, 8)}...</div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide after 5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  /**
   * Setup socket listeners for database integration
   */
  setupSocketListeners() {
    // Listen for user creation confirmation
    this.socket.on('userCreated', (data) => {
      console.log('User created in database:', data);
    });

    // Listen for session start
    this.socket.on('sessionStarted', (data) => {
      console.log('Session started:', data);
      this.sessionId = data.sessionId;
      this.sessionStartTime = new Date().toISOString();
    });

    // Listen for session completed
    this.socket.on('sessionCompleted', (data) => {
      console.log('Session completed:', data);
      if (data.summary) {
        this.showNotification(`Session complete! ${data.summary}`, 'session-complete');
      }
    });
  }

  /**
   * Start a new session
   */
  startSession() {
    if (!this.userId) {
      console.error('No user ID available');
      return;
    }

    // Send session start to server
    this.socket.emit('startTherapySession', {
      userId: this.userId,
      initialEmotionalState: {
        initialMood: 5, // Default - could be collected from UI
        stressLevel: 5,
        anxietyLevel: 5,
        dominantEmotions: []
      }
    });
  }

  /**
   * End current session
   */
  endSession(transcript = '') {
    if (!this.sessionId) {
      console.log('No active session to end');
      return;
    }

    // Calculate session duration
    const duration = this.sessionStartTime 
      ? Math.floor((new Date() - new Date(this.sessionStartTime)) / 1000)
      : 0;

    console.log('Ending session with transcript length:', transcript.length);

    // Send session completion to server
    this.socket.emit('completeTherapySession', {
      sessionId: this.sessionId,
      userId: this.userId,
      transcript: transcript,
      finalEmotionalState: {
        initialMood: 5, // Default initial
        finalMood: 7, // Could be collected from UI
        stressLevel: 3,
        anxietyLevel: 3,
        calmingEffectiveness: 8
      },
      sessionMetrics: {
        duration: duration,
        sessionQuality: 8,
        engagementLevel: 9,
        responseTime: 250,
        interruptionCount: 0,
        silenceDuration: 0,
        voiceStressIndicators: {
          averagePitch: 200,
          pitchVariation: 50,
          speakingRate: 150,
          pauseFrequency: 0.3,
          volumeConsistency: 0.8
        }
      },
      userConsent: true // Could be collected from UI
    });

    this.sessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Get current user info
   */
  getUserInfo() {
    return {
      userId: this.userId,
      userName: this.userName,
      sessionId: this.sessionId,
      isSessionActive: !!this.sessionId
    };
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for socket to be available (defined in main.js)
  const initUserIntegration = () => {
    if (typeof socket !== 'undefined') {
      window.userIntegration = new SimpleUserIntegration(socket);
      console.log('User integration initialized');
      
      // Hook into existing start/stop buttons to manage sessions
      const startButton = document.getElementById('start');
      const stopButton = document.getElementById('stop');
      
      // Store conversation transcript
      let conversationTranscript = '';
      
      // Listen for text output to build transcript
      window.userIntegration.socket.on('textOutput', (data) => {
        if (data.content) {
          const speaker = data.role === 'USER' ? 'User' : 'Assistant';
          conversationTranscript += `${speaker}: ${data.content}\n`;
          console.log('Added to transcript:', `${speaker}: ${data.content}`);
        }
      });
      
      if (startButton) {
        startButton.addEventListener('click', () => {
          // Clear previous transcript
          conversationTranscript = '';
          
          // Start session when user starts streaming
          console.log('Starting therapy session...');
          window.userIntegration.startSession();
        });
      }
      
      if (stopButton) {
        stopButton.addEventListener('click', () => {
          // End session when user stops streaming with actual transcript
          console.log('Ending therapy session with transcript:', conversationTranscript);
          window.userIntegration.endSession(conversationTranscript || 'No conversation recorded');
        });
      }
      
      // Also listen for stream completion to auto-end sessions
      window.userIntegration.socket.on('streamComplete', () => {
        if (window.userIntegration.sessionId) {
          console.log('Stream completed, ending session automatically');
          window.userIntegration.endSession(conversationTranscript || 'Session completed automatically');
        }
      });
      
    } else {
      // Retry after 100ms if socket not ready
      setTimeout(initUserIntegration, 100);
    }
  };
  
  initUserIntegration();
});

// Make it available globally for testing
window.SimpleUserIntegration = SimpleUserIntegration;