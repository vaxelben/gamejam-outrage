// interfaces/IGameSystem.js - Interface for game systems
export class IGameSystem {
    constructor(name) {
        if (this.constructor === IGameSystem) {
            throw new Error('Cannot instantiate abstract class IGameSystem');
        }
        this.name = name;
        this.enabled = true;
    }

    // Abstract methods that must be implemented
    initialize(sceneManager) {
        throw new Error('initialize() must be implemented by subclass');
    }

    update(deltaTime) {
        throw new Error('update() must be implemented by subclass');
    }

    shutdown() {
        throw new Error('shutdown() must be implemented by subclass');
    }

    // Optional hooks
    onGameStateChange(newState) {
        // Override if needed
    }

    onPlayerAction(action) {
        // Override if needed
    }

    // System control
    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
} 