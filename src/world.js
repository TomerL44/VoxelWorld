/**
 * world.js — Chunk-based world manager.
 * Generates and disposes chunks around the player.
 * Uses greedy meshing for performance — builds one merged mesh per block type per chunk.
 */
import * as THREE from 'three';
import { BlockType, getBlockMaterial, isTransparent } from './blocks.js';
import { generateChunkTerrain, getHeight, getWaterLevel } from './terrain.js';
import { addVegetation } from './vegetation.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 80;
const RENDER_DISTANCE = 6; // chunks in each direction

const chunks = new Map();
let worldGroup;

/**
 * Initialize the world system.
 */
export function initWorld(scene) {
  worldGroup = new THREE.Group();
  scene.add(worldGroup);
}

/**
 * Get chunk key from chunk coordinates.
 */
function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

/**
 * Get block at world position from chunk data.
 */
function getBlock(chunkData, lx, ly, lz) {
  if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_HEIGHT) {
    return BlockType.AIR;
  }
  return chunkData[lx * CHUNK_SIZE * CHUNK_HEIGHT + lz * CHUNK_HEIGHT + ly];
}

/**
 * Build mesh for a chunk using face culling.
 * Only creates faces that border air/transparent blocks.
 */
function buildChunkMesh(chunkData, chunkX, chunkZ) {
  // Group vertices by block type
  const geometryData = {};

  // Face normals and vertex offsets for each face direction
  const faces = [
    { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },  // +x
    { dir: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },  // -x
    { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },  // +y
    { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },  // -y
    { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },  // +z
    { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },  // -z
  ];

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        const blockType = getBlock(chunkData, x, y, z);
        if (blockType === BlockType.AIR) continue;

        // For each face, check if neighbor is transparent
        for (let f = 0; f < 6; f++) {
          const [dx, dy, dz] = faces[f].dir;
          const neighbor = getBlock(chunkData, x + dx, y + dy, z + dz);

          // Show face if neighbor is transparent (but not same block type for leaves/water)
          if (neighbor === blockType) continue;
          if (!isTransparent(neighbor) && neighbor !== BlockType.AIR) continue;
          if (blockType === BlockType.WATER && neighbor !== BlockType.AIR) continue;

          const key = `${blockType}_${f}`;
          if (!geometryData[key]) {
            geometryData[key] = { positions: [], normals: [], uvs: [], indices: [], blockType, faceIndex: f };
          }

          const gd = geometryData[key];
          const vi = gd.positions.length / 3;

          // Add 4 vertices for this face
          for (const [cx, cy, cz] of faces[f].corners) {
            gd.positions.push(x + cx, y + cy, z + cz);
            gd.normals.push(...faces[f].dir);
          }

          // UVs
          gd.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

          // Two triangles
          gd.indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        }
      }
    }
  }

  // Build meshes
  const meshes = [];
  const worldOffsetX = chunkX * CHUNK_SIZE;
  const worldOffsetZ = chunkZ * CHUNK_SIZE;

  for (const key in geometryData) {
    const gd = geometryData[key];
    if (gd.positions.length === 0) continue;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(gd.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(gd.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(gd.uvs, 2));
    geometry.setIndex(gd.indices);

    let material = getBlockMaterial(gd.blockType);

    // If material is an array (multi-face), pick the right face material
    if (Array.isArray(material)) {
      material = material[gd.faceIndex];
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldOffsetX, 0, worldOffsetZ);
    mesh.receiveShadow = true;
    mesh.castShadow = gd.blockType !== BlockType.WATER;
    meshes.push(mesh);
  }

  // Handle flower and tall grass as cross-planes (X shapes)
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        const bt = getBlock(chunkData, x, y, z);
        if (bt !== BlockType.FLOWER_RED && bt !== BlockType.FLOWER_YELLOW && bt !== BlockType.TALL_GRASS) continue;

        const material = getBlockMaterial(bt);
        const geo = new THREE.PlaneGeometry(1, 1);

        // Two crossed planes
        const mesh1 = new THREE.Mesh(geo, material);
        mesh1.position.set(worldOffsetX + x + 0.5, y + 0.5, worldOffsetZ + z + 0.5);
        mesh1.rotation.y = Math.PI / 4;

        const mesh2 = new THREE.Mesh(geo.clone(), material);
        mesh2.position.set(worldOffsetX + x + 0.5, y + 0.5, worldOffsetZ + z + 0.5);
        mesh2.rotation.y = -Math.PI / 4;

        meshes.push(mesh1, mesh2);
      }
    }
  }

  return meshes;
}

/**
 * Generate and add a chunk to the world.
 */
function loadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (chunks.has(key)) return;

  // Generate terrain
  const chunkData = generateChunkTerrain(cx, cz, CHUNK_SIZE, CHUNK_HEIGHT);

  // Add vegetation
  addVegetation(chunkData, cx, cz, CHUNK_SIZE, CHUNK_HEIGHT);

  // Build mesh
  const meshes = buildChunkMesh(chunkData, cx, cz);

  const chunkGroup = new THREE.Group();
  for (const mesh of meshes) {
    chunkGroup.add(mesh);
  }

  worldGroup.add(chunkGroup);
  chunks.set(key, { group: chunkGroup, data: chunkData });
}

