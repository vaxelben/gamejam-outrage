// params.js - Tweakable game parameters
export const params = {
    // Planet settings
    PLANET_DIAMETER: 60,
    PLANET_SURFACE_OFFSET: 3, // Distance above surface
    
    // Player movement
    PLAYER_SPEED: 20,
    PLAYER_SIZE: 0.5,
    
    // Camera settings
    CAMERA_DISTANCE: 10,
    CAMERA_HEIGHT_OFFSET: 20,
    
    // Outrage system
    OUTRAGE_INCREASE_RATE: 0.1,    // Per second in wrong crowd
    OUTRAGE_DECAY_RATE: 0.05,        // Per second when not in crowd
    OUTRAGE_POLICE_THRESHOLD: 90, // % to spawn police
    
    // Energy system
    ENERGY_DEPLETION_RATE: 2,    // Per second when wearing mask
    ENERGY_RECHARGE_RATE: 25,     // Per second in correct crowd
    
    // Crowd system
    CROWD_COUNT: 12,              // Number of crowd clusters
    CROWD_SIZE_MIN: 5,            // Minimum people per crowd
    CROWD_SIZE_MAX: 50,           // Maximum people per crowd
    CROWD_RADIUS: 4,              // Radius of crowd area
    CROWD_DETECT_DISTANCE: 6,     // Distance to detect player
    CROWD_KICKOUT_TIME: 30,       // Seconds before kickout
    
    // Police system
    POLICE_SPEED_MULTIPLIER: 1.3, // Relative to player speed
    POLICE_CATCH_DISTANCE: 2,     // Distance to catch player
    POLICE_RETREAT_DISTANCE: 25,  // Distance to retreat when outrage low
    
    // Score system
    SCORE_ALPHA: 1.0,             // Multiplier for survival time
    SCORE_BETA: 0.2,              // Multiplier for polarised people
    
    // Win conditions
    ADULT_OUTRAGE_THRESHOLD: 10,  // % outrage for adult ending
    ADULT_TIME_REQUIRED: 180,     // 3 minutes in seconds
    CHAOS_OUTRAGE_THRESHOLD: 100, // % outrage for chaos ending
    CHAOS_TIME_REQUIRED: 30,      // 30 seconds
    
    // NPC system parameters
    NPC_SIZE: 0.5,                   // Size of individual NPCs
    NPC_GROUP_SIZE: 20,              // Number of NPCs per group
    NPC_BASE_SPEED: 2,               // Base movement speed for NPCs
    NPC_SPEED_VARIATION: 8,
    NPC_INTERACTION_RADIUS: 1.5,       // Distance for NPC-player interaction
    NPC_GROUP_RADIUS: 30,             // Distance for NPCs to consider themselves in same group
    NPC_WANDER_RADIUS: 20,            // Maximum distance for wandering behavior
    NPC_MIN_STATE_DURATION: 2,       // Minimum time in seconds before state change
    NPC_STATE_CHANGE_CHANCE: 0.01,    // Probability per second of state change
    NPC_POSITIVE_INFLUENCE_RATE: 2,  // Outrage increase when NPC likes player mask
    NPC_NEGATIVE_INFLUENCE_RATE: 1,  // Outrage decrease when NPC dislikes player mask
    NPC_SAME_MASK_INFLUENCE: 0.01,       // Outrage reduction when same mask
    NPC_DIFFERENT_MASK_INFLUENCE: 0.2,  // Outrage increase when different mask
    NPC_ENERGY_DRAIN_RATE: 0.1,        // Energy drain when interacting negatively
    NPC_PERSONAL_SPACE: 1.3,         // Minimum distance between NPCs (intimacy zone)
    
    // Flocking behavior parameters (Craig Reynolds algorithm)
    NPC_FLOCKING_RADIUS: 4.0,        // Distance to consider other NPCs for flocking
    NPC_SEPARATION_FORCE: 2.0,       // Force to avoid crowding (separation)
    NPC_ALIGNMENT_FORCE: 2.0,        // Force to align with neighbors (alignment)
    NPC_COHESION_FORCE: 2.0,         // Force to move toward group center (cohesion)
    NPC_SEPARATION_RADIUS: 2.0,      // Distance for separation behavior
    NPC_ALIGNMENT_RADIUS: 6.0,       // Distance for alignment behavior
    NPC_COHESION_RADIUS: 8.0,        // Distance for cohesion behavior
    NPC_MAX_FORCE: 4.0,              // Maximum force that can be applied
    NPC_FLOCKING_WEIGHT: 0.9,        // Overall weight of flocking behavior
    
    NPC_WANDER_FORCE: 0.1,           // Strength of wandering behavior (reduced for flocking)
    NPC_INTER_GROUP_REPULSION: 1.5,  // Repulsion force between different groups
    NPC_INTER_GROUP_DISTANCE: 4.0,

    // Additional crowd parameters
    CROWD_SPREAD_FACTOR: 1.5,        // How spread out crowd members are
    CROWD_FADE_TIME: 2.0,            // Time to fade crowd members in/out
    CROWD_MOVEMENT_SPEED: 0.5,       // Speed of crowd movement
    CROWD_PATIENCE: 60,              // Seconds before crowd gets impatient
    
    // Game balancing
    GAME_SPEED_MULTIPLIER: 1.0,      // Overall game speed multiplier
    DIFFICULTY_SCALING: 1.2,         // How much difficulty increases over time
    PLAYER_INFLUENCE_RADIUS: 10,
    PLAYER_ATTRACTION_FORCE: 0.5,
    PLAYER_REPULSION_FORCE: 1.0,
    
    // Visual settings
    PLANET_TEXTURE_SCALE: 1.0,       // Scale of planet texture
    LIGHTING_INTENSITY: 1.0,         // Ambient lighting intensity
    SHADOW_QUALITY: 1.0,             // Shadow map resolution multiplier
    
    // Performance settings
    MAX_VISIBLE_NPCS: 200,           // Maximum NPCs to render
    LOD_DISTANCE: 50,                // Distance for level of detail switching
    PHYSICS_STEP_SIZE: 0.016,        // Physics simulation step size
};

