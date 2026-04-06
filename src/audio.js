/**
 * audio.js — Procedural Web Audio API sound effects.
 * Includes splash sounds and looping bubbles for water physics.
 */

let audioCtx = null;

// The bubble sequence state
let isBubbling = false;
let nextBubbleTime = 0;
let bubbleTimer = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Generate a white noise buffer.
 */
function getNoiseBuffer() {
  const ctx = getContext();
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Play a simulated splash sound using filtered noise.
 */
export function playSplashSound() {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = getNoiseBuffer();

    // Create a lowpass filter that sweeps down
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);

    // Gain envelope for the splash
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start(ctx.currentTime);
    noiseSource.stop(ctx.currentTime + 1.0);
  } catch (e) {
    console.error("Audio error", e);
  }
}

/**
 * Play a single bubble pop sound (sine sweep).
 */
function playBubblePop(time) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const freq = 400 + Math.random() * 400; // Random fundamental frequency

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.1); // Sweeps up quickly

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.15);
}

/**
 * Schedule loop of bubbles while underwater.
 */
function scheduleBubbles() {
  if (!isBubbling) return;
  const ctx = getContext();

  // Schedule bubbles ahead of time
  while (nextBubbleTime < ctx.currentTime + 0.1) {
    if (nextBubbleTime < ctx.currentTime) {
      nextBubbleTime = ctx.currentTime;
    }
    playBubblePop(nextBubbleTime);
    // Random interval between bubbles (0.1 to 0.4 seconds)
    nextBubbleTime += 0.1 + Math.random() * 0.3;
  }

  bubbleTimer = setTimeout(scheduleBubbles, 50);
}

/**
 * Start the looping underwater bubble sounds.
 */
export function startBubbleSound() {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    if (isBubbling) return;
    isBubbling = true;
    nextBubbleTime = ctx.currentTime + 0.1;
    scheduleBubbles();
  } catch (e) {
    console.error("Audio error", e);
  }
}

/**
 * Stop the underwater bubble sounds.
 */
export function stopBubbleSound() {
  isBubbling = false;
  if (bubbleTimer) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  }
}
