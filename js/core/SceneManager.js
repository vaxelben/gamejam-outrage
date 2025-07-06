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
        this.planetRadius = 0;
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
        this.scene.background = new THREE.Color(0x000000);

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

        // Setup window resize handling
        this.setupResizeHandler();

        console.log('🎬 Scene Manager initialized');
    }

    createLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 5);
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
        const geometry = new THREE.SphereGeometry(params.PLANET_DIAMETER / 2, 64, 64);
        
        // Load planet textures
        const textureLoader = new THREE.TextureLoader();
        const planetTexture = textureLoader.load('textures/planet_color.jpg');
        const planetNormalMap = textureLoader.load('textures/planet_normal.jpg');
        
        const material = new THREE.MeshPhongMaterial({ 
            map: planetTexture, // Color texture
            // normalMap: planetNormalMap, // Normal map for surface details
            normalScale: new THREE.Vector2(0.1, 0.1), // Adjust intensity if needed
            transparent: false,
            shininess: 30, // Low shininess for a more natural planet look
            // metalness: 1.0,
            // roughness: 0.5
        });
        
        this.planet = new THREE.Mesh(geometry, material);
        this.planet.receiveShadow = true;
        this.planet.castShadow = true;
        this.scene.add(this.planet);
        
        this.planetRadius = params.PLANET_DIAMETER / 2;
        
        console.log('🌍 Planet created successfully:', {
            radius: this.planetRadius,
            position: this.planet.position,
            visible: this.planet.visible,
            colorTexture: 'textures/planet_color.jpg',
            normalMap: 'textures/planet_normal.jpg',
            inScene: this.scene.children.includes(this.planet)
        });
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

    // Render the scene
    render() {
        this.renderer.render(this.scene, this.camera);
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

    // Get planet radius
    getPlanetRadius() {
        return this.planetRadius;
    }

    // Cleanup
    shutdown() {
        if (this.renderer) {
            this.renderer.dispose();
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