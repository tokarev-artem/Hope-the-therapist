import { WaveRenderer } from './WaveRenderer.js';
import { ThemeManager } from './ThemeManager.js';
import { StateManager } from './StateManager.js';
import { AccessibilityController } from './AccessibilityController.js';
import { SettingsInterface } from './SettingsInterface.js';
import { ErrorHandler } from './ErrorHandler.js';

/**
 * WaveInterface - Core wave visualization interface for therapeutic speech-to-speech bot
 * Replaces the traditional chat interface with calming wave animations
 */
export class WaveInterface {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.waveRenderer = null;
        this.themeManager = null;
        this.stateManager = null;
        this.accessibilityController = null;
        this.settingsInterface = null;
        this.errorHandler = null;
        this.isInitialized = false;
        
        // Initialize theme manager
        this.themeManager = new ThemeManager();
        
        // Initialize state manager
        this.stateManager = new StateManager({
            transitionDuration: 800,
            easing: 'gentle'
        });
        
        // Initialize accessibility controller
        this.accessibilityController = new AccessibilityController();
        
        // Canvas configuration
        this.config = {
            canvas: {
                width: 0,
                height: 0,
                devicePixelRatio: window.devicePixelRatio || 1
            },
            waves: {
                baselineAmplitude: 65,        // MAXIMUM PROMINENCE
                maxAmplitude: 600,            // EXTREME DRAMATIC EFFECT
                frequency: 0.025,             // FASTER, MORE ENERGETIC
                waveCount: 7,                 // MAXIMUM LAYERS
                smoothingFactor: 0.05         // VERY FAST RESPONSE
            },
            animation: {
                frameRate: 60,
                transitionDuration: 800,
                easing: 'ease-out'
            },
            theme: this.themeManager.getCurrentTheme()
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the wave interface with Canvas setup
     */
    initialize() {
        try {
            this.createCanvas();
            this.setupCanvas();
            this.setupEventListeners();
            this.setupThemeEventListeners();
            this.setupStateEventListeners();
            this.setupAccessibilityEventListeners();
            this.initializeWaveRenderer();
            this.initializeSettingsInterface();
            this.initializeErrorHandler();
            this.isInitialized = true;
            console.log('WaveInterface initialized successfully');
        } catch (error) {
            console.error('Failed to initialize WaveInterface:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Create and append Canvas element to container
     */
    createCanvas() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'wave-canvas';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        
        // Append to container
        this.container.appendChild(this.canvas);
        
        // Get 2D context
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Failed to get 2D canvas context');
        }
    }
    
    /**
     * Setup Canvas with proper sizing and high-DPI support
     */
    setupCanvas() {
        this.resizeCanvas();
        
        // Set canvas styles for smooth rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    /**
     * Resize canvas with high-DPI support
     */
    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        const dpr = this.config.canvas.devicePixelRatio;
        
        // Set display size
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Set actual canvas size with device pixel ratio
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        
        // Update config
        this.config.canvas.width = rect.width;
        this.config.canvas.height = rect.height;
    }
    
    /**
     * Setup event listeners for responsive design
     */
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            if (this.waveRenderer) {
                this.waveRenderer.resize();
            }
        });
        
