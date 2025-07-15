// core/InputManager.js - Centralized input management following SRP
export class InputManager {
    constructor() {
        this.keys = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = new Map();
        this.inputListeners = new Map();
        this.canvas = null;
        
        // Touch controls
        this.touchActive = false;
        this.touchOrigin = { x: 0, y: 0 };
        this.touchCurrent = { x: 0, y: 0 };
        this.touchMovement = { x: 0, y: 0 };
        this.touchSensitivity = 0.05; // Much higher sensitivity for mobile testing
        this.isMobile = this.detectMobile();
        

    }

    async initialize() {
        this.canvas = document.getElementById('renderCanvas');
        
        // Make canvas focusable
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.focus();

        this.setupKeyboardListeners();
        this.setupMouseListeners();
        
        // Setup touch controls for mobile (or force enable for testing)
        if (this.isMobile || true) { // Force enable for testing
            this.setupTouchListeners();
            console.log('📱 Touch controls enabled for mobile');
        }
        


        console.log('🎮 Input Manager initialized');
    }

    setupKeyboardListeners() {
        // Global keyboard listeners
        window.addEventListener('keydown', (event) => {
            // Prevent repeated events when a key is held down
            if (event.repeat) return;

            const key = event.key.toLowerCase();
            this.keys.set(key, true);
            this.notifyListeners('keydown', { key, originalEvent: event });
            
            // Prevent default for game keys
            if (this.isGameKey(key)) {
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            this.keys.set(key, false);
            this.notifyListeners('keyup', { key, originalEvent: event });
            
            if (this.isGameKey(key)) {
                event.preventDefault();
            }
        });

        // Canvas-specific listeners
        this.canvas.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            this.notifyListeners('canvas-keydown', { key, originalEvent: event });
            event.preventDefault();
        });

