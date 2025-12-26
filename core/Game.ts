import { Car, Segment, TrackDefinition, OilStain, GameStatus, PlayerSettings } from '../types';
import { createCars, createTrack, updateGame } from '../services/gameEngine';
import { GraphicsEngine } from './engines/GraphicsEngine';
import { AudioEngine } from './engines/AudioEngine';
import { ParticleEngine } from './engines/ParticleEngine';
import { InputEngine } from './engines/InputEngine';
import { updateHUD } from '../services/rendering/hudService';
import { ROAD_WIDTH, SEGMENT_LENGTH } from '../constants';

export interface UIRefs {
    speed: React.RefObject<HTMLSpanElement>;
    time: React.RefObject<HTMLSpanElement>;
    lap: React.RefObject<HTMLSpanElement>;
    damage: React.RefObject<HTMLDivElement>;
    rivalDamage: React.RefObject<HTMLDivElement>;
    controlBadge: React.RefObject<HTMLSpanElement>;
}

export class Game {
    private graphics: GraphicsEngine;
    private audio: AudioEngine;
    private particles: ParticleEngine;
    private input: InputEngine;

    // Game State
    private cars: Car[] = [];
    private track: Segment[] = [];
    private carOilStains: OilStain[][] = [[], []]; // Per car (Player, Rival)
    private status: GameStatus = GameStatus.MENU;
    private isRacing: boolean = false;
    private startTime: number = 0;
    private lastTime: number = 0;
    private frameId: number = 0;
    private countdownInterval: number | null = null;
    private showMinimapOverlay: boolean = true;
    private playerName: string = 'Player';
    private totalLaps: number = 3;

    // Callbacks
    private onFinish: (time: number, totalDistance: number, rank: number, winnerName: string) => void;
    private onCountdownUpdate: (count: number) => void;
    public onViewChange?: (view: number) => void;
    public onPauseToggle?: () => void;

    // UI Refs
    private uiRefs: UIRefs;

    // Finish Sequence State
    private finishingSeq = {
        active: false,
        startTime: 0,
        resultProcessed: false,
        winnerRank: 2,
        winnerName: ''
    };

    constructor(
        canvas: HTMLCanvasElement,
        uiRefs: UIRefs,
        onFinish: (time: number, totalDistance: number, rank: number, winnerName: string) => void,
        onCountdownUpdate: (count: number) => void
    ) {
        this.graphics = new GraphicsEngine(
            canvas.getContext('2d', { alpha: false })!,
            canvas.width,
            canvas.height
        );
        this.audio = new AudioEngine();
        this.particles = new ParticleEngine();
        this.input = new InputEngine();
        this.uiRefs = uiRefs;
        this.onFinish = onFinish;
        this.onCountdownUpdate = onCountdownUpdate;

        this.totalLaps = 3;
    }

    public start(
        settings: PlayerSettings,
        trackDefinition: TrackDefinition,
        playerName: string,
        bestSpeed: number = 0
    ): void {
        this.stop(); // Cleanup previous if any

        this.playerName = playerName;
        this.totalLaps = settings.laps || 3; // Respect settings
        this.status = GameStatus.PLAYING;

        // Initialize State
        this.cars = createCars(settings.color, settings.name, settings.difficulty, bestSpeed);
        this.track = createTrack(trackDefinition);
        this.carOilStains = [[], []];
        this.particles.clear();
        this.input.clear();
        this.input.setupListeners((e) => this.handleKeyPress(e));
        this.audio.init();

        this.showMinimapOverlay = true;

        this.finishingSeq = { active: false, startTime: 0, resultProcessed: false, winnerRank: 2, winnerName: '' };
        this.isRacing = false;
        this.setView(0); // Reset view to Player and notify UI

        // Start Countdown
        this.runCountdown();

        // Start Loop immediately to render static scene
        this.loop();
    }

    private runCountdown(): void {
        this.audio.stopEngine();
        let count = 3;
        this.onCountdownUpdate(count);
        this.audio.play('REV'); // Rev engine sound

        this.countdownInterval = window.setInterval(() => {
            count--;
            this.onCountdownUpdate(count);
            if (count > 0) {
                this.audio.play('REV');
            } else {
                if (this.countdownInterval) clearInterval(this.countdownInterval);
                this.audio.play('GO');
                this.isRacing = true;
                this.startTime = Date.now();
                this.lastTime = Date.now();
                this.audio.startEngine();
            }
        }, 1000);
    }

