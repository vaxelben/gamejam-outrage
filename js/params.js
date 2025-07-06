// params.js - Tweakable game parameters
export const params = {
    // Planet settings
    PLANET_DIAMETER: 60,
    PLANET_SURFACE_OFFSET: 3, // Distance above surface
    
    // Player movement
    PLAYER_SPEED: 20,
    PLAYER_SIZE: 0.5,
    
    // Camera settings
    CAMERA_DISTANCE: 20,
    CAMERA_HEIGHT_OFFSET: 20,
    
    // Outrage system
    OUTRAGE_INCREASE_RATE: 15,    // Per second in wrong crowd
    OUTRAGE_DECAY_RATE: 5,        // Per second when not in crowd
    OUTRAGE_POLICE_THRESHOLD: 90, // % to spawn police
    
    // Energy system
    ENERGY_DEPLETION_RATE: 20,    // Per second when wearing mask
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
    NPC_SPEED_VARIATION: 2,          // Speed variation between NPCs
    NPC_INTERACTION_RADIUS: 3,       // Distance for NPC-player interaction
    NPC_GROUP_RADIUS: 50,             // Distance for NPCs to consider themselves in same group
    NPC_WANDER_RADIUS: 8,            // Maximum distance for wandering behavior
    NPC_MIN_STATE_DURATION: 2,       // Minimum time in seconds before state change
    NPC_STATE_CHANGE_CHANCE: 0.1,    // Probability per second of state change
    NPC_POSITIVE_INFLUENCE_RATE: 2,  // Outrage increase when NPC likes player mask
    NPC_NEGATIVE_INFLUENCE_RATE: 1,  // Outrage decrease when NPC dislikes player mask
    NPC_SAME_MASK_INFLUENCE: 1,       // Outrage reduction when same mask
    NPC_DIFFERENT_MASK_INFLUENCE: 2,  // Outrage increase when different mask
    NPC_ENERGY_DRAIN_RATE: 5,        // Energy drain when interacting negatively
    NPC_PERSONAL_SPACE: 2.5,         // Minimum distance between NPCs (intimacy zone)
    
    // Flocking behavior parameters (Craig Reynolds algorithm)
    NPC_FLOCKING_RADIUS: 8.0,        // Distance to consider other NPCs for flocking
    NPC_SEPARATION_FORCE: 3.0,       // Force to avoid crowding (separation)
    NPC_ALIGNMENT_FORCE: 2.0,        // Force to align with neighbors (alignment)
    NPC_COHESION_FORCE: 2.5,         // Force to move toward group center (cohesion)
    NPC_SEPARATION_RADIUS: 2.0,      // Distance for separation behavior
    NPC_ALIGNMENT_RADIUS: 6.0,       // Distance for alignment behavior
    NPC_COHESION_RADIUS: 8.0,        // Distance for cohesion behavior
    NPC_MAX_FORCE: 4.0,              // Maximum force that can be applied
    NPC_FLOCKING_WEIGHT: 0.9,        // Overall weight of flocking behavior
    
    NPC_WANDER_FORCE: 0.1,           // Strength of wandering behavior (reduced for flocking)
    NPC_INTER_GROUP_REPULSION: 1.5,  // Repulsion force between different groups
    NPC_INTER_GROUP_DISTANCE: 4.0,   // Distance at which inter-group repulsion starts
    
    // Visual settings (color values for Three.js) - matching mask categories
    CROWD_COLORS: {
        1: { r: 0.2, g: 0.4, b: 0.8 },  // Conservatives - Triangle crowds - Blue
        2: { r: 0.8, g: 0.2, b: 0.2 },  // Social Justice - Square crowds - Red
        3: { r: 1.0, g: 0.6, b: 0.2 },  // Libertarians - Circle crowds - Orange
        4: { r: 0.2, g: 0.8, b: 0.2 },  // Nationalists - Triangle crowds - Green
        5: { r: 0.8, g: 0.2, b: 0.8 },  // Culture - Square crowds - Purple
        6: { r: 0.2, g: 0.2, b: 0.8 },  // Religious - Square crowds - Brown
        7: { r: 0.8, g: 0.4, b: 0.8 }   // Antisystem - Triangle crowds - Pink
    }
};

// Tweakpane integration for live parameter tuning
import { Pane } from 'tweakpane';

let pane = null;

