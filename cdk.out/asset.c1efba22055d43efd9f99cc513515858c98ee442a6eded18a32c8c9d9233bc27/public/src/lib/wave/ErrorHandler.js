/**
 * ErrorHandler - Visual error handling and feedback system for therapeutic wave interface
 * Provides gentle wave-based visual feedback for different error types and performance issues
 */
export class ErrorHandler {
    constructor(waveInterface, stateManager, themeManager) {
        this.waveInterface = waveInterface;
        this.stateManager = stateManager;
        this.themeManager = themeManager;
        
        // Error state tracking
        this.currentError = null;
        this.errorStartTime = 0;
        this.isInErrorState = false;
        this.errorRecoveryTimeout = null;
        
        // Performance monitoring
        this.performanceMonitor = {
            frameCount: 0,
            lastFrameTime: 0,
            frameRate: 60,
            targetFrameRate: 60,
            frameRateHistory: [],
            performanceDegradationLevel: 0, // 0 = normal, 1 = mild, 2 = moderate, 3 = severe
            lastPerformanceCheck: 0
        };
        
        // Error types and their visual configurations
        this.errorTypes = {
            AUDIO_PROCESSING: {
                id: 'audio_processing',
                name: 'Audio Processing Error',
                colorShift: '#d4a574', // Warm amber
                wavePattern: 'gentle',
                amplitude: 0.4,
                frequency: 0.016,
                duration: 3000, // 3 seconds
                recoveryDelay: 1000
            },
            CANVAS_RENDERING: {
                id: 'canvas_rendering',
                name: 'Canvas Rendering Error',
                colorShift: '#c4a484', // Soft brown
                wavePattern: 'minimal',
                amplitude: 0.3,
                frequency: 0.012,
                duration: 2000, // 2 seconds
                recoveryDelay: 500
            },
            NETWORK_CONNECTION: {
                id: 'network_connection',
                name: 'Network Connection Error',
                colorShift: '#b4a494', // Muted gray-brown
                wavePattern: 'interrupted',
                amplitude: 0.35,
                frequency: 0.014,
                duration: 4000, // 4 seconds
                recoveryDelay: 2000
            },
            PERFORMANCE_DEGRADATION: {
                id: 'performance_degradation',
                name: 'Performance Degradation',
                colorShift: '#a4b4c4', // Cool blue-gray
                wavePattern: 'simplified',
                amplitude: 0.25,
                frequency: 0.010,
                duration: 5000, // 5 seconds
                recoveryDelay: 1500
            },
            GENERAL_ERROR: {
                id: 'general_error',
                name: 'General Error',
                colorShift: '#b4a4a4', // Neutral gray
                wavePattern: 'calm',
                amplitude: 0.3,
                frequency: 0.013,
                duration: 3000, // 3 seconds
                recoveryDelay: 1000
            }
        };
        
        // Fallback rendering modes
        this.fallbackModes = {
            MINIMAL: {
                id: 'minimal',
                name: 'Minimal Rendering',
                waveCount: 1,
                complexity: 0.2,
                frameRate: 30
            },
            SIMPLIFIED: {
                id: 'simplified',
                name: 'Simplified Rendering',
                waveCount: 2,
                complexity: 0.5,
                frameRate: 45
            },
            BASIC: {
                id: 'basic',
                name: 'Basic Rendering',
                waveCount: 3,
                complexity: 0.7,
                frameRate: 50
            }
        };
        
        this.currentFallbackMode = null;
        
        // Initialize performance monitoring
        this.startPerformanceMonitoring();
        
        console.log('ErrorHandler initialized');
    }
    
    /**
     * Handle different types of errors with appropriate visual feedback
     */
    handleError(errorType, errorDetails = {}) {
        console.log(`ErrorHandler: Handling error type: ${errorType}`, errorDetails);
        
        const errorConfig = this.errorTypes[errorType] || this.errorTypes.GENERAL_ERROR;
        
        // Store current error state
        this.currentError = {
            type: errorType,
            config: errorConfig,
            details: errorDetails,
            startTime: performance.now()
        };
        
        this.isInErrorState = true;
        this.errorStartTime = performance.now();
        
        // Clear any existing recovery timeout
        if (this.errorRecoveryTimeout) {
            clearTimeout(this.errorRecoveryTimeout);
        }
        
        // Apply visual error feedback
        this.applyErrorVisualFeedback(errorConfig);
        
        // Set up automatic recovery
        this.scheduleErrorRecovery(errorConfig);
        
        // Log error for debugging
        this.logError(errorType, errorDetails);
    }
    
