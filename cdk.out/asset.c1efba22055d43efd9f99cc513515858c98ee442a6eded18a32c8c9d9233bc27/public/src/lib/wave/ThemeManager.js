/**
 * ThemeManager - Manages therapeutic color themes for the wave interface
 * Provides predefined calming color palettes optimized for PTSD users
 */
export class ThemeManager {
    constructor() {
        this.currentTheme = null;
        this.transitionDuration = 1000; // 1 second for smooth transitions
        this.isTransitioning = false;
        
        // Initialize predefined therapeutic themes
        this.themes = this.initializeThemes();
        
        // Set default theme
        this.setTheme('ocean-calm');
    }
    
    /**
     * Initialize predefined therapeutic color themes
     */
    initializeThemes() {
        return {
            'ocean-calm': {
                name: 'Ocean Calm',
                description: 'Soft blues and teals reminiscent of calm ocean waters',
                backgroundColor: '#0a1420',
                baselineColor: '#40a4df',
                userInputColor: '#5fb3e8',
                botOutputColor: '#7cc8f0',
                accentColor: '#2d8bb8',
                gradientStops: [
                    { offset: 0, color: '#1a3a52' },
                    { offset: 0.5, color: '#2d5a7a' },
                    { offset: 1, color: '#40a4df' }
                ],
                opacity: 0.8,
                waveBlend: 'normal'
            },
            
            'forest-peace': {
                name: 'Forest Peace',
                description: 'Gentle greens and earth tones of a peaceful forest',
                backgroundColor: '#0f1a0f',
                baselineColor: '#4a8f5a',
                userInputColor: '#5fa56f',
                botOutputColor: '#74bb84',
                accentColor: '#357345',
                gradientStops: [
                    { offset: 0, color: '#2a4a2a' },
                    { offset: 0.5, color: '#3d6a4d' },
                    { offset: 1, color: '#4a8f5a' }
                ],
                opacity: 0.8,
                waveBlend: 'normal'
            },
            
            'sunset-warmth': {
                name: 'Sunset Warmth',
                description: 'Warm oranges and soft yellows of a gentle sunset',
                backgroundColor: '#1a1410',
                baselineColor: '#d4a574',
                userInputColor: '#e8b584',
                botOutputColor: '#f0c594',
                accentColor: '#b8935a',
                gradientStops: [
                    { offset: 0, color: '#4a3a2a' },
                    { offset: 0.5, color: '#6a5a4a' },
                    { offset: 1, color: '#d4a574' }
                ],
                opacity: 0.8,
                waveBlend: 'normal'
            },
            
            'moonlight-serenity': {
                name: 'Moonlight Serenity',
                description: 'Soft purples and silvers of peaceful moonlight',
                backgroundColor: '#14101a',
                baselineColor: '#9a7fb8',
                userInputColor: '#b094d0',
                botOutputColor: '#c6a9e8',
                accentColor: '#7a5f98',
                gradientStops: [
                    { offset: 0, color: '#3a2a4a' },
                    { offset: 0.5, color: '#5a4a6a' },
                    { offset: 1, color: '#9a7fb8' }
                ],
                opacity: 0.8,
                waveBlend: 'normal'
            }
        };
    }
    
