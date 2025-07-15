// systems/GameStateSystem.js - Game state management following SOLID principles
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';
import { GameEventTypes, EventDataFactory, EventPriorities } from '../interfaces/GameEvents.js';

export class GameStateSystem extends IGameSystem {
    constructor() {
        super('GameState');
        
        // Core meters
        this.outrage = 0;           // 0-100%, triggers police at 90%
        this.energy = 100;          // 0-100%, depletes over time
        
        // Score tracking
        this.gameTime = 0;          // Total survival time
        this.polarisedPeople = 0;   // People affected by masks
        
        // Game flow
        this.isGameOver = false;
        this.currentMask = null;    // null = neutral, 1-7 = mask types
        
        // Timers for win conditions
        this.adultTimer = 0;        // Time with outrage < 10%
        this.chaosTimer = 0;        // Time with outrage >= 100%
        
        // Player status
        this.inCrowd = false;       // Whether player is in a crowd
        this.isBeingChased = false; // Whether police is chasing
        
        // Event throttling to prevent spam
        this.lastEventTime = {
            outrage: 0,
            energy: 0
        };
        this.eventThrottleInterval = 100; // 100ms minimum between events
    }

    async initialize(sceneManager) {
        console.log('🎮 Game State System initialized');
    }

    update(deltaTime) {
        if (this.isGameOver) return;
        
        // Update game time
        this.gameTime += deltaTime;
        
        // Energy depletion over time
        /* if (this.currentMask !== null) {
            this.addEnergy(-params.ENERGY_DEPLETION_RATE * deltaTime);
            
            // Force neutral if energy depleted
            if (this.energy <= 0) {
                this.setMask(null);
            }
        } */
        
        // Outrage decay when not in crowd
        if (!this.inCrowd) {
            this.addOutrage(-params.OUTRAGE_DECAY_RATE * deltaTime);
        }
        
        // Update win condition timers
        this.updateWinConditionTimers(deltaTime);
        
        // Debug logging occasionally
        if (Math.floor(this.gameTime * 10) % 50 === 0) {
            this.logGameState();
        }
    }

    shutdown() {
        this.stateChangeListeners = [];
        console.log('🎮 Game State System shutdown');
    }

    // State management methods
    addOutrage(amount) {
        const oldOutrage = this.outrage;
        this.outrage = Math.min(100, Math.max(0, this.outrage + amount));
        
        if (oldOutrage !== this.outrage) {
            // Throttle outrage events to prevent spam
            const currentTime = Date.now();
            if (currentTime - this.lastEventTime.outrage >= this.eventThrottleInterval) {
                // Publish outrage change event
                const eventData = EventDataFactory.gameOutrageChange(
                    oldOutrage, 
                    this.outrage, 
                    amount, 
                    'outrage_change'
                );
                this.publishEvent(GameEventTypes.GAME_OUTRAGE_CHANGE, eventData);
                
                // Also publish general state change
                const stateChangeData = EventDataFactory.gameStateChange(
                    'outrage', 
                    oldOutrage, 
                    this.outrage, 
                    { change: amount }
                );
                this.publishEvent(GameEventTypes.GAME_STATE_CHANGE, stateChangeData);
                
                this.lastEventTime.outrage = currentTime;
            }
        }
    }

    addEnergy(amount) {
        const oldEnergy = this.energy;
        this.energy = Math.min(100, Math.max(0, this.energy + amount));
        
        if (oldEnergy !== this.energy) {
            // Throttle energy events to prevent spam
            const currentTime = Date.now();
            if (currentTime - this.lastEventTime.energy >= this.eventThrottleInterval) {
                // Publish energy change event
                const eventData = EventDataFactory.playerEnergyChange(
                    oldEnergy, 
                    this.energy, 
                    amount, 
                    'energy_change'
                );
                this.publishEvent(GameEventTypes.PLAYER_ENERGY_CHANGE, eventData);
                
                // Also publish general state change
                const stateChangeData = EventDataFactory.gameStateChange(
                    'energy', 
                    oldEnergy, 
                    this.energy, 
                    { change: amount }
                );
                this.publishEvent(GameEventTypes.GAME_STATE_CHANGE, stateChangeData);
                
                this.lastEventTime.energy = currentTime;
            }
        }
    }

