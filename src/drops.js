/**
 * drops.js — Floating rotating drop items.
 * When a block is destroyed, a small rotating cube spawns at its position.
 * Player picks up drops on proximity collision.
 */
import * as THREE from 'three';
import { BlockType } from './blocks.js';
import { addToHotbar } from './hotbar.js';

const PICKUP_RADIUS = 1.5;
const BOB_SPEED = 2.5;
const BOB_HEIGHT = 0.15;
const ROTATE_SPEED = 2.0;
const DROP_SCALE = 0.3;

let drops = [];
let dropGroup;

// Simpler colors for drop cubes (since merged chunk materials can't be reused directly)
const DROP_COLORS = {
  [BlockType.GRASS]: 0x5FA03C,
  [BlockType.DIRT]: 0x866043,
  [BlockType.STONE]: 0x808080,
  [BlockType.SAND]: 0xD7C88C,
  [BlockType.OAK_LOG]: 0x553C23,
  [BlockType.OAK_LEAVES]: 0x328228,
  [BlockType.BIRCH_LOG]: 0xDCD7CD,
  [BlockType.BIRCH_LEAVES]: 0x50A03C,
  [BlockType.FLOWER_RED]: 0xCC2020,
  [BlockType.FLOWER_YELLOW]: 0xF0D21E,
  [BlockType.TALL_GRASS]: 0x3C8C2D,
};

/**
 * Initialize drop system.
 */
export function initDrops(scene) {
  dropGroup = new THREE.Group();
  scene.add(dropGroup);
}

/**
 * Spawn a drop item at position.
 */
export function spawnDrop(worldX, worldY, worldZ, blockType) {
  const color = DROP_COLORS[blockType] || 0x808080;

  const geo = new THREE.BoxGeometry(DROP_SCALE, DROP_SCALE, DROP_SCALE);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);

  const baseY = worldY + 0.5;
  mesh.position.set(worldX + 0.5, baseY + 0.5, worldZ + 0.5);

  dropGroup.add(mesh);

  drops.push({
    mesh,
    blockType,
    baseY: baseY + 0.5,
    spawnTime: performance.now() / 1000,
    collected: false,
  });
}

/**
 * Update all drops — bobbing, rotation, and proximity pickup.
 */
export function updateDrops(deltaTime, playerPos) {
  const now = performance.now() / 1000;

  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    if (drop.collected) continue;

    const age = now - drop.spawnTime;

    // Bobbing
    drop.mesh.position.y = drop.baseY + Math.sin(age * BOB_SPEED) * BOB_HEIGHT;

    // Rotation
    drop.mesh.rotation.y += ROTATE_SPEED * deltaTime;

    // Check pickup distance
    const dx = drop.mesh.position.x - playerPos.x;
    const dy = drop.mesh.position.y - playerPos.y;
    const dz = drop.mesh.position.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < PICKUP_RADIUS) {
      if (addToHotbar(drop.blockType)) {
        // Collect
        drop.collected = true;
        dropGroup.remove(drop.mesh);
        drop.mesh.geometry.dispose();
        drop.mesh.material.dispose();

        drops.splice(i, 1);
      }
    }

    // Despawn after 60 seconds
    if (age > 60 && !drop.collected) {
      dropGroup.remove(drop.mesh);
      drop.mesh.geometry.dispose();
      drop.mesh.material.dispose();
      drops.splice(i, 1);
    }
  }
}
