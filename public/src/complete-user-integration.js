/**
 * Complete user integration for the final POC
 * This will show the user input modal and properly store data in DynamoDB
 */

class CompleteUserIntegration {
  constructor(socket) {
    this.socket = socket;
    this.userId = null;
    this.userName = null;
    this.sessionId = null;
    this.sessionStartTime = null;
    this.conversationTranscript = '';
    this.creatingSession = false;

    this.init();
  }

  async init() {
    // Check for existing user data first
    this.checkForExistingUser();

    // Show user input modal immediately
    this.showUserInputModal();
    this.setupSocketListeners();
    this.setupConversationTracking();
  }

  checkForExistingUser() {
    try {
      const existingUserData = localStorage.getItem('therapeuticWaveUser');
      if (existingUserData) {
        const userData = JSON.parse(existingUserData);
        console.log('🔄 Found existing user data:', userData);

        // Pre-populate user info if available
        if (userData.userId) {
          this.userId = userData.userId;
        }
        if (userData.userName) {
          this.userName = userData.userName;
        }

        console.log('🔄 Restored user session:', {
          userId: this.userId,
          userName: this.userName
        });
      }
    } catch (error) {
      console.warn('Could not restore existing user data:', error);
    }
  }

  showUserInputModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'user-input-modal';
    modalOverlay.style.cssText = `
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    modalOverlay.innerHTML = `
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
      ">
        <h2 style="
          margin: 0 0 1rem 0;
          font-size: 1.8rem;
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">${this.userName ? `Welcome Back, ${this.userName}!` : 'Welcome to Your Therapeutic Space'}</h2>
        
        <p style="color: rgba(255,255,255,0.8); margin: 0 0 2rem 0;">
          ${this.userName ? 'Ready to continue your therapeutic journey?' : 'A safe space for emotional support and mindfulness'}
        </p>
        
        <div style="margin: 2rem 0;">
          <label style="
            display: block;
            margin-bottom: 0.5rem;
            color: white;
            font-weight: 500;
            text-align: left;
          ">What would you like to be called? (Optional)</label>
          
          <input type="text" id="user-name-input" placeholder="Enter your first name or leave blank for anonymous" style="
            width: 100%;
            padding: 0.75rem;
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            color: white;
            font-size: 1rem;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
          ">
          
          <small style="
            display: block;
            margin-top: 0.5rem;
            color: rgba(255,255,255,0.6);
            font-size: 0.8rem;
            text-align: left;
          ">This helps personalize your experience and is stored securely</small>
        </div>
        
