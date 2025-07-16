// systems/VisualFXSystem.js - Visual effects system for tension and atmosphere
import { IGameSystem } from '../interfaces/IGameSystem.js';
import { params } from '../params.js';
import { serviceContainer } from '../core/ServiceContainer.js';
import { GameEventTypes } from '../interfaces/GameEvents.js';

export class VisualFXSystem extends IGameSystem {
    constructor() {
        super('VisualFX');
        
        this.camera = null;
        this.sceneManager = null;
        this.renderer = null;
        
        // Camera shake system
        this.cameraShake = {
            enabled: false,
            intensity: 0,
            frequency: 0,
            duration: 0,
            remainingTime: 0,
            basePosition: new THREE.Vector3(),
            shakeOffset: new THREE.Vector3()
        };
        
        // Tension effects
        this.tensionEffects = {
            enabled: false,
            intensity: 0,
            targetIntensity: 0,
            transitionSpeed: 2.0,
            colorShift: {
                r: 0,
                g: 0,
                b: 0
            },
            vignette: {
                enabled: false,
                intensity: 0
            },
            chromatic: {
                enabled: false,
                intensity: 0
            }
        };
        
        // Police tension state
        this.policeActive = false;
        this.policeIntensity = 0;
        
        // Visual element for effects
        this.effectsOverlay = null;
        
        // Effect parameters
        this.effectParams = {
            shake: {
                baseIntensity: params.CAMERA_SHAKE_INTENSITY,
                frequency: params.CAMERA_SHAKE_FREQUENCY,
                duration: params.CAMERA_SHAKE_DURATION
            },
            tension: {
                maxIntensity: params.TENSION_MAX_INTENSITY,
                colorShift: { r: params.TENSION_COLOR_SHIFT, g: -params.TENSION_COLOR_SHIFT * 0.5, b: -params.TENSION_COLOR_SHIFT * 0.5 },
                pulseSpeed: params.TENSION_PULSE_SPEED,
                transitionSpeed: params.TENSION_TRANSITION_SPEED
            }
        };
    }

    async initialize(sceneManager) {
        this.sceneManager = sceneManager;
        this.camera = serviceContainer.resolve('camera');
        this.renderer = sceneManager.renderer;
        
        // Create effects overlay
        this.createEffectsOverlay();
        
        // Subscribe to police events using GameEventTypes constants
        try {
            this.subscribeToEvent(GameEventTypes.POLICE_ACTIVATE, (event) => {
                if (params.VISUAL_FX_ENABLED) {
                    this.activateTensionEffects();
                }
            });
            
            this.subscribeToEvent(GameEventTypes.POLICE_DEACTIVATE, (event) => {
                if (params.VISUAL_FX_ENABLED) {
                    this.deactivateTensionEffects();
                }
            });
            
            console.log('🎬 Visual FX System initialized with event subscriptions');
        } catch (error) {
            console.error('❌ Error subscribing to police events:', error);
            console.log('🎬 Visual FX System initialized without event subscriptions');
        }
    }

