// systems/NPCSystem.js - NPC management following SOLID principles
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { NPCFactory } from '../factories/NPCFactory.js';
import { Transform } from '../components/Transform.js';
import { Renderer } from '../components/Renderer.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';

export class NPCSystem extends IGameSystem {
    constructor() {
        super('NPC');
        
        this.npcs = [];
        this.groups = new Map();
        this.planetRadius = 0;
        this.planet = null;
        this.scene = null;
        this.npcFactory = new NPCFactory();
        
        // Performance optimization
        this.updateFrequency = 0.1; // Update every 100ms
        this.lastUpdateTime = 0;
    }

    async initialize(sceneManager) {
        this.scene = sceneManager.getScene();
        this.planet = sceneManager.getPlanet();
        this.planetRadius = sceneManager.getPlanetRadius();
        
        // Create NPC groups
        this.createNPCGroups();
        
        // Setup console helpers for debugging
        this.setupConsoleHelpers();
        
        console.log('👥 NPC System initialized with flocking behavior');
        console.log(`Created ${this.npcs.length} NPCs in ${this.groups.size} groups`);
    }

    createNPCGroups() {
        // Create groups for each mask type with optimized positioning
        const groupPositions = this.generateOptimizedGroupPositions();
        
        for (let maskType = 1; maskType <= 7; maskType++) {
            const group = this.createGroup(maskType, groupPositions[maskType - 1]);
            this.groups.set(maskType, group);
            console.log(`Created group ${maskType} with ${group.npcs.length} NPCs at position (${group.spawnCenter.x.toFixed(1)}, ${group.spawnCenter.y.toFixed(1)}, ${group.spawnCenter.z.toFixed(1)})`);
        }
        
        // Log distribution quality
        this.logGroupDistributionQuality(groupPositions);
    }

    createGroup(maskType, predefinedPosition = null) {
        // Generate a specific spawn area for this group
        const groupSpawnCenter = predefinedPosition || this.generateGroupSpawnPosition(maskType);
        const groupSpawnRadius = 3; // Radius of the spawn zone for the group
        
        const group = {
            id: `group_${maskType}`,
            maskType: maskType,
            npcs: [],
            color: this.getMaskColor(maskType),
            targetSize: params.NPC_GROUP_SIZE,
            cohesion: 0.5 + Math.random() * 0.5,
            activity: 0.3 + Math.random() * 0.7,
            spawnCenter: groupSpawnCenter,
            spawnRadius: groupSpawnRadius
        };

        // Create NPCs for this group in the same area
        for (let i = 0; i < group.targetSize; i++) {
            const npc = this.npcFactory.createNPC('basic', {
                maskType: maskType,
                planetRadius: this.planetRadius,
                scene: this.scene,
                color: group.color,
                groupSpawnCenter: groupSpawnCenter,
                groupSpawnRadius: groupSpawnRadius
            });
            
            group.npcs.push(npc);
            this.npcs.push(npc);
        }

        return group;
    }

    getNPCs() {
        return this.npcs;
    }

    getMaskColor(maskType) {
        const colors = {
            1: new THREE.Color(0.2, 0.4, 0.8),    // Blue - Conservatives
            2: new THREE.Color(0.8, 0.2, 0.2),    // Red - Social Justice
            3: new THREE.Color(1.0, 0.6, 0.2),    // Orange - Libertarians
            4: new THREE.Color(0.2, 0.6, 0.2),    // Green - Nationalists
            5: new THREE.Color(0.6, 0.2, 0.8),    // Purple - Culture
            6: new THREE.Color(0.6, 0.3, 0.1),    // Brown - Religious
            7: new THREE.Color(1.0, 0.4, 0.8)     // Pink - Antisystem
        };
        return colors[maskType] || new THREE.Color(0.5, 0.5, 0.5);
    }

    update(deltaTime) {
        // --- Logic update (throttled) ---
        this.lastUpdateTime += deltaTime;
        if (this.lastUpdateTime >= this.updateFrequency) {
            const actualDeltaTime = this.lastUpdateTime;
            this.fixedUpdate(actualDeltaTime);
            this.lastUpdateTime = 0;
        }

        // --- Movement and rendering update (every frame) ---
        for (const npc of this.npcs) {
            if (!npc.transform || !npc.renderer) continue;

            // Apply movement based on current velocity
            this.applyNPCMovement(npc, deltaTime);
        }

        // --- Collision resolution (every frame) ---
        this.resolveCollisions();
        
        // --- Player-NPC collision resolution (every frame) ---
        this.resolvePlayerNPCCollisions();

        // --- Final renderer update (every frame) ---
        for (const npc of this.npcs) {
            if (!npc.transform || !npc.renderer) continue;
            
            // Update renderer transform
            npc.renderer.updateTransform(npc.transform);
        }
    }