    setMask(maskType) {
        const oldMask = this.currentMask;
        this.currentMask = maskType;
        
        // Update scene background color based on mask
        const sceneManager = serviceContainer.resolve('sceneManager');
        if (sceneManager) {
            sceneManager.setBackgroundFromMask(maskType);
        }
        
        console.log(`🎭 Mask changed to: ${maskType || 'Neutral'}`);
        
        // Publish mask change event
        const eventData = EventDataFactory.playerMaskChange(oldMask, maskType, 0);
        this.publishEvent(GameEventTypes.PLAYER_MASK_CHANGE, eventData);
        
        // Also publish general state change
        const stateChangeData = EventDataFactory.gameStateChange(
            'mask', 
            oldMask, 
            maskType, 
            { reason: 'mask_change' }
        );
        this.publishEvent(GameEventTypes.GAME_STATE_CHANGE, stateChangeData);
    }

    setInCrowd(inCrowd) {
        if (this.inCrowd !== inCrowd) {
            this.inCrowd = inCrowd;
            this.notifyStateChange('inCrowd', inCrowd, !inCrowd);
        }
    }

    setBeingChased(isChased) {
        if (this.isBeingChased !== isChased) {
            this.isBeingChased = isChased;
            this.notifyStateChange('beingChased', isChased, !isChased);
        }
    }

    addPolarisedPeople(count) {
        this.polarisedPeople += count;
        this.notifyStateChange('polarisedPeople', this.polarisedPeople, this.polarisedPeople - count);
    }

    // Game end methods
    endGame(reason) {
        if (!this.isGameOver) {
            this.isGameOver = true;
            this.notifyStateChange('gameOver', { reason, score: this.getScore() });
            console.log(`🎭 Game Over: ${reason} - Score: ${this.getScore()}`);
        }
    }

    reset() {
        const oldState = this.getFullState();
        
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
        
        this.notifyStateChange('reset', this.getFullState(), oldState);
        console.log('🔄 Game state reset');
    }

    // Score calculation
    getScore() {
        return Math.floor(
            this.gameTime * params.SCORE_ALPHA + 
            this.polarisedPeople * params.SCORE_BETA
        );
    }

    // Win condition checking
    updateWinConditionTimers(deltaTime) {
        // Adult timer: outrage < 10% for 3 minutes
        if (this.outrage < params.ADULT_OUTRAGE_THRESHOLD) {
            this.adultTimer += deltaTime;
            if (this.adultTimer >= params.ADULT_TIME_REQUIRED) {
                this.endGame('ADULT');
                return;
            }
        } else {
            this.adultTimer = 0;
        }
        
        // Chaos timer: outrage >= 100% for 30 seconds
        if (this.outrage >= params.CHAOS_OUTRAGE_THRESHOLD) {
            this.chaosTimer += deltaTime;
            if (this.chaosTimer >= params.CHAOS_TIME_REQUIRED) {
                this.endGame('CHAOS');
                return;
            }
        } else {
            this.chaosTimer = 0;
        }
    }

    // State queries
    canReturnToNeutral() {
        return !this.isBeingChased && !this.inCrowd;
    }

    getFullState() {
        return {
            outrage: this.outrage,
            energy: this.energy,
            gameTime: this.gameTime,
            polarisedPeople: this.polarisedPeople,
            isGameOver: this.isGameOver,
            currentMask: this.currentMask,
            adultTimer: this.adultTimer,
            chaosTimer: this.chaosTimer,
            inCrowd: this.inCrowd,
            isBeingChased: this.isBeingChased,
            score: this.getScore()
        };
    }

    // Event system - Legacy compatibility methods
    addEventListener(callback) {
        // Convert legacy listener to new event system
        console.warn('🔄 Using legacy addEventListener, consider migrating to new event system');
        this.subscribeToEvent(GameEventTypes.GAME_STATE_CHANGE, (event) => {
            // Convert new event format to legacy format
            const legacyEvent = {
                property: event.data.property,
                newValue: event.data.newValue,
                oldValue: event.data.oldValue,
                timestamp: event.timestamp,
                gameTime: this.gameTime
            };
            callback(legacyEvent);
        });
    }

    removeEventListener(callback) {
        console.warn('🔄 Legacy removeEventListener not fully supported, use unsubscribe function instead');
        // This would require tracking callback mappings, which is complex
        // Better to use the new event system's unsubscribe functions
    }

    // Debug logging
    logGameState() {
        console.log(
            `⏱️  Time: ${this.gameTime.toFixed(1)}s | ` +
            `Outrage: ${this.outrage.toFixed(1)}% | ` +
            `Energy: ${this.energy.toFixed(1)}% | ` +
            `Score: ${this.getScore()}`
        );
    }

    // IGameSystem implementation
    onPlayerAction(action) {
        switch (action.type) {
            case 'maskChange':
                this.setMask(action.maskType);
                break;
            case 'crowdInteraction':
                this.setInCrowd(action.inCrowd);
                if (action.polarisedCount) {
                    this.addPolarisedPeople(action.polarisedCount);
                }
                break;
        }
    }
} 