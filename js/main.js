// main.js - Game initialization using new SOLID architecture
import * as THREE from 'three';
import { GameEngine } from './core/GameEngine.js';
import { GameStateSystem } from './systems/GameStateSystem.js';
import { PlayerSystem } from './systems/PlayerSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { PoliceSystem } from './systems/PoliceSystem.js';
import { UISystem } from './systems/UISystem.js';
import { VisualFXSystem } from './systems/VisualFXSystem.js';
import { serviceContainer } from './core/ServiceContainer.js';
import { params, initTweakpane } from './params.js';
import { GameEventTypes } from './interfaces/GameEvents.js';

// Make THREE available globally for other modules
window.THREE = THREE;

let gameEngine;

// Initialize the game
async function init() {
    try {
        console.log('🎭 Initializing Masques et Outrage with SOLID architecture...');
        
        // Create and initialize game engine
        gameEngine = new GameEngine();
        
        // Register game systems in the service container
        registerGameSystems();
        
        // Register systems in SystemManager before engine initialization
        await registerSystemsInManager();
        
        // Initialize the game engine (this will initialize all registered systems)
        await gameEngine.initialize();
        
        // Initialize tweakpane
        initTweakpane();
        
        console.log('🎭 Masques et Outrage - SOLID architecture initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        showErrorScreen(error);
    }
}

// Register all game systems in the service container
function registerGameSystems() {
    // Core systems - registered as singletons to ensure same instances
    serviceContainer.registerSingleton('gameStateSystem', GameStateSystem);
    serviceContainer.registerSingleton('playerSystem', PlayerSystem);
    serviceContainer.registerSingleton('npcSystem', NPCSystem);
    serviceContainer.registerSingleton('policeSystem', PoliceSystem);
    serviceContainer.registerSingleton('uiSystem', UISystem);
    serviceContainer.registerSingleton('visualFXSystem', VisualFXSystem);
    
    console.log('🔧 Game systems registered in service container');
}

// Register systems in SystemManager with proper priorities
async function registerSystemsInManager() {
    const systemManager = serviceContainer.resolve('systemManager');
    
    if (systemManager) {
        // Register systems with priorities (lower number = higher priority)
        systemManager.registerSystem('gameState', serviceContainer.resolve('gameStateSystem'), 10);
        systemManager.registerSystem('player', serviceContainer.resolve('playerSystem'), 20);
        systemManager.registerSystem('npc', serviceContainer.resolve('npcSystem'), 30);
        systemManager.registerSystem('police', serviceContainer.resolve('policeSystem'), 40);
        systemManager.registerSystem('visualFX', serviceContainer.resolve('visualFXSystem'), 45);
        systemManager.registerSystem('ui', serviceContainer.resolve('uiSystem'), 50);
        
        console.log('🔧 Game systems registered in SystemManager');
    } else {
        console.error('❌ SystemManager not available for system registration');
    }
}

// Error handling
function showErrorScreen(error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        z-index: 10000;
    `;
    
    errorDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; background: #333; border-radius: 10px;">
            <h1 style="color: #ff6666;">🎭 Initialization Error</h1>
            <p style="margin: 20px 0;">Failed to initialize the game:</p>
            <p style="color: #ffaa66; font-family: monospace;">${error.message}</p>
            <button onclick="location.reload()" style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 16px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            ">Reload Page</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

// Debug functions for development
function getEngineStats() {
    return gameEngine ? gameEngine.getEngineStats() : null;
}

function getSystemStats() {
    return gameEngine ? gameEngine.getSystem('gameState')?.getFullState() : null;
}

// Test visual effects
function testVisualEffects() {
    if (!gameEngine) {
        console.log('❌ Game engine not initialized');
        return;
    }
    
    const systemManager = gameEngine.systemManager;
    if (!systemManager) {
        console.log('❌ System manager not available');
        return;
    }
    
    const visualFX = systemManager.getSystem('visualFX');
    if (!visualFX) {
        console.log('❌ Visual FX system not available');
        return;
    }
    
    console.log('🎬 Testing Visual FX System...');
    console.log('Current state:', visualFX.getEffectsState());
    
    // Test camera shake
    visualFX.testCameraShake();
    
    // Test tension effects after 2 seconds
    setTimeout(() => {
        visualFX.testTensionEffects();
    }, 2000);
}

// Test system communication
function testSystemCommunication() {
    console.log('🧪 Testing system communication...');
    
    if (!gameEngine) {
        console.log('❌ Game engine not initialized');
        return;
    }
    
    const systemManager = gameEngine.systemManager;
    if (!systemManager) {
        console.log('❌ System manager not available');
        return;
    }
    
    // Test each system
    const systems = ['gameState', 'player', 'npc', 'police', 'visualFX', 'ui'];
    
    for (const systemName of systems) {
        const system = systemManager.getSystem(systemName);
        if (system) {
            console.log(`✅ ${systemName} system: initialized, enabled=${system.enabled}`);
        } else {
            console.log(`❌ ${systemName} system: not found`);
        }
    }
    
    // Test ServiceContainer resolution
    console.log('\n🔍 Testing ServiceContainer resolution:');
    try {
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        console.log('✅ gameStateSystem resolved:', !!gameStateSystem);
        
        const playerSystem = serviceContainer.resolve('playerSystem');
        console.log('✅ playerSystem resolved:', !!playerSystem);
        
        const npcSystem = serviceContainer.resolve('npcSystem');
        console.log('✅ npcSystem resolved:', !!npcSystem);
        
        // Test if instances are the same
        const gameStateFromManager = systemManager.getSystem('gameState');
        const gameStateFromContainer = serviceContainer.resolve('gameStateSystem');
        console.log('✅ Same instances:', gameStateFromManager === gameStateFromContainer);
        
    } catch (error) {
        console.log('❌ ServiceContainer resolution error:', error.message);
    }
}

// Test mask changing
function testMaskChanging() {
    console.log('🎭 Testing mask changing...');
    
    try {
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (!playerSystem) {
            console.log('❌ Player system not available');
            return;
        }
        
        console.log('🎭 Current mask:', playerSystem.getCurrentMask());
        
        // Try changing mask
        console.log('🎭 Changing to mask 1 (Conservative)...');
        playerSystem.setMask(1);
        
        setTimeout(() => {
            console.log('🎭 Mask after change:', playerSystem.getCurrentMask());
        }, 100);
        
    } catch (error) {
        console.log('❌ Mask changing error:', error.message);
    }
}

// Test camera shake system
function testCameraShake() {
    console.log('🎬 Testing camera shake system...');
    
    try {
        const visualFXSystem = serviceContainer.resolve('visualFXSystem');
        if (!visualFXSystem) {
            console.log('❌ Visual FX system not available');
            return;
        }
        
        console.log('🎬 Visual FX system found, testing camera shake...');
        console.log('🎬 Camera shake enabled in params:', params.CAMERA_SHAKE_ENABLED);
        
        // Test camera shake directly
        visualFXSystem.testCameraShake();
        
        // Test police events
        setTimeout(() => {
            console.log('🎬 Testing police activation...');
            visualFXSystem.activateTensionEffects();
        }, 2000);
        
        setTimeout(() => {
            console.log('🎬 Testing police deactivation...');
            visualFXSystem.deactivateTensionEffects();
        }, 7000);
        
    } catch (error) {
        console.log('❌ Camera shake test error:', error.message);
    }
}

// Test police system events
function testPoliceEvents() {
    console.log('🚔 Testing police system events...');
    
    try {
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        const policeSystem = serviceContainer.resolve('policeSystem');
        
        if (!gameStateSystem || !policeSystem) {
            console.log('❌ Game state or police system not available');
            return;
        }
        
        console.log('🚔 Current outrage:', gameStateSystem.outrage);
        console.log('🚔 Police threshold:', params.OUTRAGE_POLICE_THRESHOLD);
        
        // Force outrage to trigger police
        console.log('🚔 Forcing outrage to trigger police...');
        gameStateSystem.setOutrage(params.OUTRAGE_POLICE_THRESHOLD + 1);
        
        setTimeout(() => {
            console.log('🚔 Checking police status...');
            console.log('🚔 Police active:', policeSystem.isPoliceActive());
            console.log('🚔 Police count:', policeSystem.getPolicePositions().length);
        }, 1000);
        
        // Reset outrage after 5 seconds
        setTimeout(() => {
            console.log('🚔 Resetting outrage...');
            gameStateSystem.setOutrage(0);
        }, 5000);
        
    } catch (error) {
        console.log('❌ Police test error:', error.message);
    }
}

// Test event system
function testEventSystem() {
    console.log('📡 Testing event system...');
    
    try {
        const eventManager = serviceContainer.resolve('eventManager');
        if (!eventManager) {
            console.log('❌ Event manager not available');
            return;
        }
        
        console.log('📡 Event manager found');
        
        // Test simple event publish/subscribe
        const testEventType = 'TEST_EVENT';
        let receivedEvent = false;
        
        const unsubscribe = eventManager.subscribe(testEventType, (event) => {
            console.log('📡 Test event received:', event);
            receivedEvent = true;
        });
        
        // Publish test event
        eventManager.publish(testEventType, { message: 'Hello from test!' });
        
        // Check if event was received
        setTimeout(() => {
            if (receivedEvent) {
                console.log('✅ Event system working correctly');
            } else {
                console.log('❌ Event system not working - event not received');
            }
            unsubscribe();
        }, 100);
        
        // Test police events specifically
        setTimeout(() => {
            console.log('📡 Testing police events...');
            
            // Subscribe to police events
            const policeSubscription = eventManager.subscribe(GameEventTypes.POLICE_ACTIVATE, (event) => {
                console.log('📡 POLICE_ACTIVATE event received:', event);
            });
            
            // Manually trigger police activation
            const policeSystem = serviceContainer.resolve('policeSystem');
            if (policeSystem) {
                // Force activate police
                policeSystem.activate();
                
                // Clean up
                setTimeout(() => {
                    policeSubscription();
                }, 2000);
            }
        }, 200);
        
    } catch (error) {
        console.log('❌ Event system test error:', error.message);
    }
}

// Make debug functions available globally
window.getEngineStats = getEngineStats;
window.getSystemStats = getSystemStats;
window.testVisualEffects = testVisualEffects;
window.testSystemCommunication = testSystemCommunication;
window.testMaskChanging = testMaskChanging;
window.testCameraShake = testCameraShake;
window.testPoliceEvents = testPoliceEvents;
window.testEventSystem = testEventSystem;

// Graceful shutdown
function shutdown() {
    if (gameEngine) {
        gameEngine.shutdown();
    }
    console.log('🎭 Game shutdown complete');
}

// Handle page unload
window.addEventListener('beforeunload', shutdown);

// Advanced debugging - access to game engine
window.gameEngine = () => gameEngine;
window.serviceContainer = () => serviceContainer;

// Start the game
init().catch(console.error); 