    resolveCollisions() {
        for (let i = 0; i < this.npcs.length; i++) {
            for (let j = i + 1; j < this.npcs.length; j++) {
                const npc1 = this.npcs[i];
                const npc2 = this.npcs[j];

                const distance = npc1.transform.position.distanceTo(npc2.transform.position);
                const minDistance = params.NPC_SIZE; // Use size as collision diameter

                if (distance < minDistance) {
                    const overlap = minDistance - distance;
                    const direction = new THREE.Vector3().subVectors(npc1.transform.position, npc2.transform.position).normalize();
                    
                    // Move each NPC back by half of the overlap
                    const correction = direction.multiplyScalar(overlap / 2);
                    npc1.transform.position.add(correction);
                    npc2.transform.position.sub(correction);

                    // Re-project to surface after correction
                    this.projectToSurface(npc1);
                    this.projectToSurface(npc2);
                }
            }
        }
    }

    resolvePlayerNPCCollisions() {
        // Check if collisions are enabled
        if (!params.PLAYER_NPC_COLLISION_ENABLED) return;
        
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (!playerSystem) return;
        
        const playerPosition = playerSystem.getPlayerPosition();
        if (!playerPosition) return;
        
        // Collision radius with configurable overlap
        const collisionRadius = (params.PLAYER_SIZE + params.NPC_SIZE) * params.PLAYER_NPC_COLLISION_RADIUS;
        
        for (const npc of this.npcs) {
            const distance = npc.transform.position.distanceTo(playerPosition);
            
            if (distance < collisionRadius && distance > 0.01) { // Small threshold to avoid division by zero
                const overlap = collisionRadius - distance;
                
                // Direction from player to NPC (to push NPC away)
                const direction = new THREE.Vector3()
                    .subVectors(npc.transform.position, playerPosition)
                    .normalize();
                
                // Move NPC away from player with configurable push force
                const repulsionStrength = Math.min(overlap * params.PLAYER_NPC_PUSH_FORCE, 2.0);
                const correction = direction.multiplyScalar(repulsionStrength);
                const newNPCPosition = npc.transform.position.clone().add(correction);
                
                // Project NPC to planet surface
                const surfaceNormal = newNPCPosition.clone().normalize();
                const targetDistance = this.planetRadius + params.NPC_SIZE / 2;
                newNPCPosition.copy(surfaceNormal.multiplyScalar(targetDistance));
                
                // Update NPC position
                npc.transform.setPosition(newNPCPosition.x, newNPCPosition.y, newNPCPosition.z);
                
                // Add velocity to the NPC to make the push feel more natural
                const pushVelocity = direction.multiplyScalar(repulsionStrength * params.PLAYER_NPC_PUSH_VELOCITY);
                npc.velocity.add(pushVelocity);
                
                // Optional: Add some visual feedback for collision
                if (window.debugCollisions) {
                    console.log(`💥 Player pushed NPC: distance=${distance.toFixed(2)}, overlap=${overlap.toFixed(2)}`);
                }
            }
        }
    }



    fixedUpdate(deltaTime) {
        // Update all NPCs' logic
        for (const npc of this.npcs) {
            this.updateNPCLogic(npc, deltaTime);
            
            // Apply friction
            npc.velocity.multiplyScalar(0.95);
        }
        
        // Update group behaviors
        this.updateGroupBehaviors(deltaTime);
        
        // Check if player is in crowd and update game state
        this.updatePlayerCrowdStatus();
        
        // Handle player interactions
        this.handlePlayerInteractions();
        
        // Debug flocking occasionally
        if (window.debugFlocking && Math.random() < 0.01) {
            this.debugFlockingForces(true);
        }
    }

    updatePlayerCrowdStatus() {
        const playerSystem = serviceContainer.resolve('playerSystem');
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        
        if (!playerSystem || !gameStateSystem) return;
        
        const playerPosition = playerSystem.getPlayerPosition();
        const playerMask = playerSystem.getCurrentMask();
        
        if (!playerPosition || playerMask === null) {
            // Player is neutral or position unknown - not in crowd
            gameStateSystem.setInCrowd(false);
            gameStateSystem.setInWrongCrowd(false);
            return;
        }
        
        // Count nearby NPCs within crowd detection radius
        const nearbyNPCs = this.getNearbyNPCsFromPosition(playerPosition, params.CROWD_DETECT_DISTANCE);
        
        // Check if player is in a crowd (minimum crowd size)
        if (nearbyNPCs.length >= params.CROWD_SIZE_MIN) {
            gameStateSystem.setInCrowd(true);
            
            // Check if it's a "wrong" crowd (different mask types)
            const wrongCrowdNPCs = nearbyNPCs.filter(npc => npc.maskType !== playerMask);
            const wrongCrowdRatio = wrongCrowdNPCs.length / nearbyNPCs.length;
            
            // If majority of crowd has different mask, it's a "wrong" crowd
            if (wrongCrowdRatio > 0.5) {
                gameStateSystem.setInWrongCrowd(true);
                console.log(`🎭 Player in wrong crowd (${wrongCrowdRatio.toFixed(2)} wrong mask ratio) - outrage increasing!`);
            } else {
                gameStateSystem.setInWrongCrowd(false);
                console.log(`🎭 Player in correct crowd (${(1-wrongCrowdRatio).toFixed(2)} correct mask ratio) - outrage stable!`);
            }
        } else {
            gameStateSystem.setInCrowd(false);
            gameStateSystem.setInWrongCrowd(false);
        }
    }

