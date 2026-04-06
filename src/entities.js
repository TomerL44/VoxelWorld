/**
 * entities.js — Simple voxel wildlife entities.
 * Blocky rabbits that hop near grass, cubic fish that swim in water.
 */
import * as THREE from 'three';
import { getHeight, getWaterLevel } from './terrain.js';

const MAX_RABBITS = 12;
const MAX_FISH = 10;

let rabbits = [];
let fish = [];
let entityGroup;

/**
 * Create a blocky rabbit mesh.
 */
function createRabbitMesh() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.7);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xc4a882 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.35;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 0.55, 0.35);
  group.add(head);

  // Ears
  const earGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
  const earMat = new THREE.MeshLambertMaterial({ color: 0xd4b892 });
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.1, 0.85, 0.35);
  const earR = new THREE.Mesh(earGeo, earMat);
  earR.position.set(0.1, 0.85, 0.35);
  group.add(earL, earR);

  // Eyes
  const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 0.6, 0.52);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 0.6, 0.52);
  group.add(eyeL, eyeR);

  // Tail
  const tailGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.4, -0.35);
  group.add(tail);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
  const positions = [[-0.15, 0.1, 0.2], [0.15, 0.1, 0.2], [-0.15, 0.1, -0.2], [0.15, 0.1, -0.2]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(x, y, z);
    group.add(leg);
  }

  group.castShadow = true;
  return group;
}

/**
 * Create a cubic fish mesh.
 */
function createFishMesh() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.2, 0.2, 0.5);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf4a460 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Tail fin
  const tailGeo = new THREE.BoxGeometry(0.02, 0.2, 0.2);
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xe88c3a });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0, -0.3);
  group.add(tail);

  // Eye
  const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 0.03, 0.18);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 0.03, 0.18);
  group.add(eyeL, eyeR);

  return group;
}

/**
 * Initialize entities in the world.
 */
export function initEntities(scene, playerPos) {
  entityGroup = new THREE.Group();

  // Spawn rabbits near the player
  for (let i = 0; i < MAX_RABBITS; i++) {
    const mesh = createRabbitMesh();
    const x = playerPos.x + (Math.random() - 0.5) * 80;
    const z = playerPos.z + (Math.random() - 0.5) * 80;
    const h = getHeight(Math.floor(x), Math.floor(z));
    const waterLevel = getWaterLevel();

    if (h > waterLevel) {
      mesh.position.set(x, h + 1, z);
      mesh.userData = {
        type: 'rabbit',
        velocity: new THREE.Vector3(),
        hopTimer: Math.random() * 3,
        direction: Math.random() * Math.PI * 2,
        grounded: true,
      };
      entityGroup.add(mesh);
      rabbits.push(mesh);
    }
  }

  // Spawn fish in water
  const waterLevel = getWaterLevel();
  for (let i = 0; i < MAX_FISH; i++) {
    const mesh = createFishMesh();
    const x = playerPos.x + (Math.random() - 0.5) * 60;
    const z = playerPos.z + (Math.random() - 0.5) * 60;
    const h = getHeight(Math.floor(x), Math.floor(z));

    if (h < waterLevel) {
      const swimY = h + 1 + Math.random() * (waterLevel - h - 1);
      mesh.position.set(x, swimY, z);
      mesh.userData = {
        type: 'fish',
        swimAngle: Math.random() * Math.PI * 2,
        swimSpeed: 0.5 + Math.random() * 1.5,
        swimRadius: 2 + Math.random() * 5,
        centerX: x,
        centerZ: z,
        bobPhase: Math.random() * Math.PI * 2,
      };
      entityGroup.add(mesh);
      fish.push(mesh);
    }
  }

  scene.add(entityGroup);
}

/**
 * Update all entities each frame.
 */
export function updateEntities(deltaTime, playerPos) {
  // Update rabbits
  for (const rabbit of rabbits) {
    const data = rabbit.userData;
    data.hopTimer -= deltaTime;

    if (data.hopTimer <= 0) {
      // New hop
      data.direction = Math.random() * Math.PI * 2;
      data.velocity.x = Math.cos(data.direction) * 2;
      data.velocity.z = Math.sin(data.direction) * 2;
      data.velocity.y = 3;
      data.hopTimer = 1 + Math.random() * 3;
      data.grounded = false;
    }

    if (!data.grounded) {
      data.velocity.y -= 9.81 * deltaTime;
      rabbit.position.x += data.velocity.x * deltaTime;
      rabbit.position.y += data.velocity.y * deltaTime;
      rabbit.position.z += data.velocity.z * deltaTime;

      const groundH = getHeight(Math.floor(rabbit.position.x), Math.floor(rabbit.position.z)) + 1;
      if (rabbit.position.y <= groundH) {
        rabbit.position.y = groundH;
        data.velocity.set(0, 0, 0);
        data.grounded = true;
      }
    }

    // Face direction of movement
    if (data.velocity.x !== 0 || data.velocity.z !== 0) {
      rabbit.rotation.y = Math.atan2(data.velocity.x, data.velocity.z);
    }

    // Respawn far rabbits near player
    const dist = rabbit.position.distanceTo(playerPos);
    if (dist > 100) {
      const angle = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 40;
      rabbit.position.x = playerPos.x + Math.cos(angle) * r;
      rabbit.position.z = playerPos.z + Math.sin(angle) * r;
      const h = getHeight(Math.floor(rabbit.position.x), Math.floor(rabbit.position.z));
      if (h > getWaterLevel()) {
        rabbit.position.y = h + 1;
      }
    }
  }

  // Update fish
  for (const f of fish) {
    const data = f.userData;
    data.swimAngle += data.swimSpeed * deltaTime;
    f.position.x = data.centerX + Math.cos(data.swimAngle) * data.swimRadius;
    f.position.z = data.centerZ + Math.sin(data.swimAngle) * data.swimRadius;

    // Bob up and down
    data.bobPhase += deltaTime * 2;
    f.position.y += Math.sin(data.bobPhase) * 0.002;

    // Face swim direction
    f.rotation.y = data.swimAngle + Math.PI / 2;

    // Tail wag effect via slight rotation
    f.rotation.z = Math.sin(data.swimAngle * 3) * 0.1;
  }
}