        <button id="start-journey-btn" style="
          background: linear-gradient(135deg, #64b5f6, #42a5f5);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 1rem 0;
        ">Begin the therapy</button>
        
        <div style="
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          border-left: 4px solid #64b5f6;
          color: rgba(255,255,255,0.8);
          font-size: 0.9rem;
        ">
          🔒 Your privacy is our priority. All conversations are encrypted and stored securely.
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Focus on input and pre-populate if returning user
    setTimeout(() => {
      const input = document.getElementById('user-name-input');
      if (input) {
        // Pre-populate with existing name if available
        if (this.userName) {
          input.value = this.userName;
          console.log('🔄 Pre-populated name field for returning user:', this.userName);
        }
        input.focus();
      }
    }, 100);

    // Handle form submission
    const startBtn = document.getElementById('start-journey-btn');
    const nameInput = document.getElementById('user-name-input');

    const handleStart = () => {
      const name = nameInput.value.trim();
      this.userName = name || null;
      this.createUser();
      modalOverlay.remove();
    };

    startBtn.addEventListener('click', handleStart);
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleStart();
    });
  }

  createUser() {
    this.userId = this.generateUserId();

    console.log('🆔 Creating user with UUID:', this.userId, 'Name:', this.userName || 'Anonymous');
    console.log('🔍 localStorage data:', localStorage.getItem('therapeuticWaveUser'));

    // Send to server
    this.socket.emit('createUser', {
      userId: this.userId,
      userName: this.userName,
      isAnonymous: !this.userName
    });

    // Save locally
    this.saveUserData();

    // Show welcome message
    this.showWelcomeMessage();

    // Don't auto-start streaming here - wait for user creation to complete
    // autoStartStreaming will be called from the userCreated event handler
  }

  generateUserId() {
    // First, try to get existing UUID from localStorage
    try {
      const existingUserData = localStorage.getItem('therapeuticWaveUser');
      if (existingUserData) {
        const userData = JSON.parse(existingUserData);
        if (userData.userId && userData.userName) {
          // Check if the name matches - if not, this might be a different user
          if (this.userName && userData.userName !== this.userName) {
            console.log('⚠️ Name mismatch detected! Stored:', userData.userName, 'Current:', this.userName);
            console.log('🆕 Generating new UUID for different user');
            // Clear old data and generate new UUID
            localStorage.removeItem('therapeuticWaveUser');
          } else {
            console.log('🔄 Using existing UUID for returning user:', userData.userId);
            return userData.userId;
          }
        } else if (userData.userId) {
          console.log('🔄 Using existing UUID for returning user:', userData.userId);
          return userData.userId;
        }
      }
    } catch (error) {
      console.warn('Could not retrieve existing user data:', error);
    }

    // Generate new UUID for new users
    let newUserId;
    if (window.crypto && window.crypto.randomUUID) {
      newUserId = window.crypto.randomUUID();
    } else {
      newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    console.log('🆕 Generated new UUID for new user:', newUserId);
    return newUserId;
  }

  saveUserData() {
    const userData = {
      userId: this.userId,
      userName: this.userName,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    try {
      localStorage.setItem('therapeuticWaveUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  showWelcomeMessage() {
    const greeting = this.userName
      ? `Welcome, ${this.userName}! Your session will start automatically in a moment...`
      : 'Welcome! Your therapeutic session will start automatically in a moment...';

    this.showNotification(greeting, 'welcome', 6000);
  }

  autoStartStreaming() {
    // Wait for the user creation process to complete, then auto-start streaming
    setTimeout(() => {
      console.log('🎙️ Auto-starting streaming session...');

      // Find and click the start button
      const startButton = document.getElementById('start');
      if (startButton && !startButton.disabled) {
        console.log('✅ Clicking start button automatically');

        // Hide the start button since we're auto-starting
        startButton.style.display = 'none';

        // Click the button to start streaming
        startButton.click();

        // Show notification that streaming started automatically
        setTimeout(() => {
          this.showNotification('Session started automatically - speak when ready!', 'session', 4000);
        }, 1000);
      } else {
        console.log('⚠️ Start button not found or disabled, user will need to click manually');
      }
    }, 1000); // Wait 1 second for user creation to complete
  }

  showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'welcome' ? 'rgba(100, 181, 246, 0.9)' : type === 'session' ? 'rgba(156, 39, 176, 0.9)' : 'rgba(76, 175, 80, 0.9)'};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      max-width: 350px;
      backdrop-filter: blur(10px);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 0.5rem;">${message}</div>
      <div style="font-size: 0.8rem; opacity: 0.8;">User ID: ${this.userId ? this.userId.substring(0, 8) + '...' : 'Generating...'}</div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  setupSocketListeners() {
    this.socket.on('userCreated', (data) => {
      console.log('✅ User processed:', data);
      if (data.success) {
        if (data.isReturning) {
          this.showNotification(`Welcome back, ${data.userName || 'friend'}! 🎉`, 'welcome', 5000);
        } else {
          this.showNotification('User profile created successfully!', 'success');
        }

        // Now that user is created successfully, auto-start streaming
        console.log('🚀 User creation complete - starting auto-streaming...');
        this.autoStartStreaming();
      } else {
        console.warn('❌ User processing failed:', data.error);
        this.showNotification('Failed to create user. Please try again.', 'error');
      }
    });

    this.socket.on('sessionStarted', (data) => {
      console.log('✅ Session started event received:', data);
      console.log('📊 Session creation completed at:', new Date().toISOString());
      this.creatingSession = false; // Clear the creation flag

      if (data.success) {
        this.sessionId = data.sessionId;
        this.sessionStartTime = new Date().toISOString();
        console.log('✅ Session ID assigned:', this.sessionId);

        // Handle session context if available
        if (data.sessionContext) {
          this.handleSessionContext(data.sessionContext);
        } else {
          this.showNotification('Therapy session started - speak when ready!', 'session');
        }
      } else {
        console.error('❌ Session creation failed:', data.error);
        this.showNotification('Failed to start session. Please try again.', 'error');
      }
    });

    this.socket.on('sessionCompleted', (data) => {
      console.log('✅ Session completed:', data);
      if (data.success && data.summary) {
        this.showNotification(`Session complete! ${data.summary}`, 'success', 8000);
      }
      this.sessionId = null;
      this.sessionStartTime = null;
      this.conversationTranscript = '';
    });
  }

  handleSessionContext(context) {
    console.log('📊 Session context received:', context);

    // Dispatch event to main.js so it can use the context for AI prompting
    window.dispatchEvent(new CustomEvent('sessionContextUpdated', {
      detail: context
    }));

    if (context.isFirstSession) {
      this.showNotification('Welcome to your first session! Take your time to get comfortable.', 'welcome', 6000);
    } else {
      // Show personalized message based on session history
      let message = `Welcome back! This is session #${context.totalSessions + 1}. `;

      if (context.patterns && context.patterns.moodTrends.length > 0) {
        const trend = context.patterns.moodTrends[0];
        if (trend.includes('improving')) {
          message += 'Great progress in recent sessions! 📈';
        } else if (trend.includes('stable')) {
          message += 'Consistent progress continues. 🌊';
        } else {
          message += 'Here to support you today. 💙';
        }
      }

      this.showNotification(message, 'session', 8000);

      // Show additional context if available
      if (context.lastSessionSummary && context.lastSessionSummary !== 'Previous session completed') {
        setTimeout(() => {
          this.showNotification(`Last time: ${context.lastSessionSummary}`, 'info', 6000);
        }, 3000);
      }
    }
  }

  setupConversationTracking() {
    // Track conversation text
    this.socket.on('textOutput', (data) => {
      if (data.content && data.role) {
        const speaker = data.role === 'USER' ? 'User' : 'Assistant';
        this.conversationTranscript += `${speaker}: ${data.content}\n`;
        console.log('📝 Added to transcript:', `${speaker}: ${data.content}`);
      }
    });

    // Hook into start/stop buttons
    this.hookIntoButtons();
  }

  hookIntoButtons() {
    const startButton = document.getElementById('start');
    const stopButton = document.getElementById('stop');

    if (startButton) {
      startButton.addEventListener('click', () => {
        if (this.userId) {
          console.log('🎙️ Start button clicked - creating therapy session...');
          this.conversationTranscript = '';
          this.startSession();
        }
      });
    }

    if (stopButton) {
      stopButton.addEventListener('click', () => {
        if (this.sessionId) {
          console.log('⏹️ Ending therapy session...');
          this.endSession();
        }
      });
    }

    // Also listen for stream completion
    this.socket.on('streamComplete', () => {
      if (this.sessionId) {
        console.log('🔄 Stream completed, ending session...');
        setTimeout(() => this.endSession(), 1000);
      }
    });
  }

  startSession() {
    if (!this.userId) {
      console.error('❌ No user ID available for session creation');
      return;
    }

    // Prevent multiple session starts
    if (this.sessionId) {
      console.log('⚠️ Session already active:', this.sessionId, '- ignoring duplicate start request');
      return;
    }

    // Check if we're already in the process of creating a session
    if (this.creatingSession) {
      console.log('⚠️ Session creation already in progress, ignoring duplicate request');
      return;
    }

    this.creatingSession = true;
    console.log('🎙️ Starting new therapy session for user:', this.userId);
    console.log('📊 Session creation timestamp:', new Date().toISOString());

    this.socket.emit('startTherapySession', {
      userId: this.userId,
      initialEmotionalState: {
        initialMood: 5,
        stressLevel: 5,
        anxietyLevel: 5,
        dominantEmotions: ['curious']
      }
    });
  }

  endSession() {
    if (!this.sessionId) {
      console.log('No active session to end');
      return;
    }

    const duration = this.sessionStartTime
      ? Math.floor((new Date() - new Date(this.sessionStartTime)) / 1000)
      : 60; // Default 1 minute

    console.log('📊 Ending session with:', {
      duration: duration + 's',
      transcriptLength: this.conversationTranscript.length,
      transcript: this.conversationTranscript.substring(0, 100) + '...'
    });

    this.socket.emit('completeTherapySession', {
      sessionId: this.sessionId,
      userId: this.userId,
      transcript: this.conversationTranscript,
      finalEmotionalState: {
        initialMood: 5,
        finalMood: 7,
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
        silenceDuration: Math.max(0, duration - 30),
        voiceStressIndicators: {
          averagePitch: 200,
          pitchVariation: 50,
          speakingRate: 150,
          pauseFrequency: 0.3,
          volumeConsistency: 0.8
        }
      },
      userConsent: true
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for socket to be available
  const initIntegration = () => {
    if (typeof socket !== 'undefined') {
      window.completeUserIntegration = new CompleteUserIntegration(socket);
      console.log('🚀 Complete user integration initialized');
    } else {
      setTimeout(initIntegration, 100);
    }
  };

  initIntegration();
});