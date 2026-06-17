// Web Audio API Sound Synthesizer for Retro 8-bit Sound Effects
let audioCtx: AudioContext | null = null;
let bgmInterval: any = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Kick Drum sound (for shooting/kicking)
export function playKickSound(isMuted: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = "sine";
  const now = ctx.currentTime;

  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

  gainNode.gain.setValueAtTime(1, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.15);
}

// 2. Goal Fanfare (cheerful 8-bit arpeggio)
export function playGoalSound(isMuted: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
  const duration = 0.08;

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now + index * duration);

    gainNode.gain.setValueAtTime(0.3, now + index * duration);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + (index + 1) * duration);

    osc.start(now + index * duration);
    osc.stop(now + (index + 1) * duration);
  });
}

// 3. Save Thud (short white noise pulse for keeper block)
export function playSaveSound(isMuted: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 350;

  const gainNode = ctx.createGain();
  const now = ctx.currentTime;

  gainNode.gain.setValueAtTime(0.8, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  noiseNode.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseNode.start(now);
  noiseNode.stop(now + 0.1);
}

// 4. Referee Whistle sound
export function playWhistleSound(isMuted: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const now = ctx.currentTime;

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.type = "sine";
  osc2.type = "sine";

  osc1.frequency.setValueAtTime(2200, now);
  osc2.frequency.setValueAtTime(2230, now);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);
}

// 5. Post Hit sound (metallic ping for clanking on post/bar)
export function playPostHitSound(isMuted: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // A high-pitched metallic ping using triangle
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(987.77, now); // B5 note
  osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // Sweep to G5
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.25);

  // Secondary resonance (square wave)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(1318.51, now); // E6 note
  osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // Sweep to C6
  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.15);
}

// 6. Crowds Cheering sound (white noise bandpass sweep)
export function playCheerSound(isMuted: boolean = false) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.5;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.4);
  filter.frequency.exponentialRampToValueAtTime(550, now + 1.2);
  filter.Q.value = 1.2;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.22, now + 0.2);
  gainNode.gain.linearRampToValueAtTime(0.18, now + 0.8);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  noiseNode.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseNode.start(now);
  noiseNode.stop(now + duration);
}

// 7. Background Music (8-bit looping chiptune melody)
export function startBGM(isMuted: boolean = false) {
  if (isMuted) {
    stopBGM();
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;

  if (bgmInterval) return; // Already running

  const notes = [
    130.81, 164.81, 196.00, 261.63, // C3, E3, G3, C4
    220.00, 261.63, 329.63, 440.00, // A3, C4, E4, A4
    174.61, 220.00, 261.63, 349.23, // F3, A3, C4, F4
    196.00, 246.94, 293.66, 392.00  // G3, B3, D4, G4
  ];
  let step = 0;

  bgmInterval = setInterval(() => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === "suspended") return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Soft retro triangle wave
    osc.type = "triangle";
    osc.frequency.setValueAtTime(notes[step % notes.length], now);

    gainNode.gain.setValueAtTime(0.04, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.19);

    step++;
  }, 200);
}

export function stopBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
}

let crowdAmbientNode: AudioBufferSourceNode | null = null;
let crowdGainNode: GainNode | null = null;
let crowdLFONode: OscillatorNode | null = null;

// 8. Crowd Ambient Sound (stadium crowd murmur with LFO sweeps)
export function startCrowdAmbient(isMuted: boolean = false) {
  if (isMuted) {
    stopCrowdAmbient();
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;

  if (crowdAmbientNode) return; // Already running

  const duration = 2.0;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate continuous murmur using low-amplitude noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  crowdAmbientNode = ctx.createBufferSource();
  crowdAmbientNode.buffer = buffer;
  crowdAmbientNode.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 500;
  filter.Q.value = 0.8;

  crowdGainNode = ctx.createGain();
  crowdGainNode.gain.setValueAtTime(0.012, ctx.currentTime); // Soft background level

  crowdAmbientNode.connect(filter);
  filter.connect(crowdGainNode);
  crowdGainNode.connect(ctx.destination);

  // Slow LFO for stadium volume & frequency waves
  crowdLFONode = ctx.createOscillator();
  crowdLFONode.type = "sine";
  crowdLFONode.frequency.value = 0.25; // Wave once every 4 seconds

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 120; // Sweeps filter frequency by +/- 120Hz

  crowdLFONode.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  crowdAmbientNode.start(0);
  crowdLFONode.start(0);
}

export function stopCrowdAmbient() {
  if (crowdAmbientNode) {
    try {
      crowdAmbientNode.stop();
    } catch (e) {}
    crowdAmbientNode = null;
  }
  if (crowdLFONode) {
    try {
      crowdLFONode.stop();
    } catch (e) {}
    crowdLFONode = null;
  }
  crowdGainNode = null;
}