    public stop(): void {
        cancelAnimationFrame(this.frameId);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.audio.stopEngine();
        this.input.cleanup();
        this.status = GameStatus.MENU;
    }

    public setPaused(paused: boolean): void {
        // Simple pause toggling logic
        if (paused) {
            this.audio.stopEngine();
            this.status = GameStatus.PAUSED;
            cancelAnimationFrame(this.frameId);
        } else {
            if (this.isRacing) this.audio.startEngine();
            this.lastTime = Date.now();
            this.status = GameStatus.PLAYING;
            // Only start loop if we have initialized state
            if (this.cars.length > 0) {
                this.loop();
            }
        }
    }

    public setMuted(muted: boolean): void {
        this.audio.setMuted(muted);
    }

    private handleKeyPress(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();

        // Minimap Toggle ('o' or 'Alt+o')
        if (key === 'o') {
            this.showMinimapOverlay = !this.showMinimapOverlay;
        }

        // Pause Toggle ('p' or 'Alt+p')
        if (key === 'p') {
            this.onPauseToggle?.();
        }

        // Rival Manual Control Toggle ('k' or 'Alt+k')
        if (key === 'k' && this.cars[1]) {
            this.cars[1].isManualControl = !this.cars[1].isManualControl;
            // Provide a small visual/dev feedback if needed (could add a HUD message later)
        }
    }

    public toggleRivalControl(): void {
        if (this.cars[1]) {
            this.cars[1].isManualControl = !this.cars[1].isManualControl;
        }
    }

    public handleTouchInput(action: 'up' | 'down' | 'left' | 'right', isPressed: boolean): void {
        this.input.setTouchInput(action, isPressed);
    }

    public resize(width: number, height: number): void {
        this.graphics.resize(width, height);
    }

    public toggleMap(): void {
        if (this.activeView === 4) {
            this.setView(0);
        } else {
            this.setView(4);
        }
    }

    // View State
    // View State
    private activeView: number = 0; // 0: Player, 1: Rival, 2: Split Vert (L/R), 3: Split Horiz (T/B), 4: Map

    private setView(view: number) {
        if (this.activeView !== view) {
            this.activeView = view;
            this.onViewChange?.(view);
        }
    }

    private loop = (): void => {
        if (this.status !== GameStatus.PLAYING) return;

        this.frameId = requestAnimationFrame(this.loop);

        const now = Date.now();
        const dt = Math.min(1, (now - this.lastTime) / 1000);
        this.lastTime = now;

        this.update(dt);
        this.render();
    };

