/**
 * SettingsInterface - UI component for theme selection and accessibility options
 * Provides user-friendly controls for customizing the wave interface
 */
export class SettingsInterface {
    constructor(waveInterface, accessibilityController) {
        this.waveInterface = waveInterface;
        this.accessibilityController = accessibilityController;
        this.themeManager = waveInterface.getThemeManager();
        
        this.isVisible = false;
        this.settingsPanel = null;
        this.settingsButton = null;
        
        // Create settings interface
        this.createSettingsInterface();
        this.setupEventListeners();
        
        console.log('SettingsInterface initialized');
    }
    
    /**
     * Create the settings interface UI
     */
    createSettingsInterface() {
        // Create settings button
        this.createSettingsButton();
        
        // Create settings panel
        this.createSettingsPanel();
        
        // Initially hide the panel
        this.hideSettings();
    }
    
    /**
     * Create the settings toggle button
     */
    createSettingsButton() {
        this.settingsButton = document.createElement('button');
        this.settingsButton.id = 'settings-button';
        this.settingsButton.className = 'settings-button';
        this.settingsButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
            </svg>
            <span>Settings</span>
        `;
        this.settingsButton.setAttribute('aria-label', 'Open accessibility and theme settings');
        this.settingsButton.setAttribute('title', 'Accessibility & Theme Settings');
        
        // Add to controls container
        const controlsContainer = document.getElementById('controls');
        if (controlsContainer) {
            controlsContainer.appendChild(this.settingsButton);
        } else {
            document.body.appendChild(this.settingsButton);
        }
    }
    
    /**
     * Create the settings panel
     */
    createSettingsPanel() {
        this.settingsPanel = document.createElement('div');
        this.settingsPanel.id = 'settings-panel';
        this.settingsPanel.className = 'settings-panel';
        this.settingsPanel.setAttribute('role', 'dialog');
        this.settingsPanel.setAttribute('aria-labelledby', 'settings-title');
        this.settingsPanel.setAttribute('aria-hidden', 'true');
        
        this.settingsPanel.innerHTML = `
            <div class="settings-header">
                <h2 id="settings-title">Accessibility & Theme Settings</h2>
                <button id="close-settings" class="close-button" aria-label="Close settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <div class="settings-content">
                <!-- Theme Selection Section -->
                <section class="settings-section">
                    <h3>Visual Theme</h3>
                    <p class="section-description">Choose a calming color palette for the wave animations</p>
                    <div id="theme-selector" class="theme-selector">
                        <!-- Theme options will be populated here -->
                    </div>
                </section>
                
                <!-- Motion Sensitivity Section -->
                <section class="settings-section">
                    <h3>Motion Sensitivity</h3>
                    <p class="section-description">Adjust animation intensity for comfort</p>
                    
                    <div class="setting-group">
                        <label for="motion-preset">Sensitivity Level:</label>
                        <select id="motion-preset" class="setting-select">
                            <option value="low">Low - Minimal movement</option>
                            <option value="normal">Normal - Standard movement</option>
                            <option value="high">High - Full movement</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label for="motion-intensity">Motion Intensity:</label>
                        <div class="slider-container">
                            <input type="range" id="motion-intensity" class="setting-slider" 
                                   min="0.1" max="1.0" step="0.1" value="1.0">
                            <span class="slider-value">100%</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="reduced-motion" class="setting-checkbox">
                            <span class="checkmark"></span>
                            Reduced Motion Mode
                        </label>
                        <p class="setting-description">Minimizes wave movement for motion sensitivity</p>
                    </div>
                </section>
                
                <!-- Animation Speed Section -->
                <section class="settings-section">
                    <h3>Animation Speed</h3>
                    <p class="section-description">Control the speed of transitions and animations</p>
                    
                    <div class="setting-group">
                        <label for="animation-speed">Animation Speed:</label>
                        <div class="slider-container">
                            <input type="range" id="animation-speed" class="setting-slider" 
                                   min="0.1" max="2.0" step="0.1" value="1.0">
                            <span class="slider-value">1.0x</span>
                        </div>
                    </div>
                </section>
                
                <!-- Visual Options Section -->
                <section class="settings-section">
                    <h3>Visual Options</h3>
                    <p class="section-description">Customize visual appearance for better accessibility</p>
                    
                    <div class="setting-group">
                        <label for="color-intensity">Color Intensity:</label>
                        <div class="slider-container">
                            <input type="range" id="color-intensity" class="setting-slider" 
                                   min="0.1" max="1.0" step="0.1" value="1.0">
                            <span class="slider-value">100%</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="high-contrast" class="setting-checkbox">
                            <span class="checkmark"></span>
                            High Contrast Mode
                        </label>
                        <p class="setting-description">Increases color contrast for better visibility</p>
                    </div>
                    
                    <div class="setting-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="flash-reduction" class="setting-checkbox">
                            <span class="checkmark"></span>
                            Flash Reduction
                        </label>
                        <p class="setting-description">Reduces rapid brightness changes</p>
                    </div>
                </section>
                
                <!-- Reset Section -->
                <section class="settings-section">
                    <div class="setting-group">
                        <button id="reset-settings" class="reset-button">Reset to Defaults</button>
                        <p class="setting-description">Restore all settings to their default values</p>
                    </div>
                </section>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(this.settingsPanel);
        
        // Populate theme selector
        this.populateThemeSelector();
        
        // Load current settings
        this.loadCurrentSettings();
    }
    