        // Handle orientation change on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.resizeCanvas();
                if (this.waveRenderer) {
                    this.waveRenderer.resize();
                }
            }, 100);
        });
    }
    
    /**
     * Setup theme change event listeners
     */
    setupThemeEventListeners() {
        // Listen for theme changes from ThemeManager
        window.addEventListener('themeChanged', (event) => {
            const newTheme = event.detail.theme;
            this.config.theme = newTheme;
            
            // Update wave renderer with new theme
            if (this.waveRenderer) {
                this.waveRenderer.updateTheme(newTheme);
            }
            
            // Update canvas background
            this.updateCanvasBackground(newTheme.backgroundColor);
        });
    }
    
    /**
     * Setup state change event listeners
     */
    setupStateEventListeners() {
        // Listen for state changes from StateManager
        this.stateManager.addEventListener('stateChange', (event) => {
            const { state, config } = event;
            console.log(`Wave interface state changed to: ${state}`);
            
            // Update wave renderer with new state configuration
            if (this.waveRenderer) {
                this.waveRenderer.updateStateConfig(config);
            }
        });
        
        // Listen for transition events
        this.stateManager.addEventListener('transitionStart', (event) => {
            // console.log(`State transition started: ${event.from} → ${event.to}`);
        });
        
        this.stateManager.addEventListener('transitionEnd', (event) => {
            console.log(`State transition completed: ${event.from} → ${event.to}`);
        });
    }
    
    /**
     * Setup accessibility event listeners
     */
    setupAccessibilityEventListeners() {
        // Listen for accessibility settings changes
        this.accessibilityController.addEventListener('settingsChanged', (event) => {
            console.log('Accessibility settings changed:', event);
            
            // Apply accessibility settings to wave configuration
            const modifiedConfig = this.accessibilityController.applyToWaveConfig(this.config);
            this.config = modifiedConfig;
            
            // Update wave renderer with accessibility-modified config
            if (this.waveRenderer) {
                this.waveRenderer.updateConfig(modifiedConfig);
            }
            
            // Apply accessibility settings to current theme
            const currentTheme = this.themeManager.getCurrentTheme();
            if (currentTheme) {
                const modifiedTheme = this.accessibilityController.applyToThemeConfig(currentTheme);
                if (this.waveRenderer) {
                    this.waveRenderer.updateTheme(modifiedTheme);
                }
            }
            
            // Update state manager transition settings based on accessibility preferences
            const transitionDuration = this.accessibilityController.getTransitionDuration(800);
            this.stateManager.updateTransitionSettings({
                duration: transitionDuration,
                easing: this.accessibilityController.shouldReduceMotion() ? 'ease-out' : 'gentle'
            });
        });
        
        // Listen for specific accessibility changes
        this.accessibilityController.addEventListener('motionIntensityChanged', (event) => {
            console.log(`Motion intensity changed: ${event.newValue}`);
        });
        
        this.accessibilityController.addEventListener('reducedMotionChanged', (event) => {
            console.log(`Reduced motion changed: ${event.newValue}`);
        });
    }
    
    /**
     * Initialize the WaveRenderer with proper configuration
     */
    initializeWaveRenderer() {
        if (!this.canvas) {
            throw new Error('Canvas must be created before initializing WaveRenderer');
        }
        
        try {
            // Apply accessibility settings to initial configuration
            const accessibilityModifiedConfig = this.accessibilityController.applyToWaveConfig(this.config);
            this.config = accessibilityModifiedConfig;
            
            // Create WaveRenderer instance with accessibility-modified configuration
            this.waveRenderer = new WaveRenderer(this.canvas, this.config);
            
            // Connect state manager to wave renderer
            this.connectStateManagerToRenderer();
            
            // Start the baseline wave animation
            this.waveRenderer.start();
            
            console.log('WaveRenderer initialized and started');
        } catch (error) {
            console.error('Failed to initialize WaveRenderer:', error);
            // Handle renderer initialization error
            if (this.errorHandler) {
                this.errorHandler.handleCanvasError(error);
            } else {
                this.handleInitializationError(error);
            }
        }
    }
    
    /**
     * Initialize the settings interface
     */
    initializeSettingsInterface() {
        if (!this.accessibilityController) {
            console.warn('AccessibilityController must be initialized before SettingsInterface');
            return;
        }
        
        try {
            // Create settings interface
            this.settingsInterface = new SettingsInterface(this, this.accessibilityController);
            console.log('SettingsInterface initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SettingsInterface:', error);
            // Handle settings interface error through error handler if available
            if (this.errorHandler) {
                this.errorHandler.handleError('GENERAL_ERROR', { 
                    component: 'SettingsInterface',
                    message: error.message 
                });
            }
        }
    }
    
    /**
     * Initialize the error handler
     */
    initializeErrorHandler() {
        if (!this.stateManager || !this.themeManager) {
            console.warn('StateManager and ThemeManager must be initialized before ErrorHandler');
            return;
        }
        
        try {
            // Create error handler
            this.errorHandler = new ErrorHandler(this, this.stateManager, this.themeManager);
            console.log('ErrorHandler initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ErrorHandler:', error);
            // If error handler fails to initialize, we can't use it for error handling
            // Fall back to basic error indication
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Connect StateManager to WaveRenderer for smooth state transitions
     */
    connectStateManagerToRenderer() {
        if (!this.waveRenderer || !this.stateManager) return;
        
        // Create animation loop that updates state manager
        const updateStateManager = () => {
            if (this.stateManager && this.waveRenderer) {
                const stateConfig = this.stateManager.update();
                this.waveRenderer.updateFromStateManager(stateConfig);
            }
            requestAnimationFrame(updateStateManager);
        };
        
        requestAnimationFrame(updateStateManager);
    }
    
    /**
     * Handle initialization errors gracefully
     */
    handleInitializationError(error) {
        console.error('WaveInterface initialization failed:', error);
        
        // Create fallback content
        this.container.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #64a4df;
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <div style="font-size: 18px; margin-bottom: 10px;">
                        Wave visualization unavailable
                    </div>
                    <div style="font-size: 14px; opacity: 0.7;">
                        Audio functionality remains active
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get the WaveRenderer instance for external control
     */
    getRenderer() {
        return this.waveRenderer;
    }
    
    /**
     * Set wave amplitude for responsive animations
     */
    setAmplitude(amplitude) {
        try {
            if (this.waveRenderer) {
                this.waveRenderer.setTargetAmplitude(amplitude);
            }
        } catch (error) {
            console.error('Error setting amplitude:', error);
            if (this.errorHandler) {
                this.errorHandler.handleError('GENERAL_ERROR', { 
                    operation: 'setAmplitude',
                    message: error.message 
                });
            }
        }
    }
    
    /**
     * Update wave visualization with user input data
     */
    updateWithUserInput(waveData) {
        try {
            // Transition to listening state if not already
            if (this.stateManager && this.stateManager.getCurrentState() !== this.stateManager.states.LISTENING) {
                this.stateManager.transitionTo(this.stateManager.states.LISTENING);
            }
            
            if (this.waveRenderer) {
                this.waveRenderer.updateWithUserInput(waveData);
            }
        } catch (error) {
            console.error('Error updating with user input:', error);
            if (this.errorHandler) {
                this.errorHandler.handleAudioError(error);
            }
        }
    }
    
    /**
     * Update wave visualization with bot response data
     */
    updateWithBotResponse(waveData) {
        try {
            // Transition to speaking state if not already
            if (this.stateManager && this.stateManager.getCurrentState() !== this.stateManager.states.SPEAKING) {
                this.stateManager.transitionTo(this.stateManager.states.SPEAKING);
            }
            
            if (this.waveRenderer) {
                this.waveRenderer.updateWithBotResponse(waveData);
            }
        } catch (error) {
            console.error('Error updating with bot response:', error);
            if (this.errorHandler) {
                this.errorHandler.handleAudioError(error);
            }
        }
    }
    
    /**
     * Transition to baseline wave state
     */
    transitionToBaseline() {
        try {
            if (this.stateManager) {
                this.stateManager.transitionTo(this.stateManager.states.IDLE);
            }
            
            if (this.waveRenderer) {
                this.waveRenderer.transitionToBaseline();
            }
        } catch (error) {
            console.error('Error transitioning to baseline:', error);
            if (this.errorHandler) {
                this.errorHandler.handleError('GENERAL_ERROR', { 
                    operation: 'transitionToBaseline',
                    message: error.message 
                });
            }
        }
    }
    
    /**
     * Transition to processing state
     */
    transitionToProcessing() {
        if (this.stateManager) {
            this.stateManager.transitionTo(this.stateManager.states.PROCESSING);
        }
    }
    
    /**
     * Transition to listening state
     */
    transitionToListening() {
        if (this.stateManager) {
            this.stateManager.transitionTo(this.stateManager.states.LISTENING);
        }
    }
    
    /**
     * Transition to speaking state
     */
    transitionToSpeaking() {
        if (this.stateManager) {
            this.stateManager.transitionTo(this.stateManager.states.SPEAKING);
        }
    }
    
    /**
     * Transition to error state
     */
    transitionToError(errorType = 'GENERAL_ERROR', errorDetails = {}) {
        try {
            if (this.errorHandler) {
                // Use error handler for proper visual feedback
                this.errorHandler.handleError(errorType, errorDetails);
            } else if (this.stateManager) {
                // Fallback to direct state transition
                this.stateManager.transitionTo(this.stateManager.states.ERROR);
            }
        } catch (error) {
            console.error('Error transitioning to error state:', error);
            // Last resort - basic error indication
            this.handleInitializationError(error);
        }
    }
    
    /**
     * Get current animation state
     */
    getCurrentState() {
        return this.stateManager ? this.stateManager.getCurrentState() : 'unknown';
    }
    
    /**
     * Check if currently transitioning between states
     */
    isTransitioning() {
        return this.stateManager ? this.stateManager.isCurrentlyTransitioning() : false;
    }
    
    /**
     * Update state manager configuration
     */
    updateStateConfig(stateId, config) {
        if (this.stateManager) {
            this.stateManager.updateStateConfig(stateId, config);
        }
    }
    
    /**
     * Update transition settings
     */
    updateTransitionSettings(settings) {
        if (this.stateManager) {
            this.stateManager.updateTransitionSettings(settings);
        }
    }
    
    /**
     * Update wave configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.waveRenderer) {
            this.waveRenderer.updateConfig(newConfig);
        }
    }
    
    /**
     * Update canvas background color
     */
    updateCanvasBackground(backgroundColor) {
        if (this.container) {
            this.container.style.backgroundColor = backgroundColor;
        }
    }
    
    /**
     * Get the ThemeManager instance
     */
    getThemeManager() {
        return this.themeManager;
    }
    
    /**
     * Get the AccessibilityController instance
     */
    getAccessibilityController() {
        return this.accessibilityController;
    }
    
    /**
     * Get the SettingsInterface instance
     */
    getSettingsInterface() {
        return this.settingsInterface;
    }
    
    /**
     * Get the ErrorHandler instance
     */
    getErrorHandler() {
        return this.errorHandler;
    }
    
    /**
     * Set the active theme
     */
    setTheme(themeId, transitionDuration = null) {
        if (this.themeManager) {
            return this.themeManager.setTheme(themeId, transitionDuration);
        }
        return false;
    }
    
    /**
     * Get available themes
     */
    getAvailableThemes() {
        if (this.themeManager) {
            return this.themeManager.getAvailableThemes();
        }
        return [];
    }
    
    /**
     * Get current theme
     */
    getCurrentTheme() {
        if (this.themeManager) {
            return this.themeManager.getCurrentTheme();
        }
        return null;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.errorHandler) {
            this.errorHandler.destroy();
            this.errorHandler = null;
        }
        
        if (this.settingsInterface) {
            this.settingsInterface.destroy();
            this.settingsInterface = null;
        }
        
        if (this.accessibilityController) {
            this.accessibilityController.destroy();
            this.accessibilityController = null;
        }
        
        if (this.waveRenderer) {
            this.waveRenderer.destroy();
            this.waveRenderer = null;
        }
        
        if (this.stateManager) {
            this.stateManager.destroy();
            this.stateManager = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.resizeCanvas);
        window.removeEventListener('orientationchange', this.resizeCanvas);
        window.removeEventListener('themeChanged', this.setupThemeEventListeners);
        
        this.themeManager = null;
        this.isInitialized = false;
        console.log('WaveInterface destroyed');
    }
    
    /**
     * Check if interface is properly initialized
     */
    isReady() {
        return this.isInitialized && this.canvas && this.ctx && this.waveRenderer;
    }
}