// Tweakpane integration for live parameter tuning
import { Pane } from 'tweakpane';

let pane = null;

// Variables pour stocker les informations de déplacement instantané
export const playerMovementData = {
    inputVector: { x: 0, y: 0 },
    movementVector: { x: 0, y: 0, z: 0 },
    forwardDirection: { x: 0, y: 0, z: 0 },
    rightDirection: { x: 0, y: 0, z: 0 },
    activeKeys: '',
    position: { x: 0, y: 0, z: 0 },
    speed: 0
};

export function initTweakpane() {
    if (!Pane) {
        console.log('Tweakpane not available');
        return;
    }
    
    pane = new Pane({ 
        title: 'Déplacement Instantané ZQSD', 
        expanded: false,
        width: 350
    });
    
    // Affichage des touches actives
    pane.addBlade({
        view: 'text',
        label: 'Touches actives',
        parse: (v) => String(v),
        value: ''
    });
    
    // Vecteur d'entrée (input)
    const inputFolder = pane.addFolder({ title: 'Vecteur d\'entrée', expanded: true });
    inputFolder.addBinding(playerMovementData.inputVector, 'x', { 
        label: 'Input X (Q/D)', 
        readonly: true,
        format: (v) => v.toFixed(1)
    });
    inputFolder.addBinding(playerMovementData.inputVector, 'y', { 
        label: 'Input Y (Z/S)', 
        readonly: true,
        format: (v) => v.toFixed(1)
    });
    
    // Vecteur de déplacement instantané
    const movementFolder = pane.addFolder({ title: 'Déplacement instantané', expanded: true });
    movementFolder.addBinding(playerMovementData.movementVector, 'x', { 
        label: 'Movement X', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    movementFolder.addBinding(playerMovementData.movementVector, 'y', { 
        label: 'Movement Y', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    movementFolder.addBinding(playerMovementData.movementVector, 'z', { 
        label: 'Movement Z', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    
    // Directions de référence
    const directionsFolder = pane.addFolder({ title: 'Directions de référence', expanded: false });
    directionsFolder.addBinding(playerMovementData.forwardDirection, 'x', { 
        label: 'Forward X', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    directionsFolder.addBinding(playerMovementData.forwardDirection, 'y', { 
        label: 'Forward Y', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    directionsFolder.addBinding(playerMovementData.forwardDirection, 'z', { 
        label: 'Forward Z', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    
    directionsFolder.addBinding(playerMovementData.rightDirection, 'x', { 
        label: 'Right X', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    directionsFolder.addBinding(playerMovementData.rightDirection, 'y', { 
        label: 'Right Y', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    directionsFolder.addBinding(playerMovementData.rightDirection, 'z', { 
        label: 'Right Z', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    
    // Position du joueur
    const positionFolder = pane.addFolder({ title: 'Position du joueur', expanded: false });
    positionFolder.addBinding(playerMovementData.position, 'x', { 
        label: 'Position X', 
        readonly: true,
        format: (v) => v.toFixed(2)
    });
    positionFolder.addBinding(playerMovementData.position, 'y', { 
        label: 'Position Y', 
        readonly: true,
        format: (v) => v.toFixed(2)
    });
    positionFolder.addBinding(playerMovementData.position, 'z', { 
        label: 'Position Z', 
        readonly: true,
        format: (v) => v.toFixed(2)
    });
    
    // Vitesse instantanée
    pane.addBinding(playerMovementData, 'speed', { 
        label: 'Vitesse instantanée', 
        readonly: true,
        format: (v) => v.toFixed(3)
    });
    
    console.log('🎛️ Tweakpane initialized - Déplacement instantané ZQSD');
}

// Fonction pour mettre à jour les données de déplacement
export function updatePlayerMovementData(debugInfo) {
    if (!debugInfo) return;
    
    // Mettre à jour les données
    playerMovementData.inputVector.x = debugInfo.inputVector ? parseFloat(debugInfo.inputVector.split('(')[1].split(',')[0]) : 0;
    playerMovementData.inputVector.y = debugInfo.inputVector ? parseFloat(debugInfo.inputVector.split(',')[1].split(')')[0]) : 0;
    
    if (debugInfo.movement) {
        const movementMatch = debugInfo.movement.match(/\(([-\d.]+), ([-\d.]+), ([-\d.]+)\)/);
        if (movementMatch) {
            playerMovementData.movementVector.x = parseFloat(movementMatch[1]);
            playerMovementData.movementVector.y = parseFloat(movementMatch[2]);
            playerMovementData.movementVector.z = parseFloat(movementMatch[3]);
            
            // Calculer la vitesse instantanée
            playerMovementData.speed = Math.sqrt(
                playerMovementData.movementVector.x * playerMovementData.movementVector.x +
                playerMovementData.movementVector.y * playerMovementData.movementVector.y +
                playerMovementData.movementVector.z * playerMovementData.movementVector.z
            );
        }
    }
    
    if (debugInfo.forward) {
        const forwardMatch = debugInfo.forward.match(/\(([-\d.]+), ([-\d.]+), ([-\d.]+)\)/);
        if (forwardMatch) {
            playerMovementData.forwardDirection.x = parseFloat(forwardMatch[1]);
            playerMovementData.forwardDirection.y = parseFloat(forwardMatch[2]);
            playerMovementData.forwardDirection.z = parseFloat(forwardMatch[3]);
        }
    }
    
    if (debugInfo.right) {
        const rightMatch = debugInfo.right.match(/\(([-\d.]+), ([-\d.]+), ([-\d.]+)\)/);
        if (rightMatch) {
            playerMovementData.rightDirection.x = parseFloat(rightMatch[1]);
            playerMovementData.rightDirection.y = parseFloat(rightMatch[2]);
            playerMovementData.rightDirection.z = parseFloat(rightMatch[3]);
        }
    }
    
    if (debugInfo.position) {
        const positionMatch = debugInfo.position.match(/\(([-\d.]+), ([-\d.]+), ([-\d.]+)\)/);
        if (positionMatch) {
            playerMovementData.position.x = parseFloat(positionMatch[1]);
            playerMovementData.position.y = parseFloat(positionMatch[2]);
            playerMovementData.position.z = parseFloat(positionMatch[3]);
        }
    }
    
    playerMovementData.activeKeys = debugInfo.input || '';
    
    // Actualiser le panneau
    if (pane) {
        pane.refresh();
    }
}

// Export pane for external access
export { pane }; 