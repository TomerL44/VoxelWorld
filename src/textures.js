/**
 * textures.js — Procedurally generates pixel-art block textures as canvas elements.
 * Creates a texture atlas so we can use a single material for all blocks.
 */
import * as THREE from 'three';

const TEX_SIZE = 16; // 16x16 pixel textures

/** Fill a canvas region with a base color and add pixel noise */
function fillWithNoise(ctx, x, y, w, h, baseColor, noiseAmount = 15) {
  const [r, g, b] = baseColor;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const nr = r + (Math.random() - 0.5) * noiseAmount * 2;
      const ng = g + (Math.random() - 0.5) * noiseAmount * 2;
      const nb = b + (Math.random() - 0.5) * noiseAmount * 2;
      ctx.fillStyle = `rgb(${nr|0},${ng|0},${nb|0})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

function createTexture(drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, TEX_SIZE);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ——— Individual texture generators ———

function grassTop(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [95, 160, 60], 18);
  // Scattered darker green pixels
  for (let i = 0; i < 12; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${70 + (Math.random()*20)|0},${130 + (Math.random()*20)|0},${45 + (Math.random()*15)|0})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function grassSide(ctx, s) {
  // Top 3 pixels = grass edge
  fillWithNoise(ctx, 0, 0, s, 3, [95, 160, 60], 15);
  // Rest = dirt
  fillWithNoise(ctx, 0, 3, s, s - 3, [134, 96, 67], 12);
  // Some dirt spots
  for (let i = 0; i < 6; i++) {
    const px = (Math.random() * s) | 0;
    const py = (3 + Math.random() * (s - 3)) | 0;
    ctx.fillStyle = `rgb(${115 + (Math.random()*15)|0},${80 + (Math.random()*15)|0},${55 + (Math.random()*10)|0})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function dirt(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [134, 96, 67], 14);
  for (let i = 0; i < 8; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${110 + (Math.random()*20)|0},${75 + (Math.random()*20)|0},${50 + (Math.random()*15)|0})`;
    ctx.fillRect(px, py, 2, 1);
  }
}

function stone(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [128, 128, 128], 16);
  // Cracks
  for (let i = 0; i < 4; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${95 + (Math.random()*20)|0},${95 + (Math.random()*20)|0},${95 + (Math.random()*20)|0})`;
    ctx.fillRect(px, py, 2, 1);
    ctx.fillRect(px, py + 1, 1, 1);
  }
}

function sand(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [215, 200, 140], 12);
  for (let i = 0; i < 10; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${225 + (Math.random()*15)|0},${210 + (Math.random()*15)|0},${150 + (Math.random()*10)|0})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function water(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [30, 100, 200], 18);
  // Light caustic streaks
  for (let i = 0; i < 5; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgba(120,200,255,0.4)`;
    ctx.fillRect(px, py, 3, 1);
  }
}

function oakLog(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [85, 60, 35], 10);
  // Bark lines
  for (let y = 0; y < s; y += 3) {
    for (let x = 0; x < s; x++) {
      if (Math.random() < 0.3) {
        ctx.fillStyle = `rgb(${70 + (Math.random()*15)|0},${48 + (Math.random()*10)|0},${25 + (Math.random()*10)|0})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function oakLogTop(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [160, 130, 80], 12);
  // Rings
  const cx = s / 2; const cy = s / 2;
  for (let r = 2; r < s / 2; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const px = (cx + Math.cos(a) * r) | 0;
      const py = (cy + Math.sin(a) * r) | 0;
      if (px >= 0 && px < s && py >= 0 && py < s) {
        ctx.fillStyle = `rgb(${130 + (Math.random()*20)|0},${100 + (Math.random()*20)|0},${60 + (Math.random()*15)|0})`;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

function oakLeaves(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [50, 130, 40], 22);
  for (let i = 0; i < 15; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${35 + (Math.random()*30)|0},${110 + (Math.random()*40)|0},${25 + (Math.random()*20)|0})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function birchLog(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [220, 215, 205], 8);
  // Dark birch marks
  for (let i = 0; i < 5; i++) {
    const px = (Math.random() * (s - 3)) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${50 + (Math.random()*30)|0},${45 + (Math.random()*25)|0},${40 + (Math.random()*20)|0})`;
    ctx.fillRect(px, py, 3, 1);
  }
}

function birchLeaves(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [80, 160, 60], 20);
  for (let i = 0; i < 10; i++) {
    const px = (Math.random() * s) | 0;
    const py = (Math.random() * s) | 0;
    ctx.fillStyle = `rgb(${100 + (Math.random()*30)|0},${180 + (Math.random()*30)|0},${70 + (Math.random()*20)|0})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function flowerRed(ctx, s) {
  // Green stem background
  ctx.fillStyle = '#2a8a2a';
  fillWithNoise(ctx, 0, 0, s, s, [40, 120, 40], 15);
  // Red flower petals on top portion
  const cx = s / 2;
  for (let dy = 1; dy < 6; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + Math.abs(dy - 3) < 4) {
        ctx.fillStyle = `rgb(${200 + (Math.random()*55)|0},${20 + (Math.random()*30)|0},${20 + (Math.random()*30)|0})`;
        ctx.fillRect(cx + dx, dy, 1, 1);
      }
    }
  }
  // Stem
  ctx.fillStyle = '#1a6a1a';
  ctx.fillRect(cx, 5, 1, s - 5);
}

function flowerYellow(ctx, s) {
  fillWithNoise(ctx, 0, 0, s, s, [40, 120, 40], 15);
  const cx = s / 2;
  // Yellow petals
  for (let dy = 0; dy < 6; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.abs(dx) + Math.abs(dy - 3) < 4) {
        ctx.fillStyle = `rgb(${240 + (Math.random()*15)|0},${210 + (Math.random()*30)|0},${30 + (Math.random()*30)|0})`;
        ctx.fillRect(cx + dx, dy, 1, 1);
      }
    }
  }
  ctx.fillStyle = '#1a6a1a';
  ctx.fillRect(cx, 5, 1, s - 5);
}

function tallGrass(ctx, s) {
  ctx.clearRect(0, 0, s, s);
  // Grass blades
  for (let i = 0; i < 6; i++) {
    const bx = (2 + Math.random() * (s - 4)) | 0;
    const bh = (6 + Math.random() * 8) | 0;
    for (let y = s - 1; y > s - bh; y--) {
      const sway = Math.sin((s - y) * 0.3 + i) * 1.5;
      ctx.fillStyle = `rgb(${60 + (Math.random()*30)|0},${140 + (Math.random()*30)|0},${45 + (Math.random()*15)|0})`;
      ctx.fillRect((bx + sway) | 0, y, 1, 1);
    }
  }
}

// ——— Build and export all textures ———
export function createAllTextures() {
  return {
    grass_top: createTexture(grassTop),
    grass_side: createTexture(grassSide),
    dirt: createTexture(dirt),
    stone: createTexture(stone),
    sand: createTexture(sand),
    water: createTexture(water),
    oak_log: createTexture(oakLog),
    oak_log_top: createTexture(oakLogTop),
    oak_leaves: createTexture(oakLeaves),
    birch_log: createTexture(birchLog),
    birch_leaves: createTexture(birchLeaves),
    flower_red: createTexture(flowerRed),
    flower_yellow: createTexture(flowerYellow),
    tall_grass: createTexture(tallGrass),
  };
}
