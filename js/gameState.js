// gameState.js - Global game state management
import { params } from './params.js';

// Game state object
export const gameState = {
    // Core meters
    outrage: 0,           // 0-100%, triggers police at 90%
    energy: 100,          // 0-100%, depletes over time
    
    // Score tracking
    gameTime: 0,          // Total survival time
    polarisedPeople: 0,   // People affected by masks
    
    // Game flow
    isGameOver: false,
    currentMask: null,    // null = neutral, 1-7 = mask types
    
    // Timers for win conditions
    adultTimer: 0,        // Time with outrage < 10%
    chaosTimer: 0,        // Time with outrage >= 100%
    
    // Player status
    inCrowd: false,       // Whether player is in a crowd
    isBeingChased: false, // Whether police is chasing
    
    // Calculate final score
    getScore() {
        return Math.floor(
            this.gameTime * params.SCORE_ALPHA + 
            this.polarisedPeople * params.SCORE_BETA
        );
    },
    
    // Reset game state
    reset() {
        this.outrage = 0;
        this.energy = 100;
        this.gameTime = 0;
        this.polarisedPeople = 0;
        this.isGameOver = false;
        this.currentMask = null;
        this.adultTimer = 0;
        this.chaosTimer = 0;
        this.inCrowd = false;
        this.isBeingChased = false;
    },
    
    // Add outrage (clamped to 0-100)
    addOutrage(amount) {
        this.outrage = Math.min(100, Math.max(0, this.outrage + amount));
    },
    
    // Add energy (clamped to 0-100)
    addEnergy(amount) {
        this.energy = Math.min(100, Math.max(0, this.energy + amount));
    },
    
    // Set current mask (null for neutral, 1-7 for masks)
    setMask(maskType) {
        this.currentMask = maskType;
        console.log(`🎭 Mask changed to: ${maskType || 'Neutral'}`);
    },
    
    // Check if player can return to neutral
    canReturnToNeutral() {
        return !this.isBeingChased && !this.inCrowd;
    }
};

// Update game state each frame
export function updateGameState(deltaTime) {
    if (gameState.isGameOver) return;
    
    // Update game time
    gameState.gameTime += deltaTime;
    
    // Energy depletion over time
    if (gameState.currentMask !== null) {
        gameState.addEnergy(-params.ENERGY_DEPLETION_RATE * deltaTime);
        
        // Force neutral if energy depleted
        if (gameState.energy <= 0) {
            gameState.setMask(null);
        }
    }
    
    // Outrage decay when not in crowd
    if (!gameState.inCrowd) {
        gameState.addOutrage(-params.OUTRAGE_DECAY_RATE * deltaTime);
    }
    
    // Update win condition timers
    updateWinConditionTimers(deltaTime);
    
    // Debug logging (remove in production)
    if (Math.floor(gameState.gameTime * 10) % 50 === 0) {
        console.log(`⏱️  Time: ${gameState.gameTime.toFixed(1)}s | Outrage: ${gameState.outrage.toFixed(1)}% | Energy: ${gameState.energy.toFixed(1)}%`);
    }
}

// Update timers for win conditions
function updateWinConditionTimers(deltaTime) {
    // Adult timer: outrage < 10% for 3 minutes
    if (gameState.outrage < params.ADULT_OUTRAGE_THRESHOLD) {
        gameState.adultTimer += deltaTime;
    } else {
        gameState.adultTimer = 0;
    }
    
    // Chaos timer: outrage >= 100% for 30 seconds
    if (gameState.outrage >= params.CHAOS_OUTRAGE_THRESHOLD) {
        gameState.chaosTimer += deltaTime;
    } else {
        gameState.chaosTimer = 0;
    }
}

// Mask type names for UI
export const MASK_NAMES = {
    null: 'Neutral',
    1: 'Conservatives',
    2: 'Social Justice',
    3: 'Libertarians',
    4: 'Nationalists',
    5: 'Culture',
    6: 'Religious',
    7: 'Antisystem'
};

// Group colors for visual feedback (color values for Three.js)
export const GROUP_COLORS = {
    null: { r: 0.5, g: 0.5, b: 0.5 }, // Grey
    1: { r: 0.2, g: 0.4, b: 0.8 },    // Blue - Conservatives
    2: { r: 0.8, g: 0.2, b: 0.2 },    // Red - Social Justice
    3: { r: 1.0, g: 0.6, b: 0.2 },    // Orange - Libertarians
    4: { r: 0.2, g: 0.6, b: 0.2 },    // Green - Nationalists
    5: { r: 0.6, g: 0.2, b: 0.8 },    // Mauve - Culture
    6: { r: 0.6, g: 0.3, b: 0.1 },    // Marron - Religious
    7: { r: 1.0, g: 0.4, b: 0.8 }     // Rose - Antisystem
};

// Helper function to create THREE.Color from color object
export function createThreeColor(colorObj) {
    return new THREE.Color(colorObj.r, colorObj.g, colorObj.b);
} 