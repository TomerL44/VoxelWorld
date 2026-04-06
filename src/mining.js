import * as THREE from 'three';
import { BlockType, isSolid } from './blocks.js';
import { getBlockAtWorld, setBlockAtWorld, getWorldGroup } from './world.js';
import { spawnBlockParticles } from './particles.js';
import { spawnDrop } from './drops.js';
import { triggerSwing } from './hand.js';
import { getSelectedBlock, consumeSelectedBlock } from './hotbar.js';

const REACH_DISTANCE = 6;
const MINE_STAGES = 10;

// Break time in seconds per block type
const BREAK_TIMES = {
  [BlockType.GRASS]: 0.9,
  [BlockType.DIRT]: 0.75,
  [BlockType.STONE]: 2.25,
  [BlockType.SAND]: 0.75,
  [BlockType.OAK_LOG]: 1.5,
  [BlockType.OAK_LEAVES]: 0.3,
  [BlockType.BIRCH_LOG]: 1.5,
  [BlockType.BIRCH_LEAVES]: 0.3,
  [BlockType.FLOWER_RED]: 0.0,
  [BlockType.FLOWER_YELLOW]: 0.0,
  [BlockType.TALL_GRASS]: 0.0,
};

let raycaster;
let mouseDown = false;
let targetBlock = null; // { x, y, z, blockType }
let placementNormal = null; // surface normal for placement
let miningProgress = 0; // 0 to 1
let highlightBox = null;
let crackOverlay = null;
let crackTextures = [];
let swingTimer = 0;

/**
 * Generate crack stage textures procedurally.
 */
