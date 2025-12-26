import { AUDIO } from '../../constants';

export type SoundEffect = 'CRASH' | 'BUMP' | 'EXPLOSION' | 'TIRE' | 'BARREL' | 'REV' | 'GO' | 'VICTORY' | 'DEFEAT' | 'HEAL' | 'CHECKPOINT' | 'LAP' | 'SPLASH';

export class AudioEngine {
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    private engineOsc: OscillatorNode | null = null;
    private engineMod: OscillatorNode | null = null;
    private engineGain: GainNode | null = null;
    private isMuted: boolean = false;

    constructor() {
        // Lazy initialization in init()
    }

    public init(startMuted: boolean = false): void {
        if (this.context) return;

        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtor) return;

        this.context = new AudioCtor();
        this.isMuted = startMuted;

        // Create Master Gain for Mute Control
        const master = this.context.createGain();
        master.gain.value = startMuted ? 0 : AUDIO.MASTER_VOLUME;
        master.connect(this.context.destination);
        this.masterGain = master;

        // Generate White Noise Buffer (for explosions and tire sounds)
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;

        // Resume context if suspended (browser auto-play policy)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    public setMuted(muted: boolean): void {
        this.isMuted = muted;
        if (!this.masterGain || !this.context) return;
        this.masterGain.gain.setTargetAtTime(
            muted ? 0 : AUDIO.MASTER_VOLUME,
            this.context.currentTime,
            0.1
        );
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    public startEngine(): void {
        if (!this.context) this.init(this.isMuted);
        if (!this.context || !this.masterGain) return;

        const ctx = this.context;

        // Stop existing if any
        this.stopEngine();

        // Main Tone (Sawtooth for raw engine sound)
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = AUDIO.ENGINE.IDLE_FREQ;

        // Modulator (for the "purr" or rumble)
        const mod = ctx.createOscillator();
        mod.type = 'square';
        mod.frequency.value = AUDIO.ENGINE.IDLE_RUMBLE;

        const modGain = ctx.createGain();
        modGain.gain.value = AUDIO.ENGINE.RUMBLE_DEPTH;

        // Master Engine Gain
        const gain = ctx.createGain();
        gain.gain.value = AUDIO.ENGINE.VOLUME;

        // Lowpass filter to muffle the harsh sawtooth
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = AUDIO.ENGINE.FILTER_FREQ;

        // Connections: Mod -> ModGain -> Osc Freq
        mod.connect(modGain);
        modGain.connect(osc.frequency);

        // Osc -> Filter -> Gain -> Master
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        mod.start();

        this.engineOsc = osc;
        this.engineMod = mod;
        this.engineGain = gain;
    }

