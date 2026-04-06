/**
 * player.js — First-person player controller with WASD movement,
 * jumping, gravity, sprint, and collision detection.
 */
import * as THREE from 'three';
import { BlockType, isSolid } from './blocks.js';
import { getBlockAtWorld } from './world.js';
import { getHeight } from './terrain.js';
import { playSplashSound, startBubbleSound, stopBubbleSound } from './audio.js';

const MOVE_SPEED = 5;
const SPRINT_SPEED = 9;
const JUMP_FORCE = 7.5;
const GRAVITY = 22;
const WATER_GRAVITY = 3; // Slower sink in water
const SWIM_FORCE = 5; // Upward force when holding jump in water
const MAX_SWIM_SPEED = 4;
const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.3;

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 50, 0);
    this.grounded = false;
    this.sprinting = false;
    this.inWater = false;

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
    };

    // Euler for camera rotation
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.mouseSensitivity = 0.002;

    this._setupControls();
  }

  _setupControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = true; break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    // Mouse look (pointer lock)
    document.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== document.body) return;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= e.movementX * this.mouseSensitivity;
      this.euler.x -= e.movementY * this.mouseSensitivity;
      this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  /**
   * Spawn player at position, finding ground level.
   */
  spawn(x, z) {
    const h = getHeight(Math.floor(x), Math.floor(z));
    this.position.set(x, h + PLAYER_HEIGHT + 5, z);
    this.camera.position.copy(this.position);

    // Set initial camera looking slightly downward for a scenic vista
    this.euler.y = Math.PI * 0.75; // Angled view
    this.euler.x = -0.15; // Slight downward tilt
    this.camera.quaternion.setFromEuler(this.euler);
  }

  /**
   * Check if a given position collides with the world blocks.
   */
  _collides(pos) {
    // Player AABB
    const minX = Math.floor(pos.x - PLAYER_RADIUS);
    const maxX = Math.floor(pos.x + PLAYER_RADIUS);
    const minY = Math.floor(pos.y - PLAYER_HEIGHT + 0.01);
    const maxY = Math.floor(pos.y + 0.1);
    const minZ = Math.floor(pos.z - PLAYER_RADIUS);
    const maxZ = Math.floor(pos.z + PLAYER_RADIUS);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const type = getBlockAtWorld(x, y, z);
          if (isSolid(type)) return true;
        }
      }
    }
    return false;
  }

  /**
   * Update player physics each frame.
   */
  update(deltaTime) {
    // Clamp deltaTime to prevent large jumps
    const dt = Math.min(deltaTime, 0.05);

    // Check Water Status
    const headBlock = getBlockAtWorld(Math.floor(this.position.x), Math.floor(this.position.y), Math.floor(this.position.z));
    const feetBlock = getBlockAtWorld(Math.floor(this.position.x), Math.floor(this.position.y - PLAYER_HEIGHT / 2), Math.floor(this.position.z));
    const currentlyInWater = headBlock === BlockType.WATER || feetBlock === BlockType.WATER;

    // Handle Water Audio Triggers
    if (currentlyInWater && !this.inWater) {
      if (this.velocity.y < -3) playSplashSound();
      startBubbleSound();
    } else if (!currentlyInWater && this.inWater) {
      stopBubbleSound();
    }
    this.inWater = currentlyInWater;

    // Movement direction from keys
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get camera forward/right (XZ plane only)
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.left) moveDir.sub(right);
    if (this.keys.right) moveDir.add(right);

    if (moveDir.length() > 0) moveDir.normalize();

    let speed = this.keys.sprint ? SPRINT_SPEED : MOVE_SPEED;
    if (this.inWater) speed *= 0.6; // Slower in water
    
    // Smooth velocity accumulation for XZ
    const targetVx = moveDir.x * speed;
    const targetVz = moveDir.z * speed;
    
    // Very simple friction/acceleration
    this.velocity.x += (targetVx - this.velocity.x) * 10 * dt;
    this.velocity.z += (targetVz - this.velocity.z) * 10 * dt;

    if (this.inWater) {
      // Swimming Physics
      if (this.keys.jump) {
        this.velocity.y += SWIM_FORCE * dt;
        if (this.velocity.y > MAX_SWIM_SPEED) this.velocity.y = MAX_SWIM_SPEED;
      } else {
        // Slow sink (buoyancy)
        this.velocity.y -= WATER_GRAVITY * dt;
        if (this.velocity.y < -2) this.velocity.y = -2; // Terminal sinking velocity
      }
    } else {
      // Standard Gravity
      this.velocity.y -= GRAVITY * dt;

      // Ground Jump
      if (this.keys.jump && this.grounded) {
        this.velocity.y = JUMP_FORCE;
        this.grounded = false;
      }
    }

    // Apply velocity with independent axis collision (AABB)
    
    // X Axis
    this.position.x += this.velocity.x * dt;
    if (this._collides(this.position)) {
      this.position.x -= this.velocity.x * dt;
      this.velocity.x = 0;
    }

    // Z Axis
    this.position.z += this.velocity.z * dt;
    if (this._collides(this.position)) {
      this.position.z -= this.velocity.z * dt;
      this.velocity.z = 0;
    }

    // Y Axis
    this.position.y += this.velocity.y * dt;
    this.grounded = false;
    if (this._collides(this.position)) {
      if (this.velocity.y < 0) {
        this.grounded = true;
        // Snap to top of the block
        this.position.y = Math.floor(this.position.y - PLAYER_HEIGHT + 0.5) + PLAYER_HEIGHT;
      } else if (this.velocity.y > 0) {
        // Hit ceiling
        this.position.y -= this.velocity.y * dt;
      }
      this.velocity.y = 0;
    }

    // Prevent going below world
    if (this.position.y < 1) {
      this.position.y = 1;
      this.velocity.y = 0;
      this.grounded = true;
    }

    this.camera.position.copy(this.position);
  }

  getChunkPosition(chunkSize) {
    return {
      x: Math.floor(this.position.x / chunkSize),
      z: Math.floor(this.position.z / chunkSize),
    };
  }
}
