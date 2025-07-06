// utils/PlanetMaterial.js - Planet material utilities
import * as THREE from 'three';

export function createPlanetMaterial() {
    // Create a more interesting planet material
    const material = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color(0.7, 0.5, 0.3), // Warm brownish planet color
        transparent: false,
        flatShading: false
    });
    
    return material;
}

export function createProceduralPlanetTexture() {
    // Create a procedural texture for the planet
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Create a gradient background
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#8B4513'); // Brown
    gradient.addColorStop(0.5, '#A0522D'); // Darker brown
    gradient.addColorStop(1, '#654321'); // Dark brown
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some noise and variation
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 40;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Create Three.js texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    return texture;
}

export function createPlanetMaterialWithTexture() {
    const texture = createProceduralPlanetTexture();
    
    const material = new THREE.MeshLambertMaterial({ 
        map: texture,
        transparent: false
    });
    
    return material;
} 