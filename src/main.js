/**
 * main.js — VoxelWorld game bootstrap.
 * Creates renderer, scene, camera, initializes all systems, and runs the game loop.
 */
import * as THREE from 'three';
import { initBlockMaterials } from './blocks.js';
import { initTerrain } from './terrain.js';
import { initVegetation } from './vegetation.js';
import { initWorld, loadInitialChunks, updateChunks, CHUNK_SIZE } from './world.js';
import { initAtmosphere, updateAtmosphere } from './atmosphere.js';
import { initEntities, updateEntities } from './entities.js';
import { Player } from './player.js';
import { initMining, updateMining } from './mining.js';
import { initHand, updateHand, getHandScene, getHandCamera, setHandItem } from './hand.js';
import { initParticles, updateParticles } from './particles.js';
import { initDrops, updateDrops } from './drops.js';
import { initHotbar, getSelectedBlock } from './hotbar.js';

// ——— Configuration ———
const SEED = Math.floor(Math.random() * 100000);
let lastSelectedBlock = undefined;

// ——— Three.js setup ———
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.autoClear = false; // We manually clear for HUD layering
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

// ——— Handle resize ———
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ——— Initialize systems ———
console.log(`🌍 VoxelWorld — Seed: ${SEED}`);

// Init block materials (textures)
initBlockMaterials();

// Init terrain noise
initTerrain(SEED);

// Init vegetation noise
initVegetation(SEED + 100);

// Init world (chunk system)
initWorld(scene);

// Init atmosphere (lighting, clouds, fog)
initAtmosphere(scene);

// Init player
const player = new Player(camera);
player.spawn(0, 0);

// Init mining system
initMining(scene, camera);

// Init hand overlay
const { handScene, handCamera } = initHand();

// Init particles
initParticles(scene);

// Init drops
initDrops(scene);

// Init hotbar UI
initHotbar();

// ——— Loading screen ———
const loadingScreen = document.getElementById('loading-screen');
const loaderBar = document.getElementById('loader-bar');
const debugInfo = document.getElementById('debug-info');

const playerChunk = player.getChunkPosition(CHUNK_SIZE);

// Load initial chunks with progress bar
loadInitialChunks(playerChunk.x, playerChunk.z, (loaded, total, done) => {
  const pct = Math.floor((loaded / total) * 100);
  loaderBar.style.width = pct + '%';

  if (done) {
    // Init entities after world is loaded
    initEntities(scene, player.position);

    // Fade out loading screen
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        // Start game loop
        startGameLoop();
      }, 800);
    }, 300);
  }
});

// ——— Game loop ———
const clock = new THREE.Clock();
let frameCount = 0;
let fpsTime = 0;
let fps = 0;

function startGameLoop() {
  clock.start();
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // FPS counter
  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 1) {
    fps = frameCount;
    frameCount = 0;
    fpsTime = 0;
  }

  // Update player
  player.update(deltaTime);

  // Update chunks around player
  const pChunk = player.getChunkPosition(CHUNK_SIZE);
  updateChunks(pChunk.x, pChunk.z);

  // Update atmosphere (day/night, clouds)
  const skyColor = updateAtmosphere(deltaTime, camera);

  // Update mining (raycasting, progress, block breaking)
  const { isMining } = updateMining(deltaTime, camera);

  // Dynamic Hand Item Display
  const currentSelectedBlock = getSelectedBlock();
  if (currentSelectedBlock !== lastSelectedBlock) {
    lastSelectedBlock = currentSelectedBlock;
    setHandItem(currentSelectedBlock);
  }

  // Update hand overlay (idle bob, swing animation)
  updateHand(deltaTime, isMining);

  // Update particles
  updateParticles(deltaTime);

  // Update drops
  updateDrops(deltaTime, player.position);

  // Update entities
  updateEntities(deltaTime, player.position);

  // Debug info
  debugInfo.innerHTML = `FPS: ${fps}<br>` +
    `Pos: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}<br>` +
    `Chunk: ${pChunk.x}, ${pChunk.z}<br>` +
    `Seed: ${SEED}`;

  // Render world scene
  renderer.clear();
  renderer.setClearColor(skyColor);
  renderer.render(scene, camera);

  // Render hand overlay on top (no depth clear)
  renderer.clearDepth();
  renderer.render(handScene, handCamera);
}
