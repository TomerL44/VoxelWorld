/**
 * hand.js — First-person hand + pickaxe overlay.
 * Rendered in a separate HUD scene with its own camera.
 * Features idle bobbing and mining swing animations.
 */
import * as THREE from 'three';
import { getBlockMaterial } from './blocks.js';

let handScene, handCamera;
let handGroup, pickaxeGroup, armGroup, customBlockGroup;
let swingProgress = 0;
let isSwinging = false;
let idleTime = 0;

/**
 * Initialize the hand overlay system.
 */
export function initHand() {
  // Separate scene for hand HUD (unaffected by world fog/lighting)
  handScene = new THREE.Scene();

  // Orthographic-like perspective for hand
  handCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10);
  handCamera.position.set(0, 0, 0);

  // Lighting for hand scene
  const handAmbient = new THREE.AmbientLight(0xffffff, 0.7);
  handScene.add(handAmbient);
  const handDir = new THREE.DirectionalLight(0xfff8e8, 0.8);
  handDir.position.set(1, 2, 1);
  handScene.add(handDir);

  // Main group positioned in bottom-right of view
  handGroup = new THREE.Group();
  handGroup.position.set(0.65, -0.55, -1.0);
  handGroup.rotation.set(0.1, -0.4, 0.05);
  handScene.add(handGroup);

  // Arm (skin-toned boxes)
  armGroup = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
  const skinDarkMat = new THREE.MeshLambertMaterial({ color: 0xc49464 });

  // Upper arm
  const upperArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.35, 0.12),
    skinMat
  );
  upperArm.position.set(0, 0, 0);
  armGroup.add(upperArm);

  // Hand/fist
  const hand = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.14),
    skinDarkMat
  );
  hand.position.set(0, 0.2, 0.02);
  armGroup.add(hand);

  // Sleeve (shirt color)
  const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x4a7a4a });
  const sleeve = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.1, 0.14),
    sleeveMat
  );
  sleeve.position.set(0, -0.15, 0);
  armGroup.add(sleeve);

  handGroup.add(armGroup);

  // Pickaxe
  pickaxeGroup = new THREE.Group();
  pickaxeGroup.position.set(0.02, 0.22, 0.0);
  pickaxeGroup.rotation.set(0, 0, -0.5);

  // Handle (wooden stick)
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.45, 0.04),
    handleMat
  );
  handle.position.set(0, 0.15, 0);
  pickaxeGroup.add(handle);

  // Pickaxe head (stone colored)
  const headMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

  // Top horizontal bar
  const headTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.05, 0.05),
    headMat
  );
  headTop.position.set(0, 0.38, 0);
  pickaxeGroup.add(headTop);

  // Left pick point
  const pickLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.04),
    headMat
  );
  pickLeft.position.set(-0.14, 0.35, 0);
  pickaxeGroup.add(pickLeft);

  // Right pick point
  const pickRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.04, 0.04),
    headMat
  );
  pickRight.position.set(0.14, 0.35, 0);
  pickaxeGroup.add(pickRight);

  handGroup.add(pickaxeGroup);

  // Group for custom held block
  customBlockGroup = new THREE.Group();
  customBlockGroup.position.set(0, 0.3, 0.05); // Above the fist
  customBlockGroup.rotation.set(-0.2, 0.3, 0);
  customBlockGroup.visible = false;
  handGroup.add(customBlockGroup);

  // Default to empty hand (hiding pickaxe right now would break existing flow, 
  // but setHandItem will handle the logic when called).

  // Handle window resize
  window.addEventListener('resize', () => {
    handCamera.aspect = window.innerWidth / window.innerHeight;
    handCamera.updateProjectionMatrix();
  });

  return { handScene, handCamera };
}

/**
 * Update the block or item the hand is holding.
 */
export function setHandItem(blockType) {
  // Clear any existing custom block
  while (customBlockGroup.children.length > 0) {
    const child = customBlockGroup.children[0];
    customBlockGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
  }

  if (blockType === null) {
    // Empty hand
    customBlockGroup.visible = false;
    pickaxeGroup.visible = false;
  } else {
    // Hold block
    const mat = getBlockMaterial(blockType);
    if (mat) {
      // Different geometry for cross-planes (flowers/grass) vs blocks
      let mesh;
      if (Array.isArray(mat) || mat.map?.name !== 'flower') {
        // Regular block
        const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        mesh = new THREE.Mesh(geo, mat);
      } else {
        // Wait, materials in this project might not have map.name...
        // We'll just try to use a box geometry for all of it to be safe,
        // or we could render planes for non-solid blocks.
        // For simplicity, hotbar items are just blocks, even flowers will look like a cube with the texture or flat.
        const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        mesh = new THREE.Mesh(geo, mat);
      }
      customBlockGroup.add(mesh);
      customBlockGroup.visible = true;
      pickaxeGroup.visible = false;
    }
  }
}

/**
 * Trigger the mining swing animation.
 */
export function triggerSwing() {
  if (!isSwinging) {
    isSwinging = true;
    swingProgress = 0;
  }
}

/**
 * Update hand animations.
 */
export function updateHand(deltaTime, isMining) {
  idleTime += deltaTime;

  // Idle bobbing
  const bobX = Math.sin(idleTime * 1.5) * 0.008;
  const bobY = Math.sin(idleTime * 2.0) * 0.012;
  handGroup.position.x = 0.65 + bobX;
  handGroup.position.y = -0.55 + bobY;

  // Mining swing animation
  if (isMining || isSwinging) {
    swingProgress += deltaTime * 6.0;

    if (swingProgress >= Math.PI) {
      swingProgress = 0;
      if (!isMining) isSwinging = false;
    }

    const swingAngle = Math.sin(swingProgress) * 0.6;
    
    // Rotate either pickaxe or the hand with the block
    if (pickaxeGroup.visible) {
      pickaxeGroup.rotation.z = -0.5 - swingAngle;
    } else {
      customBlockGroup.rotation.z = -swingAngle * 0.8;
    }
    
    armGroup.rotation.x = -swingAngle * 0.3;
  } else {
    // Return to rest
    if (pickaxeGroup.visible) {
      pickaxeGroup.rotation.z += (-0.5 - pickaxeGroup.rotation.z) * 0.1;
    } else {
      customBlockGroup.rotation.z *= 0.8;
    }
    armGroup.rotation.x *= 0.9;
  }
}

export function getHandScene() { return handScene; }
export function getHandCamera() { return handCamera; }