    updateNPCLogic(npc, deltaTime) {
        // Update NPC state machine
        this.updateNPCState(npc, deltaTime);
        
        // Update NPC forces to change velocity
        this.updateNPCForces(npc);
    }

    updateNPC(npc, deltaTime) {
        if (!npc.transform || !npc.renderer) return;
        
        // This method is now split into updateNPCLogic and the movement part in update()
        // Kept for compatibility if called from elsewhere, but should be deprecated.
        
        // Update NPC state machine
        this.updateNPCState(npc, deltaTime);
        
        // Update NPC forces
        this.updateNPCForces(npc);
        
        // Apply movement
        this.applyNPCMovement(npc, deltaTime);
        
        // Update renderer
        npc.renderer.updateTransform(npc.transform);
    }

    updateNPCState(npc, deltaTime) {
        npc.stateTimer += deltaTime;
        
        // Update flocking boosters
        this.updateFlockingBoosters(npc, deltaTime);
        
        // Check for state transitions
        if (npc.stateTimer >= npc.minStateDuration) {
            if (Math.random() < params.NPC_STATE_CHANGE_CHANCE * deltaTime) {
                this.changeNPCState(npc);
            }
        }
        
        // Update personality over time
        npc.personality.curiosity = Math.max(0, Math.min(1, 
            npc.personality.curiosity + (Math.random() - 0.5) * 0.1 * deltaTime
        ));
        
        // Update player influence over time
        if (npc.playerInfluence > 0) {
            npc.playerInfluence = Math.max(0, npc.playerInfluence - deltaTime * 0.2);
        } else if (npc.playerInfluence < 0) {
            npc.playerInfluence = Math.min(0, npc.playerInfluence + deltaTime * 0.2);
        }
    }
    
    updateFlockingBoosters(npc, deltaTime) {
        // Update flocking boost timer
        if (npc.flockingBoostTimer > 0) {
            npc.flockingBoostTimer -= deltaTime;
            if (npc.flockingBoostTimer <= 0) {
                npc.flockingBoost = 1.0;
            }
        }
        
        // Update separation boost timer
        if (npc.separationBoostTimer > 0) {
            npc.separationBoostTimer -= deltaTime;
            if (npc.separationBoostTimer <= 0) {
                npc.separationBoost = 1.0;
            }
        }
        
        // Initialize boosters if they don't exist
        if (npc.flockingBoost === undefined) npc.flockingBoost = 1.0;
        if (npc.separationBoost === undefined) npc.separationBoost = 1.0;
        if (npc.playerInfluence === undefined) npc.playerInfluence = 0.0;
    }

    changeNPCState(npc) {
        const possibleStates = ['IDLE', 'WANDERING', 'GATHERING'];
        const newState = possibleStates[Math.floor(Math.random() * possibleStates.length)];
        
        if (newState !== npc.state) {
            npc.state = newState;
            npc.stateTimer = 0;
            npc.minStateDuration = params.NPC_MIN_STATE_DURATION + Math.random() * 2;
            
            // Reset target for new state
            if (newState === 'WANDERING') {
                npc.targetPosition = this.generateRandomPosition();
            }
        }
    }

    updateNPCForces(npc) {
        const forces = {
            separation: new THREE.Vector3(),
            alignment: new THREE.Vector3(),
            cohesion: new THREE.Vector3(),
            wandering: new THREE.Vector3(),
            interGroupRepulsion: new THREE.Vector3(),
            playerInfluence: new THREE.Vector3()
        };
        
        // Get neighbors for flocking behavior
        const flockingNeighbors = this.getNearbyNPCs(npc, params.NPC_FLOCKING_RADIUS);
        
        // Calculate flocking forces (Craig Reynolds algorithm)
        if (flockingNeighbors.length > 0) {
            this.calculateFlockingSeparation(npc, flockingNeighbors, forces.separation);
            this.calculateFlockingAlignment(npc, flockingNeighbors, forces.alignment);
            this.calculateFlockingCohesion(npc, flockingNeighbors, forces.cohesion);
            this.calculateInterGroupRepulsion(npc, flockingNeighbors, forces.interGroupRepulsion);
        }
        
        this.calculateWanderingForce(npc, forces.wandering);
        
        // Apply forces with weights and boosters
        const separationMultiplier = params.NPC_SEPARATION_FORCE * (npc.separationBoost || 1.0);
        const alignmentMultiplier = params.NPC_ALIGNMENT_FORCE * (npc.flockingBoost || 1.0);
        const cohesionMultiplier = params.NPC_COHESION_FORCE * (npc.flockingBoost || 1.0);
        
        const totalFlockingForce = new THREE.Vector3()
            .add(forces.separation.multiplyScalar(separationMultiplier))
            .add(forces.alignment.multiplyScalar(alignmentMultiplier))
            .add(forces.cohesion.multiplyScalar(cohesionMultiplier));
        
        // Limit the maximum flocking force
        this.limitForce(totalFlockingForce, params.NPC_MAX_FORCE * (npc.flockingBoost || 1.0));
        
        // Calculate player influence force
        this.calculatePlayerInfluence(npc, forces.playerInfluence);

        // Apply all forces
        npc.velocity.add(totalFlockingForce.multiplyScalar(params.NPC_FLOCKING_WEIGHT));
        npc.velocity.add(forces.wandering.multiplyScalar(params.NPC_WANDER_FORCE));
        npc.velocity.add(forces.interGroupRepulsion.multiplyScalar(params.NPC_INTER_GROUP_REPULSION));
        npc.velocity.add(forces.playerInfluence);
        
        // Apply speed limits
        this.limitNPCSpeed(npc);
    }

