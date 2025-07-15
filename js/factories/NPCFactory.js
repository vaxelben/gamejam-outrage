// factories/NPCFactory.js - NPC Factory following Open/Closed Principle
import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Renderer } from '../components/Renderer.js';
import { params } from '../params.js';

// Base NPC types registry
const npcTypes = new Map();
const textureLoader = new THREE.TextureLoader();

// Register NPC type
export function registerNPCType(typeName, createFunction) {
    npcTypes.set(typeName, createFunction);
}

// Factory function
export function createNPC(type, config) {
    const creator = npcTypes.get(type);
    if (!creator) {
        throw new Error(`Unknown NPC type: ${type}`);
    }
    return creator(config);
}

// Texture helper - maps mask types to corresponding group textures
function getTextureForMask(maskId) {
    const textures = {
        1: 'textures/sprites/group_conservative.png',    // Conservatives
        2: 'textures/sprites/group_sjw.png',            // Social Justice
        3: 'textures/sprites/group_libertarian.png',    // Libertarians
        4: 'textures/sprites/group_nationalist.png',    // Nationalists
        5: 'textures/sprites/group_culture.png',        // Culture
        6: 'textures/sprites/group_religious.png',      // Religious
        7: 'textures/sprites/group_antisystem.png'      // Antisystem
    };
    return textures[maskId] || 'textures/sprites/group_neutre.png'; // Fallback to neutral
}

