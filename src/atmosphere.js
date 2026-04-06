/**
 * atmosphere.js — Day/night cycle, clouds, fog, and skybox.
 * 20-minute day/night cycle with rotating directional light,
 * procedural skybox gradient, floating clouds, and distance fog.
 */
import * as THREE from 'three';

const DAY_DURATION = 20 * 60; // 20 minutes in seconds
const CLOUD_COUNT = 60;

let sunLight, moonLight, ambientLight;
let skyUniforms;
let clouds = [];
let fogRef;
let timeOfDay = 0.375; // Start at mid-morning (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)

// Sky colors at different times
const SKY_COLORS = {
  dawn: new THREE.Color(0xff7b54),
  day: new THREE.Color(0x87ceeb),
  dusk: new THREE.Color(0xff6b35),
  night: new THREE.Color(0x0a0a2e),
};

/**
 * Initialize atmosphere systems.
 */
export function initAtmosphere(scene) {
  // Directional sun light
  sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sunLight.position.set(100, 200, 100);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  scene.add(sunLight);

  // Moon light (dimmer, blueish)
  moonLight = new THREE.DirectionalLight(0x8888cc, 0.15);
  moonLight.position.set(-100, 150, -100);
  scene.add(moonLight);

  // Ambient light — strong fill to prevent dark faces
  ambientLight = new THREE.AmbientLight(0x8899bb, 0.8);
  scene.add(ambientLight);

  // Hemisphere light for natural sky/ground fill
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556633, 0.6);
  scene.add(hemiLight);

  // Fog
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0025);
  fogRef = scene.fog;

  // Create clouds
  createClouds(scene);

  return { sunLight, moonLight, ambientLight };
}

function createClouds(scene) {
  const cloudGroup = new THREE.Group();
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloud = new THREE.Group();

    // Each cloud is a cluster of rectangular blocks
    const blockCount = 3 + Math.floor(Math.random() * 6);
    for (let b = 0; b < blockCount; b++) {
      const w = 4 + Math.random() * 12;
      const h = 1 + Math.random() * 2;
      const d = 4 + Math.random() * 8;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, cloudMaterial);
      mesh.position.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 10
      );
      cloud.add(mesh);
    }

    cloud.position.set(
      (Math.random() - 0.5) * 600,
      80 + Math.random() * 40,
      (Math.random() - 0.5) * 600
    );

    cloud.userData = {
      speed: 0.3 + Math.random() * 0.5,
      originalX: cloud.position.x,
    };

    cloudGroup.add(cloud);
    clouds.push(cloud);
  }

  scene.add(cloudGroup);
}

/**
 * Update atmosphere each frame.
 * @param {number} deltaTime - Time since last frame in seconds
 * @param {THREE.Camera} camera - Player camera for fog/cloud tracking
 */
export function updateAtmosphere(deltaTime, camera) {
  // Advance time of day
  timeOfDay += deltaTime / DAY_DURATION;
  if (timeOfDay > 1) timeOfDay -= 1;

  // Sun angle (full rotation)
  const sunAngle = timeOfDay * Math.PI * 2 - Math.PI / 2;
  const sunRadius = 200;
  sunLight.position.set(
    Math.cos(sunAngle) * sunRadius + camera.position.x,
    Math.sin(sunAngle) * sunRadius,
    camera.position.z
  );
  sunLight.target.position.copy(camera.position);
  sunLight.target.updateMatrixWorld();

  // Moon opposite to sun
  moonLight.position.set(
    -Math.cos(sunAngle) * sunRadius + camera.position.x,
    -Math.sin(sunAngle) * sunRadius * 0.7,
    camera.position.z
  );

  // Calculate sun elevation for intensity
  const sunElevation = Math.sin(sunAngle);

  // Sun intensity based on elevation
  const dayIntensity = Math.max(0, sunElevation);
  sunLight.intensity = dayIntensity * 2.0;

  // Sun color (golden at horizon, white at zenith)
  const horizonFactor = 1 - Math.abs(sunElevation);
  sunLight.color.setRGB(
    1,
    0.9 + horizonFactor * 0.1,
    0.8 - horizonFactor * 0.3
  );

  // Moon visibility when sun is down
  moonLight.intensity = Math.max(0, -sunElevation * 0.3);

  // Ambient light changes — keep minimum high enough to see all faces
  ambientLight.intensity = 0.4 + dayIntensity * 0.6;
  ambientLight.color.lerpColors(
    new THREE.Color(0x202040),
    new THREE.Color(0x8899bb),
    dayIntensity
  );

  // Sky / fog color
  let skyColor;
  if (sunElevation > 0.1) {
    // Day
    skyColor = SKY_COLORS.day.clone();
  } else if (sunElevation > -0.1) {
    // Dawn/dusk
    const t = (sunElevation + 0.1) / 0.2;
    const dawnDusk = timeOfDay < 0.5 ? SKY_COLORS.dawn : SKY_COLORS.dusk;
    skyColor = new THREE.Color().lerpColors(SKY_COLORS.night, dawnDusk, t);
    skyColor.lerp(SKY_COLORS.day, Math.max(0, t - 0.5) * 2);
  } else {
    // Night
    skyColor = SKY_COLORS.night.clone();
  }

  fogRef.color.copy(skyColor);

  // Animate clouds
  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * deltaTime;
    // Wrap around
    if (cloud.position.x > camera.position.x + 350) {
      cloud.position.x = camera.position.x - 350;
    }
    if (cloud.position.x < camera.position.x - 350) {
      cloud.position.x = camera.position.x + 350;
    }
    // Keep clouds near player Z
    const dz = cloud.position.z - camera.position.z;
    if (Math.abs(dz) > 350) {
      cloud.position.z = camera.position.z + (Math.random() - 0.5) * 400;
    }
  }

  return skyColor;
}

export function getTimeOfDay() {
  return timeOfDay;
}
