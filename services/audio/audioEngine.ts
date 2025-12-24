/**
 * Audio Engine
 * Manages the Web Audio API context and engine sound synthesis
 */

export type SoundEffect = 'CRASH' | 'BUMP' | 'EXPLOSION' | 'TIRE' | 'BARREL' | 'REV' | 'GO' | 'VICTORY' | 'DEFEAT' | 'HEAL' | 'CHECKPOINT';

interface AudioEngineState {
    context: AudioContext | null;
    masterGain: GainNode | null;
    noiseBuffer: AudioBuffer | null;
    engineOsc: OscillatorNode | null;
    engineMod: OscillatorNode | null;
    engineGain: GainNode | null;
}

const state: AudioEngineState = {
    context: null,
    masterGain: null,
    noiseBuffer: null,
    engineOsc: null,
    engineMod: null,
    engineGain: null
};

/**
 * Initialize the audio context and noise buffer
 */
export function initAudio(isMuted: boolean = false): void {
    if (state.context) return;

    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;

    state.context = new AudioCtor();

    // Create Master Gain for Mute Control
    const master = state.context.createGain();
    master.gain.value = isMuted ? 0 : 0.5;
    master.connect(state.context.destination);
    state.masterGain = master;

    // Generate White Noise Buffer (for explosions and tire sounds)
    const bufferSize = state.context.sampleRate * 2;
    const buffer = state.context.createBuffer(1, bufferSize, state.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    state.noiseBuffer = buffer;

    state.context.resume();
}

/**
 * Get the audio context (for use by sound effects)
 */
export function getAudioContext(): AudioContext | null {
    return state.context;
}

/**
 * Get the master gain node (for use by sound effects)
 */
export function getMasterGain(): GainNode | null {
    return state.masterGain;
}

/**
 * Get the noise buffer (for use by sound effects)
 */
export function getNoiseBuffer(): AudioBuffer | null {
    return state.noiseBuffer;
}

/**
 * Toggle mute on/off with smooth transition
 */
export function setMuted(muted: boolean): void {
    if (!state.masterGain || !state.context) return;
    state.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.5,
        state.context.currentTime,
        0.1
    );
}

/**
 * Start the engine sound (continuous loop)
 */
export function startEngine(): void {
    if (!state.context) initAudio();
    if (!state.context || !state.masterGain) return;

    const ctx = state.context;

    // Stop existing if any
    stopEngine();

    // Main Tone (Sawtooth for raw engine sound)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60; // Idle RPM

    // Modulator (for the "purr" or rumble)
    const mod = ctx.createOscillator();
    mod.type = 'square';
    mod.frequency.value = 15; // Idle rumble speed

    const modGain = ctx.createGain();
    modGain.gain.value = 20; // Depth of rumble

    // Master Engine Gain
    const gain = ctx.createGain();
    gain.gain.value = 0.2; // Initial Volume relative to Master

    // Lowpass filter to muffle the harsh sawtooth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    // Connections: Mod -> ModGain -> Osc Freq
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    // Osc -> Filter -> Gain -> Master
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(state.masterGain);

    osc.start();
    mod.start();

    state.engineOsc = osc;
    state.engineMod = mod;
    state.engineGain = gain;
}

/**
 * Update engine sound based on speed ratio (0 to 1)
 */
export function updateEngine(speedRatio: number): void {
    if (!state.engineOsc || !state.engineMod || !state.context) return;
    const ctx = state.context;

    // Base Frequency: 60Hz (Idle) to 300Hz (Max RPM)
    const targetFreq = 60 + (speedRatio * 240);

    // Rumble Speed: 15Hz (Idle) to 50Hz (Max)
    const targetRumble = 15 + (speedRatio * 35);

    // Smooth transitions
    state.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
    state.engineMod.frequency.setTargetAtTime(targetRumble, ctx.currentTime, 0.1);
}

/**
 * Stop the engine sound
 */
export function stopEngine(): void {
    if (state.engineOsc) {
        try { state.engineOsc.stop(); } catch (e) { }
        state.engineOsc.disconnect();
        state.engineOsc = null;
    }
    if (state.engineMod) {
        try { state.engineMod.stop(); } catch (e) { }
        state.engineMod.disconnect();
        state.engineMod = null;
    }
    if (state.engineGain) {
        state.engineGain.disconnect();
        state.engineGain = null;
    }
}

/**
 * Check if engine is currently running
 */
export function isEngineRunning(): boolean {
    return state.engineOsc !== null;
}
