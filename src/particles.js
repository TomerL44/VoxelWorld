/**
 * particles.js — Block destruction particle effects.
 * Spawns small cubes matching the broken block's color that fly outward
 * with gravity and fade out.
 */
import * as THREE from 'three';
import { BlockType } from './blocks.js';

const MAX_PARTICLES = 200;
const PARTICLE_LIFETIME = 1.2; // seconds
const PARTICLES_PER_BREAK = 12;

// Color map for block types
const BLOCK_COLORS = {
  [BlockType.GRASS]: [0x5FA03C, 0x866043, 0x5FA03C],
  [BlockType.DIRT]: [0x866043, 0x734F32, 0x866043],
  [BlockType.STONE]: [0x808080, 0x606060, 0x909090],
  [BlockType.SAND]: [0xD7C88C, 0xE1D296, 0xCDBE82],
  [BlockType.OAK_LOG]: [0x553C23, 0x463019, 0x6A4E30],
  [BlockType.OAK_LEAVES]: [0x328228, 0x4AA040, 0x287020],
  [BlockType.BIRCH_LOG]: [0xDCD7CD, 0x32302D, 0xDCD7CD],
  [BlockType.BIRCH_LEAVES]: [0x50A03C, 0x66B84C, 0x40902C],
  [BlockType.FLOWER_RED]: [0xCC2020, 0x1A6A1A, 0xCC2020],
  [BlockType.FLOWER_YELLOW]: [0xF0D21E, 0x1A6A1A, 0xF0D21E],
  [BlockType.TALL_GRASS]: [0x3C8C2D, 0x50A038, 0x3C8C2D],
};

let particlePool = [];
let activeParticles = [];
let particleGroup;

// Shared geometry for all particles
const particleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

/**
 * Initialize particle system.
 */
export function initParticles(scene) {
  particleGroup = new THREE.Group();
  scene.add(particleGroup);

  // Pre-create particle pool
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.visible = false;
    particleGroup.add(mesh);
    particlePool.push({
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: PARTICLE_LIFETIME,
      active: false,
    });
  }
}

/**
 * Spawn particles at position for a given block type.
 */
export function spawnBlockParticles(worldX, worldY, worldZ, blockType) {
  const colors = BLOCK_COLORS[blockType] || [0x808080, 0x606060, 0x909090];

  let spawned = 0;
  for (const p of particlePool) {
    if (spawned >= PARTICLES_PER_BREAK) break;
    if (p.active) continue;

    // Activate particle
    p.active = true;
    p.life = 0;
    p.maxLife = PARTICLE_LIFETIME * (0.6 + Math.random() * 0.8);

    // Position at block center with slight randomness
    p.mesh.position.set(
      worldX + 0.5 + (Math.random() - 0.5) * 0.6,
      worldY + 0.5 + (Math.random() - 0.5) * 0.6,
      worldZ + 0.5 + (Math.random() - 0.5) * 0.6
    );

    // Random outward velocity
    p.velocity.set(
      (Math.random() - 0.5) * 4,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 4
    );

    // Random scale
    const s = 0.08 + Math.random() * 0.12;
    p.mesh.scale.set(s, s, s);

    // Random rotation
    p.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Random color from block palette
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 1;
    p.mesh.material.transparent = true;
    p.mesh.visible = true;

    spawned++;
  }
}

/**
 * Update all active particles.
 */
export function updateParticles(deltaTime) {
  for (const p of particlePool) {
    if (!p.active) continue;

    p.life += deltaTime;

    if (p.life >= p.maxLife) {
      // Deactivate
      p.active = false;
      p.mesh.visible = false;
      continue;
    }

    // Apply gravity
    p.velocity.y -= 12 * deltaTime;

    // Update position
    p.mesh.position.x += p.velocity.x * deltaTime;
    p.mesh.position.y += p.velocity.y * deltaTime;
    p.mesh.position.z += p.velocity.z * deltaTime;

    // Spin
    p.mesh.rotation.x += deltaTime * 5;
    p.mesh.rotation.y += deltaTime * 3;

    // Fade out in last 40%
    const fadeStart = p.maxLife * 0.6;
    if (p.life > fadeStart) {
      p.mesh.material.opacity = 1 - (p.life - fadeStart) / (p.maxLife - fadeStart);
    }

    // Slow down
    p.velocity.x *= 0.98;
    p.velocity.z *= 0.98;
  }
}
