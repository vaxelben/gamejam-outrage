// components/Renderer.js - Renderer component following SRP
export class Renderer {
    constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.mesh = null;
        this.visible = true;
        this.castShadow = true;
        this.receiveShadow = true;
    }

    // Mesh management
    createMesh(scene) {
        if (this.mesh) {
            this.destroyMesh();
        }

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.castShadow = this.castShadow;
        this.mesh.receiveShadow = this.receiveShadow;
        this.mesh.visible = this.visible;

        if (scene) {
            scene.add(this.mesh);
        }

        return this.mesh;
    }

    destroyMesh() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
            this.mesh = null;
        }
    }

    // Transform synchronization
    updateTransform(transform) {
        if (this.mesh) {
            this.mesh.position.copy(transform.position);
            this.mesh.quaternion.copy(transform.rotation);
            this.mesh.scale.copy(transform.scale);
        }
    }

    // Visibility control
    show() {
        this.visible = true;
        if (this.mesh) {
            this.mesh.visible = true;
        }
    }

    hide() {
        this.visible = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    // Material management
    setMaterial(material) {
        this.material = material;
        if (this.mesh) {
            this.mesh.material = material;
        }
    }

    // Color shortcuts
    setColor(color) {
        if (this.material && this.material.color) {
            this.material.color.copy(color);
        }
    }

    setEmissive(color, intensity = 0.2) {
        if (this.material && this.material.emissive) {
            this.material.emissive.copy(color);
            this.material.emissive.multiplyScalar(intensity);
        }
    }

    // Cleanup
    dispose() {
        this.destroyMesh();
        
        if (this.geometry) {
            this.geometry.dispose();
        }
        
        if (this.material) {
            this.material.dispose();
        }
    }
} 