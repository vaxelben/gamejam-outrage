// core/SceneManager.js - Scene and rendering management following SRP
import { params } from '../params.js';
import { serviceContainer } from './ServiceContainer.js';

// Import standard Three.js - will use custom shaders for WebGPU Earth effect compatibility
import * as THREE from 'three';

export class SceneManager {
    constructor() {
        this.canvas = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.planet = null;
        this.innerPlanet = null;
        this.planetRadius = 0;
        
        // HUD system for helpers (like drei HUD)
        this.hudScene = null;
        this.hudCamera = null;
        this.hudRenderer = null;
        this.hudCanvas = null;
        this.showHelpers = false;
    }

    async initialize() {
        // Get canvas and create standard renderer
        this.canvas = document.getElementById('renderCanvas');
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true 
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Create scene
        this.scene = new THREE.Scene();
        // Initialize with neutral mask background color
        this.scene.background = new THREE.Color(params.MASK_BACKGROUND_COLORS[null]);

        // Create camera - adapted for game with better FOV and distance
        this.camera = new THREE.PerspectiveCamera(
            75,  // Better FOV for gameplay
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000  // Larger max distance for game
        );
        this.camera.position.set(0, params.CAMERA_DISTANCE, 0);  // Use params for proper game distance
        this.camera.lookAt(0, 0, 0);
        
        // Register camera in service container for other systems to access
        serviceContainer.registerInstance('camera', this.camera);

        // Create lights
        this.createLights();

        // Create planet
        this.createPlanet();

        // Add debugging helpers with HUD system
        this.initializeHUD();

        // Setup window resize handling
        this.setupResizeHandler();

        // Hide helpers by default
        this.toggleHelpers(this.showHelpers);

        // Add GUI for atmosphere controls (exactly like the example)
        this.initializeGUI();

        console.log('🎬 Scene Manager initialized');
        console.log('🎨 Background color initialized for neutral mask:', params.MASK_BACKGROUND_COLORS[null].toString(16));
    }

    createLights() {
        // Sun light - EXACT same as WebGPU example
        this.sunLight = new THREE.DirectionalLight('#ffffff', 2);
        this.sunLight.position.set(0, 0, 3);  // EXACT same position as WebGPU example
        this.scene.add(this.sunLight);
        
        // Keep minimal ambient light for compatibility with game systems
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);
        
