import { Car, Segment, TrackDefinition, OilStain, GameStatus, PlayerSettings, Difficulty } from '../types';
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
}

export class Game {
    private graphics: GraphicsEngine;
    private audio: AudioEngine;
    private particles: ParticleEngine;
    private input: InputEngine;

    // Game State
    private cars: Car[] = [];
    private track: Segment[] = [];
    private oilStains: OilStain[] = [];
    private status: GameStatus = GameStatus.MENU;
    private isRacing: boolean = false;
    private startTime: number = 0;
    private lastTime: number = 0;
    private frameId: number = 0;
    private countdownInterval: number | null = null;

    // Config
    private settings: PlayerSettings;
    private trackDefinition: TrackDefinition;
    private bestSpeed: number;
    private playerName: string = 'Player';
    private totalLaps: number = 3;

    // Callbacks
    private onFinish: (time: number, totalDistance: number, rank: number, winnerName: string) => void;
    private onCountdownUpdate: (count: number) => void;
    public onViewChange?: (view: number) => void;

    // UI Refs
    private uiRefs: UIRefs;

    // Finish Sequence State
    private finishingSeq = {
        active: false,
        startTime: 0,
        resultProcessed: false
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

        // Placeholder initial config
        this.settings = { name: 'Player', color: '#ff0000', difficulty: Difficulty.AMATEUR, laps: 3, trackId: 'test' };
        this.trackDefinition = { id: 'test', name: 'Placeholder', description: 'Loading...', layout: [] };
        this.bestSpeed = 0;
    }

    public start(
        settings: PlayerSettings,
        trackDefinition: TrackDefinition,
        playerName: string,
        bestSpeed: number = 0
    ): void {
        this.stop(); // Cleanup previous if any

        this.settings = settings;
        this.trackDefinition = trackDefinition;
        this.playerName = playerName;
        this.bestSpeed = bestSpeed;
        this.totalLaps = settings.laps || 3; // Respect settings
        this.status = GameStatus.PLAYING;

        // Initialize State
        this.cars = createCars(settings.color, settings.name, settings.difficulty, bestSpeed);
        this.track = createTrack(trackDefinition);
        this.oilStains = [];
        this.particles.clear();
        this.input.clear();
        this.input.setupListeners();
        this.audio.init();

        this.finishingSeq = { active: false, startTime: 0, resultProcessed: false };
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
                            this.particles.spawnObstacleParticles(wx, wz, type as any);
                        }
                        if (type === 'OIL') {
                            this.oilStains.push({
                                alpha: 1.0,
                                seed: Math.random()
                            });
                        }

                        // Audio only for Player (or very close events?)
                        // User requested no phantom sounds, so restrict to player
                        if (car.isPlayer) {
                            if (type === 'OIL' || type === 'PUDDLE') this.audio.play('TIRE');
                            else if (type === 'REPAIR') this.audio.play('HEAL');
                            else this.audio.play('CRASH');
                        }
                    },
                    onCarHit: (type, severity, wx, wy, wz) => {
                        this.particles.spawnCollisionParticles(wx, wy, wz, 'DEBRIS');
                        this.audio.play(type === 'SIDE' ? 'BUMP' : 'CRASH');
                    },
                    onCheckpoint: (car) => {
                        if (car.isPlayer) this.audio.play('CHECKPOINT');
                    },
                    onLap: (car) => {
                        if (car.isPlayer) this.audio.play('LAP');
                    }
                }
            );
        }

        // Update Oil Stains Decay
        if (this.oilStains.length > 0) {
            this.oilStains.forEach(stain => stain.alpha -= 0.005);
            this.oilStains = this.oilStains.filter(s => s.alpha > 0);
        }

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
        this.particles.update();

        // HUD Updates
        // Force timer to 0 during countdown (by passing Date.now() as startTime so diff is 0)
        const hudStartTime = (this.isRacing || this.finishingSeq.active) ? this.startTime : Date.now();
        updateHUD(player, hudStartTime, this.totalLaps, this.activeView, this.cars, this.uiRefs);

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

                if (playerDead) {
                    this.audio.play('EXPLOSION');
                    setTimeout(() => this.audio.play('DEFEAT'), 1000);
                } else if (rivalWon && !player.finished) {
                    // AI beat player
                    this.audio.play('DEFEAT');
                } else {
                    // Player finished (maybe first?)
                    // If rival won is true, it means rival finished SAME frame or earlier.
                    // Priority check:
                    const rank = (player.finished && (!rivalWon || (rival.lapTime > player.lapTime))) ? 1 : 2;
                    if (rank === 1) this.audio.play('VICTORY');
                    else this.audio.play('DEFEAT');
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
                let rank = 2;
                let winnerName = 'CPU';

                if (playerDead) {
                    rank = 2; winnerName = 'CRASHED';
                } else if (rivalWon) {
                    // If rival finished, check times if player ALSO finished (rare tie)
                    if (player.finished && player.lapTime < rival.lapTime) {
                        rank = 1; winnerName = this.playerName;
                    } else {
                        rank = 2; winnerName = rival.name;
                    }
                } else {
                    rank = 1; winnerName = this.playerName;
                }
                this.onFinish(totalTime, totalDistance, rank, winnerName);
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
                this.graphics.renderScene(this.cars[0], this.cars, this.track, this.particles, this.isRacing, this.oilStains, 0, 0, halfW, fullH);
                if (this.cars[1]) this.graphics.renderScene(this.cars[1], this.cars, this.track, this.particles, this.isRacing, [], halfW, 0, halfW, fullH);
                // Separator
                const ctx = this.graphics['ctx'];
                ctx.fillStyle = '#000';
                ctx.fillRect(halfW - 2, 0, 4, fullH);
            } else if (this.activeView === 3) {
                // TOP / BOTTOM
                const halfH = fullH / 2;
                this.graphics.renderScene(this.cars[0], this.cars, this.track, this.particles, this.isRacing, this.oilStains, 0, 0, fullW, halfH);
                if (this.cars[1]) this.graphics.renderScene(this.cars[1], this.cars, this.track, this.particles, this.isRacing, [], 0, halfH, fullW, halfH);
                // Separator
                const ctx = this.graphics['ctx'];
                ctx.fillStyle = '#000';
                ctx.fillRect(0, halfH - 2, fullW, 4);
            } else {
                // Single View (Player or Rival)
                const cameraCar = (this.activeView === 1 && this.cars[1]) ? this.cars[1] : this.cars[0];
                this.graphics.renderScene(cameraCar, this.cars, this.track, this.particles, this.isRacing, this.oilStains);
            }

            // Mini-Map (Overlay)
            // Positioned below HUD (approx 120px down)
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
