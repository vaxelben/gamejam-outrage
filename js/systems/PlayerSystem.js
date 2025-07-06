// systems/PlayerSystem.js - Player management following SOLID principles
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { Transform } from '../components/Transform.js';
import { Renderer } from '../components/Renderer.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';

export class PlayerSystem extends IGameSystem {
    constructor() {
        super('Player');
        
        // Components
        this.transform = new Transform();
        this.renderer = null;
        this.directionArrow = null; // Red arrow to show player direction
        
        // State
        this.planetRadius = 0;
        this.planet = null;
        this.inputManager = null;
        this.gameStateSystem = null;
        
        // Player properties
        this.currentMask = null;
        this.normal = new THREE.Vector3(0, 1, 0); // Persistent normal vector
        this.lastMovementDirection = new THREE.Vector3(0, 0, 1); // Track last movement direction
        
        // Debug UI
        this.debugUI = null;
        this.showDebugUI = false;
    }

    async initialize(sceneManager) {
        // Get dependencies
        this.inputManager = serviceContainer.resolve('inputManager');
        this.planet = sceneManager.getPlanet();
        this.planetRadius = sceneManager.getPlanetRadius();
        
        // Setup player position
        const playerHeight = this.planetRadius + params.PLAYER_SIZE / 2;
        this.transform.setPosition(0, playerHeight, 0);
        
        // Create player renderer
        this.createPlayerRenderer(sceneManager.getScene());
        
        // Create direction arrow
        this.createDirectionArrow(sceneManager.getScene());
        
        // Setup input handling
        this.setupInputHandling();
        
        // Create debug UI
        this.createDebugUI();
        
        console.log('🚶 Player System initialized');
        console.log(`📍 Player position: ${this.transform.position.x}, ${this.transform.position.y}, ${this.transform.position.z}`);
    }