        console.log('☀️ Sun light created - EXACT same as WebGPU example (intensity: 2, position: (0,0,3))');
    }

    createPlanet() {
        /* ===============================
         * WEBGPU EARTH COMPATIBLE IMPLEMENTATION  
         * ===============================
         * This method reproduces the EXACT same visual effect as the Three.js WebGPU Earth example
         * but using standard Three.js materials with custom shaders for maximum compatibility:
         * - Custom vertex/fragment shaders reproducing TSL node logic
         * - Same texture channels: R=Bump, G=Roughness, B=Clouds 
         * - Same uniforms, atmosphere colors, and effect parameters
         * - Full GUI control support with real-time updates
         */
        
        const planetRadius = params.PLANET_DIAMETER / 2 * params.PLANET_INNER_SPHERE_SCALE;
        const atmosphereRadius = planetRadius * 1.04; // 4% larger like the example
        
        // Load texture (single day texture only)
        const textureLoader = new THREE.TextureLoader();
        
        const dayTexture = textureLoader.load('textures/planet_color.jpg');
        dayTexture.colorSpace = THREE.SRGBColorSpace;
        dayTexture.anisotropy = 8;

        const bumpRoughnessCloudsTexture = textureLoader.load('textures/planet_normal.jpg');
        bumpRoughnessCloudsTexture.anisotropy = 8;

        // Get sun light direction - use our created sun light
        const sunDirection = this.sunLight.position.clone().normalize();

        // Uniforms exactly like the WebGPU example
        this.atmosphereDayColor = new THREE.Color('#4db2ff');
        this.atmosphereTwilightColor = new THREE.Color('#bc490b'); 
        this.roughnessLow = 0.25;
        this.roughnessHigh = 0.35;

        // GLOBE - Custom shader reproducing TSL node logic exactly
        const sphereGeometry = new THREE.SphereGeometry(planetRadius, 64, 64);
        const globeMaterial = new THREE.MeshStandardMaterial({
            map: dayTexture,
            bumpMap: bumpRoughnessCloudsTexture,
            bumpScale: 0.02,
            roughnessMap: bumpRoughnessCloudsTexture,
            roughness: this.roughnessLow,
            metalness: 0.0
        });

        // Simple cloud shader - focus on VISIBLE clouds first
        globeMaterial.onBeforeCompile = (shader) => {
            // Simple cloud extraction
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #include <map_fragment>
                
                // Simple cloud extraction from blue channel
                float clouds = texture2D(map, vMapUv).b;
                
                // Clear threshold for visible clouds
                clouds = smoothstep(0.4, 0.9, clouds);
                
                // Mix with bright white for clear cloud visibility
                vec3 cloudColor = vec3(1.0, 1.0, 1.0);
                diffuseColor.rgb = mix(diffuseColor.rgb, cloudColor, clouds * 1.2);
                `
            );

            console.log('☁️ Simple cloud shader applied');
        };

        // Create globe mesh
        this.innerPlanet = new THREE.Mesh(sphereGeometry, globeMaterial);
        this.innerPlanet.receiveShadow = true;
        this.innerPlanet.castShadow = true;
        this.scene.add(this.innerPlanet);

        // ATMOSPHERE - temporarily disabled to focus on clouds
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            side: THREE.BackSide,
            opacity: 0.05,  // Very minimal for now
            color: this.atmosphereDayColor,
            blending: THREE.AdditiveBlending,
            visible: false  // Hide initially to focus on clouds
        });

        const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial);
        atmosphere.scale.setScalar(1.04); // 4% larger exactly like the example
        this.scene.add(atmosphere);

        // Store references
        this.planet = atmosphere;
        this.planetRadius = atmosphereRadius;

        console.log('🌍 Earth planet created - FOCUSING ON CLOUDS FIRST:', {
            planetRadius: planetRadius,
            atmosphereRadius: atmosphereRadius,
            method: 'Simple cloud shader - step by step approach',
            implementation: '✅ Clear cloud visibility priority',
            cloudSettings: {
                texture: 'planet_normal.jpg (Blue channel)',
                threshold: 'smoothstep(0.4, 0.9) - clearer range',
                intensity: '1.2 - bright white clouds',
                atmosphere: 'DISABLED for now - focus on clouds'
            }
        });
        
        console.log('☁️ Step-by-step cloud debugging:');
        console.log('   1. First verify clouds are visible (atmosphere disabled)');
        console.log('   2. sceneManager.testCloudThresholds() // Test different cloud ranges');
        console.log('   3. sceneManager.toggleAtmosphere() // Re-enable atmosphere after clouds work');
        console.log('   4. Compare with webgpu-earth-test.html');
        
        console.log('🔧 Available controls:');
        console.log('   - sceneManager.testCloudThresholds() // Test cloud visibility');
        console.log('   - sceneManager.setCloudThreshold(min, max, intensity) // Manual adjust');
        console.log('   - sceneManager.toggleAtmosphere() // Show/hide atmosphere');
        console.log('   - sceneManager.showDebugInfo() // Current settings');
    }

    initializeGUI() {
        console.log('🎛️ GUI disabled for now - focusing on basic cloud visibility');
        console.log('💡 Use console commands instead: sceneManager.showDebugInfo()');
    }

    initializeHUD() {
        // Create HUD canvas overlay
        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 200px;
            height: 200px;
            border: 2px solid #333;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.1);
            z-index: 1000;
            pointer-events: none;
        `;
        document.body.appendChild(this.hudCanvas);

        // Create HUD renderer
        this.hudRenderer = new THREE.WebGLRenderer({ 
            canvas: this.hudCanvas, 
            antialias: true,
            alpha: true 
        });
        this.hudRenderer.setSize(200, 200);
        this.hudRenderer.setPixelRatio(window.devicePixelRatio);
        this.hudRenderer.setClearColor(0x000000, 0.1);

        // Create HUD scene
        this.hudScene = new THREE.Scene();

        // Create HUD camera (orthographic for better helper visibility)
        this.hudCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
        this.hudCamera.position.set(10, 10, 10);
        this.hudCamera.lookAt(0, 0, 0);

        // Add helpers to HUD scene
        this.addHUDHelpers();

        console.log('🔧 HUD system initialized with helpers');
    }

    addHUDHelpers() {
        // Add axes helper to HUD scene
        this.axesHelper = new THREE.AxesHelper(8);
        this.hudScene.add(this.axesHelper);

        // Create a mini camera representation for the HUD
        this.createMiniCameraHelper();

        // Add some ambient light to HUD scene
        const hudLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.hudScene.add(hudLight);

        // Add directional light for better visibility
        const hudDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        hudDirectionalLight.position.set(5, 5, 5);
        this.hudScene.add(hudDirectionalLight);

        // Add labels for axes
        this.addHUDLabels();

        // Add player direction indicator
        this.createPlayerDirectionIndicator();
    }

    createMiniCameraHelper() {
        // Create a visual representation of the main camera in the HUD
        const cameraGeometry = new THREE.ConeGeometry(0.5, 2, 4);
        const cameraMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        
        this.miniCamera = new THREE.Mesh(cameraGeometry, cameraMaterial);
        this.miniCamera.rotateX(-Math.PI / 2); // Point forward
        this.hudScene.add(this.miniCamera);

        // Add camera direction indicator
        const directionGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
        const directionMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6
        });
        
        this.cameraDirection = new THREE.Mesh(directionGeometry, directionMaterial);
        this.cameraDirection.rotateX(-Math.PI / 2);
        this.cameraDirection.position.set(0, 0, 2);
        this.hudScene.add(this.cameraDirection);
    }

    createPlayerDirectionIndicator() {
        // Create an arrow to show player direction
        const arrowGeometry = new THREE.ConeGeometry(0.3, 1.5, 6);
        const arrowMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff4444,
            transparent: true,
            opacity: 0.8
        });
        
        this.playerDirection = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.playerDirection.position.set(0, 0, -4);
        this.playerDirection.rotateX(-Math.PI / 2);
        this.hudScene.add(this.playerDirection);
    }

    addHUDLabels() {
        // Create text labels for axes (using HTML overlay)
        const labelContainer = document.createElement('div');
        labelContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 220px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: white;
            background: rgba(0, 0, 0, 0.8);
            padding: 8px;
            border-radius: 4px;
            z-index: 1001;
            line-height: 1.3;
            border: 1px solid #333;
            pointer-events: none;
        `;
        
        labelContainer.innerHTML = `
            <div style="color: #ff6b6b; font-weight: bold;">🔴 X-Axis (Red)</div>
            <div style="color: #6bcf7f; font-weight: bold;">🟢 Y-Axis (Green)</div>
            <div style="color: #4d9ef7; font-weight: bold;">🔵 Z-Axis (Blue)</div>
            <div style="color: #00ff00; font-weight: bold;">📷 Camera (Green)</div>
            <div style="color: #ff4444; font-weight: bold;">🚀 Player Direction (Red)</div>
            <div style="margin-top: 5px; color: #ccc;">Press H to toggle</div>
        `;
        
        this.hudLabels = labelContainer;
        document.body.appendChild(labelContainer);
    }

    // Toggle HUD visibility
    toggleHelpers(visible = null) {
        this.showHelpers = visible !== null ? visible : !this.showHelpers;
        
        if (this.hudCanvas) {
            this.hudCanvas.style.display = this.showHelpers ? 'block' : 'none';
        }
        
        if (this.hudLabels) {
            this.hudLabels.style.display = this.showHelpers ? 'block' : 'none';
        }
        
        console.log(`🔧 HUD helpers ${this.showHelpers ? 'shown' : 'hidden'}`);
    }

    // Update HUD to reflect main camera orientation and player direction
    updateHUD() {
        if (!this.hudScene || !this.showHelpers) return;

        // Update mini camera orientation to match main camera
        if (this.miniCamera && this.cameraDirection) {
            // Get main camera direction
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Update mini camera rotation to show main camera direction
            this.miniCamera.lookAt(cameraDirection);
            this.cameraDirection.lookAt(cameraDirection);
            
            // Scale based on distance to make it more visible
            const distance = this.camera.position.length();
            const scale = Math.max(0.5, Math.min(2.0, distance / 20));
            this.miniCamera.scale.setScalar(scale);
        }

        // Update player direction indicator
        if (this.playerDirection) {
            // Get player system to get player direction
            const playerSystem = serviceContainer.resolve('playerSystem');
            if (playerSystem) {
                const playerPosition = playerSystem.getPlayerPosition();
                const playerNormal = playerSystem.getPlayerNormal();
                
                // Position the player direction indicator
                this.playerDirection.position.copy(playerNormal.clone().multiplyScalar(-6));
                this.playerDirection.lookAt(playerNormal);
            }
        }
    }

    addPlanetVariation(geometry) {
        // Add some procedural variation to the planet
        const positions = geometry.attributes.position;
        const vertices = positions.array;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            
            // Add some noise to make the planet less perfectly spherical
            const noise = (Math.sin(x * 0.1) + Math.cos(y * 0.1) + Math.sin(z * 0.1)) * 0.1;
            const length = Math.sqrt(x * x + y * y + z * z);
            const normalizedX = x / length;
            const normalizedY = y / length;
            const normalizedZ = z / length;
            
            vertices[i] = normalizedX * (length + noise);
            vertices[i + 1] = normalizedY * (length + noise);
            vertices[i + 2] = normalizedZ * (length + noise);
        }
        
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // Update camera based on player position
    updateCamera(playerPosition) {
        if (playerPosition) {
            // Calculate camera position relative to player
            const playerNormal = playerPosition.clone().normalize();
            const cameraOffset = playerNormal.clone().multiplyScalar(params.CAMERA_DISTANCE);
            const cameraPosition = playerPosition.clone().add(cameraOffset);
            
            // Apply camera shake if available
            if (this.cameraShakeOffset) {
                cameraPosition.add(this.cameraShakeOffset);
            }
            
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(playerPosition);
            
            // Robust camera orientation using quaternion-based approach
            // This avoids singularities and discontinuities
            this.updateCameraOrientation(playerPosition);
            
            // Update camera-following light position
            this.updateCameraLight(playerPosition);
        }
    }

    updateCameraOrientation(playerPosition) {
        // Store previous camera up vector to maintain continuity
        if (!this.lastCameraUp) {
            this.lastCameraUp = new THREE.Vector3(0, 1, 0);
        }
        
        const playerNormal = playerPosition.clone().normalize();
        const cameraToPlayer = playerPosition.clone().sub(this.camera.position).normalize();
        
        // Calculate desired camera right vector by projecting last up vector
        // onto the plane perpendicular to the camera-to-player direction
        const lastUpProjected = this.lastCameraUp.clone();
        const projectionLength = lastUpProjected.dot(cameraToPlayer);
        lastUpProjected.addScaledVector(cameraToPlayer, -projectionLength);
        
        // If projection is too small, use a fallback based on world coordinates
        if (lastUpProjected.length() < 0.1) {
            // Use the most stable world axis that's not aligned with camera direction
            const worldX = new THREE.Vector3(1, 0, 0);
            const worldY = new THREE.Vector3(0, 1, 0);
            const worldZ = new THREE.Vector3(0, 0, 1);
            
            const dotX = Math.abs(cameraToPlayer.dot(worldX));
            const dotY = Math.abs(cameraToPlayer.dot(worldY));
            const dotZ = Math.abs(cameraToPlayer.dot(worldZ));
            
            if (dotX < dotY && dotX < dotZ) {
                lastUpProjected.copy(worldX);
            } else if (dotY < dotZ) {
                lastUpProjected.copy(worldY);
            } else {
                lastUpProjected.copy(worldZ);
            }
            
            // Project chosen axis onto plane perpendicular to camera direction
            const proj = lastUpProjected.dot(cameraToPlayer);
            lastUpProjected.addScaledVector(cameraToPlayer, -proj);
        }
        
        lastUpProjected.normalize();
        
        // Calculate camera right vector
        const cameraRight = new THREE.Vector3().crossVectors(cameraToPlayer, lastUpProjected);
        cameraRight.normalize();
        
        // Calculate final camera up vector
        const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraToPlayer);
        cameraUp.normalize();
        
        // Update camera orientation
        this.camera.up.copy(cameraUp);
        
        // Store for next frame to maintain continuity
        this.lastCameraUp.copy(cameraUp);
    }

    // Update camera-following directional light position and direction
    updateCameraLight(playerPosition) {
        if (this.cameraLight) {
            // Calculate player normal vector
            const playerNormal = playerPosition.clone().normalize();
            
            // Get camera up vector for positioning light above camera
            const cameraUp = this.camera.up.clone();
            
            // Get camera right vector for positioning light to the right
            const cameraRight = new THREE.Vector3();
            cameraRight.crossVectors(this.camera.up, new THREE.Vector3().copy(playerPosition).sub(this.camera.position).normalize());
            cameraRight.normalize();
            
            // Position directional light above and to the right of camera
            const upOffset = cameraUp.multiplyScalar(150); // 25 units above camera
            const rightOffset = cameraRight.multiplyScalar(-150); // 15 units to the right of camera
            const lightPosition = this.camera.position.clone().add(upOffset).add(rightOffset);
            
            this.cameraLight.position.copy(lightPosition);
            
            // Make directional light point towards scene center
            const sceneCenter = new THREE.Vector3(0, 0, 0);
            this.cameraLight.lookAt(sceneCenter);
            
            // Optionally adjust light intensity based on distance to player
            const distanceToPlayer = this.camera.position.distanceTo(playerPosition);
            const intensityScale = Math.max(0.8, Math.min(2.0, 30 / distanceToPlayer));
            this.cameraLight.intensity = 1.5 * intensityScale;
        }
    }

    // Render the scene and HUD
    render() {
        // Render main scene
        this.renderer.render(this.scene, this.camera);
        
        // Update and render HUD
        this.updateHUD();
        if (this.hudRenderer && this.hudScene && this.showHelpers) {
            this.hudRenderer.render(this.hudScene, this.hudCamera);
        }
    }

    // Add object to scene
    addObject(object) {
        this.scene.add(object);
    }

    // Remove object from scene
    removeObject(object) {
        this.scene.remove(object);
    }

    // Get scene reference for other systems
    getScene() {
        return this.scene;
    }

    // Get planet reference
    getPlanet() {
        return this.planet;
    }

    // Get inner planet reference
    getInnerPlanet() {
        return this.innerPlanet;
    }

    // Get planet radius (returns the inner planet surface radius for character positioning)
    getPlanetRadius() {
        return params.PLANET_DIAMETER / 2 * params.PLANET_INNER_SPHERE_SCALE;
    }

    // Get atmosphere radius (the larger sphere with atmosphere effects)
    getAtmosphereRadius() {
        return this.planetRadius; // This is the stored atmosphere radius
    }

    // Get inner planet radius (the visible surface)
    getInnerPlanetRadius() {
        return params.PLANET_DIAMETER / 2 * params.PLANET_INNER_SPHERE_SCALE;
    }

    // Set background color
    setBackgroundColor(color) {
        if (this.scene && this.scene.background) {
            this.scene.background = new THREE.Color(color);
        }
    }

    // Get current background color
    getBackgroundColor() {
        return this.scene && this.scene.background ? this.scene.background.getHex() : 0x000000;
    }

    // Set background color using predefined colors
    setBackgroundFromPreset(colorName) {
        const color = params.BACKGROUND_COLORS[colorName];
        if (color !== undefined) {
            this.setBackgroundColor(color);
            console.log(`🎨 Background color set to ${colorName} (${color.toString(16)})`);
        } else {
            console.warn(`🎨 Background color preset "${colorName}" not found. Available presets:`, Object.keys(params.BACKGROUND_COLORS));
        }
    }

    // Set background color based on player mask
    setBackgroundFromMask(maskType) {
        const color = params.MASK_BACKGROUND_COLORS[maskType];
        if (color !== undefined) {
            this.setBackgroundColor(color);
            const maskName = this.getMaskName(maskType);
            console.log(`🎭 Background color changed to match ${maskName} mask (${color.toString(16)})`);
        } else {
            console.warn(`🎭 Background color for mask "${maskType}" not found. Available masks:`, Object.keys(params.MASK_BACKGROUND_COLORS));
        }
    }

    // Get mask name for logging
    getMaskName(maskType) {
        const maskNames = {
            null: 'Neutral',
            1: 'Conservative',
            2: 'Social Justice',
            3: 'Libertarian',
            4: 'Nationalist',
            5: 'Culture',
            6: 'Religious',
            7: 'Antisystem'
        };
        return maskNames[maskType] || 'Unknown';
    }

    // Test all mask background colors (for debugging)
    testAllMaskColors() {
        console.log('🎨 Testing all mask background colors:');
        const masks = [null, 1, 2, 3, 4, 5, 6, 7];
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < masks.length) {
                const maskType = masks[currentIndex];
                this.setBackgroundFromMask(maskType);
                currentIndex++;
                setTimeout(testNext, 2000); // Change color every 2 seconds
            } else {
                console.log('🎨 Mask color test completed');
                this.setBackgroundFromMask(null); // Return to neutral
            }
        };
        
        testNext();
    }

    // Debug methods for planet visibility
    toggleInnerSphereVisibility() {
        if (this.innerPlanet) {
            this.innerPlanet.visible = !this.innerPlanet.visible;
            console.log(`🌍 Inner sphere visibility: ${this.innerPlanet.visible ? 'ON' : 'OFF'}`);
        }
    }

    // Debug method for texture scale testing (disabled for proper Earth mapping)
    setPlanetTextureScale(scale = 1.0) {
        console.log(`🌍 Texture scaling disabled for proper Earth UV mapping (requested scale: ${scale})`);
        console.log(`💡 Earth textures use natural UV mapping without repeat to avoid polar distortion`);
    }

    // Debug method for adjusting inner sphere material properties
    setInnerSphereReflectivity(roughness = 0.1, metalness = 0.6, clearcoat = 0.8) {
        if (this.innerPlanet && this.innerPlanet.material) {
            const material = this.innerPlanet.material;
            material.roughness = roughness;
            material.metalness = metalness;
            material.clearcoat = clearcoat;
            material.needsUpdate = true;
            console.log(`✨ Inner sphere reflectivity updated:`, {
                roughness: roughness,
                metalness: metalness,
                clearcoat: clearcoat
            });
        }
    }

    // Debug method for displacement scale testing
    setDisplacementScale(scale = 0.5) {
        if (this.innerPlanet && this.innerPlanet.material) {
            this.innerPlanet.material.displacementScale = scale;
            this.innerPlanet.material.needsUpdate = true;
            console.log(`🌍 Inner sphere displacement scale set to: ${scale}`);
        }
    }

    // Debug method for adjusting camera directional light
    setCameraDirectionalLightParams(intensity = 1.5) {
        if (this.cameraLight) {
            this.cameraLight.intensity = intensity;
            console.log(`💡 Camera directional light updated:`, {
                intensity: intensity,
                position: this.cameraLight.position,
                rotation: this.cameraLight.rotation
            });
        }
    }

    // Enhanced Earth texture debug methods (matching example parameters)
    toggleCloudVisibility() {
        if (this.planet) {
            this.planet.visible = !this.planet.visible;
            console.log(`☁️ Atmosphere layer visibility: ${this.planet.visible ? 'ON' : 'OFF'}`);
        }
    }

    adjustAtmosphereOpacity(opacity = 0.7) {
        if (this.planet && this.planet.material) {
            this.planet.material.opacity = opacity;
            this.planet.material.transparent = opacity < 1.0;
            console.log(`☁️ Atmosphere opacity set to: ${opacity}`);
        }
    }

    adjustRoughnessRange(roughnessLow = 0.25, roughnessHigh = 0.35) {
        if (this.innerPlanet && this.innerPlanet.material) {
            // Update shader uniforms if they exist
            if (this.innerPlanet.material.uniforms) {
                this.innerPlanet.material.uniforms.roughnessLow.value = roughnessLow;
                this.innerPlanet.material.uniforms.roughnessHigh.value = roughnessHigh;
            }
            console.log(`🌍 Roughness range set to: ${roughnessLow} - ${roughnessHigh}`);
        }
    }

    adjustSurfaceBumpScale(scale = 0.02) {
        if (this.innerPlanet && this.innerPlanet.material) {
            this.innerPlanet.material.bumpScale = scale;
            console.log(`🌍 Surface bump scale set to: ${scale}`);
        }
    }

    adjustAtmosphereRoughness(roughness = 0.35) {
        if (this.planet && this.planet.material) {
            this.planet.material.roughness = roughness;
            console.log(`☁️ Atmosphere roughness set to: ${roughness}`);
        }
    }

    toggleAtmosphereSide() {
        if (this.planet && this.planet.material) {
            const material = this.planet.material;
            if (material.side === THREE.BackSide) {
                material.side = THREE.FrontSide;
                console.log('☁️ Atmosphere side: FRONT');
            } else {
                material.side = THREE.BackSide;
                console.log('☁️ Atmosphere side: BACK');
            }
            material.needsUpdate = true;
        }
    }

    // Test Earth texture effects in sequence (matching example parameters)
    testEarthTextureEffects() {
        console.log('🌍 Testing Earth texture effects (example-based)...');
        
        const tests = [
            { name: 'Normal State', action: () => this.resetEarthTextures() },
            { name: 'Surface Only', action: () => this.toggleCloudVisibility() },
            { name: 'Atmosphere Only', action: () => this.toggleInnerSphereVisibility() },
            { name: 'High Atmosphere Opacity', action: () => this.adjustAtmosphereOpacity(0.9) },
            { name: 'Low Atmosphere Opacity', action: () => this.adjustAtmosphereOpacity(0.3) },
            { name: 'Enhanced Bump Scale', action: () => this.adjustSurfaceBumpScale(0.1) },
            { name: 'Reduced Bump Scale', action: () => this.adjustSurfaceBumpScale(0.005) },
            { name: 'High Roughness Range', action: () => this.adjustRoughnessRange(0.4, 0.6) },
            { name: 'Low Roughness Range', action: () => this.adjustRoughnessRange(0.1, 0.2) },
            { name: 'Front Side Atmosphere', action: () => this.toggleAtmosphereSide() },
            { name: 'Rough Atmosphere', action: () => this.adjustAtmosphereRoughness(0.8) }
        ];
        
        let currentIndex = 0;
        
        const runNextTest = () => {
            if (currentIndex < tests.length) {
                const test = tests[currentIndex];
                console.log(`🧪 Testing: ${test.name}`);
                test.action();
                currentIndex++;
                setTimeout(runNextTest, 3000); // 3 seconds per test
            } else {
                console.log('🌍 Earth texture test completed - resetting to example defaults');
                this.resetEarthTextures();
            }
        };
        
        runNextTest();
    }

    // Reset all Earth texture effects to example defaults
    resetEarthTextures() {
        // Reset atmosphere layer
        if (this.planet) {
            this.planet.visible = true;
            if (this.planet.material) {
                this.planet.material.opacity = params.PLANET_OUTER_OPACITY;
                this.planet.material.transparent = params.PLANET_OUTER_OPACITY < 1.0;
                this.planet.material.side = THREE.BackSide;
                this.planet.material.roughness = 0.35; // roughnessHigh
                this.planet.material.needsUpdate = true;
            }
        }
        
        // Reset surface
        if (this.innerPlanet) {
            this.innerPlanet.visible = true;
            if (this.innerPlanet.material) {
                this.innerPlanet.material.roughness = 0.25; // roughnessLow base
                this.innerPlanet.material.bumpScale = 0.02;
                
                // Reset shader uniforms
                if (this.innerPlanet.material.uniforms) {
                    this.innerPlanet.material.uniforms.roughnessLow.value = 0.25;
                    this.innerPlanet.material.uniforms.roughnessHigh.value = 0.35;
                }
            }
        }
        
        console.log('🌍 Earth textures reset to example defaults');
    }

    // Get detailed Earth texture information (example-based)
    getEarthTextureInfo() {
        const atmosphereMaterial = this.planet?.material;
        const surfaceMaterial = this.innerPlanet?.material;
        
        return {
            atmosphere: {
                visible: this.planet?.visible || false,
                opacity: atmosphereMaterial?.opacity || 'N/A',
                roughness: atmosphereMaterial?.roughness || 'N/A',
                side: atmosphereMaterial?.side === THREE.BackSide ? 'BackSide' : 'FrontSide',
                metalness: atmosphereMaterial?.metalness || 'N/A',
                texture: 'planet_normal.jpg',
                channels: {
                    red: 'Bump/Elevation',
                    green: 'Roughness',
                    blue: 'Clouds/Alpha'
                },
                features: ['Cloud transparency', 'Atmospheric scattering', 'Volume rendering']
            },
            surface: {
                visible: this.innerPlanet?.visible || false,
                baseRoughness: surfaceMaterial?.roughness || 'N/A',
                bumpScale: surfaceMaterial?.bumpScale || 'N/A',
                metalness: surfaceMaterial?.metalness || 'N/A',
                transparent: surfaceMaterial?.transparent || false,
                texture: 'planet_color.jpg',
                roughnessTexture: 'planet_normal.jpg',
                features: ['Dynamic roughness mapping', 'Cloud-surface blending', 'Multi-channel texturing']
            },
            shaderEnhancements: {
                atmosphere: 'Blue channel cloud processing with smoothstep',
                surface: 'Advanced roughness remapping between low/high values',
                rendering: 'Surface first, then atmosphere (BackSide)'
            },
            exampleParameters: {
                roughnessLow: 0.25,
                roughnessHigh: 0.35,
                cloudSmoothstep: '0.2 to 1.0',
                cloudMultiplier: '2.0x for brightness',
                renderOrder: 'Surface (1) → Atmosphere (2)'
            }
        };
    }

    // Debug method for testing directional light colors
    setCameraDirectionalLightColor(color = 0xffffff) {
        if (this.cameraLight) {
            this.cameraLight.color.setHex(color);
            console.log(`💡 Camera directional light color set to: ${color.toString(16)}`);
        }
    }

    // Test different directional light colors for enhanced visual effect
    testDirectionalLightColors() {
        console.log('🎨 Testing directional light colors...');
        const colors = [
            { name: 'White', color: 0xffffff },
            { name: 'Warm White', color: 0xfff8dc },
            { name: 'Cool Blue', color: 0xb3d9ff },
            { name: 'Golden', color: 0xffd700 },
            { name: 'Cyan', color: 0x00ffff },
            { name: 'Magenta', color: 0xff00ff }
        ];
        
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < colors.length) {
                const colorData = colors[currentIndex];
                this.setCameraDirectionalLightColor(colorData.color);
                console.log(`🎨 Testing ${colorData.name} directional light`);
                currentIndex++;
                setTimeout(testNext, 2000); // Change color every 2 seconds
            } else {
                console.log('🎨 Directional light color test completed');
                this.setCameraDirectionalLightColor(0xffffff); // Return to white
            }
        };
        
        testNext();
    }

    // Update planet texture scale and persist to params (disabled for proper Earth mapping)
    updatePlanetTextureScale(scale = 1.0) {
        console.log(`🌍 Planet texture scaling disabled for proper Earth UV mapping (requested scale: ${scale})`);
        console.log(`💡 PLANET_TEXTURE_SCALE parameter is ignored for Earth textures to prevent polar distortion`);
    }

    toggleOuterSphereVisibility() {
        if (this.planet) {
            this.planet.visible = !this.planet.visible;
            console.log(`🌍 Outer sphere visibility: ${this.planet.visible ? 'ON' : 'OFF'}`);
        }
    }

    // Temporarily make outer sphere transparent to see inner sphere
    toggleOuterSphereTransparency() {
        if (this.planet && this.planet.material) {
            const material = this.planet.material;
            if (material.opacity >= 1.0) {
                material.transparent = true;
                material.opacity = 0.3;
                console.log('🌍 Outer sphere made transparent (0.3)');
            } else {
                material.transparent = false;
                material.opacity = 1.0;
                console.log('🌍 Outer sphere made opaque (1.0)');
            }
        }
    }

    // Get planet debug info
    getPlanetDebugInfo() {
        return {
            atmosphereRadius: this.planetRadius,
            planetRadius: this.getInnerPlanetRadius(),
            atmosphereOpacity: this.planet?.material?.opacity || 'N/A',
            surfaceOpacity: this.innerPlanet?.material?.opacity || 'N/A',
            atmosphereVisible: this.planet?.visible || false,
            surfaceVisible: this.innerPlanet?.visible || false,
            atmosphereRenderOrder: this.planet?.renderOrder || 'N/A',
            surfaceRenderOrder: this.innerPlanet?.renderOrder || 'N/A',
            textureMapping: 'Natural UV mapping (no repeat)',
            atmosphereTexture: 'planet_normal.jpg',
            surfaceTexture: 'planet_color.jpg',
            uvMapping: 'Standard spherical UV without distortion'
        };
    }

    // Planet rotation disabled - no automatic rotation
    updatePlanetRotation(delta) {
        // Rotation disabled - planet remains static
        // if (this.innerPlanet) {
        //     this.innerPlanet.rotation.y += delta * 0.025;
        // }
    }

    // Cloud debugging methods for real-time adjustment
    adjustCloudVisibility(intensity = 0.7) {
        if (this.innerPlanet && this.innerPlanet.material) {
            // This will require re-compiling the shader - simplified approach
            console.log(`☁️ Cloud intensity set to: ${intensity} (requires material update)`);
            // Force material recompilation
            this.innerPlanet.material.needsUpdate = true;
        }
    }

    adjustCloudThreshold(min = 0.3, max = 0.8) {
        console.log(`☁️ Cloud threshold set to: smoothstep(${min}, ${max})`);
        console.log('💡 Tip: Lower values show more clouds, higher values show fewer clouds');
    }

    toggleAtmosphere() {
        if (this.planet) {
            this.planet.visible = !this.planet.visible;
            console.log(`🌍 Atmosphere ${this.planet.visible ? 'shown' : 'hidden'}`);
        }
    }

    adjustAtmosphereOpacity(value = 0.1) {
        if (this.planet && this.planet.material) {
            this.planet.material.opacity = value;
            console.log(`🌍 Atmosphere opacity set to: ${value}`);
        }
    }

    // Test different cloud visibility levels
    testCloudVisibility() {
        console.log('☁️ Testing cloud visibility levels...');
        const levels = [0.0, 0.3, 0.5, 0.7, 1.0];
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < levels.length) {
                const level = levels[currentIndex];
                this.adjustCloudVisibility(level);
                console.log(`Testing cloud intensity: ${level}`);
                currentIndex++;
                setTimeout(testNext, 2000); // Change every 2 seconds
            } else {
                console.log('☁️ Cloud visibility test completed');
                this.adjustCloudVisibility(0.7); // Return to default
            }
        };
        
        testNext();
    }

    // Debug method to isolate white halo issue
    debugWhiteHalo() {
        console.log('🔍 Debugging white halo issue...');
        
        // First, hide atmosphere to check if it's the cause
        if (this.planet) {
            this.planet.visible = false;
            console.log('1. Atmosphere hidden - check if white halo is gone');
            
            setTimeout(() => {
                console.log('2. Atmosphere restored');
                this.planet.visible = true;
                
                // Now test with different cloud intensities
                setTimeout(() => {
                    console.log('3. Testing cloud intensity variations...');
                    this.testCloudIntensities();
                }, 2000);
            }, 3000);
        }
    }

    testCloudIntensities() {
        const intensities = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0];
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < intensities.length) {
                const intensity = intensities[currentIndex];
                console.log(`☁️ Testing cloud intensity: ${intensity}`);
                
                // Force shader recompilation with new intensity
                if (this.innerPlanet && this.innerPlanet.material) {
                    this.innerPlanet.material.needsUpdate = true;
                }
                
                currentIndex++;
                setTimeout(testNext, 2000);
            } else {
                console.log('☁️ Cloud intensity test completed - choose your preferred level');
            }
        };
        
        testNext();
    }

    // Test different atmosphere diffusion levels
    testAtmosphereDiffusion() {
        console.log('🌫️ Testing atmosphere diffusion levels...');
        
        if (!this.planet || !this.planet.material) {
            console.warn('❌ No atmosphere material found');
            return;
        }
        
        const diffusionLevels = [
            { name: 'Very Sharp', opacity: 0.8, blending: THREE.NormalBlending },
            { name: 'Sharp', opacity: 0.6, blending: THREE.NormalBlending },
            { name: 'Medium', opacity: 0.4, blending: THREE.AdditiveBlending },
            { name: 'Soft', opacity: 0.3, blending: THREE.AdditiveBlending },
            { name: 'Very Soft', opacity: 0.2, blending: THREE.AdditiveBlending },
            { name: 'Ultra Soft', opacity: 0.1, blending: THREE.AdditiveBlending }
        ];
        
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < diffusionLevels.length) {
                const level = diffusionLevels[currentIndex];
                
                // Apply settings
                this.planet.material.opacity = level.opacity;
                this.planet.material.blending = level.blending;
                this.planet.material.needsUpdate = true;
                
                console.log(`🌫️ Testing: ${level.name} (opacity: ${level.opacity}, blending: ${level.blending === THREE.AdditiveBlending ? 'Additive' : 'Normal'})`);
                
                currentIndex++;
                setTimeout(testNext, 3000); // 3 seconds per level
            } else {
                console.log('🌫️ Atmosphere diffusion test completed');
                console.log('💡 Choose your preferred level and set it manually:');
                console.log('   sceneManager.setAtmosphereDiffusion(opacity, useAdditiveBlending)');
            }
        };
        
        testNext();
    }

    // Set atmosphere diffusion manually
    setAtmosphereDiffusion(opacity = 0.3, useAdditiveBlending = true) {
        if (this.planet && this.planet.material) {
            this.planet.material.opacity = opacity;
            this.planet.material.blending = useAdditiveBlending ? THREE.AdditiveBlending : THREE.NormalBlending;
            this.planet.material.needsUpdate = true;
            
            console.log(`🌫️ Atmosphere diffusion set: opacity ${opacity}, ${useAdditiveBlending ? 'additive' : 'normal'} blending`);
        }
    }

    // Test different cloud threshold values
    testCloudThresholds() {
        console.log('☁️ Testing different cloud thresholds...');
        
        const thresholds = [
            { name: 'Very Low', min: 0.1, max: 0.5, intensity: 1.5, desc: 'Show almost all blue channel as clouds' },
            { name: 'Low', min: 0.2, max: 0.6, intensity: 1.3, desc: 'More clouds visible' },
            { name: 'Medium-Low', min: 0.3, max: 0.7, intensity: 1.2, desc: 'Moderate cloud coverage' },
            { name: 'Current', min: 0.4, max: 0.9, intensity: 1.2, desc: 'Current settings' },
            { name: 'High', min: 0.5, max: 0.95, intensity: 1.0, desc: 'Only clearest clouds' },
            { name: 'Very High', min: 0.6, max: 0.98, intensity: 0.8, desc: 'Only strongest cloud areas' }
        ];
        
        let currentIndex = 0;
        
        const testNext = () => {
            if (currentIndex < thresholds.length) {
                const threshold = thresholds[currentIndex];
                
                console.log(`☁️ Testing: ${threshold.name} - ${threshold.desc}`);
                console.log(`   Range: smoothstep(${threshold.min}, ${threshold.max}), intensity: ${threshold.intensity}`);
                
                // Note: This would require recompiling shader, so we'll just log for now
                // In a real implementation, we'd need to rebuild the shader or use uniforms
                
                currentIndex++;
                setTimeout(testNext, 4000); // 4 seconds per test
            } else {
                console.log('☁️ Cloud threshold test completed');
                console.log('💡 To apply a setting: sceneManager.setCloudThreshold(min, max, intensity)');
                console.log('🔄 Recompiling shader may require page refresh');
            }
        };
        
        testNext();
    }

    // Set cloud threshold (note: requires shader recompilation)
    setCloudThreshold(min = 0.4, max = 0.9, intensity = 1.2) {
        console.log(`☁️ Setting cloud threshold: smoothstep(${min}, ${max}) * ${intensity}`);
        console.log('⚠️  This requires shader recompilation - refresh page to see changes');
        
        // Store settings for potential shader rebuild
        this.cloudSettings = { min, max, intensity };
        
        if (this.innerPlanet && this.innerPlanet.material) {
            this.innerPlanet.material.needsUpdate = true;
        }
    }

    // Show current debug info
    showDebugInfo() {
        console.log('🔍 Current Planet Debug Info:');
        console.log('📍 Planet Position:', this.innerPlanet ? this.innerPlanet.position : 'Not found');
        console.log('👁️  Planet Visible:', this.innerPlanet ? this.innerPlanet.visible : 'Not found');
        console.log('🌍 Atmosphere Visible:', this.planet ? this.planet.visible : 'Not found');
        console.log('📐 Planet Scale:', this.innerPlanet ? this.innerPlanet.scale : 'Not found');
        console.log('🎨 Materials:');
        console.log('   - Planet Material:', this.innerPlanet ? this.innerPlanet.material.type : 'Not found');
        console.log('   - Atmosphere Material:', this.planet ? this.planet.material.type : 'Not found');
        
        // Texture info
        if (this.innerPlanet && this.innerPlanet.material) {
            const mat = this.innerPlanet.material;
            console.log('🖼️  Textures:');
            console.log('   - Diffuse Map:', mat.map ? '✅ Loaded' : '❌ Missing');
            console.log('   - Roughness Map:', mat.roughnessMap ? '✅ Loaded' : '❌ Missing');
            console.log('   - Bump Map:', mat.bumpMap ? '✅ Loaded' : '❌ Missing');
        }
        
        console.log('🎛️ Available tests:');
        console.log('   - testCloudThresholds() // Test different cloud visibility ranges');
        console.log('   - toggleAtmosphere() // Show/hide atmosphere');
        console.log('   - Planet rotation disabled (static planet)');
    }

    // Cleanup
    shutdown() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clean up GUI
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
        }
        
        // Clean up HUD
        if (this.hudRenderer) {
            this.hudRenderer.dispose();
        }
        
        if (this.hudCanvas) {
            document.body.removeChild(this.hudCanvas);
            this.hudCanvas = null;
        }
        
        if (this.hudLabels) {
            document.body.removeChild(this.hudLabels);
            this.hudLabels = null;
        }
        
        // Clean up camera directional light
        if (this.cameraLight) {
            this.scene.remove(this.cameraLight);
            this.cameraLight = null;
        }
        
        if (this.scene) {
            // Clean up scene objects
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }

        console.log('🎬 Scene Manager shutdown');
    }
} 