/**
 * Unload a chunk.
 */
function unloadChunk(key) {
  const chunk = chunks.get(key);
  if (!chunk) return;

  // Dispose geometries
  chunk.group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });

  worldGroup.remove(chunk.group);
  chunks.delete(key);
}

/**
 * Update loaded chunks around player position.
 * @param {number} playerChunkX
 * @param {number} playerChunkZ
 * @param {Function} onProgress - Called with (loaded, total) for loading screen
 */
export function updateChunks(playerChunkX, playerChunkZ, onProgress) {
  const neededChunks = new Set();

  // Calculate which chunks should be loaded
  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      // Circular distance
      if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
      const cx = playerChunkX + dx;
      const cz = playerChunkZ + dz;
      neededChunks.add(chunkKey(cx, cz));
    }
  }

  // Unload distant chunks
  for (const key of chunks.keys()) {
    if (!neededChunks.has(key)) {
      unloadChunk(key);
    }
  }

  // Load new chunks (progressive — load a few per frame)
  let loaded = 0;
  const toLoad = [];
  for (const key of neededChunks) {
    if (!chunks.has(key)) {
      const [cx, cz] = key.split(',').map(Number);
      toLoad.push({ cx, cz, dist: (cx - playerChunkX) ** 2 + (cz - playerChunkZ) ** 2 });
    }
  }

  // Sort by distance: load nearest first
  toLoad.sort((a, b) => a.dist - b.dist);

  // Load max 2 chunks per frame for smooth experience
  const maxPerFrame = 2;
  for (let i = 0; i < Math.min(maxPerFrame, toLoad.length); i++) {
    const { cx, cz } = toLoad[i];
    loadChunk(cx, cz);
    loaded++;
  }

  if (onProgress) {
    onProgress(chunks.size, neededChunks.size);
  }

  return toLoad.length - loaded; // remaining chunks to load
}

/**
 * Force-load all initial chunks (for loading screen).
 */
export function loadInitialChunks(playerChunkX, playerChunkZ, onProgress) {
  const total = [];
  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
      if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
      total.push({ cx: playerChunkX + dx, cz: playerChunkZ + dz });
    }
  }

  // Sort by distance
  total.sort((a, b) => {
    const da = (a.cx - playerChunkX) ** 2 + (a.cz - playerChunkZ) ** 2;
    const db = (b.cx - playerChunkX) ** 2 + (b.cz - playerChunkZ) ** 2;
    return da - db;
  });

  let loaded = 0;

  function loadNext() {
    if (loaded >= total.length) {
      if (onProgress) onProgress(loaded, total.length, true);
      return;
    }

    // Load a batch
    const batchSize = 3;
    for (let i = 0; i < batchSize && loaded < total.length; i++, loaded++) {
      loadChunk(total[loaded].cx, total[loaded].cz);
    }

    if (onProgress) onProgress(loaded, total.length, false);
    requestAnimationFrame(loadNext);
  }

  loadNext();
}

export function getLoadedChunkCount() {
  return chunks.size;
}

/**
 * Get block type at world coordinates.
 */
export function getBlockAtWorld(wx, wy, wz) {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const key = chunkKey(cx, cz);
  const chunk = chunks.get(key);
  if (!chunk) return BlockType.AIR;

  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = wy;
  if (ly < 0 || ly >= CHUNK_HEIGHT) return BlockType.AIR;

  return chunk.data[lx * CHUNK_SIZE * CHUNK_HEIGHT + lz * CHUNK_HEIGHT + ly];
}

/**
 * Set block type at world coordinates and rebuild the chunk mesh.
 */
export function setBlockAtWorld(wx, wy, wz, blockType) {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const key = chunkKey(cx, cz);
  const chunk = chunks.get(key);
  if (!chunk) return false;

  const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = wy;
  if (ly < 0 || ly >= CHUNK_HEIGHT) return false;

  chunk.data[lx * CHUNK_SIZE * CHUNK_HEIGHT + lz * CHUNK_HEIGHT + ly] = blockType;

  // Rebuild this chunk's mesh
  rebuildChunk(cx, cz);

  // If block is on chunk edge, rebuild neighbor too
  if (lx === 0) rebuildChunk(cx - 1, cz);
  if (lx === CHUNK_SIZE - 1) rebuildChunk(cx + 1, cz);
  if (lz === 0) rebuildChunk(cx, cz - 1);
  if (lz === CHUNK_SIZE - 1) rebuildChunk(cx, cz + 1);

  return true;
}

/**
 * Rebuild a chunk's mesh from its existing block data.
 */
function rebuildChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  const chunk = chunks.get(key);
  if (!chunk) return;

  // Remove old meshes
  chunk.group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
  chunk.group.clear();

  // Rebuild
  const meshes = buildChunkMesh(chunk.data, cx, cz);
  for (const mesh of meshes) {
    chunk.group.add(mesh);
  }
}

/**
 * Get the world group for raycasting.
 */
export function getWorldGroup() {
  return worldGroup;
}
