import { playKickSound, playGoalSound, playSaveSound, playWhistleSound } from "../audioSynth";

describe("audioSynth - Audio playback initializers", () => {
  let mockOscillator: any;
  let mockGain: any;
  let mockAudioContext: any;
  let mockBufferSource: any;
  let mockBiquadFilter: any;
  let originalAudioContext: any;

  beforeAll(() => {
    originalAudioContext = (window as any).AudioContext;
  });

  afterAll(() => {
    (window as any).AudioContext = originalAudioContext;
  });

  beforeEach(() => {
    mockOscillator = {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      type: "sine",
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        value: 440,
      },
    };

    mockGain = {
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
      },
    };

    mockBufferSource = {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
    };

    mockBiquadFilter = {
      connect: jest.fn(),
      type: "bandpass",
      frequency: {
        value: 350,
      },
    };

    mockAudioContext = {
      createOscillator: jest.fn().mockReturnValue(mockOscillator),
      createGain: jest.fn().mockReturnValue(mockGain),
      createBuffer: jest.fn().mockReturnValue({
        getChannelData: jest.fn().mockReturnValue(new Float32Array(100)),
      }),
      createBufferSource: jest.fn().mockReturnValue(mockBufferSource),
      createBiquadFilter: jest.fn().mockReturnValue(mockBiquadFilter),
      destination: {},
      currentTime: 10,
      state: "suspended",
      resume: jest.fn().mockResolvedValue(undefined),
      sampleRate: 44100,
    };

    // Assign mock AudioContext directly to existing window object in jsdom
    (window as any).AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
  });

  afterEach(() => {
    // Reset module-level caching of AudioContext
    jest.resetModules();
  });

  test("does not initialize context if muted", () => {
    const { playKickSound } = require("../audioSynth");
    playKickSound(true);
    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  test("playKickSound initializes AudioContext when not muted", () => {
    const { playKickSound } = require("../audioSynth");
    playKickSound(false);
    expect(window.AudioContext).toHaveBeenCalled();
  });

  test("playGoalSound initializes AudioContext when not muted", () => {
    const { playGoalSound } = require("../audioSynth");
    playGoalSound(false);
    expect(window.AudioContext).toHaveBeenCalled();
  });

  test("playSaveSound initializes AudioContext when not muted", () => {
    const { playSaveSound } = require("../audioSynth");
    playSaveSound(false);
    expect(window.AudioContext).toHaveBeenCalled();
  });

  test("playWhistleSound initializes AudioContext when not muted", () => {
    const { playWhistleSound } = require("../audioSynth");
    playWhistleSound(false);
    expect(window.AudioContext).toHaveBeenCalled();
  });

  test("resumes suspended AudioContext", () => {
    const { playKickSound } = require("../audioSynth");
    playKickSound(false);
    expect(mockAudioContext.resume).toHaveBeenCalled();
  });
});
