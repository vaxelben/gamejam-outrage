// core/SystemManager.js - System coordination following SRP
import { IGameSystem } from '../interfaces/IGameSystem.js';

export class SystemManager {
    constructor() {
        this.systems = new Map();
        this.systemOrder = [];
        this.sceneManager = null;
    }

    async initialize(sceneManager) {
        this.sceneManager = sceneManager;
        
        // Initialize all registered systems
        for (const systemName of this.systemOrder) {
            const system = this.systems.get(systemName);
            if (system && system.enabled) {
                try {
                    await system.initialize(sceneManager);
                    console.log(`✅ ${systemName} system initialized`);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${systemName}:`, error);
                }
            }
        }

        console.log('🔧 System Manager initialized');
    }

    // Register a new system
    registerSystem(name, system, priority = 100) {
        if (!(system instanceof IGameSystem)) {
            throw new Error(`System ${name} must extend IGameSystem`);
        }

        this.systems.set(name, system);
        
        // Insert in order based on priority (lower number = higher priority)
        const insertIndex = this.systemOrder.findIndex(
            systemName => this.systems.get(systemName).priority > priority
        );
        
        if (insertIndex === -1) {
            this.systemOrder.push(name);
        } else {
            this.systemOrder.splice(insertIndex, 0, name);
        }

        system.priority = priority;
        console.log(`📋 Registered system: ${name} (priority: ${priority})`);
    }

    // Unregister a system
    unregisterSystem(name) {
        if (this.systems.has(name)) {
            const system = this.systems.get(name);
            system.shutdown();
            this.systems.delete(name);
            
            const index = this.systemOrder.indexOf(name);
            if (index > -1) {
                this.systemOrder.splice(index, 1);
            }
            
            console.log(`🗑️ Unregistered system: ${name}`);
        }
    }

    // Get a system by name
    getSystem(name) {
        return this.systems.get(name);
    }

    // Enable/disable systems
    enableSystem(name) {
        const system = this.systems.get(name);
        if (system) {
            system.enable();
            console.log(`🟢 Enabled system: ${name}`);
        }
    }

    disableSystem(name) {
        const system = this.systems.get(name);
        if (system) {
            system.disable();
            console.log(`🔴 Disabled system: ${name}`);
        }
    }

    // Update all systems
    update(deltaTime) {
        for (const systemName of this.systemOrder) {
            const system = this.systems.get(systemName);
            if (system && system.enabled) {
                try {
                    system.update(deltaTime);
                } catch (error) {
                    console.error(`❌ Error updating ${systemName}:`, error);
                }
            }
        }
    }

    // Notify all systems of game state changes
    notifyGameStateChange(newState) {
        for (const system of this.systems.values()) {
            if (system.enabled) {
                try {
                    system.onGameStateChange(newState);
                } catch (error) {
                    console.error(`❌ Error in game state notification:`, error);
                }
            }
        }
    }

    // Notify all systems of player actions
    notifyPlayerAction(action) {
        for (const system of this.systems.values()) {
            if (system.enabled) {
                try {
                    system.onPlayerAction(action);
                } catch (error) {
                    console.error(`❌ Error in player action notification:`, error);
                }
            }
        }
    }

    // Get system statistics
    getSystemStats() {
        const stats = {
            totalSystems: this.systems.size,
            enabledSystems: 0,
            disabledSystems: 0,
            systems: []
        };

        for (const [name, system] of this.systems) {
            if (system.enabled) {
                stats.enabledSystems++;
            } else {
                stats.disabledSystems++;
            }

            stats.systems.push({
                name,
                enabled: system.enabled,
                priority: system.priority || 100
            });
        }

        return stats;
    }

    // Shutdown all systems
    shutdown() {
        console.log('🔧 Shutting down System Manager...');
        
        // Shutdown in reverse order
        for (let i = this.systemOrder.length - 1; i >= 0; i--) {
            const systemName = this.systemOrder[i];
            const system = this.systems.get(systemName);
            if (system) {
                try {
                    system.shutdown();
                    console.log(`✅ ${systemName} system shutdown`);
                } catch (error) {
                    console.error(`❌ Error shutting down ${systemName}:`, error);
                }
            }
        }

        this.systems.clear();
        this.systemOrder = [];
        console.log('🔧 System Manager shutdown complete');
    }
} 