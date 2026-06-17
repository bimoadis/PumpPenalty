// Web Audio API Sound Synthesizer for Retro 8-bit Sound Effects
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    // Standard AudioContext initialization
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended (browser autoplay restriction workaround)
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

  // Pitch sweep from 150Hz down to 40Hz (kick sweep)
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

  // Volume decay
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

    osc.type = "square"; // Perfect 8-bit sound signature
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

  const bufferSize = ctx.sampleRate * 0.1; // 100ms buffer
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Fill buffer with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 350; // Central frequency

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

  // Two close frequencies to create a wobbling whistle effect
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
