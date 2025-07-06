// systems/UISystem.js - UI management following SOLID principles
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';

export class UISystem extends IGameSystem {
    constructor() {
        super('UI');
        
        this.elements = {};
        this.isVisible = true;
        this.gameStateSystem = null;
        
        // UI configuration
        this.updateFrequency = 0.1; // Update every 100ms
        this.lastUpdateTime = 0;
    }

    async initialize(sceneManager) {
        this.gameStateSystem = serviceContainer.resolve('gameStateSystem');
        
        // Create UI elements
        this.createUIElements();
        
        // Listen to game state changes
        if (this.gameStateSystem) {
            this.gameStateSystem.addEventListener((event) => {
                this.onGameStateChange(event);
            });
        }
        
        console.log('🖥️ UI System initialized');
    }

    createUIElements() {
        // Create main UI container
        this.elements.container = document.createElement('div');
        this.elements.container.id = 'ui-container';
        this.elements.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
            font-family: 'Arial', sans-serif;
        `;
        document.body.appendChild(this.elements.container);
        
        // Create HUD elements
        this.createHUD();
        this.createMaskSelector();
        this.createGameOverScreen();
        this.createInstructions();
    }

    createHUD() {
        // Create vertical energy bar (left side)
        this.elements.energyBar = document.createElement('div');
        this.elements.energyBar.style.cssText = `
            position: absolute;
            top: 50%;
            left: 20px;
            transform: translateY(-50%);
            width: 40px;
            height: 300px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 20px;
            padding: 15px 10px;
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const energyLabel = document.createElement('div');
        energyLabel.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
            writing-mode: vertical-lr;
            text-orientation: mixed;
        `;
        energyLabel.textContent = 'VIE';
        
        const energyContainer = document.createElement('div');
        energyContainer.style.cssText = `
            width: 20px;
            height: 200px;
            background: #333;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
        `;
        
        const energyFill = document.createElement('div');
        energyFill.id = 'energy-fill';
        energyFill.style.cssText = `
            background: linear-gradient(to top, #00f, #0ff);
            width: 100%;
            height: 100%;
            border-radius: 10px;
            transition: height 0.3s;
            position: absolute;
            bottom: 0;
        `;
        
        const energyText = document.createElement('div');
        energyText.id = 'energy-text';
        energyText.style.cssText = `
            color: white;
            font-size: 10px;
            font-weight: bold;
            margin-top: 10px;
            text-align: center;
        `;
        energyText.textContent = '100%';
        
        energyContainer.appendChild(energyFill);
        this.elements.energyBar.appendChild(energyLabel);
        this.elements.energyBar.appendChild(energyContainer);
        this.elements.energyBar.appendChild(energyText);
        this.elements.container.appendChild(this.elements.energyBar);
        
        // Create vertical outrage bar (right side)
        this.elements.outrageBar = document.createElement('div');
        this.elements.outrageBar.style.cssText = `
            position: absolute;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 40px;
            height: 300px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 20px;
            padding: 15px 10px;
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const outrageLabel = document.createElement('div');
        outrageLabel.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
            writing-mode: vertical-lr;
            text-orientation: mixed;
        `;
        outrageLabel.textContent = 'OUTRAGE';
        
        const outrageContainer = document.createElement('div');
        outrageContainer.style.cssText = `
            width: 20px;
            height: 200px;
            background: #333;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
        `;
        
        const outrageFill = document.createElement('div');
        outrageFill.id = 'outrage-fill';
        outrageFill.style.cssText = `
            background: linear-gradient(to top, #0f0, #ff0, #f00);
            width: 100%;
            height: 0%;
            border-radius: 10px;
            transition: height 0.3s;
            position: absolute;
            bottom: 0;
        `;
        
        const outrageText = document.createElement('div');
        outrageText.id = 'outrage-text';
        outrageText.style.cssText = `
            color: white;
            font-size: 10px;
            font-weight: bold;
            margin-top: 10px;
            text-align: center;
        `;
        outrageText.textContent = '0%';
        
        outrageContainer.appendChild(outrageFill);
        this.elements.outrageBar.appendChild(outrageLabel);
        this.elements.outrageBar.appendChild(outrageContainer);
        this.elements.outrageBar.appendChild(outrageText);
        this.elements.container.appendChild(this.elements.outrageBar);
        
        // Create score display (bottom center)
        this.elements.scoreDisplay = document.createElement('div');
        this.elements.scoreDisplay.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            pointer-events: auto;
            font-size: 14px;
            display: flex;
            gap: 30px;
            align-items: center;
        `;
        
        this.elements.scoreDisplay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: bold;">Score:</span>
                <span id="score-value" style="color: #66ff66; font-weight: bold;">0</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: bold;">Temps:</span>
                <span id="time-value" style="color: #66ccff; font-weight: bold;">0s</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: bold;">Polarisés:</span>
                <span id="polarised-value" style="color: #ffcc66; font-weight: bold;">0</span>
            </div>
        `;
        
        this.elements.container.appendChild(this.elements.scoreDisplay);
    }

    createMaskSelector() {
        this.elements.maskSelector = document.createElement('div');
        this.elements.maskSelector.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px;
            border-radius: 10px;
            display: flex;
            gap: 10px;
            pointer-events: auto;
            z-index: 1001;
        `;
        
        // Neutral option
        this.elements.neutralButton = this.createMaskButton('ESC', 'Neutral', '#888');
        this.elements.maskSelector.appendChild(this.elements.neutralButton);
        
        // Mask options
        const maskNames = [
            'Conservative', 'Social Justice', 'Libertarian',
            'Nationalist', 'Culture', 'Religious', 'Antisystem'
        ];
        
        const maskColors = [
            '#2470c8', '#c82424', '#ff9932',
            '#32c832', '#9932c8', '#996633', '#ff4099'
        ];
        
        for (let i = 0; i < 7; i++) {
            const button = this.createMaskButton(
                maskNames[i],
                maskNames[i],
                maskColors[i]
            );
            this.elements.maskSelector.appendChild(button);
        }
        
        this.elements.container.appendChild(this.elements.maskSelector);
    }

    createMaskButton(key, name, color) {
        const button = document.createElement('div');
        button.style.cssText = `
            width: 80px;
            height: 60px;
            background: ${color};
            border: 2px solid #fff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        `;
        
        const keySpan = document.createElement('span');
        keySpan.textContent = key;
        keySpan.style.cssText = `
            font-weight: bold;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            font-size: 9px;
            text-align: center;
            line-height: 1.1;
        `;
        
        const tooltip = document.createElement('div');
        tooltip.textContent = name;
        tooltip.style.cssText = `
            position: absolute;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        `;
        
        button.appendChild(keySpan);
        button.appendChild(tooltip);
        
        // Add click handler
        button.addEventListener('click', () => {
            if (key === 'ESC') {
                this.triggerMaskChange(null);
            } else {
                // Find the mask number based on the name
                const maskNames = [
                    'Conservative', 'Social Justice', 'Libertarian',
                    'Nationalist', 'Culture', 'Religious', 'Antisystem'
                ];
                const maskIndex = maskNames.indexOf(key);
                if (maskIndex !== -1) {
                    this.triggerMaskChange(maskIndex + 1);
                }
            }
        });
        
        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            tooltip.style.opacity = '1';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            tooltip.style.opacity = '0';
        });
        
        return button;
    }

