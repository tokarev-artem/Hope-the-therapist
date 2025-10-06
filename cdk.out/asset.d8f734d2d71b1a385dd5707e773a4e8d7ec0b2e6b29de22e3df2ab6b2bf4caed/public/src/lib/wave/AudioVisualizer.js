/**
 * AudioVisualizer - Processes audio data and converts it to wave visualization parameters
 * Integrates with existing Web Audio API pipeline to provide real-time audio analysis
 */
export class AudioVisualizer {
    constructor(config = {}) {
        // Configuration with therapeutic-friendly defaults
        this.config = {
            analysis: {
                fftSize: 512,                    // FFT size for frequency analysis
                smoothingTimeConstant: 0.8,      // Smoothing for stable animations
                minDecibels: -90,                // Minimum decibel value
                maxDecibels: -10,                // Maximum decibel value
                frequencyBinCount: 256           // Number of frequency bins
            },
            smoothing: {
                amplitudeSmoothing: 0.1,         // Very fast amplitude response
                frequencySmoothing: 0.15,        // Very fast frequency response
                harmonicSmoothing: 0.2,          // Very fast harmonic response
                noiseGate: 0.008                 // Ultra sensitive noise gate
            },
            mapping: {
                amplitudeScale: 700,             // Scale factor for amplitude mapping - EXTREME SCALE
                frequencyScale: 1.5,             // Scale factor for frequency variations
                harmonicScale: 0.3,              // Scale factor for harmonic content
                baselineAmplitude: 25            // Baseline amplitude when no audio
            },
            ...config
        };
        
        // Audio analysis state
        this.state = {
            // Current values
            amplitude: 0,
            frequency: 0,
            harmonics: [],
            
            // Smoothed values for stable animations
            smoothedAmplitude: 0,
            smoothedFrequency: 0,
            smoothedHarmonics: [],
            
            // Analysis buffers
            frequencyData: null,
            timeData: null,
            
            // Audio context references
            audioContext: null,
            analyserNode: null,
            
            // State tracking
            isActive: false,
            lastUpdateTime: 0
        };
        
        // Initialize analysis buffers
        this.initializeBuffers();
    }
    
    /**
     * Initialize audio analysis buffers
     */
    initializeBuffers() {
        const bufferSize = this.config.analysis.frequencyBinCount;
        this.state.frequencyData = new Uint8Array(bufferSize);
        this.state.timeData = new Uint8Array(bufferSize);
        this.state.harmonics = new Array(8).fill(0);
        this.state.smoothedHarmonics = new Array(8).fill(0);
    }
    
    /**
     * Initialize with existing audio context and create analyser
     */
    initialize(audioContext) {
        if (!audioContext) {
            throw new Error('AudioContext is required for AudioVisualizer');
        }
        
        this.state.audioContext = audioContext;
        
        // Create analyser node with therapeutic-friendly settings
        this.state.analyserNode = audioContext.createAnalyser();
        this.state.analyserNode.fftSize = this.config.analysis.fftSize;
        this.state.analyserNode.smoothingTimeConstant = this.config.analysis.smoothingTimeConstant;
        this.state.analyserNode.minDecibels = this.config.analysis.minDecibels;
        this.state.analyserNode.maxDecibels = this.config.analysis.maxDecibels;
        
        this.state.isActive = true;
        console.log('AudioVisualizer initialized with AudioContext');
    }
    
    /**
     * Connect to an audio source node for analysis
     */
    connectSource(sourceNode) {
        if (!this.state.analyserNode) {
            throw new Error('AudioVisualizer must be initialized before connecting source');
        }
        
        sourceNode.connect(this.state.analyserNode);
        console.log('AudioVisualizer connected to audio source');
    }
    
    /**
     * Analyze user audio input and return wave data
     */
    analyzeUserAudio(inputData = null) {
        if (!this.state.isActive || !this.state.analyserNode) {
            return this.getBaselineWaveData();
        }
        
        // Get frequency and time domain data from analyser
        this.state.analyserNode.getByteFrequencyData(this.state.frequencyData);
        this.state.analyserNode.getByteTimeDomainData(this.state.timeData);
        
        // Calculate amplitude from time domain data
        const amplitude = this.calculateAmplitude(this.state.timeData);
        
        // Calculate dominant frequency from frequency domain data
        const frequency = this.calculateDominantFrequency(this.state.frequencyData);
        
        // Calculate harmonic content for wave complexity
        const harmonics = this.calculateHarmonics(this.state.frequencyData);
        
        // Apply smoothing for stable animations
        this.applySmoothing(amplitude, frequency, harmonics);
        
        // Apply noise gate to prevent visualization of background noise
        const gatedAmplitude = this.applyNoiseGate(this.state.smoothedAmplitude);
        
        return {
            amplitude: gatedAmplitude,
            frequency: this.state.smoothedFrequency,
            harmonics: [...this.state.smoothedHarmonics],
            smoothedAmplitude: gatedAmplitude
        };
    }
    