    calculatePlayerInfluence(npc, influenceForce) {
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (!playerSystem) return;

        const playerMask = playerSystem.getCurrentMask();
        if (playerMask === null) return; // No influence if player is neutral

        const playerPosition = playerSystem.getPlayerPosition();
        const distance = npc.transform.distanceTo({ position: playerPosition });

        if (distance < params.PLAYER_INFLUENCE_RADIUS) {
            // Vector from player to NPC
            const direction = new THREE.Vector3().subVectors(npc.transform.position, playerPosition).normalize();
            
            if (npc.maskType === playerMask) {
                // Attraction force (pulls NPC towards player)
                const attractionStrength = params.PLAYER_ATTRACTION_FORCE * (1 - distance / params.PLAYER_INFLUENCE_RADIUS);
                influenceForce.add(direction.multiplyScalar(-attractionStrength)); // Negative to pull towards player
            } else {
                // Repulsion force (pushes NPC away from player)
                const repulsionStrength = params.PLAYER_REPULSION_FORCE * (1 - distance / params.PLAYER_INFLUENCE_RADIUS);
                influenceForce.add(direction.multiplyScalar(repulsionStrength));
            }
        }
    }

    // Craig Reynolds Flocking Algorithm Implementation
    
    // Rule 1: Separation - avoid crowding neighbors (respects personal space)
    calculateFlockingSeparation(npc, neighbors, separationForce) {
        let count = 0;
        
        for (const neighbor of neighbors) {
            const distance = npc.transform.distanceTo(neighbor.transform);
            
            if (distance < params.NPC_SEPARATION_RADIUS && distance > 0) {
                // Calculate a normalized vector pointing away from the neighbor
                const direction = new THREE.Vector3()
                    .subVectors(npc.transform.position, neighbor.transform.position)
                    .normalize();
                
                // The force should be stronger the closer the NPCs are.
                // Using an inverse square relationship creates a strong "force field".
                const repulsionStrength = Math.pow(params.NPC_SEPARATION_RADIUS / distance, 2);
                
                direction.multiplyScalar(repulsionStrength);
                separationForce.add(direction);
                count++;
            }
        }
        
        if (count > 0) {
            separationForce.divideScalar(count);
            // Allow separation to be a much stronger force
            this.limitForce(separationForce, params.NPC_MAX_FORCE * 3);
        }
    }
    
    // Rule 2: Alignment - steer towards average heading of neighbors
    calculateFlockingAlignment(npc, neighbors, alignmentForce) {
        const sameGroupNeighbors = neighbors.filter(n => n.maskType === npc.maskType);
        let count = 0;
        
        for (const neighbor of sameGroupNeighbors) {
            const distance = npc.transform.distanceTo(neighbor.transform);
            if (distance < params.NPC_ALIGNMENT_RADIUS && distance > 0) {
                alignmentForce.add(neighbor.velocity);
                count++;
            }
        }
        
        if (count > 0) {
            alignmentForce.divideScalar(count);
            alignmentForce.normalize();
        }
    }
    
    // Rule 3: Cohesion - steer towards average position of neighbors
    calculateFlockingCohesion(npc, neighbors, cohesionForce) {
        const sameGroupNeighbors = neighbors.filter(n => n.maskType === npc.maskType);
        let count = 0;
        
        for (const neighbor of sameGroupNeighbors) {
            const distance = npc.transform.distanceTo(neighbor.transform);
            if (distance < params.NPC_COHESION_RADIUS && distance > 0) {
                cohesionForce.add(neighbor.transform.position);
                count++;
            }
        }
        
        if (count > 0) {
            cohesionForce.divideScalar(count);
            cohesionForce.sub(npc.transform.position);
            cohesionForce.normalize();
        }
    }

    calculateInterGroupRepulsion(npc, neighbors, repulsionForce) {
        const otherGroupNeighbors = neighbors.filter(n => n.maskType !== npc.maskType);
        
        for (const neighbor of otherGroupNeighbors) {
            const distance = npc.transform.distanceTo(neighbor.transform);
            if (distance < params.NPC_INTER_GROUP_DISTANCE && distance > 0) {
                const direction = new THREE.Vector3()
                    .subVectors(npc.transform.position, neighbor.transform.position)
                    .normalize();
                
                // Exponential repulsion - stronger when closer
                const repulsionStrength = Math.pow(params.NPC_INTER_GROUP_DISTANCE / distance, 2);
                const force = direction.multiplyScalar(repulsionStrength);
                repulsionForce.add(force);
            }
        }
    }

