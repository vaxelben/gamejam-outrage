// systems/PoliceSystem.js - Police NPC management following SOLID principles
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { Transform } from '../components/Transform.js';
import { Renderer } from '../components/Renderer.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';
import { NPCFactory } from '../factories/NPCFactory.js';
import { GameEventTypes } from '../interfaces/GameEvents.js';

export class PoliceSystem extends IGameSystem {
    constructor() {
        super('Police');
        
        this.isActive = false;
        this.policeNPCs = [];
        this.planetRadius = 0;
        this.scene = null;
        this.npcFactory = new NPCFactory();
        
        // Use parameter instead of hardcoded value
        this.activationOutrage = params.OUTRAGE_POLICE_THRESHOLD;
        this.maxPolice = 2; // Fewer police NPCs than drones
        this.spawnRadius = this.planetRadius + params.NPC_SIZE / 2;
        this.detectionRadius = params.POLICE_CATCH_DISTANCE || 2;
        this.speed = params.POLICE_SPEED_MULTIPLIER || 1.3;
        
        // Timing
        this.activationTimer = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // seconds between police spawns (reduced from 3 to 1.5)
        
        // Damage system
        this.damageInterval = 0.5; // Apply damage every 0.5 seconds
    }

    async initialize(sceneManager) {
        this.scene = sceneManager.getScene();
        this.planet = sceneManager.getPlanet();
        this.planetRadius = sceneManager.getPlanetRadius();
        
        // Update spawn radius now that we have planetRadius
        this.spawnRadius = this.planetRadius + params.NPC_SIZE / 2;
        
        console.log('🚔 Police System initialized');
        console.log(`🚔 Police speed multiplier: ${params.POLICE_SPEED_MULTIPLIER || 1.3}`);
        console.log(`🚔 Player speed: ${params.PLAYER_SPEED || 20}`);
        console.log(`🚔 Police catch distance: ${params.POLICE_CATCH_DISTANCE || 2}`);
        console.log(`🚔 Police spawn interval: ${this.spawnInterval}s`);
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
        
        // Update all police NPCs
        for (const policeNPC of this.policeNPCs) {
            this.updatePoliceNPC(policeNPC, deltaTime);
        }
        
        // Resolve collisions between police officers
        this.resolvePoliceCollisions();
        
        // Resolve collisions between police and normal NPCs
        this.resolvePoliceNPCCollisions();
    }

    activate() {
        this.isActive = true;
        this.spawnTimer = 0;
        console.log('🚔 Police system activated - officers incoming!');
        
        // Spawn first police officer immediately for instant response
        if (this.policeNPCs.length < this.maxPolice) {
            this.spawnPoliceNPC();
            console.log('🚔 First police officer spawned immediately!');
        }
        
        // Notify game state
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (gameStateSystem) {
            gameStateSystem.setBeingChased(true);
        }
        
        // Publish police activation event for visual effects
        this.publishEvent(GameEventTypes.POLICE_ACTIVATE, {
            outrageLevel: gameStateSystem?.outrage || 0,
            policeCount: this.policeNPCs.length,
            activationReason: 'outrage_threshold'
        });
    }

    deactivate() {
        this.isActive = false;
        console.log('🚔 Police system deactivated');
        
        // Notify game state
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (gameStateSystem) {
            gameStateSystem.setBeingChased(false);
        }
        
        // Publish police deactivation event for visual effects
        this.publishEvent(GameEventTypes.POLICE_DEACTIVATE, {
            outrageLevel: gameStateSystem?.outrage || 0,
            policeCount: this.policeNPCs.length,
            deactivationReason: 'outrage_low'
        });
        
        // Remove all police NPCs gradually
        for (const policeNPC of this.policeNPCs) {
            policeNPC.isRetreating = true;
        }
    }

