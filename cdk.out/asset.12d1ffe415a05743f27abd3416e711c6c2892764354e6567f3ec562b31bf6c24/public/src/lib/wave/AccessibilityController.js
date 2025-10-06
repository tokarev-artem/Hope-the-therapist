/**
 * AccessibilityController - Manages motion and visual sensitivity options
 * Provides customization controls for users with different accessibility needs
 */
export class AccessibilityController {
    constructor() {
        // Default accessibility settings
        this.settings = {
            motionIntensity: 1.0,        // 0.1 - 1.0 scale factor for wave movement
            colorIntensity: 1.0,         // 0.1 - 1.0 scale factor for color vibrancy
            animationSpeed: 1.0,         // 0.1 - 2.0 speed multiplier for animations
            reducedMotion: false,        // Enable minimal movement mode
            highContrast: false,         // Enable high contrast mode
            smoothTransitions: true,     // Enable/disable smooth transitions
            flashReduction: true,        // Reduce rapid color/brightness changes
            motionSensitivity: 'normal'  // 'low', 'normal', 'high'
        };
        
        // Motion sensitivity presets
        this.motionPresets = {
            'low': {
                motionIntensity: 0.3,
                animationSpeed: 0.6,
                reducedMotion: true,
                smoothTransitions: true,
                flashReduction: true
            },
            'normal': {
                motionIntensity: 1.0,
                animationSpeed: 1.0,
                reducedMotion: false,
                smoothTransitions: true,
                flashReduction: true
            },
            'high': {
                motionIntensity: 1.0,
                animationSpeed: 1.2,
                reducedMotion: false,
                smoothTransitions: true,
                flashReduction: false
            }
        };
        
        // Event listeners for settings changes
        this.eventListeners = {
            settingsChanged: [],
            motionIntensityChanged: [],
            colorIntensityChanged: [],
            reducedMotionChanged: []
        };
        
        // Load saved settings
        this.loadSettings();
        
        // Check for system preferences
        this.checkSystemPreferences();
        
        console.log('AccessibilityController initialized with settings:', this.settings);
    }
    
    /**
     * Load accessibility settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('wave-accessibility-settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
                console.log('Loaded accessibility settings from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load accessibility settings:', error);
        }
    }
    
    /**
     * Save accessibility settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('wave-accessibility-settings', JSON.stringify(this.settings));
            console.log('Saved accessibility settings to localStorage');
        } catch (error) {
            console.warn('Failed to save accessibility settings:', error);
        }
    }
    
    /**
     * Check system accessibility preferences
     */
    checkSystemPreferences() {
        // Check for prefers-reduced-motion
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('System prefers reduced motion - applying reduced motion settings');
            this.settings.reducedMotion = true;
            this.settings.motionIntensity = Math.min(this.settings.motionIntensity, 0.5);
            this.settings.animationSpeed = Math.min(this.settings.animationSpeed, 0.8);
        }
        