    calculateWanderingForce(npc, wanderingForce) {
        if (npc.state === 'WANDERING') {
            // Generate or update wander target
            if (!npc.targetPosition || npc.transform.distanceTo({ position: npc.targetPosition }) < 2) {
                npc.targetPosition = this.generateWanderTarget(npc);
            }
            
            // Steer towards target
            wanderingForce.subVectors(npc.targetPosition, npc.transform.position);
            wanderingForce.normalize();
        } else {
            // Gentle random movement for non-wandering states
            wanderingForce.set(
                (Math.random() - 0.5) * 0.5,
                0,
                (Math.random() - 0.5) * 0.5
            );
        }
    }
    
    generateWanderTarget(npc) {
        // Generate a target position within wander radius but on planet surface
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * params.NPC_WANDER_RADIUS;
        
        const currentPos = npc.transform.position.clone();
        const wanderOffset = new THREE.Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        
        const targetPos = currentPos.add(wanderOffset);
        
        // Project to planet surface
        const planetDistance = targetPos.length();
        if (planetDistance > 0) {
            const surfaceDistance = this.planetRadius + params.NPC_SIZE / 2;
            targetPos.normalize().multiplyScalar(surfaceDistance);
        }
        
        return targetPos;
    }

    // Utility method to limit force magnitude
    limitForce(force, maxForce) {
        if (force.length() > maxForce) {
            force.normalize().multiplyScalar(maxForce);
        }
    }
    
    limitNPCSpeed(npc) {
        // Use a more reasonable speed calculation: base speed + small variation
        const speedVariation = (npc.personality.energy - 0.5) * params.NPC_SPEED_VARIATION;
        const maxSpeed = params.NPC_BASE_SPEED + speedVariation;
        
        if (npc.velocity.length() > maxSpeed) {
            npc.velocity.normalize().multiplyScalar(maxSpeed);
        }
    }

    applyNPCMovement(npc, deltaTime) {
        // Apply velocity to position
        const movement = npc.velocity.clone().multiplyScalar(deltaTime);
        npc.transform.position.add(movement);
        
        // Project to planet surface
        this.projectToSurface(npc);
    }

    projectToSurface(npc) {
        const position = npc.transform.position;
        const distance = position.length();
        
        if (distance > 0) {
            const targetDistance = this.planetRadius + params.NPC_SIZE / 2;
            const normalizedPos = position.clone().normalize().multiplyScalar(targetDistance);
            npc.transform.setPosition(normalizedPos.x, normalizedPos.y, normalizedPos.z);
        }
    }

