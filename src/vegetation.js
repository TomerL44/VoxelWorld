/**
 * vegetation.js — Tree generator (oak, birch, willow) and flora placement.
 * Uses deterministic seeded random from terrain noise for consistent placement.
 */
import { createNoise2D } from 'simplex-noise';
import { BlockType } from './blocks.js';
import { getHeight, getWaterLevel } from './terrain.js';

let vegNoise;

export function initVegetation(seed = 12345) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  vegNoise = createNoise2D(mulberry32(seed));
}

function seededRandom(x, z) {
  // Deterministic hash for position
  let h = (x * 374761393 + z * 668265263 + 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/**
 * Place an oak tree into the block array.
 */
function placeOakTree(blocks, lx, lz, surfaceY, chunkSize, chunkHeight) {
  const trunkHeight = 4 + Math.floor(seededRandom(lx * 7, lz * 13) * 3);
  const leafRadius = 2;

  // Trunk
  for (let dy = 1; dy <= trunkHeight; dy++) {
    const y = surfaceY + dy;
    if (y >= chunkHeight) break;
    const idx = lx * chunkSize * chunkHeight + lz * chunkHeight + y;
    blocks[idx] = BlockType.OAK_LOG;
  }

  // Leaf canopy
  const leafBase = surfaceY + trunkHeight - 1;
  for (let dy = 0; dy <= 3; dy++) {
    const r = dy === 0 ? leafRadius : (dy <= 2 ? leafRadius : 1);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < 3) continue; // trunk passes through
        const nx = lx + dx;
        const nz = lz + dz;
        const ny = leafBase + dy;
        if (nx < 0 || nx >= chunkSize || nz < 0 || nz >= chunkSize || ny >= chunkHeight) continue;
        // Check manhattan dist for roundness
        if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
        const idx = nx * chunkSize * chunkHeight + nz * chunkHeight + ny;
        if (blocks[idx] === BlockType.AIR) {
          blocks[idx] = BlockType.OAK_LEAVES;
        }
      }
    }
  }
}

/**
 * Place a birch tree into the block array.
 */
function placeBirchTree(blocks, lx, lz, surfaceY, chunkSize, chunkHeight) {
  const trunkHeight = 5 + Math.floor(seededRandom(lx * 11, lz * 17) * 3);

  // Trunk
  for (let dy = 1; dy <= trunkHeight; dy++) {
    const y = surfaceY + dy;
    if (y >= chunkHeight) break;
    const idx = lx * chunkSize * chunkHeight + lz * chunkHeight + y;
    blocks[idx] = BlockType.BIRCH_LOG;
  }

  // Narrower taller canopy
  const leafBase = surfaceY + trunkHeight - 2;
  for (let dy = 0; dy <= 4; dy++) {
    const r = dy <= 1 ? 2 : (dy <= 3 ? 1 : 0);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < 4) continue;
        const nx = lx + dx;
        const nz = lz + dz;
        const ny = leafBase + dy;
        if (nx < 0 || nx >= chunkSize || nz < 0 || nz >= chunkSize || ny >= chunkHeight) continue;
        const idx = nx * chunkSize * chunkHeight + nz * chunkHeight + ny;
        if (blocks[idx] === BlockType.AIR) {
          blocks[idx] = BlockType.BIRCH_LEAVES;
        }
      }
    }
  }
}

/**
 * Place a willow tree (near water) into the block array.
 */
function placeWillowTree(blocks, lx, lz, surfaceY, chunkSize, chunkHeight) {
  const trunkHeight = 4 + Math.floor(seededRandom(lx * 19, lz * 23) * 2);

  // Trunk
  for (let dy = 1; dy <= trunkHeight; dy++) {
    const y = surfaceY + dy;
    if (y >= chunkHeight) break;
    const idx = lx * chunkSize * chunkHeight + lz * chunkHeight + y;
    blocks[idx] = BlockType.OAK_LOG;
  }

  // Drooping leaf canopy (wider, drops down on sides)
  const leafBase = surfaceY + trunkHeight - 1;
  for (let dy = -2; dy <= 2; dy++) {
    const r = dy <= 0 ? 1 : 3;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy <= 1) continue;
        const nx = lx + dx;
        const nz = lz + dz;
        const ny = leafBase + dy;
        if (nx < 0 || nx >= chunkSize || nz < 0 || nz >= chunkSize || ny >= chunkHeight || ny < 0) continue;
        const idx = nx * chunkSize * chunkHeight + nz * chunkHeight + ny;
        if (blocks[idx] === BlockType.AIR) {
          blocks[idx] = BlockType.OAK_LEAVES;
        }
      }
    }
  }
}

/**
 * Add vegetation to a generated chunk.
 * Must be called AFTER terrain generation.
 */
export function addVegetation(blocks, chunkX, chunkZ, chunkSize, chunkHeight) {
  const waterLevel = getWaterLevel();

  for (let lx = 2; lx < chunkSize - 2; lx++) {
    for (let lz = 2; lz < chunkSize - 2; lz++) {
      const worldX = chunkX * chunkSize + lx;
      const worldZ = chunkZ * chunkSize + lz;
      const surfaceHeight = getHeight(worldX, worldZ);

      // Skip if underwater
      if (surfaceHeight <= waterLevel) continue;

      // Get surface block
      const surfIdx = lx * chunkSize * chunkHeight + lz * chunkHeight + surfaceHeight;
      const surfaceBlock = blocks[surfIdx];
      if (surfaceBlock !== BlockType.GRASS) continue;

      const r = seededRandom(worldX, worldZ);
      const treeNoise = vegNoise(worldX * 0.1, worldZ * 0.1);

      // Trees (sparse)
      if (r < 0.015 && treeNoise > 0) {
        // Check proximity to water for willow
        const nearWater = surfaceHeight <= waterLevel + 3;
        if (nearWater && r < 0.005) {
          placeWillowTree(blocks, lx, lz, surfaceHeight, chunkSize, chunkHeight);
        } else if (r < 0.008) {
          placeBirchTree(blocks, lx, lz, surfaceHeight, chunkSize, chunkHeight);
        } else {
          placeOakTree(blocks, lx, lz, surfaceHeight, chunkSize, chunkHeight);
        }
      }
      // Flora
      else if (r > 0.92 && r < 0.94) {
        const flowerIdx = lx * chunkSize * chunkHeight + lz * chunkHeight + surfaceHeight + 1;
        if (surfaceHeight + 1 < chunkHeight) {
          blocks[flowerIdx] = BlockType.FLOWER_RED;
        }
      } else if (r > 0.94 && r < 0.96) {
        const flowerIdx = lx * chunkSize * chunkHeight + lz * chunkHeight + surfaceHeight + 1;
        if (surfaceHeight + 1 < chunkHeight) {
          blocks[flowerIdx] = BlockType.FLOWER_YELLOW;
        }
      } else if (r > 0.85 && r < 0.92) {
        const grassIdx = lx * chunkSize * chunkHeight + lz * chunkHeight + surfaceHeight + 1;
        if (surfaceHeight + 1 < chunkHeight) {
          blocks[grassIdx] = BlockType.TALL_GRASS;
        }
      }
    }
  }
}
