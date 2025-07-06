// systems/PoliceSystem.js - Police drone management following SOLID principles
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { Transform } from '../components/Transform.js';
import { Renderer } from '../components/Renderer.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';

export class PoliceSystem extends IGameSystem {
    constructor() {
        super('Police');
        
        this.drones = [];
        this.isActive = false;
        this.activationOutrage = 90; // Activate when outrage >= 90%
        this.scene = null;
        this.planet = null;
        this.planetRadius = 0;
        
        // Drone management
        this.maxDrones = 3;
        this.spawnTimer = 0;
        this.spawnInterval = 2; // Spawn every 2 seconds when active
    }

    async initialize(sceneManager) {
        this.scene = sceneManager.getScene();
        this.planet = sceneManager.getPlanet();
        this.planetRadius = sceneManager.getPlanetRadius();
        
        console.log('🚁 Police System initialized');
    }

    update(deltaTime) {
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (!gameStateSystem) return;
        
        // Check activation status
        const shouldBeActive = gameStateSystem.outrage >= this.activationOutrage;
        
        if (shouldBeActive && !this.isActive) {
            this.activate();
        } else if (!shouldBeActive && this.isActive) {
            this.deactivate();
        }
        
        if (this.isActive) {
            this.updateActiveBehavior(deltaTime);
        }
        
        // Update all drones
        for (const drone of this.drones) {
            this.updateDrone(drone, deltaTime);
        }
    }

    activate() {
        this.isActive = true;
        this.spawnTimer = 0;
        console.log('🚁 Police system activated - drones incoming!');
        
        // Notify game state
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (gameStateSystem) {
            gameStateSystem.setBeingChased(true);
        }
    }

    deactivate() {
        this.isActive = false;
        console.log('🚁 Police system deactivated');
        
        // Notify game state
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (gameStateSystem) {
            gameStateSystem.setBeingChased(false);
        }
        
        // Remove all drones gradually
        for (const drone of this.drones) {
            drone.isRetreating = true;
        }
    }

