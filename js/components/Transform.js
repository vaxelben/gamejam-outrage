// components/Transform.js - Transform component following SRP
export class Transform {
    constructor(position = new THREE.Vector3(), rotation = new THREE.Quaternion()) {
        this.position = position.clone();
        this.rotation = rotation.clone();
        this.scale = new THREE.Vector3(1, 1, 1);
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
    }

    // Position methods
    setPosition(x, y, z) {
        this.position.set(x, y, z);
    }

    translate(offset) {
        this.position.add(offset);
    }

    // Rotation methods
    setRotation(quaternion) {
        this.rotation.copy(quaternion);
    }

    rotateY(angle) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.rotation.multiplyQuaternions(rotation, this.rotation);
    }

    // Physics methods
    applyForce(force) {
        this.acceleration.add(force);
    }

    updatePhysics(deltaTime) {
        // Apply acceleration to velocity
        this.velocity.addScaledVector(this.acceleration, deltaTime);
        
        // Apply velocity to position
        this.position.addScaledVector(this.velocity, deltaTime);
        
        // Reset acceleration for next frame
        this.acceleration.set(0, 0, 0);
    }

    // Utility methods
    getWorldMatrix() {
        const matrix = new THREE.Matrix4();
        matrix.compose(this.position, this.rotation, this.scale);
        return matrix;
    }

    distanceTo(otherTransform) {
        return this.position.distanceTo(otherTransform.position);
    }

    lookAt(target) {
        const direction = target.clone().sub(this.position).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const matrix = new THREE.Matrix4().lookAt(this.position, target, up);
        this.rotation.setFromRotationMatrix(matrix);
    }
} 