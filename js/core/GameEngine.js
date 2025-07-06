// core/GameEngine.js - Game engine with separated responsibilities
import { SceneManager } from './SceneManager.js';
import { SystemManager } from './SystemManager.js';
import { InputManager } from './InputManager.js';
import { serviceContainer } from './ServiceContainer.js';

export class GameEngine {
    constructor() {
        this.sceneManager = null;
        this.systemManager = null;
        this.inputManager = null;
        this.isRunning = false;
        this.clock = new THREE.Clock();
        
        this.setupServices();
    }

    setupServices() {
        // Register core services in the container
        serviceContainer.registerInstance('gameEngine', this);
        serviceContainer.registerSingleton('sceneManager', SceneManager);
        serviceContainer.registerSingleton('systemManager', SystemManager);
        serviceContainer.registerSingleton('inputManager', InputManager);
        
        // Resolve services
        this.sceneManager = serviceContainer.resolve('sceneManager');
        this.systemManager = serviceContainer.resolve('systemManager');
        this.inputManager = serviceContainer.resolve('inputManager');
    }

    async initialize() {
        console.log('🎮 Initializing Game Engine...');
        
        // Initialize core systems in order
        await this.sceneManager.initialize();
        await this.inputManager.initialize();
        await this.systemManager.initialize(this.sceneManager);
        
        // Register game systems (will be done by main.js)
        await this.registerGameSystems();
        
        this.isRunning = true;
        
        this.gameLoop();
        
        console.log('🎮 Game Engine initialized');
    }

    async registerGameSystems() {
        // This method will be called by main.js to register all game systems
        // Keeping it here for extensibility
        console.log('📋 Game systems will be registered by main application');
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const deltaTime = this.clock.getDelta();
        
        // Update all systems through system manager
        this.systemManager.update(deltaTime);
        
        // Update camera (could be moved to a camera system later)
        const playerSystem = this.systemManager.getSystem('player');
        if (playerSystem && playerSystem.getPlayerPosition) {
            this.sceneManager.updateCamera(playerSystem.getPlayerPosition());
        }
        
        // Render
        this.sceneManager.render();
        
        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    // System management helpers
    registerSystem(name, system, priority = 100) {
        this.systemManager.registerSystem(name, system, priority);
    }

    getSystem(name) {
        return this.systemManager.getSystem(name);
    }

    // Game state management
    notifyGameStateChange(newState) {
        this.systemManager.notifyGameStateChange(newState);
    }

    notifyPlayerAction(action) {
        this.systemManager.notifyPlayerAction(action);
    }

    // Input management helpers
    addEventListener(eventType, callback, priority = 100) {
        this.inputManager.addEventListener(eventType, callback, priority);
    }

    removeEventListener(eventType, callback) {
        this.inputManager.removeEventListener(eventType, callback);
    }

    // Scene management helpers
    getScene() {
        return this.sceneManager.getScene();
    }

    getPlanet() {
        return this.sceneManager.getPlanet();
    }

    addToScene(object) {
        this.sceneManager.addObject(object);
    }

    removeFromScene(object) {
        this.sceneManager.removeObject(object);
    }

    // Service container access
    getService(name) {
        return serviceContainer.resolve(name);
    }

    registerService(name, config) {
        serviceContainer.register(name, config);
    }

    // Engine control
    pause() {
        this.isRunning = false;
        console.log('⏸️ Game Engine paused');
    }

    resume() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.clock.start();
            this.gameLoop();
            console.log('▶️ Game Engine resumed');
        }
    }

    shutdown() {
        console.log('🎮 Shutting down Game Engine...');
        
        this.isRunning = false;
        
        // Shutdown systems in reverse order
        this.systemManager.shutdown();
        this.inputManager.shutdown();
        this.sceneManager.shutdown();
        
        // Clear service container
        serviceContainer.clear();
        
        console.log('🎮 Game Engine shutdown complete');
    }

    // Debug information
    getEngineStats() {
        return {
            isRunning: this.isRunning,
            systems: this.systemManager.getSystemStats(),
            services: serviceContainer.getStats()
        };
    }
} 