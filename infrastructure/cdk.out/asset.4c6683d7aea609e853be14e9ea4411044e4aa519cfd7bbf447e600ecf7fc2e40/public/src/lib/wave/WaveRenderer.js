/**
 * WaveRenderer - Core Canvas-based rendering engine for wave animations
 * Handles baseline wave generation and user input responsive wave animations
 */
export class WaveRenderer {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.animationId = null;
        this.isRunning = false;

        // Default wave configuration with calming parameters
        this.config = {
            waves: {
                baselineAmplitude: 65,        // Maximum baseline amplitude for prominent idle waves
                maxAmplitude: 600,            // Extreme maximum amplitude for dramatic responsive waves
                frequency: 0.025,             // Faster, more energetic frequency
                waveCount: 7,                 // Maximum layers for rich depth
                smoothingFactor: 0.05,        // Very fast, responsive transitions
                phaseSpeed: 0.8,              // Very fast, dramatic phase movement
                userInputFrequencyScale: 3.0, // Maximum scale factor for extreme frequency variations
                userInputHarmonicScale: 1.5,  // Maximum scale factor for complex harmonic patterns
                ...config.waves
            },
            animation: {
                frameRate: 60,
                transitionDuration: 800,      // Longer transitions for PTSD-friendly experience
                easing: 'ease-out',
                stateTransitionDuration: 500, // Duration for state transitions
                ...config.animation
            },
            theme: {
                backgroundColor: '#0a0e1a',   // Deep calming blue
                baselineColor: '#40a4df',     // Soft blue for baseline waves
                userInputColor: '#60c4ff',    // Brighter blue for user input
                botOutputColor: '#7dd3c0',    // Soft teal/green for bot responses
                accentColor: '#a8e6cf',       // Lighter accent for bot wave layers
                opacity: {
                    primary: 0.4,             // Primary wave opacity
                    secondary: 0.25,          // Secondary wave layers
                    tertiary: 0.15,           // Background wave layers
                    botPrimary: 0.45,         // Bot response primary opacity
                    botSecondary: 0.3,        // Bot response secondary opacity
                    botTertiary: 0.18         // Bot response tertiary opacity
                },
                ...config.theme
            }
        };

        // Animation state with user input and bot response responsiveness
        this.state = {
            time: 0,
            amplitude: this.config.waves.baselineAmplitude,
            targetAmplitude: this.config.waves.baselineAmplitude,
            phase: 0,
            lastFrameTime: 0,

            // Current animation state
            currentState: 'baseline', // 'baseline', 'userInput', 'botResponse'
            currentStateColor: null,  // Current color based on state
            currentWaveData: null,
            stateTransition: {
                isTransitioning: false,
                startTime: 0,
                duration: 0,
                fromState: 'baseline',
                toState: 'baseline'
            },

            // Frequency and harmonic responsiveness
            baseFrequency: 0.015,
            currentFrequency: 0.015,
            targetFrequency: 0.015,
            harmonicInfluence: new Array(8).fill(0),
            targetHarmonicInfluence: new Array(8).fill(0),

            // Bot response specific state
            botResponseData: null,
            botPhaseOffset: 0,
            botWavePattern: 'flowing' // 'flowing', 'pulsing', 'gentle'
        };

        // Wave parameters for multiple layers
        this.waveParams = this.initializeWaveParameters();

        // Initialize state color to baseline
        this.state.currentStateColor = this.config.theme.baselineColor;

