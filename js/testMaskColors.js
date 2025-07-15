// testMaskColors.js - Utility for testing mask background colors
import { serviceContainer } from './core/ServiceContainer.js';

export class MaskColorTester {
    constructor() {
        this.sceneManager = null;
        this.playerSystem = null;
    }

    initialize() {
        this.sceneManager = serviceContainer.resolve('sceneManager');
        this.playerSystem = serviceContainer.resolve('playerSystem');
        
        if (!this.sceneManager || !this.playerSystem) {
            console.error('🎨 MaskColorTester: Required systems not found');
            return false;
        }
        
        console.log('🎨 MaskColorTester initialized');
        return true;
    }

    // Test all mask colors with automatic cycling
    testAllColors() {
        if (!this.sceneManager) {
            console.error('🎨 MaskColorTester not initialized');
            return;
        }
        
        this.sceneManager.testAllMaskColors();
    }

    // Test specific mask color
    testMaskColor(maskType) {
        if (!this.sceneManager) {
            console.error('🎨 MaskColorTester not initialized');
            return;
        }
        
        this.sceneManager.setBackgroundFromMask(maskType);
        console.log(`🎨 Testing mask ${maskType} (${this.sceneManager.getMaskName(maskType)})`);
    }

    // Simulate player mask changes
    simulatePlayerMaskChanges() {
        if (!this.playerSystem) {
            console.error('🎨 MaskColorTester not initialized');
            return;
        }
        
        console.log('🎨 Simulating player mask changes...');
        const masks = [null, 1, 2, 3, 4, 5, 6, 7];
        let currentIndex = 0;
        
        const changeNext = () => {
            if (currentIndex < masks.length) {
                const maskType = masks[currentIndex];
                this.playerSystem.setMask(maskType);
                currentIndex++;
                setTimeout(changeNext, 3000); // Change mask every 3 seconds
            } else {
                console.log('🎨 Player mask simulation completed');
                this.playerSystem.setMask(null); // Return to neutral
            }
        };
        
        changeNext();
    }

    // Add keyboard shortcuts for testing
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 't') {
                event.preventDefault();
                this.testAllColors();
            }
            
            if (event.ctrlKey && event.key === 'p') {
                event.preventDefault();
                this.simulatePlayerMaskChanges();
            }
        });
        
        console.log('🎨 Test keyboard shortcuts added:');
        console.log('   Ctrl+T: Test all mask colors');
        console.log('   Ctrl+P: Simulate player mask changes');
    }
}

// Export singleton instance
export const maskColorTester = new MaskColorTester(); 