    /**
     * Populate the theme selector with available themes
     */
    populateThemeSelector() {
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;
        
        const themes = this.themeManager.getAvailableThemes();
        const currentTheme = this.themeManager.getCurrentTheme();
        
        themes.forEach(theme => {
            const themeOption = document.createElement('div');
            themeOption.className = 'theme-option';
            themeOption.setAttribute('data-theme-id', theme.id);
            
            const isSelected = currentTheme && currentTheme.name === theme.name;
            if (isSelected) {
                themeOption.classList.add('selected');
            }
            
            themeOption.innerHTML = `
                <div class="theme-preview" style="background: linear-gradient(45deg, 
                    ${this.getThemePreviewColors(theme.id).join(', ')})"></div>
                <div class="theme-info">
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-description">${theme.description}</div>
                </div>
            `;
            
            themeSelector.appendChild(themeOption);
        });
    }
    
    /**
     * Get preview colors for a theme
     */
    getThemePreviewColors(themeId) {
        const theme = this.themeManager.getTheme(themeId);
        if (!theme) return ['#40a4df', '#5fb3e8'];
        
        return [theme.baselineColor, theme.userInputColor, theme.botOutputColor];
    }
    
    /**
     * Load current settings into the UI
     */
    loadCurrentSettings() {
        const settings = this.accessibilityController.getSettings();
        
        // Motion settings
        document.getElementById('motion-preset').value = settings.motionSensitivity;
        document.getElementById('motion-intensity').value = settings.motionIntensity;
        document.getElementById('reduced-motion').checked = settings.reducedMotion;
        
        // Animation speed
        document.getElementById('animation-speed').value = settings.animationSpeed;
        
        // Visual settings
        document.getElementById('color-intensity').value = settings.colorIntensity;
        document.getElementById('high-contrast').checked = settings.highContrast;
        document.getElementById('flash-reduction').checked = settings.flashReduction;
        
        // Update slider value displays
        this.updateSliderDisplay('motion-intensity', settings.motionIntensity);
        this.updateSliderDisplay('animation-speed', settings.animationSpeed);
        this.updateSliderDisplay('color-intensity', settings.colorIntensity);
    }
    
    /**
     * Update slider value display
     */
    updateSliderDisplay(sliderId, value) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = slider?.parentElement.querySelector('.slider-value');
        