    triggerMaskChange(maskType) {
        // Get the player system to handle mask changes
        const playerSystem = serviceContainer.resolve('playerSystem');
        if (playerSystem) {
            playerSystem.setMask(maskType);
        }
        
        // Also trigger through game state system as backup
        if (this.gameStateSystem) {
            this.gameStateSystem.setMask(maskType);
        }
        
        console.log(`🎭 UI triggered mask change to: ${maskType || 'Neutral'}`);
    }

    createGameOverScreen() {
        this.elements.gameOverScreen = document.createElement('div');
        this.elements.gameOverScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
        `;
        
        const gameOverContent = document.createElement('div');
        gameOverContent.style.cssText = `
            background: rgba(20, 20, 20, 0.9);
            color: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            border: 2px solid #666;
        `;
        
        gameOverContent.innerHTML = `
            <h1 id="game-over-title" style="margin-bottom: 20px; color: #ff6666;">Game Over</h1>
            <p id="game-over-reason" style="margin-bottom: 20px; font-size: 18px;"></p>
            <div style="margin-bottom: 30px;">
                <div style="margin-bottom: 10px;">
                    <span style="font-weight: bold;">Final Score:</span>
                    <span id="final-score" style="float: right; font-size: 24px; color: #66ff66;">0</span>
                </div>
                <div style="margin-bottom: 10px;">
                    <span style="font-weight: bold;">Survival Time:</span>
                    <span id="final-time" style="float: right;">0s</span>
                </div>
                <div>
                    <span style="font-weight: bold;">People Polarised:</span>
                    <span id="final-polarised" style="float: right;">0</span>
                </div>
            </div>
            <button id="restart-button" style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 16px;
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.3s;
            ">Play Again</button>
        `;
        
        this.elements.gameOverScreen.appendChild(gameOverContent);
        this.elements.container.appendChild(this.elements.gameOverScreen);
        
        // Restart button functionality
        const restartButton = gameOverContent.querySelector('#restart-button');
        restartButton.addEventListener('click', () => {
            this.restartGame();
        });
        
        restartButton.addEventListener('mouseenter', () => {
            restartButton.style.background = '#45a049';
        });
        
        restartButton.addEventListener('mouseleave', () => {
            restartButton.style.background = '#4CAF50';
        });
    }

    createInstructions() {
        // Instructions supprimées sur demande de l'utilisateur
    }

    update(deltaTime) {
        if (!this.isVisible) return;
        
        this.lastUpdateTime += deltaTime;
        
        // Throttle updates for performance
        if (this.lastUpdateTime < this.updateFrequency) {
            return;
        }
        
        this.lastUpdateTime = 0;
        
        // Update HUD with current game state
        this.updateHUD();
    }

    updateHUD() {
        if (!this.gameStateSystem) return;
        
        const state = this.gameStateSystem.getFullState();
        
        // Update outrage meter (vertical bar)
        const outrageFill = document.getElementById('outrage-fill');
        const outrageText = document.getElementById('outrage-text');
        if (outrageFill && outrageText) {
            outrageFill.style.height = `${state.outrage}%`;
            outrageText.textContent = `${Math.round(state.outrage)}%`;
        }
        
        // Update energy meter (vertical bar)
        const energyFill = document.getElementById('energy-fill');
        const energyText = document.getElementById('energy-text');
        if (energyFill && energyText) {
            energyFill.style.height = `${state.energy}%`;
            energyText.textContent = `${Math.round(state.energy)}%`;
        }
        
        // Update score display
        const scoreValue = document.getElementById('score-value');
        const timeValue = document.getElementById('time-value');
        const polarisedValue = document.getElementById('polarised-value');
        
        if (scoreValue) scoreValue.textContent = state.score.toString();
        if (timeValue) timeValue.textContent = `${Math.round(state.gameTime)}s`;
        if (polarisedValue) polarisedValue.textContent = state.polarisedPeople.toString();
    }

    showGameOver(reason, finalState) {
        this.elements.gameOverScreen.style.display = 'flex';
        
        // Update game over content
        const title = document.getElementById('game-over-title');
        const reasonElement = document.getElementById('game-over-reason');
        const finalScore = document.getElementById('final-score');
        const finalTime = document.getElementById('final-time');
        const finalPolarised = document.getElementById('final-polarised');
        
        const messages = {
            'CAUGHT': 'You were caught by the police!',
            'CHAOS': 'The world descended into chaos!',
            'ADULT': 'You became a responsible adult!',
            'ENERGY': 'You ran out of energy!'
        };
        
        if (title) title.textContent = reason === 'ADULT' ? 'You Win!' : 'Game Over';
        if (reasonElement) reasonElement.textContent = messages[reason] || 'Game ended';
        if (finalScore) finalScore.textContent = finalState.score.toString();
        if (finalTime) finalTime.textContent = `${Math.round(finalState.gameTime)}s`;
        if (finalPolarised) finalPolarised.textContent = finalState.polarisedPeople.toString();
        
        // Color the title based on outcome
        if (title) {
            title.style.color = reason === 'ADULT' ? '#66ff66' : '#ff6666';
        }
    }

    hideGameOver() {
        this.elements.gameOverScreen.style.display = 'none';
    }

    restartGame() {
        this.hideGameOver();
        
        if (this.gameStateSystem) {
            this.gameStateSystem.reset();
        }
        
        console.log('🔄 Game restarted via UI');
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.elements.container.style.display = this.isVisible ? 'block' : 'none';
    }

    // IGameSystem implementation
    onGameStateChange(event) {
        if (event.property === 'gameOver') {
            this.showGameOver(event.newValue.reason, this.gameStateSystem.getFullState());
        }
    }

    shutdown() {
        if (this.elements.container) {
            document.body.removeChild(this.elements.container);
        }
        
        this.elements = {};
        console.log('🖥️ UI System shutdown');
    }
} 