// Generic NPC creator function compatible with NPCSystem
function createBasicNPC(config) {
    const {
        maskType = 1,
        planetRadius = 10,
        scene = null,
        color = new THREE.Color(0.5, 0.5, 0.5),
        groupSpawnCenter = null,
        groupSpawnRadius = 3
    } = config;

    let position;
    
    if (groupSpawnCenter) {
        // Generate position around group spawn center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * groupSpawnRadius;
        
        // Create random offset from group center
        const offsetX = Math.cos(angle) * distance;
        const offsetZ = Math.sin(angle) * distance;
        
        // Apply offset to group center (keeping on planet surface)
        const centerNormalized = groupSpawnCenter.clone().normalize();
        const right = new THREE.Vector3(0, 1, 0).cross(centerNormalized).normalize();
        const up = centerNormalized.clone().cross(right).normalize();
        
        position = groupSpawnCenter.clone()
            .add(right.multiplyScalar(offsetX))
            .add(up.multiplyScalar(offsetZ));
            
        // Ensure position is on planet surface
        position.normalize().multiplyScalar(planetRadius + (params.NPC_SIZE || 0.5) / 2);
    } else {
        // Fallback to random position on planet surface
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = planetRadius + (params.NPC_SIZE || 0.5) / 2;
        
        position = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    const npc = {
        // Identity
        id: `npc_${maskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        maskType: maskType,
        
        // Components
        transform: new Transform(),
        renderer: null,
        
        // Physics
        velocity: new THREE.Vector3(),
        targetPosition: null,
        
        // Behavior state
        state: 'IDLE',
        stateTimer: 0,
        minStateDuration: (params.NPC_MIN_STATE_DURATION || 2) + Math.random() * 2,
        
        // Personality
        personality: {
            curiosity: Math.random(),
            energy: 0.5 + Math.random() * 0.5,
            aggressiveness: Math.random(),
            sociability: Math.random()
        },
        
        // Group behavior
        groupInfluence: 0.5 + Math.random() * 0.5,
        lastGroupCheck: 0
    };

    // Set initial position
    npc.transform.setPosition(position.x, position.y, position.z);

    // Create renderer immediately
    if (scene) {
        const texture = textureLoader.load(getTextureForMask(maskType));
        
        // Create initial square geometry (will be updated when texture loads)
        const geometry = new THREE.PlaneGeometry((params.NPC_SIZE || 0.5), (params.NPC_SIZE || 0.5));
        
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        
        npc.renderer = new Renderer(geometry, material);
        npc.renderer.createMesh(scene);
        
        // Update geometry when texture loads to preserve aspect ratio
        texture.onLoad = () => {
            updateNPCGeometry(npc);
        };
        
        // Position the mesh
        npc.renderer.updateTransform(npc.transform);
        
        // Add shadow casting
        if (npc.renderer.mesh) {
            npc.renderer.mesh.castShadow = true;
            npc.renderer.mesh.receiveShadow = true;
        }
    }

    return npc;
}

// Advanced NPC creator with more complex behavior
function createAdvancedNPC(config) {
    const npc = createBasicNPC(config);
    
    // Add advanced behavior properties
    npc.decisionTree = {
        currentGoal: 'wander',
        goalPriority: 1.0,
        memory: [],
        relationships: new Map()
    };
    
    npc.communication = {
        canSpeak: true,
        lastSpeech: 0,
        speechRadius: params.NPC_INTERACTION_RADIUS || 2
    };
    
    return npc;
}

// Specialized NPC types
function createLeaderNPC(config) {
    const npc = createAdvancedNPC(config);
    
    // Leader properties
    npc.isLeader = true;
    npc.leadership = {
        influence: 0.8 + Math.random() * 0.2,
        followers: [],
        maxFollowers: 3 + Math.floor(Math.random() * 3)
    };
    
    // Leaders are slightly larger
    if (npc.renderer && npc.renderer.mesh) {
        npc.renderer.mesh.scale.setScalar(1.2);
    }
    
    return npc;
}

function createFollowerNPC(config) {
    const npc = createBasicNPC(config);
    
    // Follower properties
    npc.isFollower = true;
    npc.following = {
        leader: null,
        loyalty: 0.6 + Math.random() * 0.4,
        followDistance: 1 + Math.random() * 2
    };
    
    return npc;
}

// Helper function to update NPC geometry to preserve texture aspect ratio
function updateNPCGeometry(npc) {
    if (!npc.renderer || !npc.renderer.mesh) return;
    
    const texture = npc.renderer.mesh.material.map;
    if (!texture || !texture.image) return;
    
    // Get texture dimensions
    const textureWidth = texture.image.width;
    const textureHeight = texture.image.height;
    
    if (textureWidth === 0 || textureHeight === 0) return;
    
    // Calculate aspect ratio
    const aspectRatio = textureWidth / textureHeight;
    
    // Calculate new dimensions while maintaining the base size
    const baseSize = params.NPC_SIZE || 0.5;
    let width, height;
    if (aspectRatio > 1) {
        // Wider than tall
        width = baseSize;
        height = baseSize / aspectRatio;
    } else {
        // Taller than wide or square
        width = baseSize * aspectRatio;
        height = baseSize;
    }
    
    // Create new geometry with correct aspect ratio
    const newGeometry = new THREE.PlaneGeometry(width, height);
    
    // Update the mesh geometry
    npc.renderer.mesh.geometry.dispose(); // Clean up old geometry
    npc.renderer.mesh.geometry = newGeometry;
    
    console.log(`📐 NPC geometry updated to preserve texture ratio (${textureWidth}x${textureHeight}, aspect: ${aspectRatio.toFixed(2)})`);
}

// Color helper
function getColorForMask(maskId) {
    const colors = {
        1: new THREE.Color(0.2, 0.4, 0.8),    // Blue - Conservatives
        2: new THREE.Color(0.8, 0.2, 0.2),    // Red - Social Justice
        3: new THREE.Color(1.0, 0.6, 0.2),    // Orange - Libertarians
        4: new THREE.Color(0.2, 0.6, 0.2),    // Green - Nationalists
        5: new THREE.Color(0.6, 0.2, 0.8),    // Purple - Culture
        6: new THREE.Color(0.6, 0.3, 0.1),    // Brown - Religious
        7: new THREE.Color(1.0, 0.4, 0.8)     // Pink - Antisystem
    };
    return colors[maskId] || new THREE.Color(0.5, 0.5, 0.5);
}

// NPCFactory class for object-oriented usage
export class NPCFactory {
    constructor() {
        this.createdNPCs = 0;
        this.npcRegistry = new Map();
    }
    
    createNPC(type, config) {
        // Ensure color is set from mask type
        if (config.maskType && !config.color) {
            config.color = getColorForMask(config.maskType);
        }
        
        const npc = createNPC(type, config);
        
        // Register the NPC
        this.npcRegistry.set(npc.id, npc);
        this.createdNPCs++;
        
        console.log(`🏭 NPCFactory created ${type} NPC #${this.createdNPCs} (mask: ${config.maskType})`);
        
        return npc;
    }
    
    registerNPCType(typeName, createFunction) {
        return registerNPCType(typeName, createFunction);
    }
    
    getNPCById(id) {
        return this.npcRegistry.get(id);
    }
    
    getAllNPCs() {
        return Array.from(this.npcRegistry.values());
    }
    
    removeNPC(id) {
        const npc = this.npcRegistry.get(id);
        if (npc) {
            if (npc.renderer) {
                npc.renderer.dispose();
            }
            this.npcRegistry.delete(id);
            return true;
        }
        return false;
    }
    
    getStats() {
        return {
            totalCreated: this.createdNPCs,
            currentCount: this.npcRegistry.size,
            types: Array.from(npcTypes.keys())
        };
    }
}

// Register default NPC types
registerNPCType('basic', createBasicNPC);
registerNPCType('generic', createBasicNPC);
registerNPCType('civilian', createBasicNPC);
registerNPCType('advanced', createAdvancedNPC);
registerNPCType('leader', createLeaderNPC);
registerNPCType('follower', createFollowerNPC);

// Export for easy extension
export { createBasicNPC, createAdvancedNPC, getColorForMask, getTextureForMask }; 