    generateRandomPosition() {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = this.planetRadius + params.NPC_SIZE / 2;
        
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    generateGroupSpawnPosition(maskType) {
        // Generate specific spawn zones for each group around the planet
        // Using optimized sphere distribution for better coverage
        
        // Predefined optimized positions for 7 groups using spiral distribution
        // This ensures maximum separation and even coverage of the sphere
        const optimizedPositions = [
            { theta: 0, phi: 0 },                    // Group 1: North pole
            { theta: 0, phi: Math.PI },              // Group 2: South pole
            { theta: 0, phi: Math.PI * 0.5 },        // Group 3: Equator 0°
            { theta: Math.PI * 0.67, phi: Math.PI * 0.5 }, // Group 4: Equator 120°
            { theta: Math.PI * 1.33, phi: Math.PI * 0.5 }, // Group 5: Equator 240°
            { theta: Math.PI * 0.33, phi: Math.PI * 0.25 }, // Group 6: Northern hemisphere
            { theta: Math.PI * 1.67, phi: Math.PI * 0.75 }  // Group 7: Southern hemisphere
        ];
        
        // Get the predefined position for this group
        const basePosition = optimizedPositions[maskType - 1];
        
        // Add small random variation to avoid perfect symmetry (max ±15°)
        const thetaVariation = (Math.random() - 0.5) * 0.26; // ±15° in radians
        const phiVariation = (Math.random() - 0.5) * 0.26;
        
        const theta = basePosition.theta + thetaVariation;
        const phi = Math.max(0.1, Math.min(Math.PI - 0.1, basePosition.phi + phiVariation));
        const radius = this.planetRadius + params.NPC_SIZE / 2;
        
        return new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    generateOptimizedGroupPositions() {
        // Generate all group positions and optimize them for better distribution
        const positions = [];
        
        // Generate initial positions
        for (let maskType = 1; maskType <= 7; maskType++) {
            positions.push(this.generateGroupSpawnPosition(maskType));
        }
        
        // Optimize positions to avoid clustering
        this.optimizeGroupPositions(positions);
        
        return positions;
    }

    optimizeGroupPositions(positions) {
        // Apply force-based optimization to spread groups more evenly
        const minDistance = 8; // Minimum distance between group centers
        const iterations = 50; // Number of optimization iterations
        
        for (let iter = 0; iter < iterations; iter++) {
            let totalForce = 0;
            
            for (let i = 0; i < positions.length; i++) {
                const force = new THREE.Vector3();
                
                for (let j = 0; j < positions.length; j++) {
                    if (i !== j) {
                        const distance = positions[i].distanceTo(positions[j]);
                        if (distance < minDistance) {
                            // Calculate repulsion force
                            const repulsion = new THREE.Vector3()
                                .subVectors(positions[i], positions[j])
                                .normalize()
                                .multiplyScalar(minDistance - distance);
                            
                            force.add(repulsion);
                        }
                    }
                }
                
                // Apply force and re-project to sphere surface
                if (force.length() > 0) {
                    positions[i].add(force.multiplyScalar(0.1));
                    positions[i].normalize().multiplyScalar(this.planetRadius + params.NPC_SIZE / 2);
                    totalForce += force.length();
                }
            }
            
            // Early termination if forces are small
            if (totalForce < 0.1) break;
        }
    }

    logGroupDistributionQuality(positions) {
        // Calculate and log distribution quality metrics
        let minDistance = Infinity;
        let maxDistance = 0;
        let totalDistance = 0;
        let comparisons = 0;
        
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const distance = positions[i].distanceTo(positions[j]);
                minDistance = Math.min(minDistance, distance);
                maxDistance = Math.max(maxDistance, distance);
                totalDistance += distance;
                comparisons++;
            }
        }
        
        const avgDistance = totalDistance / comparisons;
        const uniformity = (minDistance / maxDistance) * 100;
        
        console.log(`🎯 Group Distribution Quality:`);
        console.log(`   • Average distance: ${avgDistance.toFixed(1)} units`);
        console.log(`   • Min distance: ${minDistance.toFixed(1)} units`);
        console.log(`   • Max distance: ${maxDistance.toFixed(1)} units`);
        console.log(`   • Uniformity: ${uniformity.toFixed(1)}% (higher is better)`);
        
        // Coverage analysis
        const coverageAnalysis = this.analyzeSphereCoverage(positions);
        console.log(`   • Sphere coverage: ${coverageAnalysis.coverage.toFixed(1)}%`);
        console.log(`   • Hemispheric balance: ${coverageAnalysis.hemisphericBalance.toFixed(1)}%`);
    }

    analyzeSphereCoverage(positions) {
        // Analyze how well the positions cover the sphere
        let northernHemisphere = 0;
        let southernHemisphere = 0;
        
        for (const pos of positions) {
            if (pos.y >= 0) {
                northernHemisphere++;
            } else {
                southernHemisphere++;
            }
        }
        
        const hemisphericBalance = Math.min(northernHemisphere, southernHemisphere) / 
                                  Math.max(northernHemisphere, southernHemisphere) * 100;
        
        // Simple coverage estimation (could be improved with more sophisticated methods)
        const coverage = Math.min(100, positions.length / 7 * 85); // Heuristic estimation
        
        return {
            coverage,
            hemisphericBalance,
            northernGroups: northernHemisphere,
            southernGroups: southernHemisphere
        };
    }

    getNearbyNPCs(npc, radius) {
        return this.npcs.filter(other => {
            if (other === npc) return false;
            if (!npc.transform || !other.transform) return false;
            return npc.transform.distanceTo(other.transform) <= radius;
        });
    }

    // Helper method to find NPCs near a position (used for player crowd detection)
    getNearbyNPCsFromPosition(position, radius) {
        return this.npcs.filter(npc => {
            if (!npc || !npc.transform) return false;
            return position.distanceTo(npc.transform.position) <= radius;
        });
    }

    updateGroupBehaviors(deltaTime) {
        // Update group-level behaviors
        for (const group of this.groups.values()) {
            this.updateGroupCohesion(group, deltaTime);
        }
    }

    updateGroupCohesion(group, deltaTime) {
        // Calculate group center
        const center = new THREE.Vector3();
        for (const npc of group.npcs) {
            center.add(npc.transform.position);
        }
        center.divideScalar(group.npcs.length);
        
        group.center = center;
        
        // Update group activity
        group.activity = Math.max(0.1, Math.min(1.0, 
            group.activity + (Math.random() - 0.5) * 0.1 * deltaTime
        ));
    }

    handlePlayerInteractions() {
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (!playerSystem) return;
        
        const playerPosition = playerSystem.getPlayerPosition();
        const playerMask = playerSystem.getCurrentMask();
        
        // Check NPC interactions with player
        for (const npc of this.npcs) {
            const distance = npc.transform.distanceTo({ position: playerPosition });
            
            if (distance <= params.NPC_INTERACTION_RADIUS) {
                this.handleNPCPlayerInteraction(npc, playerMask, distance);
            }
        }
    }