    /**
     * Analyze bot audio output and return wave data
     */
    analyzeBotAudio(audioData) {
        if (!audioData || audioData.length === 0) {
            return this.getBaselineWaveData();
        }
        
        // Calculate amplitude from audio samples
        const amplitude = this.calculateAmplitudeFromSamples(audioData);
        
        // For bot audio, we can use a simplified frequency analysis
        // since we don't need real-time FFT processing
        const frequency = this.estimateFrequencyFromSamples(audioData);
        
        // Calculate simple harmonic content
        const harmonics = this.calculateSimpleHarmonics(audioData);
        
        // Apply smoothing
        this.applySmoothing(amplitude, frequency, harmonics);
        
        return {
            amplitude: this.state.smoothedAmplitude,
            frequency: this.state.smoothedFrequency,
            harmonics: [...this.state.smoothedHarmonics],
            smoothedAmplitude: this.state.smoothedAmplitude
        };
    }
    
    /**
     * Get baseline wave data for idle state
     */
    getBaselineWaveData() {
        return {
            amplitude: this.config.mapping.baselineAmplitude,
            frequency: 440, // A4 note for pleasant baseline
            harmonics: [0.3, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002],
            smoothedAmplitude: this.config.mapping.baselineAmplitude
        };
    }
    
    /**
     * Calculate amplitude from time domain data
     */
    calculateAmplitude(timeData) {
        let sum = 0;
        let max = 0;
        
        for (let i = 0; i < timeData.length; i++) {
            const sample = (timeData[i] - 128) / 128; // Normalize to -1 to 1
            const abs = Math.abs(sample);
            sum += abs * abs;
            max = Math.max(max, abs);
        }
        
        // Use RMS with peak detection for more responsive visualization
        const rms = Math.sqrt(sum / timeData.length);
        const amplitude = (rms * 0.7 + max * 0.3) * this.config.mapping.amplitudeScale;
        
        return Math.min(amplitude, 600); // Cap at extreme maximum amplitude for dramatic effect
    }
    
    /**
     * Calculate amplitude from audio samples (for bot audio)
     */
    calculateAmplitudeFromSamples(samples) {
        let sum = 0;
        let max = 0;
        
        for (let i = 0; i < samples.length; i++) {
            const abs = Math.abs(samples[i]);
            sum += abs * abs;
            max = Math.max(max, abs);
        }
        
        const rms = Math.sqrt(sum / samples.length);
        const amplitude = (rms * 0.7 + max * 0.3) * this.config.mapping.amplitudeScale;
        
        return Math.min(amplitude, 600); // Extreme cap for maximum dramatic response
    }
    
    /**
     * Calculate dominant frequency from frequency domain data
     */
    calculateDominantFrequency(frequencyData) {
        let maxIndex = 0;
        let maxValue = 0;
        
        // Find the frequency bin with the highest magnitude
        // Skip the first few bins to avoid DC component
        for (let i = 2; i < frequencyData.length / 2; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }
        
        // Convert bin index to frequency
        const nyquist = this.state.audioContext.sampleRate / 2;
        const frequency = (maxIndex / frequencyData.length) * nyquist;
        
        // Return a reasonable frequency range for visualization
        return Math.max(80, Math.min(frequency, 2000));
    }
    
    /**
     * Estimate frequency from audio samples using zero-crossing rate
     */
    estimateFrequencyFromSamples(samples) {
        let crossings = 0;
        let lastSign = samples[0] >= 0;
        
        for (let i = 1; i < samples.length; i++) {
            const currentSign = samples[i] >= 0;
            if (currentSign !== lastSign) {
                crossings++;
                lastSign = currentSign;
            }
        }
        
        // Estimate frequency from zero crossings
        const sampleRate = 24000; // Bot audio sample rate
        const frequency = (crossings / 2) * (sampleRate / samples.length);
        
        return Math.max(80, Math.min(frequency, 2000));
    }
    
    /**
     * Calculate harmonic content for wave complexity
     */
    calculateHarmonics(frequencyData) {
        const harmonics = [];
        const binSize = frequencyData.length / 8; // Divide into 8 harmonic bands
        
        for (let i = 0; i < 8; i++) {
            let sum = 0;
            const startBin = Math.floor(i * binSize);
            const endBin = Math.floor((i + 1) * binSize);
            
            for (let j = startBin; j < endBin && j < frequencyData.length; j++) {
                sum += frequencyData[j];
            }
            
            // Normalize and scale harmonic content
            const harmonic = (sum / (endBin - startBin)) / 255 * this.config.mapping.harmonicScale;
            harmonics.push(harmonic);
        }
        
        return harmonics;
    }
    