        if (valueDisplay) {
            if (sliderId === 'motion-intensity' || sliderId === 'color-intensity') {
                valueDisplay.textContent = Math.round(value * 100) + '%';
            } else if (sliderId === 'animation-speed') {
                valueDisplay.textContent = value.toFixed(1) + 'x';
            }
        }
    }
    
    /**
     * Setup event listeners for the settings interface
     */
    setupEventListeners() {
        // Settings button click
        this.settingsButton?.addEventListener('click', () => {
            this.toggleSettings();
        });
        
        // Close button click
        document.getElementById('close-settings')?.addEventListener('click', () => {
            this.hideSettings();
        });
        
        // Theme selection
        document.getElementById('theme-selector')?.addEventListener('click', (e) => {
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                const themeId = themeOption.getAttribute('data-theme-id');
                this.selectTheme(themeId);
            }
        });
        
        // Motion preset selection
        document.getElementById('motion-preset')?.addEventListener('change', (e) => {
            this.accessibilityController.setMotionSensitivity(e.target.value);
            this.loadCurrentSettings(); // Refresh UI with preset values
        });
        
        // Motion intensity slider
        document.getElementById('motion-intensity')?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.accessibilityController.setMotionIntensity(value);
            this.updateSliderDisplay('motion-intensity', value);
        });
        
        // Animation speed slider
        document.getElementById('animation-speed')?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.accessibilityController.setAnimationSpeed(value);
            this.updateSliderDisplay('animation-speed', value);
        });
        
        // Color intensity slider
        document.getElementById('color-intensity')?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.accessibilityController.setColorIntensity(value);
            this.updateSliderDisplay('color-intensity', value);
        });
        
        // Checkbox settings
        document.getElementById('reduced-motion')?.addEventListener('change', (e) => {
            this.accessibilityController.setReducedMotion(e.target.checked);
        });
        
        document.getElementById('high-contrast')?.addEventListener('change', (e) => {
            this.accessibilityController.setHighContrast(e.target.checked);
        });
        
        document.getElementById('flash-reduction')?.addEventListener('change', (e) => {
            this.accessibilityController.updateSetting('flashReduction', e.target.checked);
        });
        
        // Reset button
        document.getElementById('reset-settings')?.addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hideSettings();
            }
        });
        
        // Close on outside click
        this.settingsPanel?.addEventListener('click', (e) => {
            if (e.target === this.settingsPanel) {
                this.hideSettings();
            }
        });
        
        // Listen for accessibility setting changes
        this.accessibilityController.addEventListener('settingsChanged', (data) => {
            this.onAccessibilitySettingsChanged(data);
        });
    }
    
    /**
     * Select a theme
     */
    selectTheme(themeId) {
        // Update theme selection UI
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-theme-id="${themeId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Apply theme
        this.waveInterface.setTheme(themeId);
        
        console.log(`Theme selected: ${themeId}`);
    }
    
    /**
     * Reset all settings to defaults
     */
    resetSettings() {
        if (confirm('Reset all settings to their default values?')) {
            this.accessibilityController.resetToDefaults();
            this.waveInterface.setTheme('ocean-calm');
            this.loadCurrentSettings();
            
            // Update theme selection UI
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.remove('selected');
            });
            document.querySelector('[data-theme-id="ocean-calm"]')?.classList.add('selected');
            
            console.log('Settings reset to defaults');
        }
    }
    
    /**
     * Handle accessibility settings changes
     */
    onAccessibilitySettingsChanged(data) {
        // Apply settings to wave interface
        if (this.waveInterface && this.waveInterface.waveRenderer) {
            const currentConfig = this.waveInterface.config;
            const modifiedConfig = this.accessibilityController.applyToWaveConfig(currentConfig);
            this.waveInterface.updateConfig(modifiedConfig);
        }
        
        // Apply settings to theme
        if (this.themeManager) {
            const currentTheme = this.themeManager.getCurrentTheme();
            if (currentTheme) {
                const modifiedTheme = this.accessibilityController.applyToThemeConfig(currentTheme);
                // Force theme update with modified settings
                this.waveInterface.waveRenderer?.updateTheme(modifiedTheme);
            }
        }
    }
    
    /**
     * Show settings panel
     */
    showSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.style.display = 'flex';
            this.settingsPanel.setAttribute('aria-hidden', 'false');
            this.isVisible = true;
            
            // Focus management for accessibility
            const firstFocusable = this.settingsPanel.querySelector('button, input, select');
            if (firstFocusable) {
                firstFocusable.focus();
            }
            
            // Add body class to prevent scrolling
            document.body.classList.add('settings-open');
        }
    }
    
    /**
     * Hide settings panel
     */
    hideSettings() {
        if (this.settingsPanel) {
            this.settingsPanel.style.display = 'none';
            this.settingsPanel.setAttribute('aria-hidden', 'true');
            this.isVisible = false;
            
            // Return focus to settings button
            if (this.settingsButton) {
                this.settingsButton.focus();
            }
            
            // Remove body class
            document.body.classList.remove('settings-open');
        }
    }
    
    /**
     * Toggle settings panel visibility
     */
    toggleSettings() {
        if (this.isVisible) {
            this.hideSettings();
        } else {
            this.showSettings();
        }
    }
    
    /**
     * Check if settings panel is visible
     */
    isSettingsVisible() {
        return this.isVisible;
    }
    
    /**
     * Update theme selector when themes change
     */
    updateThemeSelector() {
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.innerHTML = '';
            this.populateThemeSelector();
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // Remove DOM elements
        if (this.settingsButton) {
            this.settingsButton.remove();
            this.settingsButton = null;
        }
        
        if (this.settingsPanel) {
            this.settingsPanel.remove();
            this.settingsPanel = null;
        }
        
        // Remove body class
        document.body.classList.remove('settings-open');
        
        console.log('SettingsInterface destroyed');
    }
}