    private update(dt: number): void {
        if (this.cars.length === 0) return;

        const inputState = this.input.getState();
        const player = this.cars[0];

        // Handle View Switching
        if (inputState.view1) this.setView(0);
        if (inputState.view2) this.setView(1);
        if (inputState.view3) this.setView(2); // Left/Right
        if (inputState.view4) this.setView(3); // Top/Bottom

        // Core Game Update
        if (this.isRacing) {
            updateGame(
                this.cars,
                this.track,
                inputState,
                dt,
                this.totalLaps,
                {
                    onObstacleHit: (car, type, wx, wy, wz) => {
                        this.particles.spawnCollisionParticles(wx, wy, wz, type as any);
                        if (type === 'PUDDLE' || type === 'OIL') {
                            this.particles.spawnObstacleParticles(wx, wz, type as any, car.speed, car);
                        }

                        const cameraCar = (this.activeView === 1 && this.cars[1]) ? this.cars[1] : this.cars[0];
                        const isFocused = (car === cameraCar);

                        if (type === 'OIL' && (car.isPlayer || car === this.cars[1])) {
                            const carIdx = car.isPlayer ? 0 : 1;
                            this.carOilStains[carIdx].push({
                                alpha: 1.0,
                                seed: Math.random()
                            });
                        }

                        // Audio only for Focused Car
                        if (isFocused) {
                            if (type === 'PUDDLE') this.audio.play('SPLASH');
                            else if (type === 'OIL') this.audio.play('TIRE');
                            else if (type === 'REPAIR') this.audio.play('HEAL');
                            else this.audio.play('CRASH');
                        }
                    },
                    onCarHit: (type, _severity, wx, wy, wz) => {
                        this.particles.spawnCollisionParticles(wx, wy, wz, 'DEBRIS');
                        this.audio.play(type === 'SIDE' ? 'BUMP' : 'CRASH');
                    },
                    onCheckpoint: (car) => {
                        if (car.isPlayer) this.audio.play('CHECKPOINT');
                    },
                    onLap: (car) => {
                        if (car.isPlayer) this.audio.play('LAP');
                    },
                    onDrafting: (car, target) => {
                        // Spawn slipstream and center-focused wind when drafting
                        if (car.isPlayer) {
                            this.particles.spawnSlipstreamParticles(
                                target.offset * ROAD_WIDTH,
                                0, // Ground level, will be adjusted by ownership if viewed by owner
                                target.z,
                                target
                            );
                            // Center wind for high-speed sensation
                            this.particles.spawnWindParticles(
                                car.offset * ROAD_WIDTH,
                                car.z,
                                car,
                                true // Centered tunnel effect
                            );
                        }
                    }
                }
            );
        }

        // Update Oil Stains Decay
        this.carOilStains.forEach((stains, idx) => {
            if (stains.length > 0) {
                stains.forEach(stain => stain.alpha -= 0.005);
                this.carOilStains[idx] = stains.filter(s => s.alpha > 0);
            }
        });

        // Particle Updates
        this.cars.forEach(car => {
            if (!car.exploded && !car.finished) {
                // Pass base height 0 (Ground). The ParticleEngine will apply +1150 ONLY if viewed by owner.
                this.particles.spawnDamageParticles(
                    car.offset * ROAD_WIDTH, 0, car.z,
                    car.damage, car.speed,
                    car // <-- Owner
                );
            }
        });

        // Drafting / Pressure Effect (When distinct Rival is close behind Player)
        const rival = this.cars[1];
        if (player && rival && !player.finished && !rival.finished) {
            // Check loop distance (handling lap wrap-around is complex, simplifed to Z comparison for now as Segments handle Z looping?
            // Actually gameEngine handles Z increasing indefinitely?
            // Usually Z increases indefinitely in this engine type until reset?
            // "trackLength" is total.
            // Let's assume absolute Z comparison is safe for now within a lap, or if Z is continuous.
            // Outrun engines usually reset Z or keep increasing.
            // Let's rely on simple Z diff.
            const dist = player.z - rival.z;
            if (dist > 0 && dist < 2500) {
                this.particles.spawnWindParticles(
                    player.offset * ROAD_WIDTH,
                    player.z,
                    player
                );
            }
        }

        this.particles.update();

        // HUD Updates
        const cameraCar = (this.activeView === 1 && this.cars[1]) ? this.cars[1] : this.cars[0];
        const hudStartTime = (this.isRacing || this.finishingSeq.active) ? this.startTime : Date.now();
        updateHUD(cameraCar, hudStartTime, this.totalLaps, this.activeView, this.cars, this.uiRefs);

        // Finishing Logic
        this.handleFinish(player, this.cars[1]);

        // Engine sound update
        if (this.isRacing && !player.exploded && !player.finished) {
            const speedRatio = player.speed / player.maxSpeed;
            this.audio.updateEngine(speedRatio);
        }

        // Force brake if finished
        if (player.finished && player.speed > 0) {
            player.speed *= 0.95; // Rapid deceleration
            if (player.speed < 100) player.speed = 0;
        }
    }