        this.setupCanvas();
    }

    /**
     * Initialize wave parameters for multiple layers with calming variations
     */
    initializeWaveParameters() {
        const params = [];

        for (let i = 0; i < this.config.waves.waveCount; i++) {
            params.push({
                amplitudeMultiplier: 1 - (i * 0.15),     // Decreasing amplitude
                frequencyMultiplier: 1 + (i * 0.2),      // Slightly varying frequency
                phaseOffset: (i * Math.PI) / 2.5,        // Phase offset for depth
                opacityMultiplier: 1 - (i * 0.2),        // Decreasing opacity
                verticalOffset: (i - 2) * 15,            // Centered offsets with proper spacing
                speedMultiplier: 1 + (i * 0.1)          // Slightly different speeds
            });
        }

        return params;
    }

    /**
     * Setup canvas with high-DPI support and smooth rendering
     */
    setupCanvas() {
        if (!this.ctx) {
            throw new Error('Failed to get 2D canvas context');
        }

        // Enable smooth rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Set line cap for smoother wave lines
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    /**
     * Start the animation loop with proper 60fps timing
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.state.lastFrameTime = performance.now();

        const animate = (currentTime) => {
            if (!this.isRunning) return;

            // Calculate delta time for consistent animation speed
            const deltaTime = currentTime - this.state.lastFrameTime;
            this.state.lastFrameTime = currentTime;

            this.update(deltaTime);
            this.render();

            this.animationId = requestAnimationFrame(animate);
        };

        this.animationId = requestAnimationFrame(animate);
    }

    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Update animation state with smooth transitions and user input responsiveness
     */
    update(deltaTime) {
        const deltaSeconds = deltaTime * 0.001;

        // Update time
        this.state.time += deltaSeconds;

        // Handle state transitions
        this.updateStateTransitions(deltaSeconds);

        // Smooth amplitude transitions using exponential smoothing
        // Use more responsive smoothing for audio input
        const amplitudeSmoothing = this.state.currentState === 'userInput' || this.state.currentState === 'botResponse'
            ? 0.7  // Extremely responsive for dramatic audio input
            : this.config.waves.smoothingFactor; // Default smoothing for baseline
        const amplitudeDiff = this.state.targetAmplitude - this.state.amplitude;
        this.state.amplitude += amplitudeDiff * amplitudeSmoothing;

        // Smooth frequency transitions for user input responsiveness
        const frequencySmoothing = this.state.currentState === 'userInput' || this.state.currentState === 'botResponse'
            ? 0.6  // Extremely responsive for dramatic audio input
            : this.config.waves.smoothingFactor; // Default smoothing for baseline
        const frequencyDiff = this.state.targetFrequency - this.state.currentFrequency;
        this.state.currentFrequency += frequencyDiff * frequencySmoothing;

        // Smooth harmonic influence transitions
        const harmonicSmoothing = this.state.currentState === 'userInput' || this.state.currentState === 'botResponse'
            ? 0.6  // Extremely responsive for dramatic audio input
            : this.config.waves.smoothingFactor; // Default smoothing for baseline
        for (let i = 0; i < this.state.harmonicInfluence.length; i++) {
            const harmonicDiff = this.state.targetHarmonicInfluence[i] - this.state.harmonicInfluence[i];
            this.state.harmonicInfluence[i] += harmonicDiff * harmonicSmoothing;
        }

        // Update phase for gentle wave movement with frequency responsiveness
        const phaseSpeed = this.config.waves.phaseSpeed * (this.state.currentFrequency / this.state.baseFrequency);
        this.state.phase += phaseSpeed * deltaSeconds;

        // Keep phase within reasonable bounds to prevent overflow
        if (this.state.phase > Math.PI * 2) {
            this.state.phase -= Math.PI * 2;
        }
    }

    /**
     * Update state transitions for smooth changes between baseline and user input
     */
    updateStateTransitions(deltaSeconds) {
        if (!this.state.stateTransition.isTransitioning) return;

        const elapsed = this.state.time - this.state.stateTransition.startTime;
        const progress = Math.min(elapsed / this.state.stateTransition.duration, 1.0);

        // Use easing function for smooth transitions
        const easedProgress = this.easeOutCubic(progress);

        // Apply transition effects based on state change
        if (this.state.stateTransition.toState === 'userInput') {
            // Transitioning to user input state
            this.applyUserInputTransition(easedProgress);
        } else if (this.state.stateTransition.toState === 'botResponse') {
            // Transitioning to bot response state
            this.applyBotResponseTransition(easedProgress);
        } else if (this.state.stateTransition.toState === 'baseline') {
            // Transitioning back to baseline state
            this.applyBaselineTransition(easedProgress);
        }

        // Complete transition when done
        if (progress >= 1.0) {
            this.state.stateTransition.isTransitioning = false;
            this.state.currentState = this.state.stateTransition.toState;
        }
    }

    /**
     * Apply user input transition effects
     */
    applyUserInputTransition(progress) {
        // Smoothly transition color and visual properties for user input
        // This will be used in the rendering phase
    }

    /**
     * Apply baseline transition effects
     */
    applyBaselineTransition(progress) {
        // Smoothly transition back to baseline visual properties
        // This will be used in the rendering phase
    }

    /**
     * Apply bot response transition effects
     */
    applyBotResponseTransition(progress) {
        // Smoothly transition to bot response visual properties
        // Update bot-specific wave pattern and phase offset
        this.state.botPhaseOffset = progress * Math.PI * 0.5;
    }

    /**
     * Easing function for smooth transitions
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * Main render function
     */
    render() {
        try {
            this.clearCanvas();

            // Render waves based on current state
            if (this.state.currentState === 'botResponse' ||
                (this.state.stateTransition.isTransitioning && this.state.stateTransition.toState === 'botResponse')) {
                this.renderBotResponseWaves();
            } else {
                this.renderBaselineWaves();
            }
        } catch (error) {
            console.error('Canvas rendering error:', error);
            // Emit custom event for error handling
            this.emitRenderError(error);
            // Try to recover with minimal rendering
            this.renderFallback();
        }
    }

    /**
     * Clear canvas with calming background color
     */
    clearCanvas() {
        try {
            const { width, height } = this.canvas;
            this.ctx.fillStyle = this.config.theme.backgroundColor;
            this.ctx.fillRect(0, 0, width, height);
        } catch (error) {
            console.error('Error clearing canvas:', error);
            throw error; // Re-throw to be caught by render()
        }
    }

    /**
     * Emit render error event for error handler
     */
    emitRenderError(error) {
        const event = new CustomEvent('canvasRenderError', {
            detail: { error, renderer: this }
        });
        window.dispatchEvent(event);
    }

    /**
     * Fallback rendering when main render fails
     */
    renderFallback() {
        try {
            // Clear canvas with a safe background color
            const { width, height } = this.canvas;
            this.ctx.fillStyle = '#0a0e1a'; // Safe fallback color
            this.ctx.fillRect(0, 0, width, height);

            // Draw a simple static wave as fallback
            const centerY = height / 2;
            this.ctx.strokeStyle = 'rgba(64, 164, 223, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            for (let x = 0; x <= width; x += 2) {
                const y = centerY + Math.sin(x * 0.01) * 20;
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.stroke();
        } catch (fallbackError) {
            console.error('Fallback rendering also failed:', fallbackError);
            // Last resort - just clear to background color
            try {
                const { width, height } = this.canvas;
                this.ctx.fillStyle = '#0a0e1a';
                this.ctx.fillRect(0, 0, width, height);
            } catch (finalError) {
                console.error('Complete rendering failure:', finalError);
            }
        }
    }

    /**
     * Render gentle baseline wave animations for idle state
     */
    renderBaselineWaves() {
        // USE DISPLAY DIMENSIONS (before DPR scaling) for coordinate calculations
        const width = this.config.canvas?.width || (this.canvas.width / (window.devicePixelRatio || 1));
        const height = this.config.canvas?.height || (this.canvas.height / (window.devicePixelRatio || 1));
        const centerY = height / 2;

        // console.log('Rendering waves - Display:', width, 'x', height, 'Center Y:', centerY);
        // console.log('Canvas actual:', this.canvas.width, 'x', this.canvas.height);
        // console.log('DPR:', window.devicePixelRatio);

        // Render multiple wave layers for depth and richness
        this.waveParams.forEach((params, index) => {
            this.renderWaveLayer(centerY, params, index);
        });
    }

    /**
     * Render bot response wave animations with distinct visual style
     */
    renderBotResponseWaves() {
        // USE DISPLAY DIMENSIONS (before DPR scaling) for coordinate calculations
        const width = this.config.canvas?.width || (this.canvas.width / (window.devicePixelRatio || 1));
        const height = this.config.canvas?.height || (this.canvas.height / (window.devicePixelRatio || 1));
        const centerY = height / 2;

        // Render bot response waves with distinct patterns
        this.waveParams.forEach((params, index) => {
            this.renderBotWaveLayer(centerY, params, index);
        });
    }

    /**
     * Render a single wave layer with specified parameters and user input responsiveness
     */
    renderWaveLayer(centerY, params, layerIndex) {
        const { width } = this.canvas;
        const ctx = this.ctx;

        // Calculate layer-specific properties with user input responsiveness
        const amplitude = this.state.amplitude * params.amplitudeMultiplier;
        const frequency = this.state.currentFrequency * params.frequencyMultiplier;
        const phase = this.state.phase * params.speedMultiplier + params.phaseOffset;
        const yOffset = centerY + params.verticalOffset;

        // Debug logging for first layer only
        // if (layerIndex === 0 && Math.random() < 0.01) {
        //     console.log(`Layer ${layerIndex}: centerY=${centerY}, verticalOffset=${params.verticalOffset}, yOffset=${yOffset}`);
        // }

        // Determine color and opacity based on current state
        const { color, opacity } = this.getLayerVisualProperties(layerIndex, params);

        // Set stroke style with calculated opacity
        ctx.strokeStyle = this.hexToRgba(color, opacity);
        ctx.lineWidth = 2.5 - (layerIndex * 0.3); // Varying line width for depth

        // Begin wave path
        ctx.beginPath();

        // Generate smooth sine wave with user input responsive harmonics
        for (let x = 0; x <= width; x += 1.5) {
            // Primary sine wave
            let y = Math.sin((x * frequency) + phase) * amplitude;

            // Add user input responsive harmonics
            y += this.calculateUserResponsiveHarmonics(x, frequency, phase, amplitude, layerIndex);

            // Apply gentle vertical offset and add to center
            const finalY = yOffset + y;

            if (x === 0) {
                ctx.moveTo(x, finalY);
            } else {
                ctx.lineTo(x, finalY);
            }
        }

        ctx.stroke();
    }

    /**
     * Render a bot response wave layer with distinct visual characteristics
     */
    renderBotWaveLayer(centerY, params, layerIndex) {
        const { width } = this.canvas;
        const ctx = this.ctx;

        // Calculate layer-specific properties with bot response characteristics
        const amplitude = this.state.amplitude * params.amplitudeMultiplier;
        const frequency = this.state.currentFrequency * params.frequencyMultiplier;
        const phase = this.state.phase * params.speedMultiplier + params.phaseOffset + this.state.botPhaseOffset;
        const yOffset = centerY + params.verticalOffset;

        // Determine color and opacity for bot response
        const { color, opacity } = this.getLayerVisualProperties(layerIndex, params);

        // Set stroke style with calculated opacity
        ctx.strokeStyle = this.hexToRgba(color, opacity);
        ctx.lineWidth = 2.8 - (layerIndex * 0.25); // Slightly thicker lines for bot response

        // Begin wave path
        ctx.beginPath();

        // Generate bot response wave pattern - more flowing and organic
        for (let x = 0; x <= width; x += 1.2) {
            let y = 0;

            // Primary flowing wave with bot-specific characteristics
            if (this.state.botWavePattern === 'flowing') {
                y = this.calculateFlowingWave(x, frequency, phase, amplitude, layerIndex);
            } else if (this.state.botWavePattern === 'pulsing') {
                y = this.calculatePulsingWave(x, frequency, phase, amplitude, layerIndex);
            } else {
                y = this.calculateGentleWave(x, frequency, phase, amplitude, layerIndex);
            }

            // Add bot response responsive harmonics
            y += this.calculateBotResponsiveHarmonics(x, frequency, phase, amplitude, layerIndex);

            // Apply gentle vertical offset and add to center
            const finalY = yOffset + y;

            if (x === 0) {
                ctx.moveTo(x, finalY);
            } else {
                ctx.lineTo(x, finalY);
            }
        }

        ctx.stroke();
    }

    /**
     * Calculate flowing wave pattern for bot responses
     */
    calculateFlowingWave(x, frequency, phase, amplitude, layerIndex) {
        // Create a more organic, flowing wave pattern
        const primaryWave = Math.sin((x * frequency) + phase) * amplitude;
        const secondaryWave = Math.sin((x * frequency * 0.7) + (phase * 1.3)) * (amplitude * 0.3);
        const tertiaryWave = Math.sin((x * frequency * 1.4) + (phase * 0.8)) * (amplitude * 0.15);

        // Add layer-specific phase variations for depth
        const layerPhase = layerIndex * Math.PI * 0.25;
        const layerWave = Math.sin((x * frequency * 0.5) + phase + layerPhase) * (amplitude * 0.2);

        return primaryWave + secondaryWave + tertiaryWave + layerWave;
    }

    /**
     * Calculate pulsing wave pattern for bot responses
     */
    calculatePulsingWave(x, frequency, phase, amplitude, layerIndex) {
        // Create a pulsing wave pattern with gentle amplitude modulation
        const pulseFreq = frequency * 0.3;
        const pulseModulation = (Math.sin(phase * 2) + 1) * 0.5; // 0 to 1
        const modifiedAmplitude = amplitude * (0.6 + pulseModulation * 0.4);

        const primaryWave = Math.sin((x * frequency) + phase) * modifiedAmplitude;
        const harmonicWave = Math.sin((x * frequency * 2.1) + (phase * 1.5)) * (modifiedAmplitude * 0.2);

        return primaryWave + harmonicWave;
    }

    /**
     * Calculate gentle wave pattern for bot responses
     */
    calculateGentleWave(x, frequency, phase, amplitude, layerIndex) {
        // Create a very gentle, calming wave pattern
        const primaryWave = Math.sin((x * frequency) + phase) * amplitude;
        const gentleHarmonic = Math.sin((x * frequency * 0.6) + (phase * 0.9)) * (amplitude * 0.25);

        return primaryWave + gentleHarmonic;
    }

    /**
     * Calculate bot responsive harmonics for dynamic wave shapes
     */
    calculateBotResponsiveHarmonics(x, frequency, phase, amplitude, layerIndex) {
        let harmonicSum = 0;

        // Base harmonics for organic bot response feel
        harmonicSum += Math.sin((x * frequency * 1.8) + (phase * 1.2)) * (amplitude * 0.12);
        harmonicSum += Math.sin((x * frequency * 0.9) + (phase * 0.7)) * (amplitude * 0.08);

        // Add bot response specific harmonics
        if (this.state.harmonicInfluence && this.state.harmonicInfluence.length > 0) {
            for (let i = 0; i < Math.min(4, this.state.harmonicInfluence.length); i++) {
                const harmonicFreq = frequency * (1.5 + i * 0.4);
                const harmonicPhase = phase * (1.1 + i * 0.2);
                const harmonicAmplitude = amplitude * this.state.harmonicInfluence[i] * (0.08 - layerIndex * 0.015);

                harmonicSum += Math.sin((x * harmonicFreq) + harmonicPhase) * harmonicAmplitude;
            }
        }

        return harmonicSum;
    }

    /**
     * Update theme configuration with smooth transitions
     */
    updateTheme(newTheme) {
        // Preserve the existing opacity structure when updating theme
        const existingOpacity = this.config.theme.opacity;
        this.config.theme = { ...this.config.theme, ...newTheme };

        // If the new theme doesn't have the detailed opacity structure, preserve the existing one
        if (newTheme.opacity && typeof newTheme.opacity === 'number') {
            // ThemeManager provides a single opacity value, convert it to our structure
            const baseOpacity = newTheme.opacity;
            this.config.theme.opacity = {
                primary: baseOpacity * 0.5,
                secondary: baseOpacity * 0.3125,
                tertiary: baseOpacity * 0.1875,
                botPrimary: baseOpacity * 0.5625,
                botSecondary: baseOpacity * 0.375,
                botTertiary: baseOpacity * 0.225
            };
        } else if (!newTheme.opacity) {
            // Keep existing opacity structure if none provided
            this.config.theme.opacity = existingOpacity;
        }
    }

    /**
     * Get visual properties (color, opacity) for a wave layer based on current state
     */
    getLayerVisualProperties(layerIndex, params) {
        let baseColor = this.config.theme.baselineColor;
        let baseOpacity = (this.config.theme.opacity?.primary || 0.4) * params.opacityMultiplier;

        // Apply state-based color transitions
        if (this.state.currentState === 'userInput' ||
            (this.state.stateTransition.isTransitioning && this.state.stateTransition.toState === 'userInput')) {
            const userInputColor = this.config.theme.userInputColor || this.config.theme.baselineColor;

            if (this.state.stateTransition.isTransitioning) {
                // Blend colors during transition
                const progress = this.getTransitionProgress();
                if (this.state.stateTransition.toState === 'userInput') {
                    baseColor = this.blendColors(baseColor, userInputColor, progress);
                } else {
                    baseColor = this.blendColors(userInputColor, baseColor, progress);
                }
            } else if (this.state.currentState === 'userInput') {
                baseColor = userInputColor;
                // Slightly increase opacity for user input to make it more prominent
                baseOpacity *= 1.2;
            }
        } else if (this.state.currentState === 'botResponse' ||
            (this.state.stateTransition.isTransitioning && this.state.stateTransition.toState === 'botResponse')) {
            const botResponseColor = this.config.theme.botOutputColor || this.config.theme.baselineColor;
            const botAccentColor = this.config.theme.accentColor || this.config.theme.baselineColor;

            if (this.state.stateTransition.isTransitioning) {
                // Blend colors during transition to bot response
                const progress = this.getTransitionProgress();
                if (this.state.stateTransition.toState === 'botResponse') {
                    baseColor = this.blendColors(baseColor, botResponseColor, progress);
                } else {
                    baseColor = this.blendColors(botResponseColor, baseColor, progress);
                }
            } else if (this.state.currentState === 'botResponse') {
                // Use different colors for different layers to create depth
                baseColor = layerIndex % 2 === 0 ? botResponseColor : botAccentColor;
                // Use bot-specific opacity values
                const opacityKey = layerIndex === 0 ? 'botPrimary' :
                    layerIndex === 1 ? 'botSecondary' : 'botTertiary';
                baseOpacity = (this.config.theme.opacity?.[opacityKey] || 0.4) * params.opacityMultiplier;
            }
        }

        // Use current state color if set by StateManager
        if (this.state.currentStateColor) {
            baseColor = this.state.currentStateColor;
        }



        return { color: baseColor, opacity: baseOpacity };
    }

    /**
     * Get current transition progress (0-1)
     */
    getTransitionProgress() {
        if (!this.state.stateTransition.isTransitioning) {
            return this.state.currentState === 'baseline' ? 0 : 1;
        }

        const elapsed = this.state.time - this.state.stateTransition.startTime;
        const progress = Math.min(elapsed / this.state.stateTransition.duration, 1.0);
        return this.easeOutCubic(progress);
    }

    /**
     * Blend two hex colors with given ratio (0-1)
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
     * Get visual properties (color, opacity) for a wave layer based on current state
     */
    getLayerVisualProperties(layerIndex, params) {
        let baseColor = this.config.theme.baselineColor;
        let baseOpacity = (this.config.theme.opacity?.primary || 0.4) * params.opacityMultiplier;

        // Apply state-based color transitions
        if (this.state.currentState === 'userInput' ||
            (this.state.stateTransition.isTransitioning && this.state.stateTransition.toState === 'userInput')) {
            const userInputColor = this.config.theme.userInputColor || this.config.theme.baselineColor;

            if (this.state.stateTransition.isTransitioning) {
                // Blend colors during transition
                const progress = this.getTransitionProgress();
                if (this.state.stateTransition.toState === 'userInput') {
                    baseColor = this.blendColors(baseColor, userInputColor, progress);
                } else {
                    baseColor = this.blendColors(userInputColor, baseColor, progress);
                }
            } else if (this.state.currentState === 'userInput') {
                baseColor = userInputColor;
                // Slightly increase opacity for user input to make it more prominent
                baseOpacity *= 1.2;
            }
        } else if (this.state.currentState === 'botResponse' ||
            (this.state.stateTransition.isTransitioning && this.state.stateTransition.toState === 'botResponse')) {
            const botResponseColor = this.config.theme.botOutputColor || this.config.theme.baselineColor;
            const botAccentColor = this.config.theme.accentColor || this.config.theme.baselineColor;

            if (this.state.stateTransition.isTransitioning) {
                // Blend colors during transition to bot response
                const progress = this.getTransitionProgress();
                if (this.state.stateTransition.toState === 'botResponse') {
                    baseColor = this.blendColors(baseColor, botResponseColor, progress);
                } else {
                    baseColor = this.blendColors(botResponseColor, baseColor, progress);
                }
            } else if (this.state.currentState === 'botResponse') {
                // Use different colors for different layers to create depth
                baseColor = layerIndex % 2 === 0 ? botResponseColor : botAccentColor;
                // Use bot-specific opacity values
                const opacityKey = layerIndex === 0 ? 'botPrimary' :
                    layerIndex === 1 ? 'botSecondary' : 'botTertiary';
                baseOpacity = (this.config.theme.opacity?.[opacityKey] || 0.4) * params.opacityMultiplier;
            }
        }

        return { color: baseColor, opacity: baseOpacity };
    }

    /**
     * Calculate user responsive harmonics for more dynamic wave shapes
     */
    calculateUserResponsiveHarmonics(x, frequency, phase, amplitude, layerIndex) {
        let harmonicSum = 0;

        // Base harmonics for organic feel
        harmonicSum += Math.sin((x * frequency * 2.1) + (phase * 1.3)) * (amplitude * 0.15);
        harmonicSum += Math.sin((x * frequency * 0.7) + (phase * 0.8)) * (amplitude * 0.1);

        // Add user input responsive harmonics
        if (this.state.harmonicInfluence && this.state.harmonicInfluence.length > 0) {
            for (let i = 0; i < Math.min(4, this.state.harmonicInfluence.length); i++) {
                const harmonicFreq = frequency * (2 + i * 0.5);
                const harmonicPhase = phase * (1 + i * 0.3);
                const harmonicAmplitude = amplitude * this.state.harmonicInfluence[i] * (0.1 - layerIndex * 0.02);

                harmonicSum += Math.sin((x * harmonicFreq) + harmonicPhase) * harmonicAmplitude;
            }
        }

        return harmonicSum;
    }

    /**
     * Update wave visualization with bot response data
     */
    updateWithBotResponse(waveData) {
        if (!waveData) {
            this.transitionToBaseline();
            return;
        }

        // Store bot response wave data
        this.state.botResponseData = waveData;

        // Transition to bot response state if not already
        if (this.state.currentState !== 'botResponse' && !this.state.stateTransition.isTransitioning) {
            this.transitionToBotResponse();
        }

        // Update amplitude with bot response characteristics
        this.setTargetAmplitude(waveData.smoothedAmplitude * 0.9); // Slightly gentler than user input

        // Update frequency for bot response (typically more stable)
        this.updateBotFrequencyFromInput(waveData.frequency);

        // Update harmonic influence with bot-specific scaling
        this.updateBotHarmonicInfluence(waveData.harmonics);

        // Set bot wave pattern based on amplitude
        this.updateBotWavePattern(waveData.smoothedAmplitude);
    }

    /**
     * Update bot frequency from input with bot-specific characteristics
     */
    updateBotFrequencyFromInput(inputFrequency) {
        // Bot responses tend to be more stable and lower in frequency
        const normalizedFreq = Math.max(100, Math.min(inputFrequency, 1500)); // Narrower range for bot
        const freqScale = 0.6; // More conservative frequency scaling for bot

        // Convert to wave frequency with bot-specific mapping
        const mappedFrequency = this.state.baseFrequency * (1 + (normalizedFreq - 300) / 800 * freqScale);
        this.state.targetFrequency = Math.max(0.008, Math.min(mappedFrequency, 0.035));
    }

    /**
     * Update bot harmonic influence with bot-specific scaling
     */
    updateBotHarmonicInfluence(harmonics) {
        if (!harmonics || harmonics.length === 0) return;

        const scale = 0.25; // More subtle harmonic influence for bot responses
        for (let i = 0; i < Math.min(harmonics.length, this.state.targetHarmonicInfluence.length); i++) {
            this.state.targetHarmonicInfluence[i] = harmonics[i] * scale;
        }
    }

    /**
     * Update bot wave pattern based on amplitude
     */
    updateBotWavePattern(amplitude) {
        if (amplitude < 30) {
            this.state.botWavePattern = 'gentle';
        } else if (amplitude < 70) {
            this.state.botWavePattern = 'flowing';
        } else {
            this.state.botWavePattern = 'pulsing';
        }
    }

    /**
     * Get current transition progress (0-1)
     */
    getTransitionProgress() {
        if (!this.state.stateTransition.isTransitioning) {
            return this.state.currentState === 'baseline' ? 0 : 1;
        }

        const elapsed = this.state.time - this.state.stateTransition.startTime;
        const progress = Math.min(elapsed / this.state.stateTransition.duration, 1.0);
        return this.easeOutCubic(progress);
    }

    /**
     * Blend two hex colors with given ratio (0-1)
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
     * Convert hex color to rgba with specified alpha
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Set target amplitude for smooth transitions
     */
    setTargetAmplitude(amplitude) {
        this.state.targetAmplitude = Math.max(0, Math.min(amplitude, this.config.waves.maxAmplitude));
    }

    /**
     * Update wave visualization with user input data
     */
    updateWithUserInput(waveData) {
        if (!waveData) {
            this.transitionToBaseline();
            return;
        }

        // Store current wave data
        this.state.currentWaveData = waveData;

        // Transition to user input state if not already
        if (this.state.currentState !== 'userInput' && !this.state.stateTransition.isTransitioning) {
            this.transitionToUserInput();
        }

        // Update amplitude
        this.setTargetAmplitude(waveData.smoothedAmplitude);



        // Update frequency based on user input
        this.updateFrequencyFromInput(waveData.frequency);

        // Update harmonic influence
        this.updateHarmonicInfluence(waveData.harmonics);
    }

    /**
     * Update frequency based on user input
     */
    updateFrequencyFromInput(inputFrequency) {
        // Map input frequency to wave frequency with scaling
        const normalizedFreq = Math.max(80, Math.min(inputFrequency, 2000)); // Clamp frequency range
        const freqScale = this.config.waves.userInputFrequencyScale;

        // Convert to wave frequency (lower frequencies for calming effect)
        const mappedFrequency = this.state.baseFrequency * (1 + (normalizedFreq - 440) / 1000 * freqScale);
        this.state.targetFrequency = Math.max(0.005, Math.min(mappedFrequency, 0.05));
    }

    /**
     * Update harmonic influence from user input
     */
    updateHarmonicInfluence(harmonics) {
        if (!harmonics || harmonics.length === 0) return;

        const scale = this.config.waves.userInputHarmonicScale;
        for (let i = 0; i < Math.min(harmonics.length, this.state.targetHarmonicInfluence.length); i++) {
            this.state.targetHarmonicInfluence[i] = harmonics[i] * scale;
        }
    }

    /**
     * Transition to user input responsive state
     */
    transitionToUserInput() {
        if (this.state.stateTransition.isTransitioning &&
            this.state.stateTransition.toState === 'userInput') {
            return; // Already transitioning to user input
        }

        this.state.stateTransition = {
            isTransitioning: true,
            startTime: this.state.time,
            duration: this.config.animation.stateTransitionDuration * 0.001, // Convert to seconds
            fromState: this.state.currentState,
            toState: 'userInput'
        };
    }

    /**
     * Transition to bot response state
     */
    transitionToBotResponse() {
        if (this.state.stateTransition.isTransitioning &&
            this.state.stateTransition.toState === 'botResponse') {
            return; // Already transitioning to bot response
        }

        this.state.stateTransition = {
            isTransitioning: true,
            startTime: this.state.time,
            duration: this.config.animation.stateTransitionDuration * 0.001, // Convert to seconds
            fromState: this.state.currentState,
            toState: 'botResponse'
        };
    }

    /**
     * Transition back to baseline state
     */
    transitionToBaseline() {
        if (this.state.stateTransition.isTransitioning &&
            this.state.stateTransition.toState === 'baseline') {
            return; // Already transitioning to baseline
        }

        // Reset to baseline values
        this.state.targetAmplitude = this.config.waves.baselineAmplitude;
        this.state.targetFrequency = this.state.baseFrequency;
        this.state.targetHarmonicInfluence.fill(0);
        this.state.currentWaveData = null;

        this.state.stateTransition = {
            isTransitioning: true,
            startTime: this.state.time,
            duration: this.config.animation.stateTransitionDuration * 0.001, // Convert to seconds
            fromState: this.state.currentState,
            toState: 'baseline'
        };
    }

    /**
     * Get current amplitude
     */
    getCurrentAmplitude() {
        return this.state.amplitude;
    }

    /**
     * Update wave configuration
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            waves: { ...this.config.waves, ...newConfig.waves },
            animation: { ...this.config.animation, ...newConfig.animation },
            theme: { ...this.config.theme, ...newConfig.theme }
        };

        // Reinitialize wave parameters if wave count changed
        if (newConfig.waves && newConfig.waves.waveCount !== undefined) {
            this.waveParams = this.initializeWaveParameters();
        }
    }

    /**
     * Resize canvas and maintain proper scaling
     */
    resize() {
        // Canvas resizing is handled by the parent WaveInterface
        // This method can be called to trigger any resize-specific logic
        this.setupCanvas();
    }

    /**
     * Update renderer from StateManager configuration
     */
    updateFromStateManager(stateConfig) {
        if (!stateConfig) return;



        // Update wave parameters based on state configuration
        if (stateConfig.amplitude !== undefined) {
            this.setTargetAmplitude(stateConfig.amplitude * this.config.waves.maxAmplitude);
        }

        if (stateConfig.frequency !== undefined) {
            this.state.targetFrequency = this.state.baseFrequency * (1 + stateConfig.frequency * 2);
        }

        if (stateConfig.speed !== undefined) {
            this.config.waves.phaseSpeed = 0.3 * stateConfig.speed;
        }

        // Update visual properties based on state
        if (stateConfig.color && this.config.theme) {
            this.updateStateVisualProperties(stateConfig);
        }

        // Handle transition progress for smooth state changes
        if (stateConfig.isTransitioning && stateConfig.transitionProgress !== undefined) {
            this.handleStateTransition(stateConfig);

            // Update internal state transition to match StateManager
            this.state.stateTransition = {
                isTransitioning: true,
                startTime: this.state.time - (stateConfig.transitionProgress * 1.0), // Approximate start time
                duration: 1.0, // 1 second default
                fromState: this.state.currentState,
                toState: this.mapStateManagerStateToRendererState(stateConfig.color)
            };
        } else if (!stateConfig.isTransitioning) {
            // Not transitioning, update current state directly
            const newState = this.mapStateManagerStateToRendererState(stateConfig.color);
            if (newState !== this.state.currentState) {

                this.state.currentState = newState;
                this.state.stateTransition.isTransitioning = false;
            }
        }
    }

    /**
     * Map StateManager state to WaveRenderer state
     */
    mapStateManagerStateToRendererState(stateColor) {
        const stateMap = {
            'baseline': 'baseline',
            'userInput': 'userInput',
            'botOutput': 'botResponse',
            'processing': 'baseline',
            'error': 'baseline'
        };

        return stateMap[stateColor] || 'baseline';
    }

    /**
     * Update visual properties based on state configuration
     */
    updateStateVisualProperties(stateConfig) {
        const colorMap = {
            'baseline': this.config.theme.baselineColor,
            'userInput': this.config.theme.userInputColor,
            'botOutput': this.config.theme.botOutputColor,
            'processing': this.config.theme.baselineColor,
            'error': '#ff6b6b' // Soft red for errors
        };

        // Update current color based on state
        const newColor = colorMap[stateConfig.color] || this.config.theme.baselineColor;
        this.state.currentStateColor = newColor;
    }

    /**
     * Handle state transition effects
     */
    handleStateTransition(stateConfig) {
        // Store transition progress for use in rendering
        this.state.stateTransitionProgress = stateConfig.transitionProgress;

        // Apply smoothing factor based on transition progress
        const transitionSmoothing = 0.05 + (stateConfig.smoothing || 0.9) * 0.03;
        this.config.waves.smoothingFactor = transitionSmoothing;
    }

    /**
     * Update state-specific configuration
     */
    updateStateConfig(config) {
        if (!config) return;

        // Apply configuration updates
        Object.keys(config).forEach(key => {
            if (key === 'amplitude') {
                this.setTargetAmplitude(config[key] * this.config.waves.maxAmplitude);
            } else if (key === 'frequency') {
                this.state.targetFrequency = this.state.baseFrequency * (1 + config[key] * 2);
            } else if (key === 'speed') {
                this.config.waves.phaseSpeed = 0.3 * config[key];
            }
        });
    }

    /**
     * Get current animation state for debugging
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stop();
        this.ctx = null;
        this.canvas = null;
    }
}