        this.canvas.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            this.notifyListeners('canvas-keyup', { key, originalEvent: event });
            event.preventDefault();
        });
    }

    setupMouseListeners() {
        // Mouse move - passive for better performance
        this.canvas.addEventListener('mousemove', (event) => {
            this.mousePosition.x = event.clientX;
            this.mousePosition.y = event.clientY;
            this.notifyListeners('mousemove', { 
                x: event.clientX, 
                y: event.clientY, 
                originalEvent: event 
            });
        }, { passive: true });

        // Mouse buttons - not passive as we might need to prevent default
        this.canvas.addEventListener('mousedown', (event) => {
            this.mouseButtons.set(event.button, true);
            this.notifyListeners('mousedown', { 
                button: event.button, 
                x: event.clientX, 
                y: event.clientY, 
                originalEvent: event 
            });
        });

        this.canvas.addEventListener('mouseup', (event) => {
            this.mouseButtons.set(event.button, false);
            this.notifyListeners('mouseup', { 
                button: event.button, 
                x: event.clientX, 
                y: event.clientY, 
                originalEvent: event 
            });
        });

        // Wheel - passive for better performance as we don't prevent default
        this.canvas.addEventListener('wheel', (event) => {
            this.notifyListeners('wheel', { 
                deltaY: event.deltaY, 
                deltaX: event.deltaX,
                originalEvent: event 
            });
        }, { passive: true });

        // Context menu prevention for better game experience
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        // Focus handling
        this.canvas.addEventListener('focus', () => {
            console.log('🎮 Canvas focused');
        }, { passive: true });

        this.canvas.addEventListener('blur', () => {
            console.log('🎮 Canvas lost focus');
            // Clear key states when canvas loses focus to prevent stuck keys
            this.keys.clear();
        }, { passive: true });
    }

    // Detect if device is mobile
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) ||
               window.innerWidth <= 768;
        

        
        return isMobile;
    }

    // Setup touch listeners for mobile controls
    setupTouchListeners() {

        
        // Touch start handler
        const handleTouchStart = (event) => {
            // Don't interfere with UI elements
            if (event.target.closest('#ui-container')) {
                return;
            }
            
            // Only prevent default for game canvas area to avoid blocking UI scrolling
            if (event.target === this.canvas || event.target.closest('#renderCanvas')) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                this.touchOrigin.x = touch.clientX;
                this.touchOrigin.y = touch.clientY;
                this.touchCurrent.x = touch.clientX;
                this.touchCurrent.y = touch.clientY;
                this.touchActive = true;
                
                this.notifyListeners('touchstart', {
                    x: touch.clientX,
                    y: touch.clientY,
                    originalEvent: event
                });
            }
        };
        
        // Touch start - add to multiple targets
        this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.body.addEventListener('touchstart', handleTouchStart, { passive: false });

        // Touch move handler
        const handleTouchMove = (event) => {
            // Don't interfere with UI elements
            if (event.target.closest('#ui-container')) {
                return;
            }
            
            // Only prevent default for game canvas area to avoid blocking UI scrolling
            if (event.target === this.canvas || event.target.closest('#renderCanvas')) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            if (event.touches.length === 1 && this.touchActive) {
                const touch = event.touches[0];
                this.touchCurrent.x = touch.clientX;
                this.touchCurrent.y = touch.clientY;
                
                // Calculate movement vector relative to origin
                const deltaX = this.touchCurrent.x - this.touchOrigin.x;
                const deltaY = this.touchCurrent.y - this.touchOrigin.y;
                
                // Normalize movement based on screen size and sensitivity
                // Invert X to match game logic (Q/D mapping) and Y for game coordinates
                this.touchMovement.x = -deltaX * this.touchSensitivity;
                this.touchMovement.y = -deltaY * this.touchSensitivity;
                

                
                this.notifyListeners('touchmove', {
                    x: touch.clientX,
                    y: touch.clientY,
                    deltaX,
                    deltaY,
                    normalizedX: this.touchMovement.x,
                    normalizedY: this.touchMovement.y,
                    originalEvent: event
                });
            }
        };
        
        // Touch move - add to multiple targets
        this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.body.addEventListener('touchmove', handleTouchMove, { passive: false });

        // Touch end handler
        const handleTouchEnd = (event) => {
            // Don't interfere with UI elements
            if (event.target.closest('#ui-container')) {
                return;
            }
            
            // Only prevent default for game canvas area to avoid blocking UI scrolling
            if (event.target === this.canvas || event.target.closest('#renderCanvas')) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            if (event.touches.length === 0) {
                this.touchActive = false;
                this.touchMovement.x = 0;
                this.touchMovement.y = 0;
                
                this.notifyListeners('touchend', {
                    originalEvent: event
                });
            }
        };
        
        // Touch end - add to multiple targets
        this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.body.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Touch cancel handler
        const handleTouchCancel = (event) => {
            // Don't interfere with UI elements
            if (event.target.closest('#ui-container')) {
                return;
            }
            
            // Only prevent default for game canvas area to avoid blocking UI scrolling
            if (event.target === this.canvas || event.target.closest('#renderCanvas')) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            this.touchActive = false;
            this.touchMovement.x = 0;
            this.touchMovement.y = 0;
            
            this.notifyListeners('touchcancel', {
                originalEvent: event
            });
        };
        
        // Touch cancel - add to multiple targets
        this.canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });
        document.body.addEventListener('touchcancel', handleTouchCancel, { passive: false });
        
        // Add global touch event prevention to avoid interference
        document.addEventListener('touchstart', (event) => {
            // Don't log every global touch to avoid spam
        }, { passive: false });
        
        document.addEventListener('touchmove', (event) => {
            // Don't log every global touch to avoid spam
        }, { passive: false });
        

        

    }

    

    // Register input event listener
    addEventListener(eventType, callback, priority = 100) {
        if (!this.inputListeners.has(eventType)) {
            this.inputListeners.set(eventType, []);
        }

        const listeners = this.inputListeners.get(eventType);
        listeners.push({ callback, priority });

        // Sort by priority (lower number = higher priority)
        listeners.sort((a, b) => a.priority - b.priority);
    }

    // Remove input event listener
    removeEventListener(eventType, callback) {
        if (this.inputListeners.has(eventType)) {
            const listeners = this.inputListeners.get(eventType);
            const index = listeners.findIndex(listener => listener.callback === callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Notify all listeners of an input event
    notifyListeners(eventType, eventData) {
        if (this.inputListeners.has(eventType)) {
            const listeners = this.inputListeners.get(eventType);
            for (const listener of listeners) {
                try {
                    // If listener returns true, stop propagation
                    if (listener.callback(eventData) === true) {
                        break;
                    }
                } catch (error) {
                    console.error(`❌ Error in input listener for ${eventType}:`, error);
                }
            }
        }
    }

    // Key state queries
    isKeyPressed(key) {
        return this.keys.get(key.toLowerCase()) || false;
    }

    isKeyReleased(key) {
        return !this.isKeyPressed(key);
    }

    // Mouse state queries
    isMouseButtonPressed(button = 0) {
        return this.mouseButtons.get(button) || false;
    }

    getMousePosition() {
        return { ...this.mousePosition };
    }

    // Movement input helpers
    getMovementInput() {
        return {
            forward: this.isKeyPressed('z') || this.isKeyPressed('w') || this.isKeyPressed('arrowup'),
            backward: this.isKeyPressed('s') || this.isKeyPressed('arrowdown'),
            left: this.isKeyPressed('q') || this.isKeyPressed('a') || this.isKeyPressed('arrowleft'),
            right: this.isKeyPressed('d') || this.isKeyPressed('arrowright'),
            up: this.isKeyPressed(' '), // spacebar
            down: this.isKeyPressed('shift')
        };
    }

    // Get ZQSD input vector (French AZERTY layout) + Arrow keys + Touch controls
    getMovementVector() {
        // Keyboard input
        const keyboardX = (this.isKeyPressed('q') || this.isKeyPressed('a') || this.isKeyPressed('arrowleft') ? 1 : 0) - (this.isKeyPressed('d') || this.isKeyPressed('arrowright') ? 1 : 0);
        const keyboardY = (this.isKeyPressed('z') || this.isKeyPressed('w') || this.isKeyPressed('arrowup') ? 1 : 0) - (this.isKeyPressed('s') || this.isKeyPressed('arrowdown') ? 1 : 0);
        
        // Touch input (only if mobile and touch is active)
        let touchX = 0;
        let touchY = 0;
        
        if ((this.isMobile || true) && this.touchActive) { // Force enable for testing
            touchX = Math.max(-1, Math.min(1, this.touchMovement.x));
            touchY = Math.max(-1, Math.min(1, this.touchMovement.y));
        }
        
        // Combine keyboard and touch input (keyboard takes priority)
        const result = {
            x: keyboardX !== 0 ? keyboardX : touchX,
            y: keyboardY !== 0 ? keyboardY : touchY
        };
        

        
        return result;
    }

    // Touch control utilities
    isTouchActive() {
        return this.touchActive;
    }

    getTouchMovement() {
        return { ...this.touchMovement };
    }

    getTouchOrigin() {
        return { ...this.touchOrigin };
    }

    getTouchCurrent() {
        return { ...this.touchCurrent };
    }

    // Check if device is mobile
    isMobileDevice() {
        return this.isMobile;
    }

    // Check if a key is a game control key
    isGameKey(key) {
        const gameKeys = [
            'z', 'q', 's', 'd', 'w', 'a', // Movement
            'arrowup', 'arrowdown', 'arrowleft', 'arrowright', // Arrow keys
            '1', '2', '3', '4', '5', '6', '7', // Masks
            'escape', ' ', 'shift', 'control', 'alt' // Special keys
        ];
        return gameKeys.includes(key);
    }

    // Focus management
    focusCanvas() {
        if (this.canvas) {
            this.canvas.focus();
        }
    }

    // Clear all input states (useful for game state changes)
    clearInputStates() {
        this.keys.clear();
        this.mouseButtons.clear();
        this.clearTouchStates();
        console.log('🎮 Input states cleared');
    }

    // Clear touch states
    clearTouchStates() {
        this.touchActive = false;
        this.touchMovement.x = 0;
        this.touchMovement.y = 0;
        this.touchOrigin.x = 0;
        this.touchOrigin.y = 0;
        this.touchCurrent.x = 0;
        this.touchCurrent.y = 0;
    }

    // Get current input summary for debugging
    getInputSummary() {
        const pressedKeys = [];
        for (const [key, pressed] of this.keys) {
            if (pressed) pressedKeys.push(key);
        }

        const pressedButtons = [];
        for (const [button, pressed] of this.mouseButtons) {
            if (pressed) pressedButtons.push(button);
        }

        return {
            pressedKeys,
            pressedButtons,
            mousePosition: this.mousePosition,
            touchActive: this.touchActive,
            touchMovement: this.touchMovement,
            touchOrigin: this.touchOrigin,
            touchCurrent: this.touchCurrent,
            isMobile: this.isMobile,
            totalListeners: this.inputListeners.size
        };
    }

    // Cleanup
    shutdown() {
        // Clear input states
        this.clearInputStates();
        
        // Clear all event listeners
        this.inputListeners.clear();

        console.log('🎮 Input Manager shutdown');
    }
} 