    updateActiveBehavior(deltaTime) {
        // Spawn new police NPCs if needed
        if (this.policeNPCs.length < this.maxPolice) {
            this.spawnTimer += deltaTime;
            
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnPoliceNPC();
                this.spawnTimer = 0;
            }
        }
    }

    spawnPoliceNPC() {
        const policeNPC = this.createPoliceNPC();
        this.policeNPCs.push(policeNPC);
        console.log(`🚔 Police NPC spawned (${this.policeNPCs.length}/${this.maxPolice})`);
    }

    createPoliceNPC() {
        // Generate random position on planet surface
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = this.planetRadius + params.NPC_SIZE / 2;
        
        const position = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );

        const policeNPC = this.npcFactory.createNPC('police', {
            planetRadius: this.planetRadius,
            scene: this.scene,
            groupSpawnCenter: position,
            groupSpawnRadius: 0 // Spawn exactly at position
        });
        
        // Additional police-specific setup
        policeNPC.isRetreating = false;
        policeNPC.stateTimer = 0;
        policeNPC.lastDamageTime = 0; // Initialize to 0 to allow immediate first damage
        
        return policeNPC;
    }

    updatePoliceNPC(policeNPC, deltaTime) {
        if (!policeNPC.transform || !policeNPC.renderer) return;
        
        policeNPC.stateTimer += deltaTime;
        
        if (policeNPC.isRetreating) {
            this.updateRetreatingNPC(policeNPC, deltaTime);
        } else {
            this.updatePursuingNPC(policeNPC, deltaTime);
        }
    }

    updatePursuingNPC(policeNPC, deltaTime) {
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (!playerSystem) return;
        
        const playerPosition = playerSystem.getPlayerPosition();
        const distanceToPlayer = policeNPC.transform.distanceTo({ position: playerPosition });
        
        // Check for collision first
        if (distanceToPlayer <= policeNPC.detectionRadius) {
            // Police is close enough to damage player
            this.handlePoliceCollision(policeNPC, deltaTime);
            return; // Don't move closer if already in collision range
        }
        
        // Move towards player using the same quaternion-based movement as player
        this.movePoliceTowardsPlayer(policeNPC, playerPosition, deltaTime);
        
        // Update renderer
        policeNPC.renderer.updateTransform(policeNPC.transform);
        
        // Ensure police NPC faces camera (like player and other NPCs)
        this.updatePoliceOrientation(policeNPC);
        
        // Log occasionally to avoid spam
        if (Math.floor(Date.now() / 1000) % 3 === 0 && Math.random() < 0.1) {
            const speed = params.PLAYER_SPEED * policeNPC.speedMultiplier * deltaTime;
            console.log(`🚔 Police NPC pursuing player (distance: ${distanceToPlayer.toFixed(2)}, speed: ${speed.toFixed(4)}, playerSpeed: ${(params.PLAYER_SPEED * deltaTime).toFixed(4)})`);
        }
    }

    updateRetreatingNPC(policeNPC, deltaTime) {
        // Move away from planet center (outward from surface)
        const direction = new THREE.Vector3()
            .copy(policeNPC.transform.position)
            .normalize();
        
        // Retreat faster than normal pursuit speed - use simple linear movement for retreat
        const moveSpeed = params.PLAYER_SPEED * policeNPC.speedMultiplier * 2 * deltaTime;
        const movement = direction.multiplyScalar(moveSpeed);
        policeNPC.transform.position.add(movement);
        
        // Remove NPC if far enough
        if (policeNPC.transform.position.length() > this.planetRadius * 2) {
            this.removePoliceNPC(policeNPC);
        }
        
        // Update renderer
        policeNPC.renderer.updateTransform(policeNPC.transform);
        
        // Ensure police NPC faces camera even while retreating
        this.updatePoliceOrientation(policeNPC);
    }

    movePoliceTowardsPlayer(policeNPC, playerPosition, deltaTime) {
        // Use the same quaternion-based movement system as the player
        const speed = params.PLAYER_SPEED * policeNPC.speedMultiplier * deltaTime;
        const radius = this.planetRadius + params.NPC_SIZE / 2;
        
        const currentPos = policeNPC.transform.position.clone();
        
        // Calculate direction to player on the sphere surface
        const toPlayerDirection = new THREE.Vector3().subVectors(playerPosition, currentPos);
        
        // Project direction onto the tangent plane at police position
        const surfaceNormal = currentPos.clone().normalize();
        const projectedDirection = toPlayerDirection.clone();
        const dotProduct = projectedDirection.dot(surfaceNormal);
        projectedDirection.addScaledVector(surfaceNormal, -dotProduct);
        
        if (projectedDirection.length() < 0.01) return; // No movement needed
        
        projectedDirection.normalize();
        
        // Calculate rotation from movement (same as player system)
        const rotationAxis = new THREE.Vector3().crossVectors(currentPos, projectedDirection);
        rotationAxis.normalize();
        
        // The angle of rotation is the distance to travel divided by the sphere's radius
        const angularDistance = speed / radius;
        const rotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angularDistance);
        
        // Apply rotation to police position
        const newPosition = currentPos.clone().applyQuaternion(rotation);
        
        // Ensure the police stays exactly on the surface
        newPosition.normalize().multiplyScalar(radius);
        
        policeNPC.transform.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    handlePoliceCollision(policeNPC, deltaTime) {
        // Police is in collision range with player
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (!gameStateSystem) return;
        
        // Track time since last damage to avoid spam
        const currentTime = Date.now();
        if (currentTime - policeNPC.lastDamageTime < this.damageInterval * 1000) {
            return; // Too soon since last damage
        }
        
        // Apply damage to player's energy
        const damage = policeNPC.damageRate * this.damageInterval;
        gameStateSystem.decreaseEnergy(damage);
        
        policeNPC.lastDamageTime = currentTime;
        
        console.log(`🚔 Police NPC collision! Energy reduced by ${damage.toFixed(1)}`);
        
        // If player energy reaches 0, game over
        if (gameStateSystem.energy <= 0) {
            gameStateSystem.endGame('CAUGHT');
        }
    }

    updatePoliceOrientation(policeNPC) {
        if (!policeNPC.renderer || !policeNPC.renderer.mesh) return;
        
        // Get camera for orientation
        const camera = serviceContainer.resolve('camera');
        if (!camera) return;
        
        // Calculate camera's up vector from its matrix
        const cameraUpVector = new THREE.Vector3(0, 1, 0);
        cameraUpVector.applyQuaternion(camera.quaternion);
        
        // Set the mesh "up" direction to match camera's up orientation
        policeNPC.renderer.mesh.up.copy(cameraUpVector);
        
        // Make the police NPC plane face the camera with correct up orientation
        policeNPC.renderer.mesh.lookAt(camera.position);
    }

    constrainToSurface(policeNPC) {
        // Keep NPC on planet surface
        const currentDistance = policeNPC.transform.position.length();
        const targetDistance = this.planetRadius + params.NPC_SIZE / 2;
        
        if (Math.abs(currentDistance - targetDistance) > 0.1) {
            policeNPC.transform.position.normalize().multiplyScalar(targetDistance);
        }
    }

    resolvePoliceCollisions() {
        // Check if police collisions are enabled
        if (!params.POLICE_COLLISION_ENABLED) return;
        
        // Collision detection between police officers
        for (let i = 0; i < this.policeNPCs.length; i++) {
            for (let j = i + 1; j < this.policeNPCs.length; j++) {
                const police1 = this.policeNPCs[i];
                const police2 = this.policeNPCs[j];

                if (!police1.transform || !police2.transform) continue;

                const distance = police1.transform.position.distanceTo(police2.transform.position);
                const minDistance = params.NPC_SIZE; // Use same size as NPCs

                if (distance < minDistance && distance > 0.01) {
                    const overlap = minDistance - distance;
                    const direction = new THREE.Vector3()
                        .subVectors(police1.transform.position, police2.transform.position)
                        .normalize();
                    
                    // Move each police officer back by half of the overlap
                    const correction = direction.multiplyScalar(overlap / 2);
                    police1.transform.position.add(correction);
                    police2.transform.position.sub(correction);

                    // Re-project to surface after correction
                    this.constrainToSurface(police1);
                    this.constrainToSurface(police2);
                    
                    // Optional debug logging
                    if (window.debugCollisions) {
                        console.log(`🚔💥 Police collision resolved: distance=${distance.toFixed(2)}, overlap=${overlap.toFixed(2)}`);
                    }
                }
            }
        }
    }

    resolvePoliceNPCCollisions() {
        // Check if police collisions are enabled
        if (!params.POLICE_COLLISION_ENABLED) return;
        
        // Collision detection between police and normal NPCs
        const npcSystem = serviceContainer.resolve('npcSystem');
        if (!npcSystem) return;

        const normalNPCs = npcSystem.getAllNPCs();
        if (!normalNPCs) return;

        for (const policeNPC of this.policeNPCs) {
            if (!policeNPC.transform) continue;

            for (const normalNPC of normalNPCs) {
                if (!normalNPC.transform) continue;

                const distance = policeNPC.transform.position.distanceTo(normalNPC.transform.position);
                const minDistance = params.NPC_SIZE; // Both use same size

                if (distance < minDistance && distance > 0.01) {
                    const overlap = minDistance - distance;
                    const direction = new THREE.Vector3()
                        .subVectors(policeNPC.transform.position, normalNPC.transform.position)
                        .normalize();
                    
                    // Use configurable force ratios from params
                    const policeForceRatio = params.POLICE_FORCE_RATIO; // Police moves back this much
                    const npcForceRatio = params.POLICE_NPC_PUSH_RATIO; // NPC moves back this much
                    
                    const policeCorrection = direction.multiplyScalar(overlap * policeForceRatio);
                    const npcCorrection = direction.multiplyScalar(-overlap * npcForceRatio);
                    
                    policeNPC.transform.position.add(policeCorrection);
                    normalNPC.transform.position.add(npcCorrection);

                    // Re-project to surface after correction
                    this.constrainToSurface(policeNPC);
                    npcSystem.projectToSurface(normalNPC);
                    
                    // Add some velocity to the NPC for more natural movement
                    if (normalNPC.velocity) {
                        const pushVelocity = direction.multiplyScalar(-overlap * 0.1);
                        normalNPC.velocity.add(pushVelocity);
                    }
                    
                    // Optional debug logging
                    if (window.debugCollisions) {
                        console.log(`🚔👤 Police-NPC collision resolved: distance=${distance.toFixed(2)}, overlap=${overlap.toFixed(2)}`);
                    }
                }
            }
        }
    }

    // Public method to get all police NPCs (for NPCSystem to access)
    getAllPoliceNPCs() {
        return this.policeNPCs;
    }

    removePoliceNPC(policeNPC) {
        if (policeNPC.renderer) {
            policeNPC.renderer.dispose();
        }
        
        const index = this.policeNPCs.indexOf(policeNPC);
        if (index > -1) {
            this.policeNPCs.splice(index, 1);
            console.log(`🚔 Police NPC removed (${this.policeNPCs.length} remaining)`);
        }
    }

    // Public interface methods updated for police NPCs
    getPoliceCount() {
        return this.policeNPCs.length;
    }

    getPolicePositions() {
        return this.policeNPCs.map(policeNPC => ({
            id: policeNPC.id,
            position: policeNPC.transform.position.clone(),
            state: policeNPC.state,
            isRetreating: policeNPC.isRetreating
        }));
    }

    // Additional public interface methods
    isPoliceActive() {
        return this.isActive;
    }

    // Debug methods for collision system
    togglePoliceCollisions() {
        params.POLICE_COLLISION_ENABLED = !params.POLICE_COLLISION_ENABLED;
        console.log(`🚔💥 Police collisions: ${params.POLICE_COLLISION_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    }

    setPoliceForceRatio(ratio) {
        params.POLICE_FORCE_RATIO = Math.max(0, Math.min(1, ratio));
        console.log(`🚔💥 Police force ratio set to: ${params.POLICE_FORCE_RATIO}`);
    }

    setPoliceNPCPushRatio(ratio) {
        params.POLICE_NPC_PUSH_RATIO = Math.max(0, Math.min(1, ratio));
        console.log(`🚔💥 Police NPC push ratio set to: ${params.POLICE_NPC_PUSH_RATIO}`);
    }

    enablePoliceCollisionDebug() {
        window.debugCollisions = true;
        console.log('🚔💥 Police collision debugging enabled');
    }

    disablePoliceCollisionDebug() {
        window.debugCollisions = false;
        console.log('🚔💥 Police collision debugging disabled');
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
            for (const policeNPC of this.policeNPCs) {
                if (policeNPC.state === 'PURSUING') {
                    policeNPC.detectionRadius *= 0.8; // Reduce detection
                }
            }
        }
    }

    shutdown() {
        // Clean up all police NPCs
        for (const policeNPC of this.policeNPCs) {
            this.removePoliceNPC(policeNPC);
        }
        
        this.policeNPCs = [];
        this.isActive = false;
        
        console.log('🚔 Police System shutdown');
    }
}