    handleNPCPlayerInteraction(npc, playerMask, distance) {
        const gameStateSystem = serviceContainer.resolve('gameStateSystem');
        if (!gameStateSystem) return;
        
        // Throttle interactions to prevent event spam
        const currentTime = Date.now();
        if (!npc.lastInteractionTime) {
            npc.lastInteractionTime = 0;
        }
        
        // Only process interaction if enough time has passed (500ms cooldown)
        const interactionCooldown = 500;
        if (currentTime - npc.lastInteractionTime < interactionCooldown) {
            return;
        }
        
        if (playerMask === null) {
            // Neutral player - mild curiosity but no strong reaction
            npc.playerInfluence = Math.max(0, npc.playerInfluence - 0.1);
            npc.lastInteractionTime = currentTime;
            return;
        }
        
        if (playerMask === npc.maskType) {
            // Same mask - positive interaction
            const influence = params.NPC_SAME_MASK_INFLUENCE;
            gameStateSystem.addOutrage(-influence);
            gameStateSystem.addEnergy(params.ENERGY_RECHARGE_RATE / 60); // Recharge per frame
            
            // NPC becomes more cohesive and attracted to player
            npc.state = 'GATHERING';
            npc.stateTimer = 0;
            npc.playerInfluence = Math.min(1, npc.playerInfluence + 0.2);
            
            // Increase flocking cohesion temporarily
            npc.flockingBoost = 1.5;
            npc.flockingBoostTimer = 3.0;
        } else {
            // Different mask - negative interaction
            const influence = params.NPC_DIFFERENT_MASK_INFLUENCE;
            gameStateSystem.addOutrage(influence);
            gameStateSystem.addEnergy(-params.NPC_ENERGY_DRAIN_RATE);
            
            // NPC becomes more separated and avoids player
            npc.state = 'IDLE'; // Changed from FLEEING to IDLE for better flocking
            npc.stateTimer = 0;
            npc.playerInfluence = Math.max(-1, npc.playerInfluence - 0.3);
            
            // Increase separation force temporarily
            npc.separationBoost = 2.0;
            npc.separationBoostTimer = 4.0;
        }
        
        // Update last interaction time
        npc.lastInteractionTime = currentTime;
        
        // Trigger flocking response in nearby NPCs
        this.triggerFlockingResponse(npc, playerMask);
    }
    
    triggerFlockingResponse(triggerNPC, playerMask) {
        const nearbyNPCs = this.getNearbyNPCs(triggerNPC, params.NPC_FLOCKING_RADIUS * 1.5);
        
        for (const npc of nearbyNPCs) {
            if (npc.maskType === triggerNPC.maskType) {
                // Same group - amplify the response
                if (playerMask === npc.maskType) {
                    npc.flockingBoost = (npc.flockingBoost || 1) * 1.2;
                    npc.flockingBoostTimer = 2.0;
                } else {
                    npc.separationBoost = (npc.separationBoost || 1) * 1.3;
                    npc.separationBoostTimer = 3.0;
                }
            }
        }
    }

    // Public interface
    getNPCCount() {
        return this.npcs.length;
    }

    getNPCsInRadius(center, radius) {
        return this.npcs.filter(npc => {
            const distance = npc.transform.distanceTo({ position: center });
            return distance <= radius;
        });
    }

    getGroupStats() {
        const stats = {};
        for (const [maskType, group] of this.groups) {
            const groupStats = {
                count: group.npcs.length,
                activity: group.activity,
                cohesion: group.cohesion,
                center: group.center,
                flocking: {
                    averageVelocity: new THREE.Vector3(),
                    averageSeparation: 0,
                    averageAlignment: 0,
                    averageCohesion: 0
                }
            };
            
            // Calculate flocking metrics
            let velocitySum = new THREE.Vector3();
            let separationSum = 0;
            let alignmentSum = 0;
            let cohesionSum = 0;
            
            for (const npc of group.npcs) {
                velocitySum.add(npc.velocity);
                separationSum += npc.separationBoost || 1.0;
                alignmentSum += npc.flockingBoost || 1.0;
                cohesionSum += npc.flockingBoost || 1.0;
            }
            
            if (group.npcs.length > 0) {
                groupStats.flocking.averageVelocity = velocitySum.divideScalar(group.npcs.length);
                groupStats.flocking.averageSeparation = separationSum / group.npcs.length;
                groupStats.flocking.averageAlignment = alignmentSum / group.npcs.length;
                groupStats.flocking.averageCohesion = cohesionSum / group.npcs.length;
            }
            
            stats[maskType] = groupStats;
        }
        return stats;
    }
    
    // Debug method to visualize flocking forces (optional)
    debugFlockingForces(enabled = false) {
        if (!enabled) return;
        
        console.log('🐟 Flocking Debug Info:');
        const stats = this.getGroupStats();
        
        for (const [maskType, groupStats] of Object.entries(stats)) {
            console.log(`Group ${maskType}:`, {
                npcs: groupStats.count,
                avgVelocity: groupStats.flocking.averageVelocity.length().toFixed(2),
                avgSeparation: groupStats.flocking.averageSeparation.toFixed(2),
                avgAlignment: groupStats.flocking.averageAlignment.toFixed(2),
                avgCohesion: groupStats.flocking.averageCohesion.toFixed(2)
            });
        }
    }
    
