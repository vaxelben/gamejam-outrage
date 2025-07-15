// interfaces/GameEvents.js - Game event definitions and constants

/**
 * Game Event Types - Centralized event constants
 */
export const GameEventTypes = {
    // Player events
    PLAYER_MOVE: 'player.move',
    PLAYER_MASK_CHANGE: 'player.mask.change',
    PLAYER_ENERGY_CHANGE: 'player.energy.change',
    PLAYER_TELEPORT: 'player.teleport',
    PLAYER_INTERACTION: 'player.interaction',

    // Game state events
    GAME_STATE_CHANGE: 'gameState.change',
    GAME_OUTRAGE_CHANGE: 'gameState.outrage.change',
    GAME_ENERGY_CHANGE: 'gameState.energy.change',
    GAME_TIMER_UPDATE: 'gameState.timer.update',
    GAME_OVER: 'gameState.gameOver',
    GAME_WIN: 'gameState.win',
    GAME_RESET: 'gameState.reset',

    // NPC events
    NPC_SPAWN: 'npc.spawn',
    NPC_DESPAWN: 'npc.despawn',
    NPC_STATE_CHANGE: 'npc.state.change',
    NPC_INTERACTION: 'npc.interaction',
    NPC_FLOCKING_UPDATE: 'npc.flocking.update',

    // Police events
    POLICE_ACTIVATE: 'police.activate',
    POLICE_DEACTIVATE: 'police.deactivate',
    POLICE_PURSUIT: 'police.pursuit',
    POLICE_CATCH_PLAYER: 'police.catch',

    // UI events
    UI_BUTTON_CLICK: 'ui.button.click',
    UI_MASK_SELECT: 'ui.mask.select',
    UI_TOGGLE_DEBUG: 'ui.debug.toggle',
    UI_HUD_UPDATE: 'ui.hud.update',

    // System events
    SYSTEM_INITIALIZE: 'system.initialize',
    SYSTEM_SHUTDOWN: 'system.shutdown',
    SYSTEM_ERROR: 'system.error',

    // Scene events
    SCENE_BACKGROUND_CHANGE: 'scene.background.change',
    SCENE_CAMERA_UPDATE: 'scene.camera.update',

    // Input events
    INPUT_KEY_DOWN: 'input.key.down',
    INPUT_KEY_UP: 'input.key.up',
    INPUT_MOUSE_CLICK: 'input.mouse.click',
    INPUT_MOVEMENT: 'input.movement'
};

/**
 * Event Data Structures
 */

// Player event data
export class PlayerMoveEventData {
    constructor(oldPosition, newPosition, velocity) {
        this.oldPosition = oldPosition;
        this.newPosition = newPosition;
        this.velocity = velocity;
    }
}

export class PlayerMaskChangeEventData {
    constructor(oldMask, newMask, energyCost) {
        this.oldMask = oldMask;
        this.newMask = newMask;
        this.energyCost = energyCost;
    }
}

export class PlayerEnergyChangeEventData {
    constructor(oldEnergy, newEnergy, change, reason) {
        this.oldEnergy = oldEnergy;
        this.newEnergy = newEnergy;
        this.change = change;
        this.reason = reason;
    }
}

export class PlayerInteractionEventData {
    constructor(interactionType, targetId, targetType, distance, result) {
        this.interactionType = interactionType;
        this.targetId = targetId;
        this.targetType = targetType;
        this.distance = distance;
        this.result = result;
    }
}

// Game state event data
export class GameStateChangeEventData {
    constructor(property, oldValue, newValue, context) {
        this.property = property;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.context = context;
    }
}

export class GameOutrageChangeEventData {
    constructor(oldOutrage, newOutrage, change, reason) {
        this.oldOutrage = oldOutrage;
        this.newOutrage = newOutrage;
        this.change = change;
        this.reason = reason;
    }
}

export class GameOverEventData {
    constructor(reason, finalScore, gameTime, stats) {
        this.reason = reason;
        this.finalScore = finalScore;
        this.gameTime = gameTime;
        this.stats = stats;
    }
}

// NPC event data
export class NPCSpawnEventData {
    constructor(npcId, npcType, position, maskType, groupId) {
        this.npcId = npcId;
        this.npcType = npcType;
        this.position = position;
        this.maskType = maskType;
        this.groupId = groupId;
    }
}

export class NPCStateChangeEventData {
    constructor(npcId, oldState, newState, reason) {
        this.npcId = npcId;
        this.oldState = oldState;
        this.newState = newState;
        this.reason = reason;
    }
}

export class NPCInteractionEventData {
    constructor(npcId, interactionType, targetId, targetType, influence, result) {
        this.npcId = npcId;
        this.interactionType = interactionType;
        this.targetId = targetId;
        this.targetType = targetType;
        this.influence = influence;
        this.result = result;
    }
}

