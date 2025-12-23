/**
 * Sound Effects
 * Procedural sound synthesis for game events
 */

import { getAudioContext, getMasterGain, getNoiseBuffer, type SoundEffect } from './audioEngine';

/**
 * Play a procedural sound effect
 */
export function playSound(type: SoundEffect): void {
    const ctx = getAudioContext();
    const masterGain = getMasterGain();

    if (!ctx || ctx.state !== 'running' || !masterGain) return;

    const t = ctx.currentTime;

    switch (type) {
        case 'CRASH':
            playCrash(ctx, masterGain, t);
            break;
        case 'BUMP':
            playBump(ctx, masterGain, t);
            break;
        case 'EXPLOSION':
            playExplosion(ctx, masterGain, t);
            break;
        case 'TIRE':
            playTire(ctx, masterGain, t);
            break;
        case 'BARREL':
            playBarrel(ctx, masterGain, t);
            break;
        case 'REV':
            playRev(ctx, masterGain, t);
            break;
        case 'GO':
            playGo(ctx, masterGain, t);
            break;
        case 'VICTORY':
            playVictory(ctx, masterGain, t);
            break;
        case 'DEFEAT':
            playDefeat(ctx, masterGain, t);
            break;
        case 'HEAL':
            playHeal(ctx, masterGain, t);
            break;
        case 'CHECKPOINT':
            playCheckpoint(ctx, masterGain, t);
            break;
    }
}

function playCrash(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
}

function playBump(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
}

function playExplosion(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const noiseBuffer = getNoiseBuffer();

    // Use Noise Buffer if available for realistic explosion
    if (noiseBuffer) {
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, t);
        noiseFilter.frequency.linearRampToValueAtTime(100, t + 1.5);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(1.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noiseSrc.start(t);
    }

    // Add Sub-bass thump via Oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 1.0);
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 1.0);
}

function playTire(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, t);
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(20, t + 0.2);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
}

function playBarrel(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'square';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.Q.value = 15;
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
}

function playRev(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(300, t + 0.3);
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
}

function playGo(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.6);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.8);
}

function playVictory(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const freqs = [523.25, 659.25, 783.99, 1046.50];

    freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = f;

        const start = t + (i * 0.15);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + 0.5);
    });
}

function playDefeat(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const notes = [138.59, 130.81, 123.47, 110.00];

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        const start = t + (i * 0.4);
        const duration = i === 3 ? 1.5 : 0.35;

        osc.frequency.setValueAtTime(freq, start);

        if (i === 3) {
            osc.frequency.linearRampToValueAtTime(freq - 20, start + duration);
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.value = 5;
            lfoGain.gain.value = 10;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start(start);
            lfo.stop(start + duration);
        }

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
        gain.gain.linearRampToValueAtTime(0, start + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + duration);
    });
}

function playHeal(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.1); // E6

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
}

function playCheckpoint(ctx: AudioContext, masterGain: GainNode, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.4);
}