    // Console helper methods for debugging
    setupConsoleHelpers() {
        if (typeof window !== 'undefined') {
            window.npcFlocking = {
                debug: (enabled) => {
                    window.debugFlocking = enabled;
                    console.log(`🐟 Flocking debug ${enabled ? 'enabled' : 'disabled'}`);
                },
                stats: () => this.getGroupStats(),
                setParameter: (param, value) => {
                    if (params[param] !== undefined) {
                        params[param] = value;
                        console.log(`🐟 Set ${param} to ${value}`);
                    } else {
                        console.log(`🐟 Parameter ${param} not found`);
                    }
                },
                resetForces: () => {
                    for (const npc of this.npcs) {
                        npc.flockingBoost = 1.0;
                        npc.separationBoost = 1.0;
                        npc.playerInfluence = 0.0;
                        npc.flockingBoostTimer = 0;
                        npc.separationBoostTimer = 0;
                    }
                    console.log('🐟 Reset all flocking forces');
                }
            };
            
            window.npcCollisions = {
                toggle: () => this.togglePlayerNPCCollisions(),
                setRadius: (radius) => this.setCollisionRadius(radius),
                setPushForce: (force) => this.setPushForce(force),
                setPushVelocity: (velocity) => this.setPushVelocity(velocity),
                debug: (enabled) => {
                    if (enabled) {
                        this.enableCollisionDebug();
                    } else {
                        this.disableCollisionDebug();
                    }
                },
                status: () => {
                    console.log(`💥 Player-NPC Collision System:`);
                    console.log(`   Enabled: ${params.PLAYER_NPC_COLLISION_ENABLED}`);
                    console.log(`   Radius: ${params.PLAYER_NPC_COLLISION_RADIUS}`);
                    console.log(`   Push Force: ${params.PLAYER_NPC_PUSH_FORCE}`);
                    console.log(`   Push Velocity: ${params.PLAYER_NPC_PUSH_VELOCITY}`);
                    console.log(`   Debug: ${window.debugCollisions || false}`);
                }
            };
            
            console.log('🐟 Flocking console helpers available: window.npcFlocking');
            console.log('💥 Collision console helpers available: window.npcCollisions');
            
            // Group distribution helpers
            window.npcDistribution = {
                analyze: () => {
                    const positions = Array.from(this.groups.values()).map(group => group.spawnCenter);
                    this.logGroupDistributionQuality(positions);
                },
                regenerate: () => {
                    console.log('🔄 Regenerating group positions...');
                    this.createNPCGroups();
                    console.log('✅ Groups regenerated with new positions');
                },
                visualize: () => {
                    console.log('📍 Current group positions:');
                    for (const [maskType, group] of this.groups.entries()) {
                        const pos = group.spawnCenter;
                        console.log(`   Group ${maskType}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
                    }
                }
            };
            
            console.log('📍 Group distribution helpers available: window.npcDistribution');
        }
    }

    // Debug methods for collision system
    togglePlayerNPCCollisions() {
        params.PLAYER_NPC_COLLISION_ENABLED = !params.PLAYER_NPC_COLLISION_ENABLED;
        console.log(`💥 Player-NPC collisions: ${params.PLAYER_NPC_COLLISION_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    }

    setCollisionRadius(radius) {
        params.PLAYER_NPC_COLLISION_RADIUS = Math.max(0.1, Math.min(2.0, radius));
        console.log(`💥 Player-NPC collision radius set to: ${params.PLAYER_NPC_COLLISION_RADIUS}`);
    }

    setPushForce(force) {
        params.PLAYER_NPC_PUSH_FORCE = Math.max(0.1, Math.min(5.0, force));
        console.log(`💥 Player push force set to: ${params.PLAYER_NPC_PUSH_FORCE}`);
    }

    setPushVelocity(velocity) {
        params.PLAYER_NPC_PUSH_VELOCITY = Math.max(0.0, Math.min(2.0, velocity));
        console.log(`💥 Player push velocity set to: ${params.PLAYER_NPC_PUSH_VELOCITY}`);
    }

    enableCollisionDebug() {
        window.debugCollisions = true;
        console.log('💥 Player-NPC collision debugging enabled');
    }

    disableCollisionDebug() {
        window.debugCollisions = false;
        console.log('💥 Player-NPC collision debugging disabled');
    }

    // IGameSystem implementation
    onPlayerAction(action) {
        if (action.type === 'polarize') {
            // Player has polarized NPCs
            const gameStateSystem = serviceContainer.resolve('gameStateSystem');
            if (gameStateSystem) {
                gameStateSystem.addPolarisedPeople(action.count);
            }
        }
    }

    shutdown() {
        // Clean up NPCs
        for (const npc of this.npcs) {
            if (npc.renderer) {
                npc.renderer.dispose();
            }
        }
        
        this.npcs = [];
        this.groups.clear();
        
        // console.log('👥 NPC System shutdown');
    }

    // Public method to get all NPCs (for other systems to access)
    getAllNPCs() {
        return this.npcs;
    }
} 