    private handleFinish(player: Car, rival: Car): void {
        const playerDead = player.exploded;
        // AI Win Condition: If rival finishes, game over immediately for player too (Loss)
        const rivalWon = rival && rival.finished;

        if (player.finished || playerDead || rivalWon) {
            if (!this.finishingSeq.active) {
                this.finishingSeq.active = true;
                this.finishingSeq.startTime = Date.now();
                this.audio.stopEngine();

                // LOCK WINNER DATA IMMEDIATELY
                if (playerDead) {
                    this.finishingSeq.winnerRank = 2;
                    this.finishingSeq.winnerName = 'CRASHED';
                    this.audio.play('EXPLOSION');
                    setTimeout(() => this.audio.play('DEFEAT'), 1000);
                } else {
                    // Decide winner based on who finished first or has better lapTime
                    // If multiple finished in same frame, compare lapTimes
                    const isPlayerFirst = player.finished && (!rivalWon || (player.lapTime < rival.lapTime));

                    if (isPlayerFirst) {
                        this.finishingSeq.winnerRank = 1;
                        this.finishingSeq.winnerName = this.playerName;
                        this.audio.play('VICTORY');
                    } else {
                        this.finishingSeq.winnerRank = 2;
                        this.finishingSeq.winnerName = rival ? rival.name : 'CPU';
                        this.audio.play('DEFEAT');
                    }
                }
            }

            // Fireworks (Only if player won and finished)
            if (player.finished && !playerDead && !rivalWon && Math.random() < 0.08) {
                const cameraX = player.offset * ROAD_WIDTH;
                const x = cameraX + (Math.random() - 0.5) * 6000;
                const y = 500 + Math.random() * 1500;
                const z = player.z + 1000 + Math.random() * 3000;
                this.particles.spawnFireworks(x, y, z);
            }

            // Result Callback
            const timeSinceFinish = Date.now() - this.finishingSeq.startTime;
            // Stop player car if AI finished
            if (rivalWon && !player.finished) {
                player.speed *= 0.95;
                if (player.speed < 100) player.speed = 0;
            }

            if (timeSinceFinish > 1500 && !this.finishingSeq.resultProcessed && (player.speed < 500 || rivalWon)) {
                this.finishingSeq.resultProcessed = true;
                const totalTime = (Date.now() - this.startTime) / 1000;
                const totalDistance = this.track.length * SEGMENT_LENGTH * this.totalLaps;

                this.onFinish(totalTime, totalDistance, this.finishingSeq.winnerRank, this.finishingSeq.winnerName);
            }
        }
    }

    private render(): void {
        if (this.cars.length === 0) return;

        const fullW = this.graphics['width'];
        const fullH = this.graphics['height'];

        // Split Screen Logic
        // Split Screen Logic
        if (this.activeView === 4) {
            // Full Screen Map
            this.graphics.renderMap(
                this.cars,
                this.track,
                fullW,
                fullH,
                false
            );
        } else {
            // Render 3D Scene based on View
            if (this.activeView === 2) {
                // LEFT / RIGHT
                const halfW = fullW / 2;
                this.graphics.renderScene(this.cars[0], this.cars, this.track, this.particles, this.isRacing, this.carOilStains[0], 0, 0, halfW, fullH);
                if (this.cars[1]) this.graphics.renderScene(this.cars[1], this.cars, this.track, this.particles, this.isRacing, this.carOilStains[1], halfW, 0, halfW, fullH);
                // Separator
                const ctx = this.graphics['ctx'];
                ctx.fillStyle = '#000';
                ctx.fillRect(halfW - 2, 0, 4, fullH);
            } else if (this.activeView === 3) {
                // TOP / BOTTOM
                const halfH = fullH / 2;
                this.graphics.renderScene(this.cars[0], this.cars, this.track, this.particles, this.isRacing, this.carOilStains[0], 0, 0, fullW, halfH);
                if (this.cars[1]) this.graphics.renderScene(this.cars[1], this.cars, this.track, this.particles, this.isRacing, this.carOilStains[1], 0, halfH, fullW, halfH);
                // Separator
                const ctx = this.graphics['ctx'];
                ctx.fillStyle = '#000';
                ctx.fillRect(0, halfH - 2, fullW, 4);
            } else {
                // Single View (Player or Rival)
                const cameraCar = (this.activeView === 1 && this.cars[1]) ? this.cars[1] : this.cars[0];
                const carIdx = (this.activeView === 1 && this.cars[1]) ? 1 : 0;
                this.graphics.renderScene(cameraCar, this.cars, this.track, this.particles, this.isRacing, this.carOilStains[carIdx], 0, 0, fullW, fullH);
            }

            // Mini-Map (Overlay)
            if (this.showMinimapOverlay) {
                const mapW = Math.max(150, Math.min(250, fullW * 0.25));
                const mapH = mapW * 0.75;

                this.graphics.renderMap(
                    this.cars,
                    this.track,
                    mapW,
                    mapH,
                    true, // isOverlay
                    20,   // x
                    120   // y
                );
            }
        }
    }
}
