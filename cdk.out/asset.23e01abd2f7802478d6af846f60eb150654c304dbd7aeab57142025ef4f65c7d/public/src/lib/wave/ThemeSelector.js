/**
 * ThemeSelector - UI component for selecting therapeutic color themes
 * Provides a simple interface for users to switch between predefined themes
 */
export class ThemeSelector {
    constructor(waveInterface, container = null) {
        this.waveInterface = waveInterface;
        this.container = container;
        this.element = null;
        this.isVisible = false;
        
        this.createThemeSelector();
        this.setupEventListeners();
    }
    
    /**
     * Create the theme selector UI element
     */
    createThemeSelector() {
        // Create main container
        this.element = document.createElement('div');
        this.element.className = 'theme-selector';
        this.element.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 12px;
            padding: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            min-width: 200px;
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
        `;
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: rgba(255, 255, 255, 0.9);
        `;
        header.textContent = 'Wave Themes';
        this.element.appendChild(header);
        
        // Create theme options
        const themes = this.waveInterface.getAvailableThemes();
        const currentTheme = this.waveInterface.getCurrentTheme();
        
        themes.forEach(theme => {
            const themeOption = this.createThemeOption(theme, currentTheme?.name === theme.name);
            this.element.appendChild(themeOption);
        });
        
        // Create toggle button
        this.createToggleButton();
        
        // Append to container or body
        if (this.container) {
            this.container.appendChild(this.element);
        } else {
            document.body.appendChild(this.element);
        }
    }
    
    /**
     * Create a theme option element
     */
    createThemeOption(theme, isActive) {
        const option = document.createElement('div');
        option.className = 'theme-option';
        option.dataset.themeId = theme.id;
        
        option.style.cssText = `
            padding: 10px 12px;
            margin: 4px 0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid ${isActive ? 'rgba(255, 255, 255, 0.3)' : 'transparent'};
            background: ${isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
        `;
        
        // Theme name
        const name = document.createElement('div');
        name.style.cssText = `
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 4px;
        `;
        name.textContent = theme.name;
        option.appendChild(name);
        
        // Theme description
        const description = document.createElement('div');
        description.style.cssText = `
            font-size: 11px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.3;
        `;
        description.textContent = theme.description;
        option.appendChild(description);
        
        // Color preview
        const colorPreview = this.createColorPreview(theme.id);
        option.appendChild(colorPreview);
        
        // Hover effects
        option.addEventListener('mouseenter', () => {
            if (!isActive) {
                option.style.background = 'rgba(255, 255, 255, 0.05)';
                option.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            }
        });
        
        option.addEventListener('mouseleave', () => {
            if (!isActive) {
                option.style.background = 'transparent';
                option.style.border = '1px solid transparent';
            }
        });
        
        // Click handler
        option.addEventListener('click', () => {
            this.selectTheme(theme.id);
        });
        
        return option;
    }
    
    /**
     * Create color preview for a theme
     */
    createColorPreview(themeId) {
        const preview = document.createElement('div');
        preview.style.cssText = `
            display: flex;
            gap: 4px;
            margin-top: 6px;
        `;
        
        const theme = this.waveInterface.getThemeManager().getTheme(themeId);
        if (!theme) return preview;
        
        // Create color swatches
        const colors = [
            theme.baselineColor,
            theme.userInputColor,
            theme.botOutputColor
        ];
        
        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.style.cssText = `
                width: 12px;
                height: 12px;
                border-radius: 2px;
                background-color: ${color};
                border: 1px solid rgba(255, 255, 255, 0.2);
            `;
            preview.appendChild(swatch);
        });
        
        return preview;
    }
    
    /**
     * Create toggle button to show/hide theme selector
     */
    createToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'theme-toggle-button';
        this.toggleButton.innerHTML = '🎨';
        this.toggleButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 18px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1001;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Hover effects
        this.toggleButton.addEventListener('mouseenter', () => {
            this.toggleButton.style.background = 'rgba(0, 0, 0, 0.9)';
            this.toggleButton.style.transform = 'scale(1.05)';
        });
        
        this.toggleButton.addEventListener('mouseleave', () => {
            this.toggleButton.style.background = 'rgba(0, 0, 0, 0.8)';
            this.toggleButton.style.transform = 'scale(1)';
        });
        
        // Click handler
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });
        
        // Append to container or body
        if (this.container) {
            this.container.appendChild(this.toggleButton);
        } else {
            document.body.appendChild(this.toggleButton);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for theme changes to update active state
        window.addEventListener('themeChanged', (event) => {
            this.updateActiveTheme(event.detail.theme.name);
        });
        
        // Close selector when clicking outside
        document.addEventListener('click', (event) => {
            if (this.isVisible && 
                !this.element.contains(event.target) && 
                !this.toggleButton.contains(event.target)) {
                this.hide();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    /**
     * Select a theme
     */
    selectTheme(themeId) {
        const success = this.waveInterface.setTheme(themeId, 800); // 800ms transition
        
        if (success) {
            // Update UI to reflect selection
            this.updateActiveTheme(this.waveInterface.getThemeManager().getTheme(themeId).name);
            
            // Hide selector after selection
            setTimeout(() => {
                this.hide();
            }, 300);
        }
    }
    
    /**
     * Update active theme in UI
     */
    updateActiveTheme(themeName) {
        const options = this.element.querySelectorAll('.theme-option');
        
        options.forEach(option => {
            const themeId = option.dataset.themeId;
            const theme = this.waveInterface.getThemeManager().getTheme(themeId);
            const isActive = theme && theme.name === themeName;
            
            option.style.border = `1px solid ${isActive ? 'rgba(255, 255, 255, 0.3)' : 'transparent'}`;
            option.style.background = isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
        });
    }
    
    /**
     * Show the theme selector
     */
    show() {
        this.isVisible = true;
        this.element.style.transform = 'translateX(0)';
        this.toggleButton.style.right = '240px'; // Move button to accommodate panel
    }
    
    /**
     * Hide the theme selector
     */
    hide() {
        this.isVisible = false;
        this.element.style.transform = 'translateX(100%)';
        this.toggleButton.style.right = '20px'; // Reset button position
    }
    
    /**
     * Toggle theme selector visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Destroy the theme selector
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('themeChanged', this.updateActiveTheme);
        document.removeEventListener('click', this.hide);
        document.removeEventListener('keydown', this.hide);
        
        // Remove elements
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        if (this.toggleButton && this.toggleButton.parentNode) {
            this.toggleButton.parentNode.removeChild(this.toggleButton);
        }
        
        this.element = null;
        this.toggleButton = null;
        this.waveInterface = null;
    }
    
    /**
     * Update position for responsive design
     */
    updatePosition(top = '20px', right = '20px') {
        if (this.element) {
            this.element.style.top = top;
            this.element.style.right = right;
        }
        
        if (this.toggleButton) {
            this.toggleButton.style.top = top;
            this.toggleButton.style.right = this.isVisible ? `calc(${right} + 220px)` : right;
        }
    }
    
    /**
     * Set container for the theme selector
     */
    setContainer(container) {
        if (this.container !== container) {
            // Remove from old container
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            if (this.toggleButton && this.toggleButton.parentNode) {
                this.toggleButton.parentNode.removeChild(this.toggleButton);
            }
            
            // Add to new container
            this.container = container;
            if (container) {
                container.appendChild(this.element);
                container.appendChild(this.toggleButton);
            } else {
                document.body.appendChild(this.element);
                document.body.appendChild(this.toggleButton);
            }
        }
    }
}