function generateCrackTextures() {
  const textures = [];
  const size = 16;

  for (let stage = 0; stage < MINE_STAGES; stage++) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, size, size);

    // Draw cracks — more cracks at higher stages
    const crackCount = 1 + Math.floor(stage * 1.5);
    const opacity = 0.2 + (stage / MINE_STAGES) * 0.6;

    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = 1;

    // Deterministic random for consistent crack patterns
    let seed = stage * 1337;
    function nextRand() {
      seed = (seed * 16807 + 13) % 2147483647;
      return (seed & 0x7fffffff) / 2147483647;
    }

    for (let c = 0; c < crackCount; c++) {
      const startX = nextRand() * size;
      const startY = nextRand() * size;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      const segments = 2 + Math.floor(nextRand() * 4);
      for (let s = 0; s < segments; s++) {
        const endX = startX + (nextRand() - 0.5) * size * 0.7;
        const endY = startY + (nextRand() - 0.5) * size * 0.7;
        ctx.lineTo(endX, endY);
      }
      ctx.stroke();
    }

    // Add dark spots at higher stages
    if (stage > 4) {
      const spotCount = stage - 4;
      for (let s = 0; s < spotCount; s++) {
        const sx = nextRand() * size;
        const sy = nextRand() * size;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + (stage / MINE_STAGES) * 0.3})`;
        ctx.fillRect(sx, sy, 1 + nextRand() * 2, 1 + nextRand() * 2);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    textures.push(tex);
  }

  return textures;
}

// Generate simple thump sound
function playThumpSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Ignore audio errors
  }
}

/**
 * Initialize the mining system.
 */
export function initMining(scene, camera) {
  raycaster = new THREE.Raycaster();
  raycaster.far = REACH_DISTANCE;

  // Generate crack textures
  crackTextures = generateCrackTextures();

  // Block highlight wireframe
  const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
  const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
  const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2, transparent: true, opacity: 0.5 });
  highlightBox = new THREE.LineSegments(highlightEdges, highlightMat);
  highlightBox.visible = false;
  scene.add(highlightBox);

  // Crack overlay mesh
  const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
  const crackMat = new THREE.MeshBasicMaterial({
    map: crackTextures[0],
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    opacity: 1,
  });
  crackOverlay = new THREE.Mesh(crackGeo, crackMat);
  crackOverlay.visible = false;
  crackOverlay.renderOrder = 1;
  scene.add(crackOverlay);

  // Disable context menu so right click works
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Mouse events
  document.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement) {
      if (e.button === 0) { // Left click
        mouseDown = true;
      } else if (e.button === 2) { // Right click
        placeBlock();
      }
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      mouseDown = false;
      resetMining();
    }
  });
}

/**
 * Reset current mining progress.
 */
function resetMining() {
  miningProgress = 0;
  if (crackOverlay) crackOverlay.visible = false;
  targetBlock = null;
}

/**
 * Place a block from hotbar onto the targeted surface.
 */
function placeBlock() {
  if (!targetBlock || !placementNormal) return;

  const toPlace = getSelectedBlock();
  if (toPlace === null) return; // Empty slot

  // Calculate placement position
  const px = targetBlock.x + placementNormal.x;
  const py = targetBlock.y + placementNormal.y;
  const pz = targetBlock.z + placementNormal.z;

  // Don't place blocks inside player
  // Simply just ensure we can actually place it
  if (setBlockAtWorld(px, py, pz, toPlace)) {
    consumeSelectedBlock();
    triggerSwing();
    playThumpSound();
  }
}

/**
 * Convert raycast hit to block world coordinates.
 * Nudges the point slightly into the block along the face normal.
 */
function hitToBlockCoords(point, normal) {
  // Step slightly into the block (opposite the normal)
  const bx = Math.floor(point.x - normal.x * 0.01);
  const by = Math.floor(point.y - normal.y * 0.01);
  const bz = Math.floor(point.z - normal.z * 0.01);
  return { x: bx, y: by, z: bz };
}

/**
 * Update mining system each frame.
 */
export function updateMining(deltaTime, camera) {
  const worldGroup = getWorldGroup();
  if (!worldGroup) return { isMining: false, targetBlock: null };

  // Raycast from camera center
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  // Get all meshes to test against
  const meshes = [];
  worldGroup.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });

  const intersects = raycaster.intersectObjects(meshes, false);

  let currentTarget = null;
  let currentNormal = null;

  if (intersects.length > 0) {
    const hit = intersects[0];
    const point = hit.point;
    const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);

    // Transform normal from local to world
    if (hit.object.matrixWorld) {
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();
    }

    // Round the normal to nearest axis
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);
    if (absX >= absY && absX >= absZ) {
      normal.set(Math.sign(normal.x), 0, 0);
    } else if (absY >= absX && absY >= absZ) {
      normal.set(0, Math.sign(normal.y), 0);
    } else {
      normal.set(0, 0, Math.sign(normal.z));
    }

    const blockCoords = hitToBlockCoords(point, normal);
    const blockType = getBlockAtWorld(blockCoords.x, blockCoords.y, blockCoords.z);

    if (blockType !== BlockType.AIR && blockType !== BlockType.WATER) {
      currentTarget = { ...blockCoords, blockType };
      currentNormal = normal;

      // Show highlight
      highlightBox.position.set(blockCoords.x + 0.5, blockCoords.y + 0.5, blockCoords.z + 0.5);
      highlightBox.visible = true;
    } else {
      highlightBox.visible = false;
    }
  } else {
    highlightBox.visible = false;
  }

  placementNormal = currentNormal;

  // Mining logic
  let isMining = false;

  if (mouseDown && currentTarget) {
    // Check if we're still targeting the same block
    if (targetBlock &&
      targetBlock.x === currentTarget.x &&
      targetBlock.y === currentTarget.y &&
      targetBlock.z === currentTarget.z) {
      // Continue mining same block
    } else {
      // New target — reset progress
      targetBlock = currentTarget;
      miningProgress = 0;
    }

    const breakTime = BREAK_TIMES[targetBlock.blockType] ?? 1.5;

    if (breakTime <= 0) {
      // Instant break
      destroyBlock(targetBlock);
      resetMining();
    } else {
      miningProgress += deltaTime / breakTime;

      // Show crack texture
      const stage = Math.min(MINE_STAGES - 1, Math.floor(miningProgress * MINE_STAGES));
      crackOverlay.material.map = crackTextures[stage];
      crackOverlay.material.needsUpdate = true;
      crackOverlay.position.set(targetBlock.x + 0.5, targetBlock.y + 0.5, targetBlock.z + 0.5);
      crackOverlay.visible = true;

      // Swing animation timing
      swingTimer += deltaTime;
      if (swingTimer > 0.3) {
        triggerSwing();
        playThumpSound(); // optional thump on crack progress
        swingTimer = 0;
      }

      isMining = true;

      // Check if mining complete
      if (miningProgress >= 1) {
        destroyBlock(targetBlock);
        resetMining();
      }
    }
  } else {
    if (!mouseDown) {
      resetMining();
    }
    // Retain target for placing blocks (via right click) even if not holding left click
    if (!mouseDown) {
      targetBlock = currentTarget;
    }
    swingTimer = 0;
  }

  return { isMining, targetBlock: currentTarget };
}

/**
 * Destroy a block — remove from world, spawn particles and drop.
 */
function destroyBlock(block) {
  const { x, y, z, blockType } = block;

  // Remove block from world
  setBlockAtWorld(x, y, z, BlockType.AIR);

  // Spawn particles
  spawnBlockParticles(x, y, z, blockType);

  // Spawn drop item
  spawnDrop(x, y, z, blockType);
}

/**
 * Whether the player is currently mining.
 */
export function isMiningActive() {
  return mouseDown && targetBlock !== null;
}