// Police event data
export class PoliceActivateEventData {
    constructor(outrageLevel, droneCount, activationReason) {
        this.outrageLevel = outrageLevel;
        this.droneCount = droneCount;
        this.activationReason = activationReason;
    }
}

export class PolicePursuitEventData {
    constructor(droneId, targetId, distance, pursuitSpeed) {
        this.droneId = droneId;
        this.targetId = targetId;
        this.distance = distance;
        this.pursuitSpeed = pursuitSpeed;
    }
}

// UI event data
export class UIButtonClickEventData {
    constructor(buttonId, buttonType, context) {
        this.buttonId = buttonId;
        this.buttonType = buttonType;
        this.context = context;
    }
}

export class UIMaskSelectEventData {
    constructor(maskType, previousMask, energyCost) {
        this.maskType = maskType;
        this.previousMask = previousMask;
        this.energyCost = energyCost;
    }
}

// System event data
export class SystemEventData {
    constructor(systemName, action, status, details) {
        this.systemName = systemName;
        this.action = action;
        this.status = status;
        this.details = details;
    }
}

export class SystemErrorEventData {
    constructor(systemName, error, context) {
        this.systemName = systemName;
        this.error = error;
        this.context = context;
    }
}

// Input event data
export class InputEventData {
    constructor(inputType, key, value, modifiers) {
        this.inputType = inputType;
        this.key = key;
        this.value = value;
        this.modifiers = modifiers;
    }
}

export class InputMovementEventData {
    constructor(direction, magnitude, deltaTime) {
        this.direction = direction;
        this.magnitude = magnitude;
        this.deltaTime = deltaTime;
    }
}

/**
 * Event Validation Utilities
 */
export class EventValidator {
    static validateEventType(eventType) {
        const validTypes = Object.values(GameEventTypes);
        return validTypes.includes(eventType);
    }

    static validateEventData(eventType, data) {
        // Add specific validation logic for each event type
        switch (eventType) {
            case GameEventTypes.PLAYER_MASK_CHANGE:
                return data instanceof PlayerMaskChangeEventData;
            case GameEventTypes.GAME_STATE_CHANGE:
                return data instanceof GameStateChangeEventData;
            case GameEventTypes.NPC_SPAWN:
                return data instanceof NPCSpawnEventData;
            // Add more validations as needed
            default:
                return true; // Allow any data for unknown event types
        }
    }

    static createValidatedEvent(eventType, data, source) {
        if (!this.validateEventType(eventType)) {
            throw new Error(`Invalid event type: ${eventType}`);
        }

        if (!this.validateEventData(eventType, data)) {
            console.warn(`Invalid event data for type: ${eventType}`, data);
        }

        return {
            type: eventType,
            data: data,
            source: source,
            timestamp: Date.now(),
            id: Symbol()
        };
    }
}

/**
 * Event Priority Constants
 */
export const EventPriorities = {
    CRITICAL: 10,    // System critical events
    HIGH: 25,        // Game state changes
    NORMAL: 50,      // Standard gameplay events
    LOW: 75,         // UI updates
    BACKGROUND: 100  // Non-essential events
};

/**
 * Event Categories for middleware filtering
 */
export const EventCategories = {
    PLAYER: 'player',
    GAME_STATE: 'gameState',
    NPC: 'npc',
    POLICE: 'police',
    UI: 'ui',
    SYSTEM: 'system',
    INPUT: 'input',
    SCENE: 'scene'
};

/**
 * Helper function to get event category from event type
 */
export function getEventCategory(eventType) {
    const parts = eventType.split('.');
    return parts[0] || 'unknown';
}

/**
 * Helper function to create event data objects
 */
export const EventDataFactory = {
    playerMove: (oldPos, newPos, velocity) => new PlayerMoveEventData(oldPos, newPos, velocity),
    playerMaskChange: (oldMask, newMask, energyCost) => new PlayerMaskChangeEventData(oldMask, newMask, energyCost),
    playerEnergyChange: (oldEnergy, newEnergy, change, reason) => new PlayerEnergyChangeEventData(oldEnergy, newEnergy, change, reason),
    gameStateChange: (property, oldValue, newValue, context) => new GameStateChangeEventData(property, oldValue, newValue, context),
    gameOutrageChange: (oldOutrage, newOutrage, change, reason) => new GameOutrageChangeEventData(oldOutrage, newOutrage, change, reason),
    gameOver: (reason, finalScore, gameTime, stats) => new GameOverEventData(reason, finalScore, gameTime, stats),
    npcSpawn: (npcId, npcType, position, maskType, groupId) => new NPCSpawnEventData(npcId, npcType, position, maskType, groupId),
    npcStateChange: (npcId, oldState, newState, reason) => new NPCStateChangeEventData(npcId, oldState, newState, reason),
    policeActivate: (outrageLevel, droneCount, reason) => new PoliceActivateEventData(outrageLevel, droneCount, reason),
    systemError: (systemName, error, context) => new SystemErrorEventData(systemName, error, context)
}; 