export function initTweakpane() {
    if (!Pane) {
        console.log('Tweakpane not available');
        return;
    }
    
    pane = new Pane({ title: 'Game Parameters', expanded: false });
    
    // Player folder
    const playerFolder = pane.addFolder({ title: 'Player', expanded: false });
    playerFolder.addBinding(params, 'PLAYER_SPEED', { min: 1, max: 20 });
    playerFolder.addBinding(params, 'PLAYER_SIZE', { min: 0.1, max: 2 });
    
    // Outrage folder
    const outrageFolder = pane.addFolder({ title: 'Outrage System', expanded: false });
    outrageFolder.addBinding(params, 'OUTRAGE_INCREASE_RATE', { min: 1, max: 50 });
    outrageFolder.addBinding(params, 'OUTRAGE_DECAY_RATE', { min: 1, max: 20 });
    outrageFolder.addBinding(params, 'OUTRAGE_POLICE_THRESHOLD', { min: 50, max: 100 });
    
    // Energy folder
    const energyFolder = pane.addFolder({ title: 'Energy System', expanded: false });
    energyFolder.addBinding(params, 'ENERGY_DEPLETION_RATE', { min: 1, max: 50 });
    energyFolder.addBinding(params, 'ENERGY_RECHARGE_RATE', { min: 1, max: 50 });
    
    // Crowd folder
    const crowdFolder = pane.addFolder({ title: 'Crowds', expanded: false });
    crowdFolder.addBinding(params, 'CROWD_COUNT', { min: 3, max: 20 });
    crowdFolder.addBinding(params, 'CROWD_SIZE_MIN', { min: 2, max: 10 });
    crowdFolder.addBinding(params, 'CROWD_SIZE_MAX', { min: 5, max: 25 });
    crowdFolder.addBinding(params, 'CROWD_RADIUS', { min: 2, max: 8 });
    crowdFolder.addBinding(params, 'CROWD_KICKOUT_TIME', { min: 10, max: 60 });
    
    // Police folder
    const policeFolder = pane.addFolder({ title: 'Police', expanded: false });
    policeFolder.addBinding(params, 'POLICE_SPEED_MULTIPLIER', { min: 0.5, max: 3 });
    policeFolder.addBinding(params, 'POLICE_CATCH_DISTANCE', { min: 1, max: 5 });
    
    // Score folder
    const scoreFolder = pane.addFolder({ title: 'Score', expanded: false });
    scoreFolder.addBinding(params, 'SCORE_ALPHA', { min: 0.1, max: 5 });
    scoreFolder.addBinding(params, 'SCORE_BETA', { min: 0.01, max: 1 });
    
    // NPC system folder
    const npcFolder = pane.addFolder({ title: 'NPC System', expanded: false });
    npcFolder.addBinding(params, 'NPC_SIZE', { min: 0.1, max: 2 });
    npcFolder.addBinding(params, 'NPC_GROUP_SIZE', { min: 1, max: 20 });
    npcFolder.addBinding(params, 'NPC_BASE_SPEED', { min: 0.5, max: 10 });
    npcFolder.addBinding(params, 'NPC_SPEED_VARIATION', { min: 0, max: 5 });
    npcFolder.addBinding(params, 'NPC_INTERACTION_RADIUS', { min: 1, max: 10 });
    npcFolder.addBinding(params, 'NPC_GROUP_RADIUS', { min: 2, max: 15 });
    npcFolder.addBinding(params, 'NPC_WANDER_RADIUS', { min: 3, max: 20 });
    npcFolder.addBinding(params, 'NPC_STATE_CHANGE_CHANCE', { min: 0.01, max: 0.5 });
    npcFolder.addBinding(params, 'NPC_POSITIVE_INFLUENCE_RATE', { min: 0.5, max: 10 });
    npcFolder.addBinding(params, 'NPC_NEGATIVE_INFLUENCE_RATE', { min: 0.5, max: 5 });
    npcFolder.addBinding(params, 'NPC_PERSONAL_SPACE', { min: 0.5, max: 5 });
    npcFolder.addBinding(params, 'NPC_WANDER_FORCE', { min: 0.1, max: 2 });
    npcFolder.addBinding(params, 'NPC_INTER_GROUP_REPULSION', { min: 0.5, max: 10 });
    npcFolder.addBinding(params, 'NPC_INTER_GROUP_DISTANCE', { min: 1, max: 8 });
    
    // Flocking behavior subfolder
    const flockingFolder = npcFolder.addFolder({ title: 'Flocking Behavior', expanded: false });
    flockingFolder.addBinding(params, 'NPC_FLOCKING_RADIUS', { min: 1, max: 10 });
    flockingFolder.addBinding(params, 'NPC_SEPARATION_FORCE', { min: 0.1, max: 5 });
    flockingFolder.addBinding(params, 'NPC_ALIGNMENT_FORCE', { min: 0.1, max: 3 });
    flockingFolder.addBinding(params, 'NPC_COHESION_FORCE', { min: 0.1, max: 3 });
    flockingFolder.addBinding(params, 'NPC_SEPARATION_RADIUS', { min: 0.5, max: 5 });
    flockingFolder.addBinding(params, 'NPC_ALIGNMENT_RADIUS', { min: 1, max: 8 });
    flockingFolder.addBinding(params, 'NPC_COHESION_RADIUS', { min: 1, max: 10 });
    flockingFolder.addBinding(params, 'NPC_MAX_FORCE', { min: 0.5, max: 5 });
    flockingFolder.addBinding(params, 'NPC_FLOCKING_WEIGHT', { min: 0, max: 1 });
    
    // Win conditions folder
    const winFolder = pane.addFolder({ title: 'Win Conditions', expanded: false });
    winFolder.addBinding(params, 'ADULT_TIME_REQUIRED', { min: 30, max: 300 });
    winFolder.addBinding(params, 'CHAOS_TIME_REQUIRED', { min: 10, max: 120 });
    
    console.log('🎛️ Tweakpane initialized');
}

// Export pane for external access
export { pane }; 