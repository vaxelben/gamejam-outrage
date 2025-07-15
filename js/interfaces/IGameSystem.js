// interfaces/IGameSystem.js - Interface for game systems
import { eventManager } from '../core/EventManager.js';

export class IGameSystem {
    constructor(name) {
        if (this.constructor === IGameSystem) {
            throw new Error('Cannot instantiate abstract class IGameSystem');
        }
        this.name = name;
        this.enabled = true;
        this.eventManager = eventManager;
        this.eventSubscriptions = []; // Track subscriptions for cleanup
    }

    // Abstract methods that must be implemented
    initialize(sceneManager) {
        throw new Error('initialize() must be implemented by subclass');
    }

    update(deltaTime) {
        throw new Error('update() must be implemented by subclass');
    }

    shutdown() {
        // Cleanup event subscriptions
        this.cleanupEventSubscriptions();
        // Subclasses should override this method for their own cleanup
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

    // Event management helper methods
    subscribeToEvent(eventType, callback, priority = 100) {
        const unsubscribe = this.eventManager.subscribe(eventType, callback, priority);
        this.eventSubscriptions.push(unsubscribe);
        return unsubscribe;
    }

    subscribeToEventOnce(eventType, callback, priority = 100) {
        const unsubscribe = this.eventManager.subscribeOnce(eventType, callback, priority);
        this.eventSubscriptions.push(unsubscribe);
        return unsubscribe;
    }

    publishEvent(eventType, data = null, source = null) {
        const eventSource = source || this.name;
        return this.eventManager.publish(eventType, data, eventSource);
    }

    publishEventAsync(eventType, data = null, source = null) {
        const eventSource = source || this.name;
        return this.eventManager.publishAsync(eventType, data, eventSource);
    }

    cleanupEventSubscriptions() {
        for (const unsubscribe of this.eventSubscriptions) {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        }
        this.eventSubscriptions = [];
    }
} 