/**
 * blocks.js — Block type registry with materials.
 * Each block type defines which textures to use for its faces.
 */
import * as THREE from 'three';
import { createAllTextures } from './textures.js';

// Block type IDs
export const BlockType = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  OAK_LOG: 6,
  OAK_LEAVES: 7,
  BIRCH_LOG: 8,
  BIRCH_LEAVES: 9,
  FLOWER_RED: 10,
  FLOWER_YELLOW: 11,
  TALL_GRASS: 12,
};

let blockMaterials = null;
let textures = null;

export function initBlockMaterials() {
  textures = createAllTextures();

  // For each block type, define an array of 6 materials: [+x, -x, +y, -y, +z, -z]
  // or a single material if all faces are the same
  blockMaterials = {
    [BlockType.GRASS]: [
      new THREE.MeshLambertMaterial({ map: textures.grass_side }),
      new THREE.MeshLambertMaterial({ map: textures.grass_side }),
      new THREE.MeshLambertMaterial({ map: textures.grass_top }),
      new THREE.MeshLambertMaterial({ map: textures.dirt }),
      new THREE.MeshLambertMaterial({ map: textures.grass_side }),
      new THREE.MeshLambertMaterial({ map: textures.grass_side }),
    ],
    [BlockType.DIRT]: new THREE.MeshLambertMaterial({ map: textures.dirt }),
    [BlockType.STONE]: new THREE.MeshLambertMaterial({ map: textures.stone }),
    [BlockType.SAND]: new THREE.MeshLambertMaterial({ map: textures.sand }),
    [BlockType.WATER]: new THREE.MeshLambertMaterial({
      map: textures.water,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    }),
    [BlockType.OAK_LOG]: [
      new THREE.MeshLambertMaterial({ map: textures.oak_log }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log_top }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log_top }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log }),
    ],
    [BlockType.OAK_LEAVES]: new THREE.MeshLambertMaterial({
      map: textures.oak_leaves,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
    [BlockType.BIRCH_LOG]: [
      new THREE.MeshLambertMaterial({ map: textures.birch_log }),
      new THREE.MeshLambertMaterial({ map: textures.birch_log }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log_top }),
      new THREE.MeshLambertMaterial({ map: textures.oak_log_top }),
      new THREE.MeshLambertMaterial({ map: textures.birch_log }),
      new THREE.MeshLambertMaterial({ map: textures.birch_log }),
    ],
    [BlockType.BIRCH_LEAVES]: new THREE.MeshLambertMaterial({
      map: textures.birch_leaves,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
    [BlockType.FLOWER_RED]: new THREE.MeshLambertMaterial({
      map: textures.flower_red,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    }),
    [BlockType.FLOWER_YELLOW]: new THREE.MeshLambertMaterial({
      map: textures.flower_yellow,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    }),
    [BlockType.TALL_GRASS]: new THREE.MeshLambertMaterial({
      map: textures.tall_grass,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    }),
  };

  return blockMaterials;
}

export function getBlockMaterial(blockType) {
  return blockMaterials[blockType];
}

export function isTransparent(blockType) {
  return blockType === BlockType.AIR ||
    blockType === BlockType.WATER ||
    blockType === BlockType.OAK_LEAVES ||
    blockType === BlockType.BIRCH_LEAVES ||
    blockType === BlockType.FLOWER_RED ||
    blockType === BlockType.FLOWER_YELLOW ||
    blockType === BlockType.TALL_GRASS;
}

export function isSolid(blockType) {
  return blockType !== BlockType.AIR &&
    blockType !== BlockType.WATER &&
    blockType !== BlockType.FLOWER_RED &&
    blockType !== BlockType.FLOWER_YELLOW &&
    blockType !== BlockType.TALL_GRASS;
}