    /**
     * Get all available theme names
     */
    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            id: key,
            name: this.themes[key].name,
            description: this.themes[key].description
        }));
    }
    
    /**
     * Get the current active theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * Get a specific theme by ID
     */
    getTheme(themeId) {
        return this.themes[themeId] || null;
    }
    
    /**
     * Set the active theme with smooth transition
     */
    setTheme(themeId, transitionDuration = null) {
        if (!this.themes[themeId]) {
            console.warn(`Theme '${themeId}' not found. Available themes:`, Object.keys(this.themes));
            return false;
        }
        
        const newTheme = { ...this.themes[themeId] };
        const duration = transitionDuration !== null ? transitionDuration : this.transitionDuration;
        
        if (this.currentTheme && duration > 0) {
            this.transitionToTheme(newTheme, duration);
        } else {
            this.currentTheme = newTheme;
            this.notifyThemeChange(newTheme);
        }
        
        return true;
    }
    
    /**
     * Smoothly transition from current theme to new theme
     */
    transitionToTheme(newTheme, duration) {
        if (this.isTransitioning) {
            return; // Prevent overlapping transitions
        }
        
        this.isTransitioning = true;
        const startTheme = { ...this.currentTheme };
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easeInOutCubic for smooth transitions
            const easedProgress = this.easeInOutCubic(progress);
            
            // Interpolate between themes
            const interpolatedTheme = this.interpolateThemes(startTheme, newTheme, easedProgress);
            
            this.currentTheme = interpolatedTheme;
            this.notifyThemeChange(interpolatedTheme);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.currentTheme = newTheme;
                this.isTransitioning = false;
                this.notifyThemeChange(newTheme);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    /**
     * Interpolate between two themes based on progress (0-1)
     */
    interpolateThemes(startTheme, endTheme, progress) {
        return {
            ...endTheme,
            backgroundColor: this.interpolateColor(startTheme.backgroundColor, endTheme.backgroundColor, progress),
            baselineColor: this.interpolateColor(startTheme.baselineColor, endTheme.baselineColor, progress),
            userInputColor: this.interpolateColor(startTheme.userInputColor, endTheme.userInputColor, progress),
            botOutputColor: this.interpolateColor(startTheme.botOutputColor, endTheme.botOutputColor, progress),
            accentColor: this.interpolateColor(startTheme.accentColor, endTheme.accentColor, progress),
            gradientStops: this.interpolateGradientStops(startTheme.gradientStops, endTheme.gradientStops, progress),
            opacity: this.lerp(startTheme.opacity, endTheme.opacity, progress)
        };
    }
    
    /**
     * Interpolate between two colors
     */
    interpolateColor(startColor, endColor, progress) {
        const start = this.hexToRgb(startColor);
        const end = this.hexToRgb(endColor);
        
        if (!start || !end) {
            return endColor; // Fallback to end color if parsing fails
        }
        
        const r = Math.round(this.lerp(start.r, end.r, progress));
        const g = Math.round(this.lerp(start.g, end.g, progress));
        const b = Math.round(this.lerp(start.b, end.b, progress));
        
        return this.rgbToHex(r, g, b);
    }
    
    /**
     * Interpolate between gradient stops arrays
     */
    interpolateGradientStops(startStops, endStops, progress) {
        const result = [];
        const maxLength = Math.max(startStops.length, endStops.length);
        
        for (let i = 0; i < maxLength; i++) {
            const startStop = startStops[i] || startStops[startStops.length - 1];
            const endStop = endStops[i] || endStops[endStops.length - 1];
            
            result.push({
                offset: this.lerp(startStop.offset, endStop.offset, progress),
                color: this.interpolateColor(startStop.color, endStop.color, progress)
            });
        }
        
        return result;
    }
    
    /**
     * Create a gradient from the current theme's gradient stops
     */
    createGradient(ctx, x0, y0, x1, y1) {
        if (!this.currentTheme || !this.currentTheme.gradientStops) {
            return this.currentTheme?.baselineColor || '#40a4df';
        }
        
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        
        this.currentTheme.gradientStops.forEach(stop => {
            gradient.addColorStop(stop.offset, stop.color);
        });
        
        return gradient;
    }
    
    /**
     * Get a color with applied opacity
     */
    getColorWithOpacity(colorType, opacity = null) {
        if (!this.currentTheme) {
            return 'rgba(64, 164, 223, 0.8)'; // Fallback
        }
        
        const color = this.currentTheme[colorType] || this.currentTheme.baselineColor;
        const alpha = opacity !== null ? opacity : this.currentTheme.opacity;
        
        const rgb = this.hexToRgb(color);
        if (!rgb) {
            return color; // Return original if parsing fails
        }
        
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    
    /**
     * Blend two colors based on blend mode
     */
    blendColors(baseColor, overlayColor, blendMode = 'normal', opacity = 1) {
        // For now, implement simple alpha blending
        // Can be extended with more blend modes if needed
        const base = this.hexToRgb(baseColor);
        const overlay = this.hexToRgb(overlayColor);
        
        if (!base || !overlay) {
            return baseColor;
        }
        
        const alpha = opacity;
        const invAlpha = 1 - alpha;
        
        const r = Math.round(overlay.r * alpha + base.r * invAlpha);
        const g = Math.round(overlay.g * alpha + base.g * invAlpha);
        const b = Math.round(overlay.b * alpha + base.b * invAlpha);
        
        return this.rgbToHex(r, g, b);
    }
    
    /**
     * Notify listeners of theme changes
     */
    notifyThemeChange(theme) {
        // Dispatch custom event for theme changes
        const event = new CustomEvent('themeChanged', {
            detail: { theme: { ...theme } }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Set transition duration for theme changes
     */
    setTransitionDuration(duration) {
        this.transitionDuration = Math.max(0, duration);
    }
    
    /**
     * Check if currently transitioning between themes
     */
    isTransitioningTheme() {
        return this.isTransitioning;
    }
    
    // Utility functions
    
    /**
     * Linear interpolation between two values
     */
    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }
    
    /**
     * Cubic easing function for smooth transitions
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Convert hex color to RGB object
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    /**
     * Convert RGB values to hex color
     */
    rgbToHex(r, g, b) {
        const toHex = (n) => {
            const hex = Math.max(0, Math.min(255, n)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    /**
     * Validate theme object structure
     */
    validateTheme(theme) {
        const requiredProperties = [
            'name', 'backgroundColor', 'baselineColor', 
            'userInputColor', 'botOutputColor', 'gradientStops'
        ];
        
        return requiredProperties.every(prop => theme.hasOwnProperty(prop));
    }
    
    /**
     * Add a custom theme
     */
    addCustomTheme(themeId, themeConfig) {
        if (!this.validateTheme(themeConfig)) {
            console.error('Invalid theme configuration:', themeConfig);
            return false;
        }
        
        this.themes[themeId] = { ...themeConfig };
        return true;
    }
    
    /**
     * Remove a custom theme (cannot remove predefined themes)
     */
    removeCustomTheme(themeId) {
        const predefinedThemes = ['ocean-calm', 'forest-peace', 'sunset-warmth', 'moonlight-serenity'];
        
        if (predefinedThemes.includes(themeId)) {
            console.warn('Cannot remove predefined theme:', themeId);
            return false;
        }
        
        if (this.themes[themeId]) {
            delete this.themes[themeId];
            
            // If current theme was removed, switch to default
            if (this.currentTheme && this.currentTheme.name === this.themes[themeId]?.name) {
                this.setTheme('ocean-calm');
            }
            
            return true;
        }
        
        return false;
    }
}