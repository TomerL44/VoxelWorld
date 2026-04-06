/**
 * terrain.js — Procedural terrain generator using simplex noise.
 * Generates height maps with multi-octave noise for rolling hills,
 * layer logic (grass/dirt/stone), sand patches near water, and lake placement.
 */
import { createNoise2D } from 'simplex-noise';
import { BlockType } from './blocks.js';

const WATER_LEVEL = 32;
const SEA_FLOOR = 28;

// Create seeded noise functions
let noise2D_main, noise2D_detail, noise2D_biome, noise2D_cave;

export function initTerrain(seed = 42) {
  // Simple seeded PRNG
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rng1 = mulberry32(seed);
  const rng2 = mulberry32(seed + 1);
  const rng3 = mulberry32(seed + 2);
  const rng4 = mulberry32(seed + 3);

  noise2D_main = createNoise2D(rng1);
  noise2D_detail = createNoise2D(rng2);
  noise2D_biome = createNoise2D(rng3);
  noise2D_cave = createNoise2D(rng4);
}

/**
 * Get terrain height at world (x, z) coordinates.
 * Uses multiple octaves of noise for natural-looking hills.
 */
export function getHeight(worldX, worldZ) {
  // Large-scale terrain shape
  const scale1 = 0.005;
  const h1 = noise2D_main(worldX * scale1, worldZ * scale1) * 20;

  // Medium hills
  const scale2 = 0.015;
  const h2 = noise2D_detail(worldX * scale2, worldZ * scale2) * 10;

  // Small detail
  const scale3 = 0.05;
  const h3 = noise2D_main(worldX * scale3, worldZ * scale3) * 3;

  // Biome variation (flatter plains vs hills)
  const biome = noise2D_biome(worldX * 0.003, worldZ * 0.003);
  const hillFactor = Math.max(0.3, (biome + 1) / 2);

  const height = 35 + (h1 + h2 + h3) * hillFactor;
  return Math.floor(height);
}

/**
 * Determine if a position should have sand instead of grass.
 */
function isSandZone(worldX, worldZ, height) {
  if (height <= WATER_LEVEL + 1 && height >= WATER_LEVEL - 1) return true;
  // Beach-like noise near water
  const beachNoise = noise2D_detail(worldX * 0.08, worldZ * 0.08);
  if (height <= WATER_LEVEL + 2 && beachNoise > 0.2) return true;
  return false;
}

/**
 * Generate block data for a chunk.
 * @param {number} chunkX - Chunk X coordinate (in chunk units)
 * @param {number} chunkZ - Chunk Z coordinate (in chunk units)
 * @param {number} chunkSize - Size of chunk in blocks
 * @param {number} chunkHeight - Max Y height
 * @returns {Uint8Array} Flat array of block types [x][z][y] layout
 */
export function generateChunkTerrain(chunkX, chunkZ, chunkSize, chunkHeight) {
  const blocks = new Uint8Array(chunkSize * chunkSize * chunkHeight);

  for (let lx = 0; lx < chunkSize; lx++) {
    for (let lz = 0; lz < chunkSize; lz++) {
      const worldX = chunkX * chunkSize + lx;
      const worldZ = chunkZ * chunkSize + lz;
      const surfaceHeight = getHeight(worldX, worldZ);

      for (let y = 0; y < chunkHeight; y++) {
        const idx = lx * chunkSize * chunkHeight + lz * chunkHeight + y;

        if (y === 0) {
          // Bedrock layer (stone)
          blocks[idx] = BlockType.STONE;
        } else if (y < surfaceHeight - 4) {
          // Deep stone
          blocks[idx] = BlockType.STONE;
        } else if (y < surfaceHeight) {
          // Dirt layers
          blocks[idx] = BlockType.DIRT;
        } else if (y === surfaceHeight) {
          // Surface
          if (isSandZone(worldX, worldZ, surfaceHeight)) {
            blocks[idx] = BlockType.SAND;
          } else if (surfaceHeight <= WATER_LEVEL) {
            blocks[idx] = BlockType.SAND;
          } else {
            blocks[idx] = BlockType.GRASS;
          }
        } else if (y <= WATER_LEVEL && y > surfaceHeight) {
          // Water fill
          blocks[idx] = BlockType.WATER;
        } else {
          blocks[idx] = BlockType.AIR;
        }
      }
    }
  }

  return blocks;
}

export function getWaterLevel() {
  return WATER_LEVEL;
}
