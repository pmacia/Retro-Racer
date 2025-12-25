/**
 * DEPRECATED: Use core/engines/AudioEngine.ts
 * Keeping file to prevent breakages if lazy imports exist, but functionality is stripped.
 */

export type SoundEffect = 'CRASH' | 'BUMP' | 'EXPLOSION' | 'TIRE' | 'BARREL' | 'REV' | 'GO' | 'VICTORY' | 'DEFEAT' | 'HEAL' | 'CHECKPOINT';

export function initAudio(isMuted: boolean = false): void { }
export function getAudioContext(): AudioContext | null { return null; }
export function getMasterGain(): GainNode | null { return null; }
export function getNoiseBuffer(): AudioBuffer | null { return null; }
export function setMuted(muted: boolean): void { }
export function startEngine(): void { }
export function updateEngine(speedRatio: number): void { }
export function stopEngine(): void { }
export function isEngineRunning(): boolean { return false; }
