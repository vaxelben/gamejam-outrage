// core/EventManager.js - Centralized event management following SOLID principles

export class EventManager {
    constructor() {
        this.listeners = new Map(); // eventType -> Set of listeners
        this.onceListeners = new Map(); // eventType -> Set of one-time listeners
        this.middlewares = []; // Array of middleware functions
        this.isDebugging = false;
    }

    // Subscribe to an event
    subscribe(eventType, listener, priority = 100) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }

        const listenerWrapper = {
            callback: listener,
            priority: priority,
            id: Symbol(),
            createdAt: Date.now()
        };

        this.listeners.get(eventType).add(listenerWrapper);

        // Sort listeners by priority (lower number = higher priority)
        this.sortListeners(eventType);

        if (this.isDebugging) {
            console.log(`📡 Subscribed to event '${eventType}' with priority ${priority}`);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(eventType, listenerWrapper.id);
    }

    // Subscribe to an event only once
    subscribeOnce(eventType, listener, priority = 100) {
        if (!this.onceListeners.has(eventType)) {
            this.onceListeners.set(eventType, new Set());
        }

        const listenerWrapper = {
            callback: listener,
            priority: priority,
            id: Symbol(),
            createdAt: Date.now()
        };

        this.onceListeners.get(eventType).add(listenerWrapper);
        this.sortOnceListeners(eventType);

        if (this.isDebugging) {
            console.log(`📡 Subscribed once to event '${eventType}' with priority ${priority}`);
        }

        // Return unsubscribe function
        return () => this.unsubscribeOnce(eventType, listenerWrapper.id);
    }

    // Unsubscribe from an event
    unsubscribe(eventType, listenerId) {
        if (!this.listeners.has(eventType)) return false;

        const listeners = this.listeners.get(eventType);
        for (const listener of listeners) {
            if (listener.id === listenerId) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.listeners.delete(eventType);
                }
                return true;
            }
        }
        return false;
    }

    // Unsubscribe from once listeners
    unsubscribeOnce(eventType, listenerId) {
        if (!this.onceListeners.has(eventType)) return false;

        const listeners = this.onceListeners.get(eventType);
        for (const listener of listeners) {
            if (listener.id === listenerId) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.onceListeners.delete(eventType);
                }
                return true;
            }
        }
        return false;
    }

    // Publish an event synchronously
    publish(eventType, data = null, source = 'unknown') {
        const event = this.createEvent(eventType, data, source);
        
        if (this.isDebugging) {
            console.log(`📢 Publishing event '${eventType}' from '${source}'`, data);
        }

        // Apply middlewares
        for (const middleware of this.middlewares) {
            try {
                const result = middleware(event);
                if (result === false) {
                    // Middleware cancelled the event
                    if (this.isDebugging) {
                        console.log(`🚫 Event '${eventType}' cancelled by middleware`);
                    }
                    return false;
                }
            } catch (error) {
                console.error(`❌ Error in event middleware:`, error);
            }
        }

        // Notify regular listeners
        this.notifyListeners(eventType, event);

        // Notify once listeners and remove them
        this.notifyOnceListeners(eventType, event);

        return true;
    }

    // Publish an event asynchronously
    async publishAsync(eventType, data = null, source = 'unknown') {
        const event = this.createEvent(eventType, data, source);
        
        if (this.isDebugging) {
            console.log(`📢 Publishing async event '${eventType}' from '${source}'`, data);
        }

        // Apply middlewares
        for (const middleware of this.middlewares) {
            try {
                const result = await middleware(event);
                if (result === false) {
                    if (this.isDebugging) {
                        console.log(`🚫 Async event '${eventType}' cancelled by middleware`);
                    }
                    return false;
                }
            } catch (error) {
                console.error(`❌ Error in async event middleware:`, error);
            }
        }

        // Notify regular listeners
        await this.notifyListenersAsync(eventType, event);

        // Notify once listeners and remove them
        await this.notifyOnceListenersAsync(eventType, event);

        return true;
    }

    // Add middleware function
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
        if (this.isDebugging) {
            console.log(`🔧 Added event middleware`);
        }
    }

    // Remove middleware function
    removeMiddleware(middleware) {
        const index = this.middlewares.indexOf(middleware);
        if (index !== -1) {
            this.middlewares.splice(index, 1);
            return true;
        }
        return false;
    }

    // Clear all listeners for an event type
    clearListeners(eventType) {
        let cleared = 0;
        
        if (this.listeners.has(eventType)) {
            cleared += this.listeners.get(eventType).size;
            this.listeners.delete(eventType);
        }
        
        if (this.onceListeners.has(eventType)) {
            cleared += this.onceListeners.get(eventType).size;
            this.onceListeners.delete(eventType);
        }

        if (this.isDebugging) {
            console.log(`🧹 Cleared ${cleared} listeners for event '${eventType}'`);
        }
        
        return cleared;
    }

    // Clear all listeners
    clearAllListeners() {
        const totalListeners = this.getTotalListenerCount();
        this.listeners.clear();
        this.onceListeners.clear();
        
        if (this.isDebugging) {
            console.log(`🧹 Cleared all ${totalListeners} listeners`);
        }
        
        return totalListeners;
    }

    // Get listener count for an event type
    getListenerCount(eventType) {
        const regular = this.listeners.has(eventType) ? this.listeners.get(eventType).size : 0;
        const once = this.onceListeners.has(eventType) ? this.onceListeners.get(eventType).size : 0;
        return regular + once;
    }

    // Get total listener count
    getTotalListenerCount() {
        let total = 0;
        for (const listeners of this.listeners.values()) {
            total += listeners.size;
        }
        for (const listeners of this.onceListeners.values()) {
            total += listeners.size;
        }
        return total;
    }

    // Get all event types
    getEventTypes() {
        const types = new Set();
        for (const type of this.listeners.keys()) {
            types.add(type);
        }
        for (const type of this.onceListeners.keys()) {
            types.add(type);
        }
        return Array.from(types);
    }

    // Get statistics
    getStats() {
        return {
            eventTypes: this.getEventTypes().length,
            totalListeners: this.getTotalListenerCount(),
            middlewares: this.middlewares.length,
            isDebugging: this.isDebugging
        };
    }

    // Enable/disable debugging
    setDebugging(enabled) {
        this.isDebugging = enabled;
        console.log(`🔍 Event debugging ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Private methods
    createEvent(type, data, source) {
        return {
            type: type,
            data: data,
            source: source,
            timestamp: Date.now(),
            id: Symbol()
        };
    }

    sortListeners(eventType) {
        if (!this.listeners.has(eventType)) return;
        
        const listeners = Array.from(this.listeners.get(eventType));
        listeners.sort((a, b) => a.priority - b.priority);
        this.listeners.set(eventType, new Set(listeners));
    }

    sortOnceListeners(eventType) {
        if (!this.onceListeners.has(eventType)) return;
        
        const listeners = Array.from(this.onceListeners.get(eventType));
        listeners.sort((a, b) => a.priority - b.priority);
        this.onceListeners.set(eventType, new Set(listeners));
    }

    notifyListeners(eventType, event) {
        if (!this.listeners.has(eventType)) return;

        const listeners = Array.from(this.listeners.get(eventType));
        for (const listener of listeners) {
            try {
                listener.callback(event);
            } catch (error) {
                console.error(`❌ Error in event listener for '${eventType}':`, error);
            }
        }
    }

    notifyOnceListeners(eventType, event) {
        if (!this.onceListeners.has(eventType)) return;

        const listeners = Array.from(this.onceListeners.get(eventType));
        for (const listener of listeners) {
            try {
                listener.callback(event);
            } catch (error) {
                console.error(`❌ Error in once event listener for '${eventType}':`, error);
            }
        }
        
        // Clear once listeners after notification
        this.onceListeners.delete(eventType);
    }

    async notifyListenersAsync(eventType, event) {
        if (!this.listeners.has(eventType)) return;

        const listeners = Array.from(this.listeners.get(eventType));
        for (const listener of listeners) {
            try {
                await listener.callback(event);
            } catch (error) {
                console.error(`❌ Error in async event listener for '${eventType}':`, error);
            }
        }
    }

    async notifyOnceListenersAsync(eventType, event) {
        if (!this.onceListeners.has(eventType)) return;

        const listeners = Array.from(this.onceListeners.get(eventType));
        for (const listener of listeners) {
            try {
                await listener.callback(event);
            } catch (error) {
                console.error(`❌ Error in async once event listener for '${eventType}':`, error);
            }
        }
        
        // Clear once listeners after notification
        this.onceListeners.delete(eventType);
    }
}

// Global event manager instance
export const eventManager = new EventManager(); 