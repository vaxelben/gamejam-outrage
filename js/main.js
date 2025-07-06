// main.js - Game initialization using new SOLID architecture
import * as THREE from 'three';
import { GameEngine } from './core/GameEngine.js';
import { GameStateSystem } from './systems/GameStateSystem.js';
import { PlayerSystem } from './systems/PlayerSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { PoliceSystem } from './systems/PoliceSystem.js';
import { UISystem } from './systems/UISystem.js';
import { serviceContainer } from './core/ServiceContainer.js';
import { params, initTweakpane } from './params.js';

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
        
        // Initialize the game engine
        await gameEngine.initialize();
        
        // Initialize tweakpane
        initTweakpane();
        
        console.log('🎭 Masques et Outrage - SOLID architecture initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        showErrorScreen(error);
    }
}

// Register all game systems with dependencies
function registerGameSystems() {
    // Register systems in service container
    serviceContainer.registerSingleton('gameStateSystem', GameStateSystem);
    serviceContainer.registerSingleton('playerSystem', PlayerSystem);
    serviceContainer.registerSingleton('npcSystem', NPCSystem);
    serviceContainer.registerSingleton('policeSystem', PoliceSystem);
    serviceContainer.registerSingleton('uiSystem', UISystem);
    
    // Register systems with the game engine (with priorities)
    gameEngine.registerSystem('gameState', serviceContainer.resolve('gameStateSystem'), 10);
    gameEngine.registerSystem('player', serviceContainer.resolve('playerSystem'), 20);
    gameEngine.registerSystem('npc', serviceContainer.resolve('npcSystem'), 30);
    gameEngine.registerSystem('police', serviceContainer.resolve('policeSystem'), 40);
    gameEngine.registerSystem('ui', serviceContainer.resolve('uiSystem'), 50);
    
    console.log('📋 Game systems registered with dependencies');
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

// Make debug functions available globally
window.getEngineStats = getEngineStats;
window.getSystemStats = getSystemStats;

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