    /**
     * Apply visual feedback for the error
     */
    applyErrorVisualFeedback(errorConfig) {
        try {
            // Transition to error state in StateManager
            if (this.stateManager && this.stateManager.states.ERROR) {
                // Update error state configuration with error-specific settings
                this.stateManager.updateStateConfig(this.stateManager.states.ERROR, {
                    amplitude: errorConfig.amplitude,
                    frequency: errorConfig.frequency,
                    speed: 0.8, // Slightly slower for calming effect
                    color: 'error',
                    smoothing: 0.95 // High smoothing for gentle transitions
                });
                
                // Transition to error state with gentle timing
                this.stateManager.transitionTo(this.stateManager.states.ERROR, 1000, 'gentle');
            }
            
            // Apply color shift through theme manager
            if (this.themeManager) {
                this.applyErrorColorShift(errorConfig.colorShift);
            }
            
            // Apply wave pattern changes
            this.applyErrorWavePattern(errorConfig.wavePattern);
            
        } catch (visualError) {
            console.error('Error applying visual feedback:', visualError);
            // Fallback to minimal error indication
            this.applyMinimalErrorFeedback();
        }
    }
    
    /**
     * Apply error-specific color shift
     */
    applyErrorColorShift(errorColor) {
        try {
            if (!this.themeManager) return;
            
            // Get current theme
            const currentTheme = this.themeManager.getCurrentTheme();
            if (!currentTheme) return;
            
            // Create error theme variant with gentle color shift
            const errorTheme = {
                ...currentTheme,
                baselineColor: errorColor,
                userInputColor: this.blendColors(currentTheme.userInputColor, errorColor, 0.3),
                botOutputColor: this.blendColors(currentTheme.botOutputColor, errorColor, 0.3),
                opacity: {
                    ...currentTheme.opacity,
                    primary: Math.max(0.2, (currentTheme.opacity?.primary || 0.4) * 0.8),
                    secondary: Math.max(0.15, (currentTheme.opacity?.secondary || 0.25) * 0.8)
                }
            };
            
            // Apply error theme temporarily
            this.waveInterface?.getRenderer()?.updateTheme(errorTheme);
            
        } catch (error) {
            console.error('Error applying color shift:', error);
        }
    }
    
    /**
     * Apply error-specific wave pattern
     */
    applyErrorWavePattern(patternType) {
        try {
            const renderer = this.waveInterface?.getRenderer();
            if (!renderer) return;
            
            switch (patternType) {
                case 'gentle':
                    // Very gentle, slow waves
                    renderer.updateConfig({
                        waves: {
                            baselineAmplitude: 20,
                            frequency: 0.012,
                            smoothingFactor: 0.95
                        }
                    });
                    break;
                    
                case 'minimal':
                    // Minimal wave movement
                    renderer.updateConfig({
                        waves: {
                            baselineAmplitude: 15,
                            frequency: 0.008,
                            waveCount: 2,
                            smoothingFactor: 0.98
                        }
                    });
                    break;
                    
                case 'interrupted':
                    // Slightly irregular pattern to indicate connection issues
                    renderer.updateConfig({
                        waves: {
                            baselineAmplitude: 25,
                            frequency: 0.014,
                            phaseSpeed: 0.2, // Slower phase movement
                            smoothingFactor: 0.92
                        }
                    });
                    break;
                    
                case 'simplified':
                    // Simplified rendering for performance issues
                    this.enableFallbackMode('SIMPLIFIED');
                    break;
                    
                case 'calm':
                default:
                    // Default calm error pattern
                    renderer.updateConfig({
                        waves: {
                            baselineAmplitude: 22,
                            frequency: 0.013,
                            smoothingFactor: 0.94
                        }
                    });
                    break;
            }
            
        } catch (error) {
            console.error('Error applying wave pattern:', error);
        }
    }
    
