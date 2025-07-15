// debugPlanet.js - Utility for debugging planet visibility issues
import { serviceContainer } from './core/ServiceContainer.js';
import { params } from './params.js';

export class PlanetDebugger {
    constructor() {
        this.sceneManager = null;
    }

    initialize() {
        this.sceneManager = serviceContainer.resolve('sceneManager');
        
        if (!this.sceneManager) {
            console.error('🌍 PlanetDebugger: SceneManager not found');
            return false;
        }
        
        console.log('🌍 PlanetDebugger initialized');
        this.addKeyboardShortcuts();
        return true;
    }

    // Add keyboard shortcuts for debugging
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'i') {
                event.preventDefault();
                this.sceneManager.toggleInnerSphereVisibility();
            }
            
            if (event.ctrlKey && event.key === 'o') {
                event.preventDefault();
                this.sceneManager.toggleOuterSphereVisibility();
            }
            
            if (event.ctrlKey && event.key === 'u') {
                event.preventDefault();
                this.sceneManager.toggleOuterSphereTransparency();
            }
            
            if (event.ctrlKey && event.key === 'd') {
                event.preventDefault();
                this.showDebugInfo();
            }
        });
        
        console.log('🌍 Planet debug shortcuts added:');
        console.log('   Ctrl+I: Toggle inner sphere visibility');
        console.log('   Ctrl+O: Toggle outer sphere visibility');
        console.log('   Ctrl+U: Toggle outer sphere transparency');
        console.log('   Ctrl+D: Show debug info');
    }

    // Show comprehensive debug information
    showDebugInfo() {
        console.log('🌍 === PLANET DEBUG INFO ===');
        
        const debugInfo = this.sceneManager.getPlanetDebugInfo();
        console.log('📊 Current state:', debugInfo);
        
        const currentParams = {
            PLANET_DIAMETER: params.PLANET_DIAMETER,
            PLANET_INNER_SPHERE_SCALE: params.PLANET_INNER_SPHERE_SCALE,
            PLANET_OUTER_OPACITY: params.PLANET_OUTER_OPACITY,
            PLANET_INNER_OPACITY: params.PLANET_INNER_OPACITY
        };
        console.log('⚙️  Current parameters:', currentParams);
        
        // Analyze potential issues
        this.analyzeVisibilityIssues(debugInfo, currentParams);
        
        console.log('🌍 === END DEBUG INFO ===');
    }

    // Analyze and suggest fixes for visibility issues
    analyzeVisibilityIssues(debugInfo, currentParams) {
        console.log('🔍 Analyzing visibility issues:');
        
        const issues = [];
        const suggestions = [];
        
        // Check if inner sphere is too small
        if (currentParams.PLANET_INNER_SPHERE_SCALE < 0.5) {
            issues.push('Inner sphere is very small (< 50% of outer sphere)');
            suggestions.push('Increase PLANET_INNER_SPHERE_SCALE to 0.5 or higher');
        }
        
        // Check if outer sphere is opaque
        if (currentParams.PLANET_OUTER_OPACITY >= 1.0) {
            issues.push('Outer sphere is opaque and will hide inner sphere');
            suggestions.push('Reduce PLANET_OUTER_OPACITY to 0.3-0.7 to see inner sphere');
        }
        
        // Check visibility flags
        if (!debugInfo.innerVisible) {
            issues.push('Inner sphere is set to invisible');
            suggestions.push('Use Ctrl+I to toggle inner sphere visibility');
        }
        
        if (!debugInfo.outerVisible) {
            issues.push('Outer sphere is set to invisible');
            suggestions.push('Use Ctrl+O to toggle outer sphere visibility');
        }
        
        // Display results
        if (issues.length === 0) {
            console.log('✅ No obvious visibility issues detected');
        } else {
            console.log('❌ Issues found:');
            issues.forEach(issue => console.log(`   - ${issue}`));
            console.log('💡 Suggestions:');
            suggestions.forEach(suggestion => console.log(`   - ${suggestion}`));
        }
    }

    // Quick fixes for common issues
    quickFixTransparency() {
        if (this.sceneManager.planet && this.sceneManager.planet.material) {
            const material = this.sceneManager.planet.material;
            material.transparent = true;
            material.opacity = 0.4;
            console.log('🔧 Quick fix: Made outer sphere transparent (0.4)');
        }
    }

    quickFixSize() {
        console.log('🔧 Quick fix: To make inner sphere bigger, modify params.js:');
        console.log('   PLANET_INNER_SPHERE_SCALE: 0.7  // Instead of current value');
        console.log('   Then restart the application.');
    }

    // Test visibility with different configurations
    testVisibilityConfigurations() {
        console.log('🧪 Testing visibility configurations...');
        
        const configs = [
            { name: 'Transparent outer', outerOpacity: 0.3, innerOpacity: 1.0 },
            { name: 'Semi-transparent outer', outerOpacity: 0.6, innerOpacity: 1.0 },
            { name: 'Both semi-transparent', outerOpacity: 0.7, innerOpacity: 0.8 },
            { name: 'Original settings', outerOpacity: params.PLANET_OUTER_OPACITY, innerOpacity: params.PLANET_INNER_OPACITY }
        ];
        
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < configs.length) {
                const config = configs[currentIndex];
                console.log(`🧪 Testing: ${config.name}`);
                
                if (this.sceneManager.planet && this.sceneManager.planet.material) {
                    this.sceneManager.planet.material.transparent = config.outerOpacity < 1.0;
                    this.sceneManager.planet.material.opacity = config.outerOpacity;
                }
                
                if (this.sceneManager.innerPlanet && this.sceneManager.innerPlanet.material) {
                    this.sceneManager.innerPlanet.material.transparent = config.innerOpacity < 1.0;
                    this.sceneManager.innerPlanet.material.opacity = config.innerOpacity;
                }
                
                currentIndex++;
                setTimeout(testNext, 3000); // Change every 3 seconds
            } else {
                console.log('🧪 Visibility test completed');
            }
        };
        
        testNext();
    }
}

// Export singleton instance
export const planetDebugger = new PlanetDebugger(); 