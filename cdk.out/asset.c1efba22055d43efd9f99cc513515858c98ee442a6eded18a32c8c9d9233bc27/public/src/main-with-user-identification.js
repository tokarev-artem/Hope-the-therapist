/**
 * Main application file with user identification integration
 * Shows how to integrate the user management system with your existing app
 */

import UserManager from './lib/user/UserManager.js';
import { WaveInterface } from './lib/wave/WaveInterface.js';

class TherapeuticWaveApp {
  constructor() {
    this.socket = null;
    this.userManager = null;
    this.waveInterface = null;
    this.isSessionActive = false;
    
    this.initializeApp();
  }

  /**
   * Initialize the application
   */
  async initializeApp() {
    try {
      // Initialize Socket.IO connection
      this.socket = io();
      
      // Initialize user management
      this.userManager = new UserManager(this.socket);
      
      // Initialize wave interface
      this.waveInterface = new WaveInterface(document.getElementById('wave-container'));
      
      // Set up socket event listeners
      this.setupSocketListeners();
      
      // Set up UI event listeners
      this.setupUIListeners();
      
      console.log('Therapeutic Wave App initialized');
      
    } catch (error) {
      console.error('Error initializing app:', error);
      this.showError('Failed to initialize application');
    }
  }

  /**
   * Set up socket event listeners
   */
  setupSocketListeners() {
    // User context received
    this.socket.on('userContextResponse', (context) => {
      console.log('User context received:', context);
      this.updateUIWithUserContext(context);
    });

    // Session initialized
    this.socket.on('sessionInitialized', (data) => {
      console.log('Session initialized:', data);
      this.handleSessionInitialized(data);
    });

    // Session completed
    this.socket.on('sessionCompleted', (data) => {
      console.log('Session completed:', data);
      this.handleSessionCompleted(data);
    });

    // AI responses
    this.socket.on('textOutput', (data) => {
      this.handleAIResponse(data);
    });

    // Audio output
    this.socket.on('audioOutput', (data) => {
      this.handleAudioOutput(data);
    });

    // Errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.showError(error.message || 'Connection error');
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.updateConnectionStatus(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.updateConnectionStatus(false);
    });
  }

  /**
   * Set up UI event listeners
   */
  setupUIListeners() {
    // Start session button
    const startButton = document.getElementById('start-session');
    if (startButton) {
      startButton.addEventListener('click', () => this.startSession());
    }

    // End session button
    const endButton = document.getElementById('end-session');
    if (endButton) {
      endButton.addEventListener('click', () => this.endSession());
    }

    // Microphone toggle
    const micButton = document.getElementById('mic-toggle');
    if (micButton) {
      micButton.addEventListener('click', () => this.toggleMicrophone());
    }

    // Settings button
    const settingsButton = document.getElementById('settings');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => this.showSettings());
    }

    // Dashboard button
    const dashboardButton = document.getElementById('dashboard');
    if (dashboardButton) {
      dashboardButton.addEventListener('click', () => this.showDashboard());
    }

    // Wave theme selector
    const themeSelector = document.getElementById('wave-theme');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        this.waveInterface.setTheme(e.target.value);
      });
    }

    // Listen for wave theme changes from user manager
    document.addEventListener('setWaveTheme', (e) => {
      this.waveInterface.setTheme(e.detail.theme);
      
      // Update theme selector if present
      const themeSelector = document.getElementById('wave-theme');
      if (themeSelector) {
        themeSelector.value = e.detail.theme;
      }
    });
  }

  /**
   * Update UI with user context
   */
  updateUIWithUserContext(context) {
    // Update welcome message
    const welcomeElement = document.getElementById('welcome-message');
    if (welcomeElement) {
      welcomeElement.textContent = context.personalizedGreeting;
    }

    // Update user stats
    const statsElement = document.getElementById('user-stats');
    if (statsElement && context.user.isReturningUser) {
      statsElement.innerHTML = `
        <div class="stat">
          <span class="stat-label">Sessions:</span>
          <span class="stat-value">${context.user.totalSessions}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Progress:</span>
          <span class="stat-value ${context.recentProgress.moodTrend}">
            ${context.recentProgress.moodTrend}
          </span>
        </div>
      `;
    }

    // Show recommendations
    if (context.recommendations && context.recommendations.length > 0) {
      this.showRecommendations(context.recommendations);
    }
  }

  /**
   * Handle session initialization
   */
  handleSessionInitialized(data) {
    this.isSessionActive = true;
    
    // Update UI state
    this.updateSessionUI(true);
    
    // Start wave interface
    this.waveInterface.start();
    
    // Set recommended theme
    if (data.recommendedWaveTheme) {
      this.waveInterface.setTheme(data.recommendedWaveTheme);
    }
  }

  /**
   * Handle session completion
   */
  handleSessionCompleted(data) {
    this.isSessionActive = false;
    
    // Update UI state
    this.updateSessionUI(false);
    
    // Stop wave interface
    this.waveInterface.stop();
    
    // Show session summary
    this.showSessionSummary(data);
  }

  /**
   * Start therapeutic session
   */
  startSession() {
    if (this.isSessionActive) return;
    
    // Get initial emotional state from user
    this.getInitialEmotionalState().then(emotionalState => {
      // Send session start to server
      this.socket.emit('startSession', {
        userId: this.userManager.getCurrentUser()?.userId,
        initialEmotionalState: emotionalState
      });
    });
  }

  /**
   * End therapeutic session
   */
  endSession() {
    if (!this.isSessionActive) return;
    
    // Get final emotional state
    this.getFinalEmotionalState().then(finalEmotionalState => {
      // Collect session metrics
      const sessionMetrics = this.collectSessionMetrics();
      
      // Send session completion to server
      this.userManager.handleSessionComplete({
        finalEmotionalState,
        sessionMetrics,
        userConsent: this.getUserConsent()
      });
    });
  }

  /**
   * Get initial emotional state from user
   */
  async getInitialEmotionalState() {
    // This could be a modal or form to collect user's current state
    return {
      initialMood: 5, // Default values - replace with actual user input
      stressLevel: 5,
      anxietyLevel: 5,
      dominantEmotions: []
    };
  }

  /**
   * Get final emotional state from user
   */
  async getFinalEmotionalState() {
    // This could be a modal to collect how the user feels after the session
    return {
      finalMood: 7, // Example - replace with actual user input
      stressLevel: 3,
      anxietyLevel: 3,
      calmingEffectiveness: 8
    };
  }

  /**
   * Collect session metrics
   */
  collectSessionMetrics() {
    return {
      duration: Date.now() - this.sessionStartTime,
      sessionQuality: 8, // Could be calculated based on various factors
      engagementLevel: 9,
      responseTime: 250,
      interruptionCount: 0,
      silenceDuration: 0
    };
  }

  /**
   * Get user consent for data storage
   */
  getUserConsent() {
    // Check user's privacy settings or ask for consent
    return true; // Default - replace with actual consent mechanism
  }

  /**
   * Handle AI response
   */
  handleAIResponse(data) {
    // Display AI response in chat or update wave patterns
    console.log('AI Response:', data);
    
    // Update wave interface with response
    this.waveInterface.addWavePattern({
      type: 'ai-response',
      timestamp: Date.now(),
      amplitude: 0.7,
      frequency: 440
    });
  }

  /**
   * Handle audio output
   */
  handleAudioOutput(data) {
    // Play audio response
    console.log('Audio output received');
    
    // Update wave interface
    this.waveInterface.addWavePattern({
      type: 'audio-output',
      timestamp: Date.now(),
      amplitude: 0.8,
      frequency: 880
    });
  }

  /**
   * Toggle microphone
   */
  toggleMicrophone() {
    // Implement microphone toggle logic
    console.log('Microphone toggled');
  }

  /**
   * Show settings modal
   */
  showSettings() {
    // Implement settings modal
    console.log('Show settings');
  }

  /**
   * Show dashboard
   */
  showDashboard() {
    // Request dashboard data
    this.socket.emit('getDashboard');
    
    this.socket.once('dashboardData', (data) => {
      this.displayDashboard(data);
    });
  }

  /**
   * Display dashboard
   */
  displayDashboard(data) {
    // Create and show dashboard modal with user progress
    console.log('Dashboard data:', data);
  }

  /**
   * Show recommendations
   */
  showRecommendations(recommendations) {
    const recommendationsElement = document.getElementById('recommendations');
    if (recommendationsElement) {
      recommendationsElement.innerHTML = recommendations
        .map(rec => `<div class="recommendation">💡 ${rec}</div>`)
        .join('');
    }
  }

  /**
   * Show session summary
   */
  showSessionSummary(data) {
    // Create modal or notification with session summary
    const summary = `
      <div class="session-summary">
        <h3>Session Complete</h3>
        <p>${data.summary}</p>
        <div class="insights">
          <h4>Insights:</h4>
          <p>Mood: ${data.insights?.moodProgression || 'Positive session'}</p>
        </div>
        <div class="recommendations">
          <h4>For Next Time:</h4>
          <ul>
            ${data.recommendations?.map(rec => `<li>${rec}</li>`).join('') || '<li>Continue regular sessions</li>'}
          </ul>
        </div>
      </div>
    `;
    
    this.showModal(summary);
  }

  /**
   * Update session UI state
   */
  updateSessionUI(isActive) {
    const startButton = document.getElementById('start-session');
    const endButton = document.getElementById('end-session');
    const micButton = document.getElementById('mic-toggle');
    
    if (startButton) startButton.disabled = isActive;
    if (endButton) endButton.disabled = !isActive;
    if (micButton) micButton.disabled = !isActive;
    
    // Update session status indicator
    const statusElement = document.getElementById('session-status');
    if (statusElement) {
      statusElement.textContent = isActive ? 'Session Active' : 'Ready to Start';
      statusElement.className = isActive ? 'status-active' : 'status-ready';
    }
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.textContent = isConnected ? 'Connected' : 'Disconnected';
      statusElement.className = isConnected ? 'connected' : 'disconnected';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('App Error:', message);
    
    // Show error notification
    const errorElement = document.createElement('div');
    errorElement.className = 'error-notification';
    errorElement.textContent = message;
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement);
      }
    }, 5000);
  }

  /**
   * Show modal
   */
  showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <button class="modal-close">&times;</button>
        <div class="modal-content">${content}</div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close')) {
        document.body.removeChild(modal);
      }
    });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TherapeuticWaveApp();
});

export default TherapeuticWaveApp;