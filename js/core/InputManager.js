// core/InputManager.js - Centralized input management following SRP
export class InputManager {
    constructor() {
        this.keys = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseButtons = new Map();
        this.inputListeners = new Map();
        this.canvas = null;
    }

    async initialize() {
        this.canvas = document.getElementById('renderCanvas');
        
        // Make canvas focusable
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.focus();

        this.setupKeyboardListeners();
        this.setupMouseListeners();

        console.log('🎮 Input Manager initialized');
    }

    setupKeyboardListeners() {
        // Global keyboard listeners
        window.addEventListener('keydown', (event) => {
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
            forward: this.isKeyPressed('z') || this.isKeyPressed('w'),
            backward: this.isKeyPressed('s'),
            left: this.isKeyPressed('q') || this.isKeyPressed('a'),
            right: this.isKeyPressed('d'),
            up: this.isKeyPressed(' '), // spacebar
            down: this.isKeyPressed('shift')
        };
    }

    // Get ZQSD input vector (French AZERTY layout)
    getMovementVector() {
        return {
            x: (this.isKeyPressed('q') ? 1 : 0) - (this.isKeyPressed('d') ? 1 : 0),
            y: (this.isKeyPressed('z') ? 1 : 0) - (this.isKeyPressed('s') ? 1 : 0)
        };
    }

    // Check if a key is a game control key
    isGameKey(key) {
        const gameKeys = [
            'z', 'q', 's', 'd', 'w', 'a', // Movement
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
        console.log('🎮 Input states cleared');
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