    createPlayerRenderer(scene) {
        const geometry = new THREE.SphereGeometry(params.PLAYER_SIZE / 2, 16, 16);
        const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(0.5, 0.5, 0.5), // Start neutral
            transparent: false
        });
        
        this.renderer = new Renderer(geometry, material);
        this.renderer.createMesh(scene);
    }

    createDirectionArrow(scene) {
        // Create a proper arrow using THREE.ArrowHelper
        const direction = new THREE.Vector3(0, 0, 1); // Initial direction
        const origin = new THREE.Vector3(0, 0, 0);
        const length = 0.8; // Arrow length
        const color = 0xff0000; // Red color
        
        this.directionArrow = new THREE.ArrowHelper(direction, origin, length, color, 0.2, 0.1);
        
        // Position the arrow above the player
        this.updateDirectionArrow();
        
        scene.add(this.directionArrow);
        
        console.log('🏹 Direction arrow created and added to scene');
    }

    updateDirectionArrow() {
        if (!this.directionArrow) return;
        
        // Position the arrow above the player
        const playerPosition = this.transform.position.clone();
        const playerNormal = this.normal.clone();
        
        // Place arrow slightly above the player sphere
        const arrowPosition = playerPosition.clone().add(playerNormal.clone().multiplyScalar(0.4));
        this.directionArrow.position.copy(arrowPosition);
        
        // Orient the arrow to show the last movement direction
        // Project the movement direction onto the tangent plane at player position
        const movementDirection = this.lastMovementDirection.clone();
        const movementDotNormal = movementDirection.dot(playerNormal);
        movementDirection.addScaledVector(playerNormal, -movementDotNormal);
        
        if (movementDirection.length() > 0.1) {
            movementDirection.normalize();
            this.directionArrow.setDirection(movementDirection);
        }
    }

    setupInputHandling() {
        // Register input listeners
        this.inputManager.addEventListener('keydown', (event) => {
            this.handleKeyDown(event.key);
        }, 10); // High priority for player input
    }

    createDebugUI() {
        // Create debug UI container
        this.debugUI = document.createElement('div');
        this.debugUI.id = 'player-debug-ui';
        this.debugUI.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            z-index: 1000;
            display: none;
            max-width: 400px;
            border: 2px solid #333;
        `;
        
        document.body.appendChild(this.debugUI);
        
        // Create instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.3;
            z-index: 1000;
            border: 1px solid #333;
        `;
        instructions.innerHTML = `
            <strong>🎮 Controls:</strong><br>
            <strong>ZQSD</strong> - Move player<br>
            <strong>H</strong> - Toggle axis/camera HUD<br>
            <strong>F1</strong> - Toggle debug info<br>
            <strong>1-7</strong> - Switch masks<br>
            <strong>ESC</strong> - Return to neutral
        `;
        
        document.body.appendChild(instructions);
    }

    updateDebugUI(debugInfo) {
        if (!this.debugUI || !this.showDebugUI) return;
        
        this.debugUI.innerHTML = `
            <strong>🎮 ZQSD Movement Debug</strong><br>
            <strong>Keys:</strong> ${debugInfo.input}<br>
            <strong>Input Vector:</strong> ${debugInfo.inputVector}<br>
            <strong>Forward Dir:</strong> ${debugInfo.forward}<br>
            <strong>Right Dir:</strong> ${debugInfo.right}<br>
            <strong>Movement:</strong> ${debugInfo.movement}<br>
            <strong>Position:</strong> ${debugInfo.position}<br>
            <strong>Latitude:</strong> ${debugInfo.sphericalCoords.lat}<br>
            <strong>Longitude:</strong> ${debugInfo.sphericalCoords.lon}<br>
            <strong>Mask:</strong> ${this.currentMask || 'Neutral'}<br>
            <strong>Camera Mode:</strong> Third-person orbital
        `;
    }

    toggleDebugUI() {
        this.showDebugUI = !this.showDebugUI;
        this.debugUI.style.display = this.showDebugUI ? 'block' : 'none';
        console.log(`🔧 Debug UI ${this.showDebugUI ? 'shown' : 'hidden'}`);
    }

    handleKeyDown(key) {
        // Handle mask switching keys
        switch (key) {
            case 'escape':
                if (this.canReturnToNeutral()) {
                    this.setMask(null);
                }
                break;
            case 'h':
                // Toggle debug helpers
                const sceneManager = serviceContainer.resolve('sceneManager');
                if (sceneManager) {
                    sceneManager.toggleHelpers();
                }
                break;
            case 'f1':
                // Toggle debug UI
                this.toggleDebugUI();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
                const maskType = parseInt(key);
                if (this.hasEnergy()) {
                    this.setMask(maskType);
                }
                break;
        }
    }

    update(deltaTime) {
        // Handle movement
        this.handleMovement(deltaTime);
        
        // Update renderer
        if (this.renderer) {
            this.renderer.updateTransform(this.transform);
        }
        
        // Update direction arrow
        this.updateDirectionArrow();
    }

    handleMovement(deltaTime) {
        if (!this.planet) return;
        
        // Get movement input
        const input = this.inputManager.getMovementVector();
        
        if (input.x === 0 && input.y === 0) return;
        
        // Use linear movement with tangent vectors
        this.handleLinearMovement(input, deltaTime);
    }
    
    handleLinearMovement(input, deltaTime) {
        // Calculate movement speed
        const speed = params.PLAYER_SPEED * deltaTime;
        const radius = this.planetRadius + params.PLAYER_SIZE / 2;
        
        // Get current position and normalize to correct radius
        const currentPos = this.transform.position.clone();
        const currentDistance = currentPos.length();
        
        // Normalize to correct distance if needed
        if (Math.abs(currentDistance - radius) > 0.01) {
            currentPos.normalize().multiplyScalar(radius);
            this.transform.setPosition(currentPos.x, currentPos.y, currentPos.z);
        }
        
        // Calculate the surface normal at current position
        const surfaceNormal = currentPos.clone().normalize();
        
        // Get camera for movement reference
        const camera = serviceContainer.resolve('camera');
        if (!camera) return;
        
        // IMPROVED ZQSD MOVEMENT SYSTEM
        // Get camera's forward direction (where camera is looking)
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Project camera direction onto the tangent plane at player position
        const forwardDirection = cameraDirection.clone();
        const forwardDotNormal = forwardDirection.dot(surfaceNormal);
        forwardDirection.addScaledVector(surfaceNormal, -forwardDotNormal);
        
        // Normalize and check if projection is valid
        if (forwardDirection.length() < 0.1) {
            // Camera is pointing directly at/away from surface, use fallback
            forwardDirection.set(0, 0, 1); // Fallback direction
        } else {
            forwardDirection.normalize();
        }
        
        // Calculate right direction using cross product
        const rightDirection = new THREE.Vector3().crossVectors(forwardDirection, surfaceNormal);
        rightDirection.normalize();
        
        // Calculate movement vector with clearer ZQSD mapping
        const movement = new THREE.Vector3();
        
        // ZQSD Movement mapping (French AZERTY):
        // Z = forward (positive Y input)
        // S = backward (negative Y input) 
        // Q = left (positive X input)
        // D = right (negative X input)
        
        // Forward/Backward movement (Z/S keys)
        if (input.y !== 0) {
            movement.addScaledVector(forwardDirection, input.y * speed);
        }
        
        // Left/Right movement (Q/D keys)  
        if (input.x !== 0) {
            movement.addScaledVector(rightDirection, -input.x * speed); // Q=1 goes left (-right), D=-1 goes right (+right)
        }
        
        // Apply movement
        let newPosition = currentPos.clone();
        newPosition.add(movement);
        
        // Store movement direction for arrow (before constraining to sphere)
        if (movement.length() > 0.01) {
            this.lastMovementDirection.copy(movement.clone().normalize());
        }
        
        // Constrain to sphere surface
        newPosition.normalize().multiplyScalar(radius);
        
        // Update position
        this.transform.setPosition(newPosition.x, newPosition.y, newPosition.z);
        
        // Update player normal
        this.normal.copy(newPosition.clone().normalize());
        
        // Enhanced debug logging and UI update
        if (input.x !== 0 || input.y !== 0) {
            const debugInfo = {
                input: `Z:${input.y > 0 ? '✓' : ''}${input.y < 0 ? '✗' : ''} S:${input.y < 0 ? '✓' : ''}${input.y > 0 ? '✗' : ''} Q:${input.x > 0 ? '✓' : ''}${input.x < 0 ? '✗' : ''} D:${input.x < 0 ? '✓' : ''}${input.x > 0 ? '✗' : ''}`,
                inputVector: `(${input.x.toFixed(1)}, ${input.y.toFixed(1)})`,
                forward: `(${forwardDirection.x.toFixed(2)}, ${forwardDirection.y.toFixed(2)}, ${forwardDirection.z.toFixed(2)})`,
                right: `(${rightDirection.x.toFixed(2)}, ${rightDirection.y.toFixed(2)}, ${rightDirection.z.toFixed(2)})`,
                movement: `(${movement.x.toFixed(3)}, ${movement.y.toFixed(3)}, ${movement.z.toFixed(3)})`,
                position: `(${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`,
                sphericalCoords: {
                    lat: (Math.asin(newPosition.y / radius) * 180 / Math.PI).toFixed(1) + '°',
                    lon: (Math.atan2(newPosition.z, newPosition.x) * 180 / Math.PI).toFixed(1) + '°'
                }
            };
            
            // Update debug UI
            this.updateDebugUI(debugInfo);
            
            // Optional console logging for development
            if (this.showDebugUI) {
                console.log('🎮 ZQSD Movement:', debugInfo);
            }
        }
    }
    


    // Mask management
    setMask(maskType) {
        this.currentMask = maskType;
        this.updatePlayerAppearance();
        
        // Notify other systems
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (gameStateSystem) {
            gameStateSystem.setMask(maskType);
        }
        
        console.log(`🎭 Player mask changed to: ${maskType || 'Neutral'}`);
    }

    updatePlayerAppearance() {
        if (!this.renderer) return;
        
        const colors = this.getMaskColors();
        const color = colors[this.currentMask] || colors[null];
        
        this.renderer.setColor(color);
        
        // Add subtle glow effect for masked state
        if (this.currentMask !== null) {
            this.renderer.setEmissive(color, 0.2);
        } else {
            this.renderer.setEmissive(new THREE.Color(0, 0, 0), 0);
        }
    }

    getMaskColors() {
        return {
            null: new THREE.Color(0.5, 0.5, 0.5), // Grey
            1: new THREE.Color(0.2, 0.4, 0.8),    // Blue - Conservatives
            2: new THREE.Color(0.8, 0.2, 0.2),    // Red - Social Justice
            3: new THREE.Color(1.0, 0.6, 0.2),    // Orange - Libertarians
            4: new THREE.Color(0.2, 0.6, 0.2),    // Green - Nationalists
            5: new THREE.Color(0.6, 0.2, 0.8),    // Purple - Culture
            6: new THREE.Color(0.6, 0.3, 0.1),    // Brown - Religious
            7: new THREE.Color(1.0, 0.4, 0.8)     // Pink - Antisystem
        };
    }

    // State queries
    canReturnToNeutral() {
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        return gameStateSystem ? gameStateSystem.canReturnToNeutral() : true;
    }

    hasEnergy() {
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        return gameStateSystem ? gameStateSystem.energy > 0 : true;
    }

    // Getters for other systems
    getPlayerPosition() {
        return this.transform.position;
    }

    getPlayerNormal() {
        return this.normal;
    }

    getDistanceTo(targetPosition) {
        return this.transform.distanceTo({ position: targetPosition });
    }

    isNearPosition(targetPosition, range) {
        return this.getDistanceTo(targetPosition) <= range;
    }

    getCurrentMask() {
        return this.currentMask;
    }

    // IGameSystem implementation
    onGameStateChange(newState) {
        if (newState.property === 'energy' && newState.newValue <= 0) {
            // Force neutral when energy depleted
            this.setMask(null);
        }
    }

    onPlayerAction(action) {
        switch (action.type) {
            case 'teleport':
                this.transform.setPosition(action.x, action.y, action.z);
                break;
            case 'forceMask':
                this.setMask(action.maskType);
                break;
        }
    }

    shutdown() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clean up direction arrow
        if (this.directionArrow) {
            // Remove from scene
            if (this.directionArrow.parent) {
                this.directionArrow.parent.remove(this.directionArrow);
            }
            this.directionArrow = null;
        }
        
        // Clean up debug UI
        if (this.debugUI) {
            document.body.removeChild(this.debugUI);
            this.debugUI = null;
        }
        
        // Clean up any other UI elements we created
        const instructions = document.querySelector('div[style*="bottom: 10px"]');
        if (instructions) {
            document.body.removeChild(instructions);
        }
        
        console.log('🚶 Player System shutdown');
    }
} 