# VoxelWorld

A browser-based 3D voxel sandbox game built with JavaScript and Three.js. This game features a procedurally generated blocky world complete with physics, mining, item drops, an interactive hotbar, and immersive audio-visual environments.

## Features

- **Procedural Terrain Generation:** Automatically generates a rolling landscape with dirt, grass, stone, sand, flora, and water bodies.
- **First-Person Controls:** Standard WASD movement, jumping, and mouse-look for navigation.
- **Advanced Water Physics:** Realistic buoyancy and swimming mechanics. Sound effects adjust based on submersion, including underwater bubbles and splashing. Includes a smart "auto-jump" functionality for smoothly stepping out of water onto land.
- **Mining & Placing:** Mine blocks in the environment. Mined blocks will spawn as physics-enabled dropping items.
- **Interactive Hotbar & Inventory:** Pick up block drops, which then populate your hotbar. 
- **Dynamic Hand Rendering:** First-person hand model dynamically renders the block you currently have selected in your hotbar.
- **Immersive Audio & Particles:** Splashing sounds, underwater ambient audio, and particle effects enhance the overall environment.

## Technologies

- **[Three.js](https://threejs.org/):** Core library powering 3D rendering.
- **Vite:** Build tool for fast local development and optimized production bundling.

## Setup & Run Local Development

1. **Install Dependencies:**
   Make sure you have Node.js installed, then run:
   ```bash
   npm install
   ```
2. **Start the Development Server:**
   ```bash
   npm run dev
   ```
3. Open your browser to the local URL provided by Vite (typically `http://localhost:5173/`).

## Controls
*   **W, A, S, D:** Move
*   **Mouse Move:** Look around (click into the game to lock pointer)
*   **Spacebar:** Jump (or swim up while in water)
*   **Left Click:** Mine block / interact
*   **Right Click:** Place block
*   **1-9 Keys / Scroll Wheel:** Select items from the hotbar

## Code Structure Overview
*   `src/main.js` - Game entry point and loop.
*   `src/world.js` / `src/terrain.js` - Map storage, chunking, and procedural generation logic.
*   `src/player.js` - Movement, collision detection, and physics.
*   `src/mining.js` / `src/drops.js` - Block breaking raycasting and item drop spawning.
*   `src/hotbar.js` / `src/hand.js` - Inventory state and dynamic first-person 3D hand item rendering.
*   `src/audio.js` - Sound synthesis and effect management.