    public updateEngine(speedRatio: number): void {
        if (!this.engineOsc || !this.engineMod || !this.context) return;
        const ctx = this.context;

        // Base Frequency: Idle to Max RPM
        const targetFreq = AUDIO.ENGINE.IDLE_FREQ + (speedRatio * (AUDIO.ENGINE.MAX_FREQ - AUDIO.ENGINE.IDLE_FREQ));

        // Rumble Speed
        const targetRumble = AUDIO.ENGINE.IDLE_RUMBLE + (speedRatio * (AUDIO.ENGINE.MAX_RUMBLE - AUDIO.ENGINE.IDLE_RUMBLE));

        // Smooth transitions
        this.engineOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.1);
        this.engineMod.frequency.setTargetAtTime(targetRumble, ctx.currentTime, 0.1);
    }

    public stopEngine(): void {
        if (this.engineOsc) {
            try { this.engineOsc.stop(); } catch (e) { }
            this.engineOsc.disconnect();
            this.engineOsc = null;
        }
        if (this.engineMod) {
            try { this.engineMod.stop(); } catch (e) { }
            this.engineMod.disconnect();
            this.engineMod = null;
        }
        if (this.engineGain) {
            this.engineGain.disconnect();
            this.engineGain = null;
        }
    }

    public isEngineRunning(): boolean {
        return this.engineOsc !== null;
    }

    public play(type: SoundEffect): void {
        if (!this.context || this.context.state !== 'running' || !this.masterGain) return;

        const t = this.context.currentTime;

        switch (type) {
            case 'CRASH': this.playCrash(t); break;
            case 'BUMP': this.playBump(t); break;
            case 'EXPLOSION': this.playExplosion(t); break;
            case 'TIRE': this.playTire(t); break;
            case 'BARREL': this.playBarrel(t); break;
            case 'REV': this.playRev(t); break;
            case 'GO': this.playGo(t); break;
            case 'VICTORY': this.playVictory(t); break;
            case 'DEFEAT': this.playDefeat(t); break;
            case 'HEAL': this.playHeal(t); break;
            case 'CHECKPOINT': this.playCheckpoint(t); break;
            case 'LAP': this.playLap(t); break;
            case 'SPLASH': this.playSplash(t); break;
        }
    }

    // --- Private Sound Effect Generators ---

    private playCrash(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    private playBump(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    private playExplosion(t: number): void {
        if (!this.context || !this.masterGain) return;

        // Use Noise Buffer if available
        if (this.noiseBuffer) {
            const noiseSrc = this.context.createBufferSource();
            noiseSrc.buffer = this.noiseBuffer;

            const noiseFilter = this.context.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(1000, t);
            noiseFilter.frequency.linearRampToValueAtTime(100, t + 1.5);

            const noiseGain = this.context.createGain();
            noiseGain.gain.setValueAtTime(1.5, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

            noiseSrc.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);

            noiseSrc.start(t);
        }

        // Add Sub-bass thump
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 1.0);
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 1.0);
    }

    private playTire(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, t);
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.linearRampToValueAtTime(20, t + 0.2);
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }

    private playBarrel(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();

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
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    private playRev(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.3);
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0.01, t + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.4);
    }

    private playGo(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(800, t + 0.6);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.8);
    }

    private playVictory(t: number): void {
        if (!this.context || !this.masterGain) return;
        const freqs = [523.25, 659.25, 783.99, 1046.50];

        freqs.forEach((f, i) => {
            if (!this.context || !this.masterGain) return;
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'triangle';
            osc.frequency.value = f;

            const start = t + (i * 0.15);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(start);
            osc.stop(start + 0.5);
        });
    }

    private playDefeat(t: number): void {
        if (!this.context || !this.masterGain) return;
        const notes = [138.59, 130.81, 123.47, 110.00];

        notes.forEach((freq, i) => {
            if (!this.context || !this.masterGain) return;
            const osc = this.context.createOscillator();
            const filter = this.context.createBiquadFilter();
            const gain = this.context.createGain();

            osc.type = 'sawtooth';
            filter.type = 'lowpass';
            filter.frequency.value = 300;

            const start = t + (i * 0.4);
            const duration = i === 3 ? 1.5 : 0.35;

            osc.frequency.setValueAtTime(freq, start);

            if (i === 3) {
                osc.frequency.linearRampToValueAtTime(freq - 20, start + duration);
                const lfo = this.context.createOscillator();
                const lfoGain = this.context.createGain();
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
            gain.connect(this.masterGain);
            osc.start(start);
            osc.stop(start + duration);
        });
    }

    private playHeal(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, t); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, t + 0.1); // E6

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    private playCheckpoint(t: number): void {
        if (!this.context || !this.masterGain) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // Short, subtle ding
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, t); // Lower pitch
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1); // Constant pitch

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2); // Faster decay (200ms)

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    private playLap(t: number): void {
        if (!this.context || !this.masterGain) return;
        // Double beep for Lap
        const times = [t, t + 0.15];
        times.forEach(start => {
            const osc = this.context!.createOscillator();
            const gain = this.context!.createGain();

            osc.type = 'square'; // Distinct from sine Checkpoint
            osc.frequency.setValueAtTime(1500, start);
            osc.frequency.exponentialRampToValueAtTime(2000, start + 0.05);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);

            osc.connect(gain);
            gain.connect(this.masterGain!);
            osc.start(start);
            osc.stop(start + 0.15);
        });
    }

    private playSplash(t: number): void {
        if (!this.context || !this.masterGain || !this.noiseBuffer) return;

        const noiseSrc = this.context.createBufferSource();
        noiseSrc.buffer = this.noiseBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(1.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

        noiseSrc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noiseSrc.start(t);
        noiseSrc.stop(t + 0.7);
    }
}
