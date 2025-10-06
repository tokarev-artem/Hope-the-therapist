/**
 * StateManager - Manages smooth transitions between different animation states
 * Designed for PTSD-friendly animations with smooth, predictable transitions
 */
export class StateManager {
    constructor(config = {}) {
        // Animation states
        this.states = {
            IDLE: 'idle',
            LISTENING: 'listening', 
            PROCESSING: 'processing',
            SPEAKING: 'speaking',
            ERROR: 'error'
        };
        
        // Current state management
        this.currentState = this.states.IDLE;
        this.previousState = null;
        this.targetState = null;
        
        // Transition management
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionDuration = config.transitionDuration || 800; // ms
        this.transitionProgress = 0;
        
        // Easing functions for PTSD-friendly animations
        this.easingFunctions = {
            'ease-out': (t) => 1 - Math.pow(1 - t, 3),
            'ease-in-out': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
            'linear': (t) => t,
            'ease-in': (t) => t * t * t,
            'gentle': (t) => Math.sin(t * Math.PI / 2) // Very smooth for PTSD users
        };
        
        this.currentEasing = config.easing || 'gentle';
        
        // State-specific configurations
        this.stateConfigs = {
            [this.states.IDLE]: {
                amplitude: 0.3,
                frequency: 0.015,
                speed: 0.8,
                color: 'baseline',
                smoothing: 0.95
            },
            [this.states.LISTENING]: {
                amplitude: 1.0,
                frequency: 0.025,
                speed: 1.2,
                color: 'userInput',
                smoothing: 0.85
            },
            [this.states.PROCESSING]: {
                amplitude: 0.5,
                frequency: 0.02,
                speed: 1.0,
                color: 'processing',
                smoothing: 0.9
            },
            [this.states.SPEAKING]: {
                amplitude: 0.8,
                frequency: 0.03,
                speed: 1.1,
                color: 'botOutput',
                smoothing: 0.88
            },
            [this.states.ERROR]: {
                amplitude: 0.4,
                frequency: 0.018,
                speed: 0.9,
                color: 'error',
                smoothing: 0.92
            }
        };
        
        // Event listeners
        this.eventListeners = {
            stateChange: [],
            transitionStart: [],
            transitionEnd: []
        };
        
        // Minimum transition duration for PTSD-friendly animations
        this.minTransitionDuration = 500; // ms
        
        console.log('StateManager initialized with state:', this.currentState);
    }
    
    /**
     * Transition to a new state with smooth animation
     * @param {string} newState - Target state to transition to
     * @param {number} duration - Optional transition duration override
     * @param {string} easing - Optional easing function override
     */
    transitionTo(newState, duration = null, easing = null) {
        // Validate state
        if (!Object.values(this.states).includes(newState)) {
            console.warn(`Invalid state: ${newState}`);
            return false;
        }
        
        // Don't transition to the same state unless we're currently transitioning
        if (newState === this.currentState && !this.isTransitioning) {
            return false;
        }
        
        // Store previous state
        this.previousState = this.currentState;
        this.targetState = newState;
        
        // Set transition parameters
        const transitionDuration = Math.max(
            duration || this.transitionDuration,
            this.minTransitionDuration
        );
        
        // Start transition
        this.isTransitioning = true;
        this.transitionStartTime = performance.now();
        this.transitionDuration = transitionDuration;
        this.transitionProgress = 0;
        
        // Set easing function
        if (easing && this.easingFunctions[easing]) {
            this.currentEasing = easing;
        }
        
        // Emit transition start event
        this.emit('transitionStart', {
            from: this.previousState,
            to: this.targetState,
            duration: transitionDuration,
            easing: this.currentEasing
        });
        
        // console.log(`State transition started: ${this.previousState} → ${this.targetState} (${transitionDuration}ms)`);
        
        return true;
    }
    
    /**
     * Update transition progress and handle completion
     * Should be called on each animation frame
     */
    update() {
        if (!this.isTransitioning) {
            return this.getStateConfig();
        }
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.transitionStartTime;
        
        // Calculate transition progress (0 to 1)
        this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);
        
        // Check if transition is complete
        if (this.transitionProgress >= 1) {
            this.completeTransition();
        }
        