    /**
     * Apply minimal error feedback as fallback
     */
    applyMinimalErrorFeedback() {
        try {
            // Just change the container background color slightly
            const container = this.waveInterface?.container;
            if (container) {
                const originalBg = container.style.backgroundColor || '#0a0e1a';
                container.style.backgroundColor = '#1a0e0a'; // Slightly warmer dark color
                
                // Restore original background after a delay
                setTimeout(() => {
                    if (container) {
                        container.style.backgroundColor = originalBg;
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Error applying minimal error feedback:', error);
        }
    }
    
    /**
     * Schedule automatic error recovery
     */
    scheduleErrorRecovery(errorConfig) {
        this.errorRecoveryTimeout = setTimeout(() => {
            this.recoverFromError();
        }, errorConfig.duration + errorConfig.recoveryDelay);
    }
    
    /**
     * Recover from error state and return to normal operation
     */
    recoverFromError() {
        if (!this.isInErrorState) return;
        
        console.log('ErrorHandler: Recovering from error state');
        
        try {
            // Clear error state
            this.isInErrorState = false;
            this.currentError = null;
            
            // Restore normal theme
            if (this.themeManager) {
                const originalTheme = this.themeManager.getCurrentTheme();
                if (originalTheme && this.waveInterface) {
                    this.waveInterface.getRenderer()?.updateTheme(originalTheme);
                }
            }
            
            // Restore normal wave configuration
            this.restoreNormalWaveConfig();
            
            // Transition back to appropriate state
            if (this.stateManager) {
                // Determine appropriate state to return to
                const targetState = this.determineRecoveryState();
                this.stateManager.transitionTo(targetState, 1500, 'gentle');
            }
            
            // Disable fallback mode if active
            if (this.currentFallbackMode) {
                this.disableFallbackMode();
            }
            
        } catch (error) {
            console.error('Error during recovery:', error);
            // If recovery fails, try again after a delay
            setTimeout(() => this.recoverFromError(), 2000);
        }
    }
    
    /**
     * Restore normal wave configuration
     */
    restoreNormalWaveConfig() {
        try {
            const renderer = this.waveInterface?.getRenderer();
            if (!renderer) return;
            
            // Restore default wave configuration
            renderer.updateConfig({
                waves: {
                    baselineAmplitude: 25,
                    frequency: 0.015,
                    waveCount: 4,
                    phaseSpeed: 0.3,
                    smoothingFactor: 0.08
                }
            });
            
        } catch (error) {
            console.error('Error restoring wave config:', error);
        }
    }
    
    /**
     * Determine appropriate state to recover to
     */
    determineRecoveryState() {
        // Check if we should return to a specific state based on current application state
        // For now, default to IDLE state
        return this.stateManager?.states.IDLE || 'idle';
    }
    
    /**
     * Start performance monitoring for frame rate degradation
     */
    startPerformanceMonitoring() {
        const monitor = () => {
            const now = performance.now();
            
            // Calculate frame rate
            if (this.performanceMonitor.lastFrameTime > 0) {
                const deltaTime = now - this.performanceMonitor.lastFrameTime;
                const currentFPS = 1000 / deltaTime;
                
                this.performanceMonitor.frameRateHistory.push(currentFPS);
                
                // Keep only last 60 frames for average calculation
                if (this.performanceMonitor.frameRateHistory.length > 60) {
                    this.performanceMonitor.frameRateHistory.shift();
                }
                
                // Calculate average frame rate
                const avgFPS = this.performanceMonitor.frameRateHistory.reduce((a, b) => a + b, 0) / 
                              this.performanceMonitor.frameRateHistory.length;
                
                this.performanceMonitor.frameRate = avgFPS;
                
                // Check for performance degradation every 2 seconds
                if (now - this.performanceMonitor.lastPerformanceCheck > 2000) {
                    this.checkPerformanceDegradation(avgFPS);
                    this.performanceMonitor.lastPerformanceCheck = now;
                }
            }
            
            this.performanceMonitor.lastFrameTime = now;
            this.performanceMonitor.frameCount++;
            
            // Continue monitoring
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }
    
    /**
     * Check for performance degradation and apply appropriate fallback
     */
    checkPerformanceDegradation(currentFPS) {
        const targetFPS = this.performanceMonitor.targetFrameRate;
        const fpsRatio = currentFPS / targetFPS;
        
        let newDegradationLevel = 0;
        
        if (fpsRatio < 0.5) { // Less than 30 FPS
            newDegradationLevel = 3; // Severe
        } else if (fpsRatio < 0.7) { // Less than 42 FPS
            newDegradationLevel = 2; // Moderate
        } else if (fpsRatio < 0.85) { // Less than 51 FPS
            newDegradationLevel = 1; // Mild
        }
        
        // Only act if degradation level changed
        if (newDegradationLevel !== this.performanceMonitor.performanceDegradationLevel) {
            this.performanceMonitor.performanceDegradationLevel = newDegradationLevel;
            this.handlePerformanceDegradation(newDegradationLevel, currentFPS);
        }
    }
    
    /**
     * Handle performance degradation with appropriate fallback modes
     */
    handlePerformanceDegradation(level, currentFPS) {
        console.log(`Performance degradation detected: Level ${level}, FPS: ${currentFPS.toFixed(1)}`);
        
        switch (level) {
            case 0:
                // Normal performance - disable any fallback modes
                if (this.currentFallbackMode) {
                    this.disableFallbackMode();
                }
                break;
                
            case 1:
                // Mild degradation - use basic fallback
                this.enableFallbackMode('BASIC');
                break;
                
            case 2:
                // Moderate degradation - use simplified fallback
                this.enableFallbackMode('SIMPLIFIED');
                break;
                
            case 3:
                // Severe degradation - use minimal fallback and show error
                this.enableFallbackMode('MINIMAL');
                this.handleError('PERFORMANCE_DEGRADATION', { 
                    currentFPS: currentFPS.toFixed(1),
                    level: 'severe'
                });
                break;
        }
    }
    
    /**
     * Enable fallback rendering mode
     */
    enableFallbackMode(modeId) {
        const mode = this.fallbackModes[modeId];
        if (!mode) return;
        
        console.log(`Enabling fallback mode: ${mode.name}`);
        
        this.currentFallbackMode = mode;
        
        try {
            const renderer = this.waveInterface?.getRenderer();
            if (renderer) {
                // Apply fallback configuration
                renderer.updateConfig({
                    waves: {
                        waveCount: mode.waveCount,
                        baselineAmplitude: 25 * mode.complexity,
                        maxAmplitude: 120 * mode.complexity,
                        smoothingFactor: 0.08 + (1 - mode.complexity) * 0.1
                    },
                    animation: {
                        frameRate: mode.frameRate
                    }
                });
            }
            
            // Update performance monitor target
            this.performanceMonitor.targetFrameRate = mode.frameRate;
            
        } catch (error) {
            console.error('Error enabling fallback mode:', error);
        }
    }
    
    /**
     * Disable fallback rendering mode
     */
    disableFallbackMode() {
        if (!this.currentFallbackMode) return;
        
        console.log(`Disabling fallback mode: ${this.currentFallbackMode.name}`);
        
        try {
            // Restore normal configuration
            this.restoreNormalWaveConfig();
            
            // Reset performance monitor target
            this.performanceMonitor.targetFrameRate = 60;
            
            this.currentFallbackMode = null;
            
        } catch (error) {
            console.error('Error disabling fallback mode:', error);
        }
    }
    
    /**
     * Handle Canvas-specific errors
     */
    handleCanvasError(error) {
        console.error('Canvas error detected:', error);
        this.handleError('CANVAS_RENDERING', { 
            message: error.message,
            stack: error.stack 
        });
    }
    
    /**
     * Handle audio processing errors
     */
    handleAudioError(error) {
        console.error('Audio processing error detected:', error);
        this.handleError('AUDIO_PROCESSING', { 
            message: error.message,
            stack: error.stack 
        });
    }
    
    /**
     * Handle network/connection errors
     */
    handleNetworkError(error) {
        console.error('Network error detected:', error);
        this.handleError('NETWORK_CONNECTION', { 
            message: error.message,
            stack: error.stack 
        });
    }
    
    /**
     * Blend two hex colors
     */
    blendColors(color1, color2, ratio) {
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);
        
        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Log error for debugging and monitoring
     */
    logError(errorType, errorDetails) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: errorType,
            details: errorDetails,
            performance: {
                frameRate: this.performanceMonitor.frameRate.toFixed(1),
                degradationLevel: this.performanceMonitor.performanceDegradationLevel
            },
            fallbackMode: this.currentFallbackMode?.id || 'none'
        };
        
        console.log('Error logged:', logEntry);
        
        // In a production environment, this could be sent to a logging service
        // For now, we'll store it in sessionStorage for debugging
        try {
            const errorLog = JSON.parse(sessionStorage.getItem('waveErrorLog') || '[]');
            errorLog.push(logEntry);
            
            // Keep only last 50 errors
            if (errorLog.length > 50) {
                errorLog.shift();
            }
            
            sessionStorage.setItem('waveErrorLog', JSON.stringify(errorLog));
        } catch (storageError) {
            console.warn('Could not store error log:', storageError);
        }
    }
    
    /**
     * Get current error state
     */
    getCurrentError() {
        return this.currentError;
    }
    
    /**
     * Check if currently in error state
     */
    isInError() {
        return this.isInErrorState;
    }
    
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return {
            frameRate: this.performanceMonitor.frameRate,
            degradationLevel: this.performanceMonitor.performanceDegradationLevel,
            fallbackMode: this.currentFallbackMode?.id || 'none'
        };
    }
    
    /**
     * Force recovery from error state (for manual intervention)
     */
    forceRecovery() {
        if (this.errorRecoveryTimeout) {
            clearTimeout(this.errorRecoveryTimeout);
        }
        this.recoverFromError();
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.errorRecoveryTimeout) {
            clearTimeout(this.errorRecoveryTimeout);
        }
        
        this.currentError = null;
        this.isInErrorState = false;
        this.currentFallbackMode = null;
        
        console.log('ErrorHandler destroyed');
    }
}