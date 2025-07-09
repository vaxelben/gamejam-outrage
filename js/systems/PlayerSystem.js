// systems/PlayerSystem.js - Player management following SOLID principles
import * as THREE from 'three';
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
        
        // Animation
        this.textureLoader = new THREE.TextureLoader();
        this.playerFSM = {
            currentState: 'idle',
            stateChanged: false,
            animations: {
                idle: { row: 0, frames: 4, speed: 0.2, sheetCols: 4 },
                walk: { row: 1, frames: 4, speed: 0.1, sheetCols: 4 },
                jump: { row: 2, frames: 4, speed: 0.15, sheetCols: 4 }
            },
            currentFrame: 0,
            frameTimer: 0
        };

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
        this.textureLoader.load(
            'public/textures/spritesheet_bordercollie.png',
            (spritesheet) => {
                spritesheet.magFilter = THREE.NearestFilter;
                spritesheet.minFilter = THREE.NearestFilter;
                spritesheet.wrapS = THREE.ClampToEdgeWrapping;
                spritesheet.wrapT = THREE.ClampToEdgeWrapping;
                
                // Créer les frames individuelles
                this.createFrameTextures(spritesheet);
                
                // Créer le matériau avec la première frame
                const geometry = new THREE.PlaneGeometry(params.PLAYER_SIZE, params.PLAYER_SIZE);
                
                // Modifier les coordonnées UV pour qu'elles occupent toute la géométrie
                const uvAttribute = geometry.attributes.uv;
                // Les coordonnées UV par défaut vont de (0,0) à (1,1)
                // On les laisse telles quelles pour occuper toute la frame
                for (let i = 0; i < uvAttribute.count; i++) {
                    const u = uvAttribute.getX(i);
                    const v = uvAttribute.getY(i);
                    // Garder les coordonnées UV originales (0,0) à (1,1)
                    uvAttribute.setXY(i, u, v);
                }
                uvAttribute.needsUpdate = true;
                
                const material = new THREE.MeshLambertMaterial({
                    map: this.playerFSM.animations.idle.frameTextures[0],
                    transparent: true,
                    side: THREE.DoubleSide
                });
                
                this.renderer = new Renderer(geometry, material);
                this.renderer.createMesh(scene);
                this.renderer.mesh.castShadow = false;
            }
        );
    }

    createFrameTextures(baseTexture) {
        const fsm = this.playerFSM;
        
        // Pour chaque animation
        for (const animKey in fsm.animations) {
            const anim = fsm.animations[animKey];
            anim.frameTextures = [];
            
            // Pour chaque frame de cette animation
            for (let frameIndex = 0; frameIndex < anim.frames; frameIndex++) {
                // Cloner la texture de base
                const frameTexture = baseTexture.clone();
                frameTexture.needsUpdate = true;
                
                // Configurer les filtres pour des pixels nets
                frameTexture.magFilter = THREE.NearestFilter;
                frameTexture.minFilter = THREE.NearestFilter;
                frameTexture.wrapS = THREE.ClampToEdgeWrapping;
                frameTexture.wrapT = THREE.ClampToEdgeWrapping;
                
                // Calculer les coordonnées UV pour cette frame spécifique
                const frameWidth = 1 / 4; // 4 colonnes dans la spritesheet
                const frameHeight = 1 / 3; // 3 rangées dans la spritesheet
                
                // Position de cette frame dans la spritesheet
                const offsetX = frameIndex * frameWidth / 3;
                const offsetY = (2 - anim.row) * frameHeight; // Inverser Y car Three.js utilise Y inversé
                
                // Configurer la texture pour qu'elle occupe toute la géométrie
                frameTexture.repeat.set(frameWidth, frameHeight);
                frameTexture.offset.set(offsetX, offsetY);
                
                // Pas de centrage - la texture doit occuper toute la géométrie
                frameTexture.center.set(0, 0);
                
                anim.frameTextures.push(frameTexture);
                
                console.log(`🎬 Frame ${animKey}[${frameIndex}]: offset(${offsetX.toFixed(3)}, ${offsetY.toFixed(3)}) repeat(${frameWidth.toFixed(3)}, ${frameHeight.toFixed(3)})`);
            }
        }
        
        console.log('🎬 Frame textures créées:', {
            idle: fsm.animations.idle.frameTextures.length,
            walk: fsm.animations.walk.frameTextures.length,
            jump: fsm.animations.jump.frameTextures.length
        });
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
        
        this.updatePlayerState();
        this.updateAnimation(deltaTime);

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
        const input = this.inputManager.getMovementInput();
        
        const isMoving = input.forward || input.backward || input.left || input.right;
        if (!isMoving) return;
        
        // Use quaternion-based movement for constant speed
        this.handleQuaternionMovement(input, deltaTime);
    }
    
    handleQuaternionMovement(input, deltaTime) {
        const speed = params.PLAYER_SPEED * deltaTime;
        const radius = this.planetRadius + params.PLAYER_SIZE / 2;

        // Get camera and current position
        const camera = serviceContainer.resolve('camera');
        if (!camera) return;
        const currentPos = this.transform.position.clone();

        // 1. Get Player's "Up" Vector (the normal to the sphere surface)
        const surfaceNormal = currentPos.clone().normalize();

        // 2. Get a Stable "Right" Vector from the Camera
        // We use the camera's local X-axis, which is not affected by pitch.
        const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);

        // 3. Create Player-Relative Movement Vectors on the Tangent Plane
        // Project the stable cameraRight vector onto the tangent plane to get the player's right.
        const playerRight = cameraRight.clone().addScaledVector(surfaceNormal, -cameraRight.dot(surfaceNormal));
        playerRight.normalize();

        // The player's forward is perpendicular to their right and their up (surfaceNormal).
        // The order of the cross product is important to get "forward" instead of "backward".
        const playerForward = new THREE.Vector3().crossVectors(surfaceNormal, playerRight);
        
        const y_mov = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
        const x_mov = (input.right ? 1 : 0) - (input.left ? 1 : 0);

        // 4. Calculate Total Movement Vector
        // Input Y (Z/S -> +1/-1) moves along playerForward.
        // Input X (Q/D -> +1/-1) moves along playerRight.
        const movementDirection = playerForward.clone().multiplyScalar(y_mov).add(playerRight.clone().multiplyScalar(x_mov));
        
        // If there's no movement, no need to do anything else.
        if (movementDirection.lengthSq() === 0) return;

        movementDirection.normalize();

        if (movementDirection.length() > 0.01) {
            this.lastMovementDirection.copy(movementDirection);
        }

        // 5. Calculate Rotation from Movement
        // The axis of rotation is perpendicular to the direction of movement.
        const rotationAxis = new THREE.Vector3().crossVectors(surfaceNormal, movementDirection);
        rotationAxis.normalize();

        // The angle of rotation is the distance to travel divided by the sphere's radius.
        const angularDistance = speed / radius;
        const rotation = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angularDistance);

        // 6. Apply Rotation to Player Position
        const newPosition = currentPos.clone().applyQuaternion(rotation);
        
        // Ensure the player stays exactly on the surface.
        newPosition.normalize().multiplyScalar(radius);
        
        this.transform.setPosition(newPosition.x, newPosition.y, newPosition.z);
        this.normal.copy(newPosition.clone().normalize());
    }
    
    handleLinearMovement(input, deltaTime) {
        // Calculate movement speed
        const speed = params.PLAYER_SPEED;
        const movement = new THREE.Vector3();
        
        // Get player orientation relative to the world
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        const rightDirection = new THREE.Vector3(1, 0, 0);
        
        const y_mov = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
        const x_mov = (input.right ? 1 : 0) - (input.left ? 1 : 0);

        // Forward/Backward movement (Z/S keys)
        if (y_mov !== 0) {
            movement.addScaledVector(forwardDirection, y_mov * speed);
        }
        
        // Left/Right movement (Q/D keys)  
        if (x_mov !== 0) {
            movement.addScaledVector(rightDirection, x_mov * speed);
        }
        
        // If no movement, exit early
        if (movement.length() === 0) return;
        
        // Apply movement
        this.transform.position.add(movement.clone().multiplyScalar(deltaTime));
        
        // Project back to the sphere surface
        this.transform.position.normalize().multiplyScalar(this.planetRadius + params.PLAYER_SIZE / 2);
        
        this.normal.copy(this.transform.position).normalize();

        // Update debug info
        this.updateDebugUI({
            input: input.forward ? 'Z' : input.backward ? 'S' : input.left ? 'Q' : 'D',
            inputVector: movement.normalize().toString(),
            forward: forwardDirection.normalize().toString(),
            right: rightDirection.normalize().toString(),
            movement: movement.length().toFixed(2),
            position: this.transform.position.toString(),
            sphericalCoords: this.transform.position.normalize().toString(),
            input: input.forward ? 'Z' : input.backward ? 'S' : input.left ? 'Q' : 'D'
        });
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

    updatePlayerState() {
        const movementInput = this.inputManager.getMovementInput();
        const isMoving = movementInput.forward || movementInput.backward || movementInput.left || movementInput.right;

        // a 'isJumping' flag could be added
        if (isMoving) {
            if (this.playerFSM.currentState !== 'walk') {
                this.playerFSM.currentState = 'walk';
                this.playerFSM.stateChanged = true;
            }
        } else {
            if (this.playerFSM.currentState !== 'idle') {
                this.playerFSM.currentState = 'idle';
                this.playerFSM.stateChanged = true;
            }
        }
    }

    updateAnimation(deltaTime) {
        if (!this.renderer || !this.renderer.material) return;

        const fsm = this.playerFSM;
        const anim = fsm.animations[fsm.currentState];
        
        // Vérifier que les textures de frames sont disponibles
        if (!anim.frameTextures || anim.frameTextures.length === 0) return;

        // Handle state changes (e.g., idle -> walk)
        if (fsm.stateChanged) {
            fsm.currentFrame = 0;
            fsm.frameTimer = 0;
            fsm.stateChanged = false;
            
            console.log(`🎭 Animation changée vers: ${fsm.currentState}`);
        }

        // Handle frame progression
        fsm.frameTimer += deltaTime;
        if (fsm.frameTimer > anim.speed) {
            fsm.frameTimer -= anim.speed;
            fsm.currentFrame = (fsm.currentFrame + 1) % anim.frames;
        }
        
        // Appliquer la texture de la frame courante
        const currentFrameTexture = anim.frameTextures[fsm.currentFrame];
        if (currentFrameTexture && this.renderer.material.map !== currentFrameTexture) {
            this.renderer.material.map = currentFrameTexture;
            this.renderer.material.needsUpdate = true;
        }
    }
} 