    /**
     * Calculate simple harmonics from audio samples
     */
    calculateSimpleHarmonics(samples) {
        // Simple harmonic estimation based on sample variance in different ranges
        const harmonics = [];
        const chunkSize = Math.floor(samples.length / 8);
        
        for (let i = 0; i < 8; i++) {
            let variance = 0;
            const start = i * chunkSize;
            const end = Math.min((i + 1) * chunkSize, samples.length);
            
            // Calculate variance in this chunk
            let mean = 0;
            for (let j = start; j < end; j++) {
                mean += samples[j];
            }
            mean /= (end - start);
            
            for (let j = start; j < end; j++) {
                variance += Math.pow(samples[j] - mean, 2);
            }
            variance /= (end - start);
            
            harmonics.push(Math.sqrt(variance) * this.config.mapping.harmonicScale);
        }
        
        return harmonics;
    }
    
    /**
     * Apply smoothing to prevent jarring wave movements
     */
    applySmoothing(amplitude, frequency, harmonics) {
        const ampSmooth = this.config.smoothing.amplitudeSmoothing;
        const freqSmooth = this.config.smoothing.frequencySmoothing;
        const harmSmooth = this.config.smoothing.harmonicSmoothing;
        
        // Smooth amplitude
        this.state.smoothedAmplitude = 
            this.state.smoothedAmplitude * (1 - ampSmooth) + amplitude * ampSmooth;
        
        // Smooth frequency
        this.state.smoothedFrequency = 
            this.state.smoothedFrequency * (1 - freqSmooth) + frequency * freqSmooth;
        
        // Smooth harmonics
        for (let i = 0; i < harmonics.length && i < this.state.smoothedHarmonics.length; i++) {
            this.state.smoothedHarmonics[i] = 
                this.state.smoothedHarmonics[i] * (1 - harmSmooth) + harmonics[i] * harmSmooth;
        }
        
        // Update raw values
        this.state.amplitude = amplitude;
        this.state.frequency = frequency;
        this.state.harmonics = [...harmonics];
        this.state.lastUpdateTime = performance.now();
    }
    
    /**
     * Apply noise gate to prevent visualization of background noise
     */
    applyNoiseGate(amplitude) {
        const threshold = this.config.smoothing.noiseGate * this.config.mapping.amplitudeScale;
        
        if (amplitude < threshold) {
            return this.config.mapping.baselineAmplitude;
        }
        
        // Smooth transition above threshold
        const gateRange = threshold * 0.5;
        if (amplitude < threshold + gateRange) {
            const factor = (amplitude - threshold) / gateRange;
            return this.config.mapping.baselineAmplitude + 
                   (amplitude - this.config.mapping.baselineAmplitude) * factor;
        }
        
        return amplitude;
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            analysis: { ...this.config.analysis, ...newConfig.analysis },
            smoothing: { ...this.config.smoothing, ...newConfig.smoothing },
            mapping: { ...this.config.mapping, ...newConfig.mapping }
        };
        
        // Update analyser node if configuration changed
        if (this.state.analyserNode && newConfig.analysis) {
            if (newConfig.analysis.fftSize) {
                this.state.analyserNode.fftSize = newConfig.analysis.fftSize;
            }
            if (newConfig.analysis.smoothingTimeConstant !== undefined) {
                this.state.analyserNode.smoothingTimeConstant = newConfig.analysis.smoothingTimeConstant;
            }
            if (newConfig.analysis.minDecibels !== undefined) {
                this.state.analyserNode.minDecibels = newConfig.analysis.minDecibels;
            }
            if (newConfig.analysis.maxDecibels !== undefined) {
                this.state.analyserNode.maxDecibels = newConfig.analysis.maxDecibels;
            }
        }
    }
    
    /**
     * Get current analysis state for debugging
     */
    getState() {
        return {
            ...this.state,
            // Don't include large buffers in state output
            frequencyData: this.state.frequencyData ? this.state.frequencyData.length : 0,
            timeData: this.state.timeData ? this.state.timeData.length : 0
        };
    }
    
    /**
     * Check if visualizer is active and ready
     */
    isReady() {
        return this.state.isActive && this.state.analyserNode !== null;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.state.isActive = false;
        
        if (this.state.analyserNode) {
            this.state.analyserNode.disconnect();
            this.state.analyserNode = null;
        }
        
        this.state.audioContext = null;
        this.state.frequencyData = null;
        this.state.timeData = null;
        
        console.log('AudioVisualizer destroyed');
    }
}