        return this.getInterpolatedConfig();
    }
    
    /**
     * Complete the current transition
     */
    completeTransition() {
        if (!this.isTransitioning) return;
        
        // Update current state
        this.currentState = this.targetState;
        this.isTransitioning = false;
        this.transitionProgress = 1;
        
        // Emit events
        this.emit('transitionEnd', {
            from: this.previousState,
            to: this.currentState
        });
        
        this.emit('stateChange', {
            state: this.currentState,
            config: this.getStateConfig()
        });
        
        console.log(`State transition completed: ${this.currentState}`);
        
        // Reset transition state
        this.targetState = null;
        this.previousState = null;
    }
    
    /**
     * Get interpolated configuration during transition
     */
    getInterpolatedConfig() {
        if (!this.isTransitioning || !this.previousState || !this.targetState) {
            return this.getStateConfig();
        }
        
        const fromConfig = this.stateConfigs[this.previousState];
        const toConfig = this.stateConfigs[this.targetState];
        const easingFunc = this.easingFunctions[this.currentEasing];
        const t = easingFunc(this.transitionProgress);
        
        // Interpolate numeric values
        const interpolatedConfig = {
            amplitude: this.lerp(fromConfig.amplitude, toConfig.amplitude, t),
            frequency: this.lerp(fromConfig.frequency, toConfig.frequency, t),
            speed: this.lerp(fromConfig.speed, toConfig.speed, t),
            smoothing: this.lerp(fromConfig.smoothing, toConfig.smoothing, t),
            color: t < 0.5 ? fromConfig.color : toConfig.color, // Switch color at midpoint
            transitionProgress: this.transitionProgress,
            isTransitioning: true
        };
        
        return interpolatedConfig;
    }
    
    /**
     * Get current state configuration
     */
    getStateConfig() {
        return {
            ...this.stateConfigs[this.currentState],
            transitionProgress: 0,
            isTransitioning: false
        };
    }
    
    /**
     * Linear interpolation helper
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    }
    
    /**
     * Get current state
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Get target state (if transitioning)
     */
    getTargetState() {
        return this.targetState;
    }
    
    /**
     * Check if currently transitioning
     */
    isCurrentlyTransitioning() {
        return this.isTransitioning;
    }
    
    /**
     * Get transition progress (0-1)
     */
    getTransitionProgress() {
        return this.transitionProgress;
    }
    
    /**
     * Force immediate state change without transition
     * Use sparingly - mainly for error states or initialization
     */
    setState(newState) {
        if (!Object.values(this.states).includes(newState)) {
            console.warn(`Invalid state: ${newState}`);
            return false;
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        this.isTransitioning = false;
        this.targetState = null;
        this.transitionProgress = 0;
        
        this.emit('stateChange', {
            state: this.currentState,
            config: this.getStateConfig()
        });
        
        console.log(`State set immediately: ${this.currentState}`);
        return true;
    }
    
    /**
     * Update state configuration
     */
    updateStateConfig(state, config) {
        if (this.stateConfigs[state]) {
            this.stateConfigs[state] = { ...this.stateConfigs[state], ...config };
            console.log(`Updated config for state: ${state}`);
        }
    }
    
    /**
     * Update transition settings
     */
    updateTransitionSettings(settings) {
        if (settings.duration !== undefined) {
            this.transitionDuration = Math.max(settings.duration, this.minTransitionDuration);
        }
        if (settings.easing && this.easingFunctions[settings.easing]) {
            this.currentEasing = settings.easing;
        }
        if (settings.minDuration !== undefined) {
            this.minTransitionDuration = settings.minDuration;
        }
    }
    
    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to listeners
     */
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} event listener:`, error);
                }
            });
        }
    }
    
    /**
     * Get available states
     */
    getAvailableStates() {
        return { ...this.states };
    }
    
    /**
     * Get available easing functions
     */
    getAvailableEasings() {
        return Object.keys(this.easingFunctions);
    }
    
    /**
     * Reset to idle state
     */
    reset() {
        this.setState(this.states.IDLE);
        console.log('StateManager reset to idle state');
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clear all event listeners
        Object.keys(this.eventListeners).forEach(event => {
            this.eventListeners[event] = [];
        });
        
        // Reset state
        this.isTransitioning = false;
        this.currentState = this.states.IDLE;
        this.targetState = null;
        this.previousState = null;
        
        console.log('StateManager destroyed');
    }
}