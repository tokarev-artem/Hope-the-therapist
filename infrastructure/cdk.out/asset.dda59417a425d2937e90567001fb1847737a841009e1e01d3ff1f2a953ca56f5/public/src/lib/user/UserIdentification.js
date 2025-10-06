/**
 * User identification system for therapeutic wave interface
 * Supports anonymous users with optional name input for personalization
 */

export class UserIdentification {
  constructor() {
    this.userId = null;
    this.userName = null;
    this.isAnonymous = true;
    this.storageKey = 'therapeuticWaveUser';
    
    this.loadUserFromStorage();
  }

  /**
   * Load existing user data from browser storage
   */
  loadUserFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const userData = JSON.parse(stored);
        this.userId = userData.userId;
        this.userName = userData.userName;
        this.isAnonymous = userData.isAnonymous !== false;
        
        console.log('Loaded existing user:', this.getDisplayName());
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    }
  }

  /**
   * Save user data to browser storage
   */
  saveUserToStorage() {
    try {
      const userData = {
        userId: this.userId,
        userName: this.userName,
        isAnonymous: this.isAnonymous,
        lastSeen: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }

  /**
   * Generate a new anonymous user ID
   */
  generateAnonymousUser() {
    this.userId = this.generateSecureId();
    this.userName = null;
    this.isAnonymous = true;
    this.saveUserToStorage();
    
    console.log('Generated new anonymous user:', this.userId);
    return this.userId;
  }

  /**
   * Set user name (optional personalization)
   */
  setUserName(name) {
    if (name && name.trim()) {
      this.userName = name.trim();
      this.saveUserToStorage();
      console.log('User name set:', this.getDisplayName());
      return true;
    }
    return false;
  }

  /**
   * Get user ID (create if doesn't exist)
   */
  getUserId() {
    if (!this.userId) {
      this.generateAnonymousUser();
    }
    return this.userId;
  }

  /**
   * Get display name for UI
   */
  getDisplayName() {
    if (this.userName) {
      return this.userName;
    }
    return this.isAnonymous ? 'Anonymous User' : 'User';
  }

  /**
   * Get user info for session initialization
   */
  getUserInfo() {
    return {
      userId: this.getUserId(),
      userName: this.userName,
      displayName: this.getDisplayName(),
      isAnonymous: this.isAnonymous,
      isReturningUser: !!localStorage.getItem(this.storageKey)
    };
  }

  /**
   * Clear user data (for testing or privacy)
   */
  clearUserData() {
    localStorage.removeItem(this.storageKey);
    this.userId = null;
    this.userName = null;
    this.isAnonymous = true;
    console.log('User data cleared');
  }

  /**
   * Generate secure random ID
   */
  generateSecureId() {
    // Generate a secure random ID using crypto API
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    
    // Fallback for older browsers
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if user wants to be remembered across sessions
   */
  shouldRememberUser() {
    return localStorage.getItem(this.storageKey) !== null;
  }

  /**
   * Export user data (for privacy compliance)
   */
  exportUserData() {
    return {
      userId: this.userId,
      userName: this.userName,
      isAnonymous: this.isAnonymous,
      createdAt: this.getCreatedDate(),
      lastSeen: new Date().toISOString()
    };
  }

  /**
   * Get user creation date from storage
   */
  getCreatedDate() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const userData = JSON.parse(stored);
        return userData.createdAt || userData.lastSeen || 'Unknown';
      }
    } catch (error) {
      console.error('Error getting creation date:', error);
    }
    return 'Unknown';
  }
}

// Create singleton instance
export const userIdentification = new UserIdentification();