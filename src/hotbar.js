/**
 * hotbar.js — Hotbar UI system with 9 slots, scroll selection, and block placement support.
 * Manages slot contents (blockType + count), renders the DOM hotbar, and handles scroll input.
 */
import { BlockType } from './blocks.js';

const SLOT_COUNT = 9;

// Hotbar state: array of { blockType, count } or null for empty
let slots = new Array(SLOT_COUNT).fill(null);
let selectedSlot = 0;

// Block display names
const BLOCK_NAMES = {
  [BlockType.GRASS]: 'Grass',
  [BlockType.DIRT]: 'Dirt',
  [BlockType.STONE]: 'Stone',
  [BlockType.SAND]: 'Sand',
  [BlockType.OAK_LOG]: 'Oak Log',
  [BlockType.OAK_LEAVES]: 'Leaves',
  [BlockType.BIRCH_LOG]: 'Birch',
  [BlockType.BIRCH_LEAVES]: 'B.Leaves',
  [BlockType.FLOWER_RED]: 'Poppy',
  [BlockType.FLOWER_YELLOW]: 'Sunflwr',
  [BlockType.TALL_GRASS]: 'T.Grass',
};

// Block colors for slot preview squares
const SLOT_COLORS = {
  [BlockType.GRASS]: '#5FA03C',
  [BlockType.DIRT]: '#866043',
  [BlockType.STONE]: '#808080',
  [BlockType.SAND]: '#D7C88C',
  [BlockType.OAK_LOG]: '#553C23',
  [BlockType.OAK_LEAVES]: '#328228',
  [BlockType.BIRCH_LOG]: '#DCD7CD',
  [BlockType.BIRCH_LEAVES]: '#50A03C',
  [BlockType.FLOWER_RED]: '#CC2020',
  [BlockType.FLOWER_YELLOW]: '#F0D21E',
  [BlockType.TALL_GRASS]: '#3C8C2D',
};

/**
 * Initialize the hotbar system.
 */
export function initHotbar() {
  // Build DOM
  renderHotbar();

  // Scroll wheel to change selected slot
  document.addEventListener('wheel', (e) => {
    if (!document.pointerLockElement) return;
    e.preventDefault();

    if (e.deltaY > 0) {
      selectedSlot = (selectedSlot + 1) % SLOT_COUNT;
    } else {
      selectedSlot = (selectedSlot - 1 + SLOT_COUNT) % SLOT_COUNT;
    }
    updateSelection();
  }, { passive: false });

  // Number keys 1-9 to select slots
  document.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      selectedSlot = num - 1;
      updateSelection();
    }
  });
}

/**
 * Add a block to the hotbar. Returns true if added successfully.
 */
export function addToHotbar(blockType) {
  // First: try to stack onto existing slot with same block type
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (slots[i] && slots[i].blockType === blockType) {
      slots[i].count++;
      renderSlotContent(i);
      return true;
    }
  }

  // Second: find first empty slot
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (!slots[i]) {
      slots[i] = { blockType, count: 1 };
      renderSlotContent(i);
      return true;
    }
  }

  // Hotbar full
  return false;
}

/**
 * Get the currently selected block type (or null if slot empty).
 */
export function getSelectedBlock() {
  const slot = slots[selectedSlot];
  return slot ? slot.blockType : null;
}

/**
 * Consume one block from the selected slot. Returns the blockType consumed, or null.
 */
export function consumeSelectedBlock() {
  const slot = slots[selectedSlot];
  if (!slot || slot.count <= 0) return null;

  const blockType = slot.blockType;
  slot.count--;

  if (slot.count <= 0) {
    slots[selectedSlot] = null;
  }

  renderSlotContent(selectedSlot);
  return blockType;
}

/**
 * Get selected slot index.
 */
export function getSelectedSlotIndex() {
  return selectedSlot;
}

// ——— DOM rendering ———

function renderHotbar() {
  const container = document.getElementById('hotbar-container');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot' + (i === selectedSlot ? ' hotbar-selected' : '');
    slot.id = `hotbar-slot-${i}`;

    // Slot number
    const num = document.createElement('span');
    num.className = 'hotbar-num';
    num.textContent = i + 1;
    slot.appendChild(num);

    // Block preview
    const preview = document.createElement('div');
    preview.className = 'hotbar-preview';
    preview.id = `hotbar-preview-${i}`;
    slot.appendChild(preview);

    // Count badge
    const count = document.createElement('span');
    count.className = 'hotbar-count';
    count.id = `hotbar-count-${i}`;
    slot.appendChild(count);

    container.appendChild(slot);
  }
}

function renderSlotContent(index) {
  const preview = document.getElementById(`hotbar-preview-${index}`);
  const countEl = document.getElementById(`hotbar-count-${index}`);
  if (!preview || !countEl) return;

  const slot = slots[index];

  if (slot) {
    const color = SLOT_COLORS[slot.blockType] || '#808080';
    preview.style.background = color;
    preview.title = BLOCK_NAMES[slot.blockType] || 'Block';
    countEl.textContent = slot.count > 1 ? slot.count : '';
  } else {
    preview.style.background = 'transparent';
    preview.title = '';
    countEl.textContent = '';
  }
}

function updateSelection() {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const el = document.getElementById(`hotbar-slot-${i}`);
    if (el) {
      el.classList.toggle('hotbar-selected', i === selectedSlot);
    }
  }
}