    updateActiveBehavior(deltaTime) {
        // Spawn new drones if needed
        if (this.drones.length < this.maxDrones) {
            this.spawnTimer += deltaTime;
            
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnDrone();
                this.spawnTimer = 0;
            }
        }
    }

    spawnDrone() {
        const drone = this.createDrone();
        this.drones.push(drone);
        console.log(`🚁 Police drone spawned (${this.drones.length}/${this.maxDrones})`);
    }

    createDrone() {
        const drone = {
            id: `drone_${Date.now()}`,
            transform: new Transform(),
            renderer: null,
            velocity: new THREE.Vector3(),
            target: null,
            state: 'SEARCHING', // SEARCHING, PURSUING, RETREATING
            speed: params.POLICE_SPEED || 5,
            detectionRadius: params.POLICE_DETECTION_RADIUS || 8,
            isRetreating: false,
            stateTimer: 0,
            searchTimer: 0,
            searchInterval: 3 // Change search pattern every 3 seconds
        };
        
        // Position drone at random location around planet
        const angle = Math.random() * Math.PI * 2;
        const height = this.planetRadius + params.POLICE_HEIGHT || 15;
        drone.transform.setPosition(
            Math.cos(angle) * height,
            height * 0.5,
            Math.sin(angle) * height
        );
        
        // Create drone renderer
        this.createDroneRenderer(drone);
        
        return drone;
    }

    createDroneRenderer(drone) {
        const geometry = new THREE.BoxGeometry(0.8, 0.4, 0.8);
        const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(0.1, 0.1, 0.1), // Dark color for police drones
            transparent: true,
            opacity: 0.9
        });
        
        drone.renderer = new Renderer(geometry, material);
        drone.renderer.createMesh(this.scene);
        
        // Add warning light effect
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(1, 0, 0), // Red warning light
            transparent: true,
            opacity: 0.8
        });
        
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(0, 0.3, 0);
        drone.renderer.mesh.add(light);
        
        drone.warningLight = light;
    }

    updateDrone(drone, deltaTime) {
        if (!drone.transform || !drone.renderer) return;
        
        drone.stateTimer += deltaTime;
        
        if (drone.isRetreating) {
            this.updateRetreatingDrone(drone, deltaTime);
        } else {
            this.updateActiveDrone(drone, deltaTime);
        }
        
        // Apply movement
        this.applyDroneMovement(drone, deltaTime);
        
        // Update renderer
        drone.renderer.updateTransform(drone.transform);
        
        // Update warning light
        this.updateWarningLight(drone, deltaTime);
    }

    updateActiveDrone(drone, deltaTime) {
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (!playerSystem) return;
        
        const playerPosition = playerSystem.getPlayerPosition();
        const distanceToPlayer = drone.transform.distanceTo({ position: playerPosition });
        
        if (distanceToPlayer <= drone.detectionRadius) {
            // Player detected - switch to pursuit
            if (drone.state !== 'PURSUING') {
                drone.state = 'PURSUING';
                drone.stateTimer = 0;
                console.log('🚁 Police drone pursuing player!');
            }
            
            // Move towards player
            const direction = new THREE.Vector3()
                .subVectors(playerPosition, drone.transform.position)
                .normalize();
            
            drone.velocity.lerp(direction.multiplyScalar(drone.speed), 0.1);
            
            // Check if caught player
            if (distanceToPlayer <= 1.5) {
                this.catchPlayer();
            }
        } else {
            // Player not detected - search pattern
            if (drone.state !== 'SEARCHING') {
                drone.state = 'SEARCHING';
                drone.stateTimer = 0;
            }
            
            this.updateSearchPattern(drone, deltaTime);
        }
    }

    updateSearchPattern(drone, deltaTime) {
        drone.searchTimer += deltaTime;
        
        if (drone.searchTimer >= drone.searchInterval) {
            // Change search direction
            const angle = Math.random() * Math.PI * 2;
            const height = this.planetRadius + (params.POLICE_HEIGHT || 15);
            
            drone.target = new THREE.Vector3(
                Math.cos(angle) * height * 0.7,
                height * (0.3 + Math.random() * 0.4),
                Math.sin(angle) * height * 0.7
            );
            
            drone.searchTimer = 0;
        }
        
        if (drone.target) {
            const direction = new THREE.Vector3()
                .subVectors(drone.target, drone.transform.position)
                .normalize();
            
            drone.velocity.lerp(direction.multiplyScalar(drone.speed * 0.5), 0.05);
        }
    }

    updateRetreatingDrone(drone, deltaTime) {
        // Move away from planet
        const direction = new THREE.Vector3()
            .copy(drone.transform.position)
            .normalize();
        
        drone.velocity.lerp(direction.multiplyScalar(drone.speed * 1.5), 0.1);
        
        // Remove drone if far enough
        if (drone.transform.position.length() > this.planetRadius * 3) {
            this.removeDrone(drone);
        }
    }

    applyDroneMovement(drone, deltaTime) {
        // Apply velocity to position
        const movement = drone.velocity.clone().multiplyScalar(deltaTime);
        drone.transform.position.add(movement);
        
        // Apply some drag
        drone.velocity.multiplyScalar(0.95);
        
        // Constrain to patrol area (unless retreating)
        if (!drone.isRetreating) {
            const maxDistance = this.planetRadius * 2;
            if (drone.transform.position.length() > maxDistance) {
                drone.transform.position.normalize().multiplyScalar(maxDistance);
            }
        }
    }

    updateWarningLight(drone, deltaTime) {
        if (drone.warningLight) {
            // Blinking red light
            const blinkSpeed = drone.state === 'PURSUING' ? 8 : 4;
            const intensity = Math.sin(drone.stateTimer * blinkSpeed) * 0.5 + 0.5;
            drone.warningLight.material.opacity = 0.3 + intensity * 0.5;
        }
    }

    catchPlayer() {
        console.log('🚁 Player caught by police drone!');
        
        // End game
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (gameStateSystem) {
            gameStateSystem.endGame('CAUGHT');
        }
    }

    removeDrone(drone) {
        if (drone.renderer) {
            drone.renderer.dispose();
        }
        
        const index = this.drones.indexOf(drone);
        if (index > -1) {
            this.drones.splice(index, 1);
            console.log(`🚁 Police drone removed (${this.drones.length} remaining)`);
        }
    }

    // Public interface
    getDroneCount() {
        return this.drones.length;
    }

    isPoliceActive() {
        return this.isActive;
    }

    getDronePositions() {
        return this.drones.map(drone => ({
            id: drone.id,
            position: drone.transform.position.clone(),
            state: drone.state
        }));
    }

    // IGameSystem implementation
    onGameStateChange(newState) {
        if (newState.property === 'outrage') {
            // React to outrage changes
            const shouldBeActive = newState.newValue >= this.activationOutrage;
            
            if (shouldBeActive && !this.isActive) {
                this.activate();
            } else if (!shouldBeActive && this.isActive) {
                this.deactivate();
            }
        }
    }

    onPlayerAction(action) {
        if (action.type === 'maskChange' && action.maskType === null) {
            // Player went neutral - reduce pursuit intensity
            for (const drone of this.drones) {
                if (drone.state === 'PURSUING') {
                    drone.detectionRadius *= 0.8; // Reduce detection
                }
            }
        }
    }

    shutdown() {
        // Clean up all drones
        for (const drone of this.drones) {
            this.removeDrone(drone);
        }
        
        this.drones = [];
        this.isActive = false;
        
        console.log('🚁 Police System shutdown');
    }
} 