        // Check for prefers-contrast
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            console.log('System prefers high contrast - applying high contrast settings');
            this.settings.highContrast = true;
            this.settings.colorIntensity = Math.max(this.settings.colorIntensity, 0.8);
        }
        
        // Listen for changes to system preferences
        if (window.matchMedia) {
            const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            reducedMotionQuery.addEventListener('change', (e) => {
                if (e.matches) {
                    this.setReducedMotion(true);
                }
            });
            
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            highContrastQuery.addEventListener('change', (e) => {
                this.setHighContrast(e.matches);
            });
        }
    }
    
    /**
     * Get current accessibility settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Update a specific setting
     */
    updateSetting(key, value) {
        if (this.settings.hasOwnProperty(key)) {
            const oldValue = this.settings[key];
            this.settings[key] = value;
            
            // Validate and constrain values
            this.validateSettings();
            
            // Save settings
            this.saveSettings();
            
            // Emit specific change events
            this.emit(`${key}Changed`, { oldValue, newValue: this.settings[key] });
            
            // Emit general settings change event
            this.emit('settingsChanged', { 
                key, 
                oldValue, 
                newValue: this.settings[key], 
                allSettings: this.getSettings() 
            });
            
            console.log(`Accessibility setting updated: ${key} = ${this.settings[key]}`);
            return true;
        }
        
        console.warn(`Invalid accessibility setting: ${key}`);
        return false;
    }
    
    /**
     * Update multiple settings at once
     */
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        
        Object.keys(newSettings).forEach(key => {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = newSettings[key];
            }
        });
        
        // Validate and constrain values
        this.validateSettings();
        
        // Save settings
        this.saveSettings();
        
        // Emit change event
        this.emit('settingsChanged', { 
            oldSettings, 
            newSettings: this.getSettings() 
        });
        
        console.log('Multiple accessibility settings updated:', newSettings);
    }
    
    /**
     * Validate and constrain setting values
     */
    validateSettings() {
        // Constrain numeric values to valid ranges
        this.settings.motionIntensity = Math.max(0.1, Math.min(1.0, this.settings.motionIntensity));
        this.settings.colorIntensity = Math.max(0.1, Math.min(1.0, this.settings.colorIntensity));
        this.settings.animationSpeed = Math.max(0.1, Math.min(2.0, this.settings.animationSpeed));
        
        // Ensure boolean values
        this.settings.reducedMotion = Boolean(this.settings.reducedMotion);
        this.settings.highContrast = Boolean(this.settings.highContrast);
        this.settings.smoothTransitions = Boolean(this.settings.smoothTransitions);
        this.settings.flashReduction = Boolean(this.settings.flashReduction);
        
        // Validate motion sensitivity preset
        if (!this.motionPresets[this.settings.motionSensitivity]) {
            this.settings.motionSensitivity = 'normal';
        }
    }
    
    /**
     * Set motion intensity (0.1 - 1.0)
     */
    setMotionIntensity(intensity) {
        const constrainedIntensity = Math.max(0.1, Math.min(1.0, intensity));
        return this.updateSetting('motionIntensity', constrainedIntensity);
    }
    
    /**
     * Set color intensity (0.1 - 1.0)
     */
    setColorIntensity(intensity) {
        const constrainedIntensity = Math.max(0.1, Math.min(1.0, intensity));
        return this.updateSetting('colorIntensity', constrainedIntensity);
    }
    
    /**
     * Set animation speed (0.1 - 2.0)
     */
    setAnimationSpeed(speed) {
        const constrainedSpeed = Math.max(0.1, Math.min(2.0, speed));
        return this.updateSetting('animationSpeed', constrainedSpeed);
    }
    
    /**
     * Enable/disable reduced motion mode
     */
    setReducedMotion(enabled) {
        return this.updateSetting('reducedMotion', enabled);
    }
    
    /**
     * Enable/disable high contrast mode
     */
    setHighContrast(enabled) {
        return this.updateSetting('highContrast', enabled);
    }
    
    /**
     * Set motion sensitivity preset
     */
    setMotionSensitivity(level) {
        if (!this.motionPresets[level]) {
            console.warn(`Invalid motion sensitivity level: ${level}`);
            return false;
        }
        
        // Apply preset settings
        const preset = this.motionPresets[level];
        this.updateSettings({
            ...preset,
            motionSensitivity: level
        });
        
        return true;
    }
    
    /**
     * Get motion sensitivity presets
     */
    getMotionPresets() {
        return { ...this.motionPresets };
    }
    
    /**
     * Apply accessibility settings to wave configuration
     */
    applyToWaveConfig(waveConfig) {
        const modifiedConfig = { ...waveConfig };
        
        // Apply motion intensity scaling
        if (modifiedConfig.waves) {
            modifiedConfig.waves.baselineAmplitude *= this.settings.motionIntensity;
            modifiedConfig.waves.maxAmplitude *= this.settings.motionIntensity;
            
            // Apply reduced motion constraints
            if (this.settings.reducedMotion) {
                modifiedConfig.waves.baselineAmplitude = Math.min(modifiedConfig.waves.baselineAmplitude, 15);
                modifiedConfig.waves.maxAmplitude = Math.min(modifiedConfig.waves.maxAmplitude, 60);
                modifiedConfig.waves.frequency *= 0.7; // Slower wave movement
            }
        }
        
        // Apply animation speed scaling
        if (modifiedConfig.animation) {
            modifiedConfig.animation.transitionDuration /= this.settings.animationSpeed;
            
            // Ensure minimum transition duration for smooth transitions
            if (this.settings.smoothTransitions) {
                modifiedConfig.animation.transitionDuration = Math.max(
                    modifiedConfig.animation.transitionDuration, 
                    500
                );
            }
        }
        
        // Add accessibility flags
        modifiedConfig.accessibility = {
            motionIntensity: this.settings.motionIntensity,
            colorIntensity: this.settings.colorIntensity,
            animationSpeed: this.settings.animationSpeed,
            reducedMotion: this.settings.reducedMotion,
            highContrast: this.settings.highContrast,
            smoothTransitions: this.settings.smoothTransitions,
            flashReduction: this.settings.flashReduction
        };
        
        return modifiedConfig;
    }
    
    /**
     * Apply accessibility settings to theme configuration
     */
    applyToThemeConfig(themeConfig) {
        const modifiedTheme = { ...themeConfig };
        
        // Apply color intensity scaling
        if (this.settings.colorIntensity !== 1.0) {
            modifiedTheme.opacity *= this.settings.colorIntensity;
        }
        
        // Apply high contrast adjustments
        if (this.settings.highContrast) {
            modifiedTheme.opacity = Math.max(modifiedTheme.opacity, 0.9);
            
            // Increase color saturation for better contrast
            modifiedTheme.gradientStops = modifiedTheme.gradientStops.map(stop => ({
                ...stop,
                color: this.adjustColorContrast(stop.color, 1.2)
            }));
        }
        
        // Apply flash reduction
        if (this.settings.flashReduction) {
            // Reduce opacity variations to prevent flashing
            modifiedTheme.opacity = Math.min(modifiedTheme.opacity, 0.85);
        }
        
        return modifiedTheme;
    }
    
    /**
     * Adjust color contrast by modifying saturation
     */
    adjustColorContrast(hexColor, factor) {
        // Convert hex to HSL, adjust saturation, convert back
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return hexColor;
        
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.s = Math.min(1, hsl.s * factor);
        
        const adjustedRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
    }
    
    /**
     * Get accessibility-friendly transition duration
     */
    getTransitionDuration(baseDuration) {
        let duration = baseDuration / this.settings.animationSpeed;
        
        // Ensure minimum duration for smooth transitions
        if (this.settings.smoothTransitions) {
            duration = Math.max(duration, 500);
        }
        
        // Extend duration for reduced motion
        if (this.settings.reducedMotion) {
            duration *= 1.5;
        }
        
        return duration;
    }
    
    /**
     * Check if motion should be reduced
     */
    shouldReduceMotion() {
        return this.settings.reducedMotion;
    }
    
    /**
     * Check if high contrast is enabled
     */
    isHighContrastEnabled() {
        return this.settings.highContrast;
    }
    
    /**
     * Get motion intensity multiplier
     */
    getMotionIntensity() {
        return this.settings.motionIntensity;
    }
    
    /**
     * Get color intensity multiplier
     */
    getColorIntensity() {
        return this.settings.colorIntensity;
    }
    
    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        const defaultSettings = {
            motionIntensity: 1.0,
            colorIntensity: 1.0,
            animationSpeed: 1.0,
            reducedMotion: false,
            highContrast: false,
            smoothTransitions: true,
            flashReduction: true,
            motionSensitivity: 'normal'
        };
        
        this.updateSettings(defaultSettings);
        console.log('Accessibility settings reset to defaults');
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
    
    // Color utility functions
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    rgbToHex(r, g, b) {
        const toHex = (n) => {
            const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h, s, l };
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Clear all event listeners
        Object.keys(this.eventListeners).forEach(event => {
            this.eventListeners[event] = [];
        });
        
        console.log('AccessibilityController destroyed');
    }
}