    createEffectsOverlay() {
        if (!params.OVERLAY_EFFECTS_ENABLED) return;
        
        // Create overlay div for visual effects
        this.effectsOverlay = document.createElement('div');
        this.effectsOverlay.id = 'visual-effects-overlay';
        this.effectsOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
            background: rgba(0, 0, 0, 0);
            transition: all 0.3s ease;
            mix-blend-mode: screen;
        `;
        
        document.body.appendChild(this.effectsOverlay);
    }

    update(deltaTime) {
        if (!params.VISUAL_FX_ENABLED || !this.camera || !this.sceneManager) return;
        
        // Update tension effects
        if (params.TENSION_EFFECTS_ENABLED) {
            this.updateTensionEffects(deltaTime);
        }
        
        // Update camera shake
        if (params.CAMERA_SHAKE_ENABLED) {
            this.updateCameraShake(deltaTime);
        }
        
        // Update overlay effects
        if (params.OVERLAY_EFFECTS_ENABLED) {
            this.updateOverlayEffects(deltaTime);
        }
    }

    updateTensionEffects(deltaTime) {
        if (!this.tensionEffects.enabled) return;
        
        // Smooth transition to target intensity
        const diff = this.tensionEffects.targetIntensity - this.tensionEffects.intensity;
        this.tensionEffects.intensity += diff * this.effectParams.tension.transitionSpeed * deltaTime;
        
        // Clamp to [0, 1]
        this.tensionEffects.intensity = Math.max(0, Math.min(1, this.tensionEffects.intensity));
        
        // Update lighting effects
        this.updateLightingEffects();
        
        // Update background color shift
        this.updateBackgroundColorShift();
    }

    updateCameraShake(deltaTime) {
        if (!this.cameraShake.enabled || !this.camera) return;
        
        // Update shake timer
        this.cameraShake.remainingTime -= deltaTime;
        
        // If police is active, keep shake going indefinitely
        if (this.policeActive) {
            // Reset timer to keep shake continuous during police activity
            if (this.cameraShake.remainingTime <= 0) {
                this.cameraShake.remainingTime = this.cameraShake.duration;
            }
        } else {
            // Normal behavior: stop shake when timer expires
            if (this.cameraShake.remainingTime <= 0) {
                this.stopCameraShake();
                return;
            }
        }
        
        // Calculate shake offset with continuous time for police activity
        let shakeIntensity;
        let time;
        
        if (this.policeActive) {
            // Continuous shake during police activity with variation
            const currentTime = Date.now() * 0.001;
            const intensityVariation = Math.sin(currentTime * 0.5) * 0.3 + 0.7; // Varies between 0.4 and 1.0
            shakeIntensity = this.cameraShake.intensity * intensityVariation;
            time = currentTime * this.cameraShake.frequency;
        } else {
            // Normal timed shake
            shakeIntensity = this.cameraShake.intensity * (this.cameraShake.remainingTime / this.cameraShake.duration);
            time = (this.cameraShake.duration - this.cameraShake.remainingTime) * this.cameraShake.frequency;
        }
        
        this.cameraShake.shakeOffset.set(
            (Math.sin(time) + Math.sin(time * 2.5) * 0.5) * shakeIntensity,
            (Math.cos(time * 1.3) + Math.cos(time * 3.2) * 0.3) * shakeIntensity,
            (Math.sin(time * 0.7) + Math.sin(time * 1.9) * 0.4) * shakeIntensity * 0.5
        );
        
        // Store shake offset for use in SceneManager instead of directly modifying camera
        // This prevents interference with normal camera updates
        this.sceneManager.cameraShakeOffset = this.cameraShake.shakeOffset.clone();
    }

    updateOverlayEffects(deltaTime) {
        if (!this.effectsOverlay) return;
        
        let overlayStyle = '';
        
        if (this.tensionEffects.enabled && this.tensionEffects.intensity > 0) {
            // Pulsing red vignette effect with enhanced intensity
            const time = Date.now() * 0.001;
            const pulseIntensity = Math.sin(time * this.effectParams.tension.pulseSpeed) * 0.5 + 0.5;
            const vignetteIntensity = this.tensionEffects.intensity * 0.4 * pulseIntensity;
            
            // Enhanced red tint with multiple gradient layers
            const redTint = this.tensionEffects.intensity * 0.15;
            const edgeIntensity = this.tensionEffects.intensity * 0.3;
            
            overlayStyle = `
                background: 
                    radial-gradient(circle at 50% 50%, 
                        rgba(255, 0, 0, ${redTint * 0.3}) 0%, 
                        rgba(255, 0, 0, ${redTint * 0.5}) 40%, 
                        rgba(255, 0, 0, ${redTint + vignetteIntensity * 0.8}) 70%, 
                        rgba(150, 0, 0, ${vignetteIntensity * 1.5}) 85%,
                        rgba(100, 0, 0, ${edgeIntensity * 2}) 100%),
                    linear-gradient(45deg, 
                        rgba(255, 0, 0, ${redTint * 0.1}) 0%, 
                        rgba(0, 0, 0, 0) 50%, 
                        rgba(255, 0, 0, ${redTint * 0.1}) 100%);
                animation: tensionPulse ${1 / this.effectParams.tension.pulseSpeed}s ease-in-out infinite;
            `;
            
            // Add CSS animation for tension pulse if not already added
            if (!document.getElementById('tension-effects-style')) {
                const styleElement = document.createElement('style');
                styleElement.id = 'tension-effects-style';
                styleElement.textContent = `
                    @keyframes tensionPulse {
                        0% { opacity: 0.8; filter: blur(0px); }
                        50% { opacity: 1.0; filter: blur(0.5px); }
                        100% { opacity: 0.8; filter: blur(0px); }
                    }
                    
                    @keyframes tensionFlash {
                        0% { opacity: 0; }
                        50% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                `;
                document.head.appendChild(styleElement);
            }
        } else {
            overlayStyle = 'background: rgba(0, 0, 0, 0);';
        }
        
        this.effectsOverlay.style.background = overlayStyle;
    }

    updateLightingEffects() {
        if (!this.sceneManager.cameraLight) return;
        
        // Enhanced lighting effects with more dramatic changes
        const baseIntensity = 1.5;
        const tensionIntensity = this.tensionEffects.intensity * 0.8;
        
        // Pulsing intensity effect
        const time = Date.now() * 0.001;
        const pulseFactor = Math.sin(time * this.effectParams.tension.pulseSpeed * 2) * 0.2 + 1;
        
        this.sceneManager.cameraLight.intensity = (baseIntensity + tensionIntensity) * pulseFactor;
        
        // Enhanced color shifting - more dramatic red shift
        const redShift = this.tensionEffects.intensity * 0.4;
        const blueShift = this.tensionEffects.intensity * 0.3;
        
        this.sceneManager.cameraLight.color.setRGB(
            Math.min(1.0, 1.0 + redShift * 0.2),
            Math.max(0.3, 1.0 - redShift),
            Math.max(0.2, 1.0 - blueShift)
        );
        
        // Add flickering effect during high tension
        if (this.tensionEffects.intensity > 0.7) {
            const flickerChance = this.tensionEffects.intensity * 0.05;
            if (Math.random() < flickerChance) {
                this.sceneManager.cameraLight.intensity *= 0.7;
            }
        }
    }

    updateBackgroundColorShift() {
        if (!this.sceneManager.scene) return;
        
        // Get current background color
        const currentColor = this.sceneManager.scene.background;
        if (!currentColor) return;
        
        // Enhanced color shift with more dramatic effects
        const shiftAmount = this.tensionEffects.intensity * 0.3;
        const playerSystem = serviceContainer.resolve('playerSystem');
        const currentMask = playerSystem ? playerSystem.getCurrentMask() : null;
        
        // Use current mask color as base or neutral
        const baseColor = new THREE.Color(params.MASK_BACKGROUND_COLORS[currentMask] || params.MASK_BACKGROUND_COLORS[null]);
        
        // Shift towards dark red with pulsing effect
        const time = Date.now() * 0.001;
        const pulseFactor = Math.sin(time * this.effectParams.tension.pulseSpeed) * 0.1 + 0.9;
        
        const shiftedColor = new THREE.Color(
            Math.min(1.0, baseColor.r + shiftAmount * pulseFactor),
            Math.max(0.0, baseColor.g - shiftAmount * 0.7 * pulseFactor),
            Math.max(0.0, baseColor.b - shiftAmount * 0.8 * pulseFactor)
        );
        
        // Smooth transition
        currentColor.lerp(shiftedColor, 0.05);
    }

    // Public methods for effect control
    activateTensionEffects() {
        if (!params.VISUAL_FX_ENABLED) return;
        
        this.tensionEffects.enabled = true;
        this.tensionEffects.targetIntensity = this.effectParams.tension.maxIntensity;
        this.policeActive = true;
        
        // Start camera shake
        if (params.CAMERA_SHAKE_ENABLED) {
            this.startCameraShake(
                this.effectParams.shake.baseIntensity,
                this.effectParams.shake.frequency,
                this.effectParams.shake.duration
            );
        }
        
        console.log('🎬 Tension effects activated!');
    }

    deactivateTensionEffects() {
        if (!params.VISUAL_FX_ENABLED) return;
        
        this.tensionEffects.targetIntensity = 0;
        this.policeActive = false;
        
        // Stop camera shake (will now stop properly since policeActive is false)
        this.stopCameraShake();
        
        // Reset lighting to normal
        if (this.sceneManager && this.sceneManager.cameraLight) {
            this.sceneManager.cameraLight.intensity = 1.5;
            this.sceneManager.cameraLight.color.setRGB(1.0, 1.0, 1.0);
        }
        
        // Reset background color
        if (this.sceneManager && this.sceneManager.scene) {
            const playerSystem = serviceContainer.resolve('playerSystem');
            const currentMask = playerSystem ? playerSystem.getCurrentMask() : null;
            const baseColor = params.MASK_BACKGROUND_COLORS[currentMask] || params.MASK_BACKGROUND_COLORS[null];
            this.sceneManager.scene.background = new THREE.Color(baseColor);
        }
        
        // After intensity reaches 0, disable effects
        setTimeout(() => {
            if (this.tensionEffects.intensity < 0.01) {
                this.tensionEffects.enabled = false;
            }
        }, 1000);
        
        console.log('🎬 Tension effects deactivated');
    }

    startCameraShake(intensity = 0.1, frequency = 20, duration = 0.5) {
        if (!this.camera || !params.CAMERA_SHAKE_ENABLED) return;
        
        this.cameraShake.enabled = true;
        this.cameraShake.intensity = intensity;
        this.cameraShake.frequency = frequency;
        this.cameraShake.duration = duration;
        this.cameraShake.remainingTime = duration;
        
        console.log(`🎬 Camera shake started: intensity=${intensity}, frequency=${frequency}, duration=${duration}`);
    }

    stopCameraShake() {
        this.cameraShake.enabled = false;
        this.cameraShake.remainingTime = 0;
        this.cameraShake.shakeOffset.set(0, 0, 0);
        
        // Clear shake offset from SceneManager
        if (this.sceneManager) {
            this.sceneManager.cameraShakeOffset = null;
        }
        
        console.log('🎬 Camera shake stopped');
    }

    // Trigger specific effects
    triggerPoliceSiren() {
        // Flash effect
        if (this.effectsOverlay) {
            this.effectsOverlay.style.background = 'rgba(255, 0, 0, 0.5)';
            setTimeout(() => {
                if (this.effectsOverlay) {
                    this.effectsOverlay.style.background = 'rgba(0, 0, 255, 0.3)';
                }
            }, 100);
            setTimeout(() => {
                if (this.effectsOverlay) {
                    this.effectsOverlay.style.background = 'rgba(0, 0, 0, 0)';
                }
            }, 200);
        }
        
        // Intense camera shake
        this.startCameraShake(0.25, 30, 0.3);
    }

    triggerPoliceChase() {
        // Continuous tension effects
        this.activateTensionEffects();
        
        // Periodic shake bursts
        const shakeInterval = setInterval(() => {
            if (this.policeActive) {
                this.startCameraShake(0.1, 25, 0.2);
            } else {
                clearInterval(shakeInterval);
            }
        }, 1000);
    }

    // Debug methods
    testCameraShake() {
        if (!params.CAMERA_SHAKE_ENABLED) {
            console.log('🎬 Camera shake is disabled in params');
            return;
        }
        
        this.startCameraShake(0.2, 20, 2.0);
        console.log('🎬 Testing camera shake for 2 seconds');
    }

    testTensionEffects() {
        if (!params.TENSION_EFFECTS_ENABLED) {
            console.log('🎬 Tension effects are disabled in params');
            return;
        }
        
        this.activateTensionEffects();
        setTimeout(() => {
            this.deactivateTensionEffects();
        }, 5000);
        console.log('🎬 Testing tension effects for 5 seconds');
    }

    testPoliceArrival() {
        console.log('🎬 Testing police arrival sequence...');
        
        // Simulate police siren
        this.triggerPoliceSiren();
        
        // Wait a bit then start chase effects
        setTimeout(() => {
            this.activateTensionEffects();
            console.log('🎬 Police tension effects activated');
        }, 500);
        
        // Stop after 10 seconds
        setTimeout(() => {
            this.deactivateTensionEffects();
            console.log('🎬 Police tension effects deactivated');
        }, 10000);
    }

    // Configuration methods
    setShakeIntensity(intensity) {
        const clampedIntensity = Math.max(0, Math.min(1, intensity));
        this.effectParams.shake.baseIntensity = clampedIntensity;
        console.log(`🎬 Camera shake intensity set to: ${clampedIntensity}`);
    }

    setTensionIntensity(intensity) {
        const clampedIntensity = Math.max(0, Math.min(1, intensity));
        this.effectParams.tension.maxIntensity = clampedIntensity;
        console.log(`🎬 Tension intensity set to: ${clampedIntensity}`);
    }

    setTensionSpeed(speed) {
        const clampedSpeed = Math.max(0.1, Math.min(10, speed));
        this.effectParams.tension.pulseSpeed = clampedSpeed;
        console.log(`🎬 Tension pulse speed set to: ${clampedSpeed}`);
    }

    // Enhanced police effects
    triggerPoliceArrivalSequence() {
        console.log('🎬 Police arrival sequence initiated!');
        
        // Immediate flash effect
        this.triggerPoliceSiren();
        
        // Strong shake on arrival
        setTimeout(() => {
            this.startCameraShake(0.3, 30, 0.8);
        }, 200);
        
        // Activate tension effects
        setTimeout(() => {
            this.activateTensionEffects();
        }, 400);
        
        // Periodic tension bursts
        const burstInterval = setInterval(() => {
            if (this.policeActive) {
                this.startCameraShake(0.15, 25, 0.3);
            } else {
                clearInterval(burstInterval);
            }
        }, 3000);
    }

    // Get current visual effects state
    getEffectsState() {
        return {
            visualFXEnabled: params.VISUAL_FX_ENABLED,
            cameraShakeEnabled: params.CAMERA_SHAKE_ENABLED,
            tensionEffectsEnabled: params.TENSION_EFFECTS_ENABLED,
            overlayEffectsEnabled: params.OVERLAY_EFFECTS_ENABLED,
            policeActive: this.policeActive,
            tensionIntensity: this.tensionEffects.intensity,
            cameraShakeActive: this.cameraShake.enabled,
            effectParams: this.effectParams
        };
    }

    // Toggle individual effects
    toggleCameraShake() {
        params.CAMERA_SHAKE_ENABLED = !params.CAMERA_SHAKE_ENABLED;
        if (!params.CAMERA_SHAKE_ENABLED) {
            this.stopCameraShake();
        }
        console.log(`🎬 Camera shake: ${params.CAMERA_SHAKE_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    }

    toggleTensionEffects() {
        params.TENSION_EFFECTS_ENABLED = !params.TENSION_EFFECTS_ENABLED;
        if (!params.TENSION_EFFECTS_ENABLED) {
            this.deactivateTensionEffects();
        }
        console.log(`🎬 Tension effects: ${params.TENSION_EFFECTS_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    }

    toggleOverlayEffects() {
        params.OVERLAY_EFFECTS_ENABLED = !params.OVERLAY_EFFECTS_ENABLED;
        if (!params.OVERLAY_EFFECTS_ENABLED && this.effectsOverlay) {
            this.effectsOverlay.style.background = 'rgba(0, 0, 0, 0)';
        }
        console.log(`🎬 Overlay effects: ${params.OVERLAY_EFFECTS_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    }

    shutdown() {
        // Clean up overlay
        if (this.effectsOverlay) {
            document.body.removeChild(this.effectsOverlay);
            this.effectsOverlay = null;
        }
        
        // Reset camera
        this.stopCameraShake();
        
        // Reset lighting
        if (this.sceneManager.cameraLight) {
            this.sceneManager.cameraLight.intensity = 1.5;
            this.sceneManager.cameraLight.color.setRGB(1.0, 1.0, 1.0);
        }
        
        console.log('🎬 Visual FX System shutdown');
    }
} 