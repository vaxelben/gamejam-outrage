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
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xfeefff, 0.9);
        this.scene.add(ambientLight);

        // Directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 5);
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
    }

    createPlanet() {
        const outerRadius = params.PLANET_DIAMETER / 2;
        const innerRadius = outerRadius * params.PLANET_INNER_SPHERE_SCALE;
        
        // Load planet textures
        const textureLoader = new THREE.TextureLoader();
        
        // Create outer planet (existing planet)
        const outerGeometry = new THREE.SphereGeometry(outerRadius, 64, 64);
        const outerTexture = textureLoader.load('textures/bordel_ext.png');
        
        // Configure outer texture
        outerTexture.wrapS = THREE.RepeatWrapping;
        outerTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        const outerMaterial = new THREE.MeshStandardMaterial({ 
            map: outerTexture,
            transparent: params.PLANET_OUTER_OPACITY < 1.0,
            opacity: params.PLANET_OUTER_OPACITY,
            roughness: 0.3,
            metalness: 0.1,
            side: THREE.DoubleSide,
            // Force rendering order to ensure inner sphere is visible
            depthWrite: params.PLANET_OUTER_OPACITY < 1.0 ? false : true
        });
        
        this.planet = new THREE.Mesh(outerGeometry, outerMaterial);
        this.planet.receiveShadow = true;
        this.planet.castShadow = true;
        // Set render order for outer sphere
        this.planet.renderOrder = 1;
        this.scene.add(this.planet);
        
        // Create inner sphere
        const innerGeometry = new THREE.SphereGeometry(innerRadius, 64, 64);
        const innerTexture = textureLoader.load('textures/bordel_int.png');
        
        // Configure inner texture
        innerTexture.wrapS = THREE.RepeatWrapping;
        innerTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        const innerMaterial = new THREE.MeshStandardMaterial({ 
            map: innerTexture,
            transparent: true,
            opacity: params.PLANET_INNER_OPACITY,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
            // Ensure inner sphere renders after outer sphere
            depthTest: true,
            depthWrite: true
        });
        
        this.innerPlanet = new THREE.Mesh(innerGeometry, innerMaterial);
        this.innerPlanet.receiveShadow = true;
        this.innerPlanet.castShadow = false; // Inner sphere doesn't cast shadows
        // Set render order for inner sphere (higher = rendered later)
        this.innerPlanet.renderOrder = 2;
        this.scene.add(this.innerPlanet);
        
        this.planetRadius = outerRadius;
        
        console.log('🌍 Planet created successfully:', {
            outerRadius: outerRadius,
            innerRadius: innerRadius,
            outerOpacity: params.PLANET_OUTER_OPACITY,
            innerOpacity: params.PLANET_INNER_OPACITY,
            outerTexture: 'textures/bordel_ext.png',
            innerTexture: 'textures/bordel_int.png',
            inScene: this.scene.children.includes(this.planet) && this.scene.children.includes(this.innerPlanet),
            innerVisible: this.innerPlanet.visible,
            outerVisible: this.planet.visible
        });
        
        // Debug: Check if inner sphere is visible
        if (params.PLANET_OUTER_OPACITY >= 1.0 && innerRadius < outerRadius * 0.8) {
            console.warn('⚠️  Inner sphere may not be visible: outer sphere is opaque and inner sphere is small');
            console.log('💡 Suggestions:');
            console.log('   - Reduce PLANET_OUTER_OPACITY to < 1.0 to make outer sphere transparent');
            console.log('   - Increase PLANET_INNER_SPHERE_SCALE to make inner sphere bigger');
            console.log('   - Use toggleInnerSphereVisibility() method to debug');
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
            
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(playerPosition);
            
            // Robust camera orientation using quaternion-based approach
            // This avoids singularities and discontinuities
            this.updateCameraOrientation(playerPosition);
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
    getInnerPlanetRadius() {
        return this.planetRadius * params.PLANET_INNER_SPHERE_SCALE;
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
            outerRadius: this.planetRadius,
            innerRadius: this.getInnerPlanetRadius(),
            outerOpacity: this.planet?.material?.opacity || 'N/A',
            innerOpacity: this.innerPlanet?.material?.opacity || 'N/A',
            outerVisible: this.planet?.visible || false,
            innerVisible: this.innerPlanet?.visible || false,
            outerRenderOrder: this.planet?.renderOrder || 'N/A',
            innerRenderOrder: this.innerPlanet?.renderOrder || 'N/A'
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
        
        if (this.scene) {
            // Clean up scene objects
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }

        console.log('🎬 Scene Manager shutdown');
    }
} 