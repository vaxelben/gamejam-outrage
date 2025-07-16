// core/SceneManager.js - Scene and rendering management following SRP
import { params } from '../params.js';
import { serviceContainer } from './ServiceContainer.js';

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
        // Get canvas and create renderer
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

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, params.CAMERA_DISTANCE, 0);
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

        console.log('🎬 Scene Manager initialized');
        console.log('🎨 Background color initialized for neutral mask:', params.MASK_BACKGROUND_COLORS[null].toString(16));
    }

    createLights() {
        // Ambient light - reduced intensity to let other lights show more effect
        const ambientLight = new THREE.AmbientLight(0xfeefff, 0.8);
        this.scene.add(ambientLight);

        // Directional light with shadows - reduced intensity
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(0, 20, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);

        // Camera-following directional light (always follows camera direction)
        this.cameraLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.cameraLight.position.set(0, 0, 0); // Will be updated in updateCamera
        this.cameraLight.castShadow = false; // Disable shadows for performance
        this.scene.add(this.cameraLight);
        
        console.log('💡 Camera-following directional light created');
    }

    createPlanet() {
        const atmosphereRadius = params.PLANET_DIAMETER / 2 * params.PLANET_OUTER_SPHERE_SCALE;
        const planetRadius = params.PLANET_DIAMETER / 2 * params.PLANET_INNER_SPHERE_SCALE;
        
        // Material parameters from the Three.js example
        const roughnessLow = 0.25;
        const roughnessHigh = 0.35;
        
        // Load planet textures
        const textureLoader = new THREE.TextureLoader();
        
        // Load Earth textures with proper configuration (same as example)
        const earthDayTexture = textureLoader.load('textures/planet_color.jpg');
        earthDayTexture.colorSpace = THREE.SRGBColorSpace;
        earthDayTexture.anisotropy = 8;
        // No repeat wrapping - use default ClampToEdgeWrapping like example
        // earthDayTexture.wrapS = THREE.ClampToEdgeWrapping;
        // earthDayTexture.wrapT = THREE.ClampToEdgeWrapping;
        // No repeat scaling - use natural UV mapping like example
        
        const earthBumpRoughnessCloudsTexture = textureLoader.load('textures/earth_bump_roughness_clouds_4096.jpg');
        earthBumpRoughnessCloudsTexture.anisotropy = 8;
        // No repeat wrapping - use default ClampToEdgeWrapping like example
        // earthBumpRoughnessCloudsTexture.wrapS = THREE.ClampToEdgeWrapping;
        // earthBumpRoughnessCloudsTexture.wrapT = THREE.ClampToEdgeWrapping;
        // No repeat scaling - use natural UV mapping like example
        
        // Create outer planet (clouds atmosphere layer)
        const outerGeometry = new THREE.SphereGeometry(atmosphereRadius, 64, 64);
        
        // Advanced outer material matching the example's atmosphere approach
        const outerMaterial = new THREE.MeshStandardMaterial({
            map: earthBumpRoughnessCloudsTexture,
            transparent: true,
            opacity: params.PLANET_OUTER_OPACITY,
            side: THREE.BackSide, // Same as example's atmosphere
            depthWrite: false, // Same as example for transparency
            
            // Use the texture channels for advanced effects
            // Red channel: bump/elevation
            // Green channel: roughness
            // Blue channel: clouds
            roughnessMap: earthBumpRoughnessCloudsTexture,
            roughness: roughnessHigh, // Use high roughness for clouds
            metalness: 0.0, // No metalness for clouds/atmosphere
            
            // Enhanced cloud rendering
            alphaMap: earthBumpRoughnessCloudsTexture, // Use blue channel for cloud alpha
            alphaTest: 0.01, // Lower alpha test like example
            
            // Lighting properties
            envMapIntensity: 0.5 // Reduced for atmosphere
        });
        
        // Custom shader chunks for advanced cloud effects (matching example logic)
        outerMaterial.onBeforeCompile = (shader) => {
            // Add cloud processing to fragment shader
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #include <map_fragment>
                
                // Extract cloud strength from blue channel (same as example)
                float cloudStrength = texture2D(map, vMapUv).b;
                cloudStrength = smoothstep(0.2, 1.0, cloudStrength);
                
                // Enhance cloud appearance (same logic as example)
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), cloudStrength * 2.0);
                
                // Apply cloud transparency
                float alpha = cloudStrength;
                diffuseColor.a = alpha;
                `
            );
        };
        
        this.planet = new THREE.Mesh(outerGeometry, outerMaterial);
        this.planet.receiveShadow = true;
        this.planet.castShadow = false; // Atmosphere doesn't cast shadows
        this.planet.renderOrder = 2; // Render after surface
        this.scene.add(this.planet);
        
        // Create inner sphere (solid Earth surface - main globe)
        const innerGeometry = new THREE.SphereGeometry(planetRadius, 64, 64);
        
        // Globe material matching the example's settings
        const innerMaterial = new THREE.MeshStandardMaterial({
            map: earthDayTexture,
            transparent: true,
            opacity: 0.7,
            side: THREE.FrontSide,
            
            // Surface properties matching example
            roughnessMap: earthBumpRoughnessCloudsTexture,
            roughness: roughnessLow, // Base roughness
            metalness: 0.0, // No metalness like example
            
            // Enhanced surface details
            bumpMap: earthBumpRoughnessCloudsTexture,
            bumpScale: 0.02, // Same as example
            
            // Lighting response
            envMapIntensity: 1.0
        });
        
        // Custom shader for enhanced Earth surface (matching example logic)
        innerMaterial.onBeforeCompile = (shader) => {
            // Add uniforms for roughness range
            shader.uniforms.roughnessLow = { value: roughnessLow };
            shader.uniforms.roughnessHigh = { value: roughnessHigh };
            
            // Add uniform declarations to fragment shader
            shader.fragmentShader = shader.fragmentShader.replace(
                'uniform float roughness;',
                `uniform float roughness;
                uniform float roughnessLow;
                uniform float roughnessHigh;`
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #include <map_fragment>
                
                // Get cloud strength from blue channel for surface color mixing
                float surfaceCloudsStrength = texture2D(roughnessMap, vMapUv).b;
                surfaceCloudsStrength = smoothstep(0.2, 1.0, surfaceCloudsStrength);
                
                // Mix day texture with clouds (same as example)
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), surfaceCloudsStrength * 2.0);
                `
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <roughnessmap_fragment>',
                `
                #include <roughnessmap_fragment>
                
                // Advanced roughness calculation (same as example)
                float roughnessFromMap = texture2D(roughnessMap, vMapUv).g;
                float roughnessCloudsStrength = texture2D(roughnessMap, vMapUv).b;
                roughnessCloudsStrength = smoothstep(0.2, 1.0, roughnessCloudsStrength);
                
                // Use max of roughness and cloud step (same as example)
                float finalRoughness = max(roughnessFromMap, step(0.01, roughnessCloudsStrength));
                
                // Remap between low and high roughness (same as example)
                roughnessFactor = mix(roughnessLow, roughnessHigh, finalRoughness);
                `
            );
        };
        
        this.innerPlanet = new THREE.Mesh(innerGeometry, innerMaterial);
        this.innerPlanet.receiveShadow = true;
        this.innerPlanet.castShadow = true;
        this.innerPlanet.renderOrder = 1; // Render before atmosphere
        this.scene.add(this.innerPlanet);
        
        this.planetRadius = atmosphereRadius;
        
        console.log('🌍 Earth planet created (Three.js example-based):', {
            atmosphereRadius: atmosphereRadius,
            planetRadius: planetRadius,
            atmosphereOpacity: params.PLANET_OUTER_OPACITY,
            textureMapping: 'Natural UV mapping (no repeat) - prevents polar distortion',
            atmosphereTexture: 'earth_bump_roughness_clouds_4096.jpg (BackSide)',
            surfaceTexture: 'planet_color.jpg (FrontSide)',
            materialParameters: {
                roughnessLow: roughnessLow,
                roughnessHigh: roughnessHigh,
                atmosphereRoughness: roughnessHigh,
                surfaceBaseRoughness: roughnessLow,
                metalness: 0.0
            },
            features: {
                atmosphereLayer: 'Blue channel cloud processing with BackSide rendering',
                surfaceDetails: 'Dynamic roughness mapping with texture channels',
                cloudBlending: 'Surface-cloud color mixing at 2.0x multiplier',
                textureChannels: 'R=Bump, G=Roughness, B=Clouds',
                uvMapping: 'Standard spherical UV mapping without repetition'
            },
            shaderEnhancements: {
                atmosphere: 'Cloud transparency with smoothstep(0.2, 1.0)',
                surface: 'Roughness remapping between low/high values',
                rendering: 'Surface first (order 1), atmosphere second (order 2)'
            },
            exampleCompliance: 'Full compatibility with Three.js WebGPU Earth example'
        });
        
        // Debug: Check visibility and provide tips
        if (params.PLANET_OUTER_OPACITY >= 1.0 && planetRadius < atmosphereRadius * 0.8) {
            console.warn('⚠️  Surface may not be visible: atmosphere is opaque and surface is small');
            console.log('💡 Three.js example-based suggestions:');
            console.log('   - Reduce PLANET_OUTER_OPACITY to 0.7 for better atmosphere transparency');
            console.log('   - Increase PLANET_INNER_SPHERE_SCALE to 0.95 for better surface visibility');
            console.log('   - Use toggleCloudVisibility() method to debug atmosphere layer');
            console.log('   - Use toggleAtmosphereSide() to test BackSide vs FrontSide rendering');
        }
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

    // Get planet radius
    getPlanetRadius() {
        return this.planetRadius;
    }

    // Get inner planet radius
    getAtmosphereRadius() {
        return this.planetRadius * params.PLANET_OUTER_SPHERE_SCALE;
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
                texture: 'earth_bump_roughness_clouds_4096.jpg',
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
                roughnessTexture: 'earth_bump_roughness_clouds_4096.jpg',
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
            atmosphereTexture: 'earth_bump_roughness_clouds_4096.jpg',
            surfaceTexture: 'planet_color.jpg',
            uvMapping: 'Standard spherical UV without distortion'
        };
    }

    // Cleanup
    shutdown() {
        if (this.renderer) {
            this.renderer.dispose();
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