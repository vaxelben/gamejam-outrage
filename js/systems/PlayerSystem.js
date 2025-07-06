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
        
        // State
        this.planetRadius = 0;
        this.planet = null;
        this.inputManager = null;
        this.gameStateSystem = null;
        
        // Player properties
        this.currentMask = null;
        this.normal = new THREE.Vector3(0, 1, 0); // Persistent normal vector
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
        
        // Setup input handling
        this.setupInputHandling();
        
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

    setupInputHandling() {
        // Register input listeners
        this.inputManager.addEventListener('keydown', (event) => {
            this.handleKeyDown(event.key);
        }, 10); // High priority for player input
    }

    handleKeyDown(key) {
        // Handle mask switching keys
        switch (key) {
            case 'escape':
                if (this.canReturnToNeutral()) {
                    this.setMask(null);
                }
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
        
        // Use camera-relative movement (standard approach for third-person spherical movement)
        // Get camera's looking direction (where camera is pointing)
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        
        // Project camera direction onto the surface tangent plane
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
        
        // DEBUG: Log directions
        if (Math.random() < 0.01) {
            console.log('🎥 Camera direction:', cameraDirection.x.toFixed(2), cameraDirection.y.toFixed(2), cameraDirection.z.toFixed(2));
            console.log('➡️ Forward direction:', forwardDirection.x.toFixed(2), forwardDirection.y.toFixed(2), forwardDirection.z.toFixed(2));
            console.log('⬆️ Right direction:', rightDirection.x.toFixed(2), rightDirection.y.toFixed(2), rightDirection.z.toFixed(2));
        }
        
        // Calculate movement vector
        const movement = new THREE.Vector3();
        
        // DEBUG: Log input values
        if (Math.random() < 0.1) {
            console.log('🎮 Input:', 'x:', input.x, 'y:', input.y);
        }
        
        // Forward/Backward movement (Z/S)
        if (input.y !== 0) {
            movement.addScaledVector(forwardDirection, input.y * speed);
            console.log('⬆️ Forward movement:', input.y, 'direction:', forwardDirection.x.toFixed(2), forwardDirection.y.toFixed(2), forwardDirection.z.toFixed(2));
        }
        
        // Left/Right movement (Q/D)
        if (input.x !== 0) {
            movement.addScaledVector(rightDirection, -input.x * speed); // Q=1 goes west (-east), D=-1 goes east (+east)
            console.log('➡️ Right movement:', -input.x, 'direction:', rightDirection.x.toFixed(2), rightDirection.y.toFixed(2), rightDirection.z.toFixed(2));
        }
        
        // Apply movement
        let newPosition = currentPos.clone();
        newPosition.add(movement);
        
        // Constrain to sphere surface
        newPosition.normalize().multiplyScalar(radius);
        
        // Update position
        this.transform.setPosition(newPosition.x, newPosition.y, newPosition.z);
        
        // Update player normal
        this.normal.copy(newPosition.clone().normalize());
        
        // Debug log occasionally
        if (Math.random() < 0.05) {
            const lat = Math.asin(newPosition.y / radius) * 180 / Math.PI;
            const lon = Math.atan2(newPosition.z, newPosition.x) * 180 / Math.PI;
            console.log('🚶 Player moving:', 
                'pos:', newPosition.x.toFixed(2), newPosition.y.toFixed(2), newPosition.z.toFixed(2),
                'lat:', lat.toFixed(1), '° lon:', lon.toFixed(1), '°',
                'input:', input.x.toFixed(1), input.y.toFixed(1)
            );
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
        
        console.log('🚶 Player System shutdown');
    }
} 