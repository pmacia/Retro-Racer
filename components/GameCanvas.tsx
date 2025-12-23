import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, PlayerSettings, Car, Segment, TrackDefinition, OilStain } from '../types';
import { createTrack, createCars, updateGame } from '../services/gameEngine';
import { WIDTH, HEIGHT } from '../constants';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Gauge, Timer, Flag, Map as MapIcon, Skull, Volume2, VolumeX } from 'lucide-react';
import { startEngine, stopEngine, setMuted, isEngineRunning, updateEngine } from '../services/audio/audioEngine';
import { playSound } from '../services/audio/soundEffects';
import { updateParticles, clearParticles, spawnCollisionParticles, spawnDamageParticles, spawnObstacleParticles } from '../services/rendering/drawParticles';
import { renderView, renderMap } from '../services/rendering/renderingService';
import { createInputHandler } from '../services/input/inputHandler';
import { updateHUD } from '../services/rendering/hudService';
import { startCountdown, handleFinishSequence } from '../services/game/gameLifecycle';

interface GameCanvasProps {
    status: GameStatus;
    settings: PlayerSettings;
    trackDefinition: TrackDefinition;
    playerName: string;
    onFinish: (time: number, totalDistance: number, rank: number, winnerName: string) => void;
    isPaused: boolean;
    bestSpeed?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, settings, trackDefinition, playerName, onFinish, isPaused, bestSpeed }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Game State
    const carsRef = useRef<Car[]>([]);
    const trackRef = useRef<Segment[]>([]);
    const inputRef = useRef({ left: false, right: false, up: false, down: false });
    const startTimeRef = useRef<number>(0);
    const frameIdRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const cameraViewRef = useRef<number>(0); // 0 = Player, 1 = Rival

    // Finishing Sequence State
    const finishingSeqRef = useRef<{
        active: boolean;
        startTime: number;
        resultProcessed: boolean;
        winner?: boolean;
    }>({ active: false, startTime: 0, resultProcessed: false });

    // HUD Refs
    const speedRef = useRef<HTMLSpanElement>(null);
    const timeRef = useRef<HTMLSpanElement>(null);
    const lapRef = useRef<HTMLSpanElement>(null);
    const damageRef = useRef<HTMLDivElement>(null);
    const rivalDamageRef = useRef<HTMLDivElement>(null);

    const [countdown, setCountdown] = useState<number>(3);
    const isRacingRef = useRef<boolean>(false);
    const [viewMode, setViewMode] = useState<'3D' | 'MAP'>('3D');
    const [activeView, setActiveView] = useState<number>(0); // 0=Player, 1=Rival, 2=Split
    const oilStainsRef = useRef<OilStain[]>([]);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    // Toggle mute handler
    const toggleMute = () => {
        setIsMuted(prev => {
            const newState = !prev;
            setMuted(newState);
            return newState;
        });
    };

    // Initial Setup & Cleanup
    useEffect(() => {
        return () => {
            stopEngine();
        };
    }, []);

    useEffect(() => {
        if (status === GameStatus.PLAYING && carsRef.current.length === 0) {
            carsRef.current = createCars(settings.color, settings.name, settings.difficulty, bestSpeed);
            trackRef.current = createTrack(trackDefinition);
            clearParticles();
            setCountdown(3);
            isRacingRef.current = false;
            finishingSeqRef.current = { active: false, startTime: 0, resultProcessed: false };
            stopEngine();

            const interval = startCountdown(setCountdown, () => {
                isRacingRef.current = true;
                startTimeRef.current = Date.now();
                lastTimeRef.current = Date.now();
            });

            return () => clearInterval(interval);
        } else if (status === GameStatus.MENU || status === GameStatus.GAME_OVER) {
            carsRef.current = [];
            trackRef.current = [];
            clearParticles();
            isRacingRef.current = false;
            finishingSeqRef.current = { active: false, startTime: 0, resultProcessed: false };
            stopEngine();
            oilStainsRef.current = [];
        }
    }, [status, settings, bestSpeed, trackDefinition]);

    // Input Handling
    const inputHandler = useRef(createInputHandler(inputRef, cameraViewRef, setActiveView, () => finishingSeqRef.current.active));

    useEffect(() => {
        const handler = inputHandler.current;
        window.addEventListener('keydown', handler.handleKeyDown);
        window.addEventListener('keyup', handler.handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handler.handleKeyDown);
            window.removeEventListener('keyup', handler.handleKeyUp);
        };
    }, []);

    const handleTouchInput = (action: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
        inputHandler.current.handleTouchInput(action, isPressed);
    };

    // Main Loop
    useEffect(() => {
        if (status !== GameStatus.PLAYING) {
            if (isEngineRunning()) stopEngine();
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const render = () => {
            try {
                if (trackRef.current.length === 0 || carsRef.current.length === 0) {
                    frameIdRef.current = requestAnimationFrame(render);
                    return;
                }

                if (isPaused) {
                    if (isEngineRunning()) stopEngine();
                    frameIdRef.current = requestAnimationFrame(render);
                    return;
                }
                if (isRacingRef.current && !isEngineRunning() && !finishingSeqRef.current.active && !carsRef.current[0]?.exploded) {
                    startEngine();
                }

                const now = Date.now();
                const dt = Math.min(1, (now - lastTimeRef.current) / 1000);
                lastTimeRef.current = now;

                const player = carsRef.current[0];
                const rival = carsRef.current[1];

                const cameraTargetIndex = cameraViewRef.current < carsRef.current.length ? cameraViewRef.current : 0;
                const cameraCar = carsRef.current[cameraTargetIndex];

                if (!player || !cameraCar) {
                    frameIdRef.current = requestAnimationFrame(render);
                    return;
                }

                const finishConditionMet = carsRef.current.some(c => c.finished) || player.exploded;

                if (finishConditionMet || finishingSeqRef.current.active) {
                    const finished = handleFinishSequence(
                        player,
                        rival,
                        finishingSeqRef,
                        startTimeRef,
                        trackRef.current,
                        settings.laps,
                        settings.name,
                        onFinish
                    );
                    if (finished) return;
                    if (finishConditionMet) {
                        inputRef.current = { up: false, down: false, left: false, right: false };
                    }

                    // Clear oil stains on finish for clear visibility
                    if (oilStainsRef.current.length > 0) {
                        oilStainsRef.current = [];
                    }
                }

                if (isRacingRef.current) {
                    updateParticles();

                    // Oil stain decay (independent for each stain)
                    if (oilStainsRef.current.length > 0) {
                        // Decay all stains
                        oilStainsRef.current.forEach(stain => {
                            stain.alpha = Math.max(0, stain.alpha - dt * 0.15); // Slower decay for longer duration
                        });
                        // Remove expired stains
                        oilStainsRef.current = oilStainsRef.current.filter(stain => stain.alpha > 0);
                    }

                    // Spawn damage particles for all cars
                    carsRef.current.forEach((car, index) => {
                        if (car.damage < 5 && !car.exploded) return;

                        if (index === 0) {
                            // Player car: apply visual offset for 2D sprite alignment
                            // Using moderate offsets for better high-speed visibility
                            const zOffset = 400;
                            const yOffset = 100;
                            spawnDamageParticles(car.offset * 2000, yOffset, car.z + zOffset, car.exploded ? 100 : car.damage, car.speed);
                        } else {
                            // AI cars: standard world coordinates
                            spawnDamageParticles(car.offset * 2000, 0, car.z, car.exploded ? 100 : car.damage, car.speed);
                        }
                    });

                    // Update engine sound based on player speed
                    updateEngine(player.speed / player.maxSpeed);

                    updateGame(
                        carsRef.current,
                        trackRef.current,
                        inputRef.current,
                        dt,
                        settings.laps,
                        {
                            onObstacleHit: (type, worldX, worldY, worldZ) => {
                                if (type === 'TREE') { playSound('CRASH'); spawnCollisionParticles(worldX, worldY, worldZ, 'TREE'); }
                                else if (type === 'BOULDER') { playSound('CRASH'); spawnCollisionParticles(worldX, worldY, worldZ, 'BOULDER'); }
                                else if (type === 'BARREL') { playSound('BARREL'); spawnCollisionParticles(worldX, worldY, worldZ, 'BARREL'); }
                                else if (type === 'TIRE') { playSound('TIRE'); spawnCollisionParticles(worldX, worldY, worldZ, 'TIRE'); }
                                else if (type === 'REPAIR') { playSound('HEAL'); }
                                else if (type === 'PUDDLE') { spawnObstacleParticles(worldX, worldZ, 'PUDDLE'); }
                                else if (type === 'OIL') {
                                    spawnObstacleParticles(worldX, worldZ, 'OIL');
                                    // Add new stain without removing old ones
                                    oilStainsRef.current.push({
                                        alpha: 1.0,
                                        seed: Math.random()
                                    });
                                }
                                else { spawnCollisionParticles(worldX, worldY, worldZ, 'DEBRIS'); }
                            },
                            onCarHit: (_type, severity, worldX, worldY, worldZ) => {
                                if (severity > 0.8) playSound('CRASH');
                                else playSound('BUMP');
                                spawnCollisionParticles(worldX, worldY, worldZ, 'SPARK');
                            },
                            onCheckpoint: (car) => {
                                if (car.isPlayer) playSound('CHECKPOINT');
                            }
                        }
                    );

                    updateHUD(cameraCar, startTimeRef.current, settings.laps, activeView, carsRef.current, {
                        speed: speedRef,
                        time: timeRef,
                        lap: lapRef,
                        damage: damageRef,
                        rivalDamage: rivalDamageRef
                    });
                }

                // --- RENDERING ---
                ctx.clearRect(0, 0, WIDTH, HEIGHT);

                if (viewMode === 'MAP') {
                    renderMap(ctx, carsRef.current, trackRef.current, WIDTH, HEIGHT);
                } else {
                    if (activeView === 2) {
                        renderView(ctx, player, carsRef.current, trackRef.current, 0, 0, WIDTH / 2, HEIGHT, isRacingRef.current, oilStainsRef.current);
                        if (rival) {
                            renderView(ctx, rival, carsRef.current, trackRef.current, WIDTH / 2, 0, WIDTH / 2, HEIGHT, isRacingRef.current, []);
                        }
                        ctx.fillStyle = '#000';
                        ctx.fillRect(WIDTH / 2 - 2, 0, 4, HEIGHT);
                    } else {
                        renderView(ctx, cameraCar, carsRef.current, trackRef.current, 0, 0, WIDTH, HEIGHT, isRacingRef.current, cameraTargetIndex === 0 ? oilStainsRef.current : []);
                    }

                    // --- MINI-MAP OVERLAY ---
                    const mapSize = 150; // Slightly larger
                    const padding = 20;
                    ctx.save();
                    // Move to top-left, just below the HUD
                    ctx.translate(padding, 130);
                    renderMap(ctx, carsRef.current, trackRef.current, mapSize, mapSize, true);
                    ctx.restore();
                }

                if (!isRacingRef.current && countdown > 0) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(0, 0, WIDTH, HEIGHT);
                    ctx.fillStyle = '#eab308';
                    ctx.font = 'bold 200px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 8;
                    ctx.strokeText(countdown.toString(), WIDTH / 2, HEIGHT / 2);
                    ctx.fillText(countdown.toString(), WIDTH / 2, HEIGHT / 2);
                } else if (!isRacingRef.current && countdown === 0) {
                    ctx.fillStyle = '#22c55e';
                    ctx.font = 'bold 200px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 8;
                    ctx.strokeText("YA!", WIDTH / 2, HEIGHT / 2);
                    ctx.fillText("YA!", WIDTH / 2, HEIGHT / 2);
                }

                // --- FINAL ANIMATIONS (Victory / Defeat) ---
                if (finishingSeqRef.current.active) {
                    const timeSinceFinish = (Date.now() - finishingSeqRef.current.startTime) / 1000;
                    const player = carsRef.current[0];
                    const rival = carsRef.current[1];
                    const playerDead = player.exploded;

                    if (player.finished && !playerDead) {
                        // Fireworks are handled in handleFinishSequence
                    }

                    let text = "FIN DE CARRERA";
                    let color = "#fff";

                    if (playerDead) {
                        text = "¡COCHE AVERIADO!";
                        color = "#ef4444";
                    } else if (player.finished) {
                        // Determine winner once and store it
                        if (finishingSeqRef.current.winner === undefined) {
                            const isWinner = !rival || !rival.finished || rival.lapTime > player.lapTime;
                            finishingSeqRef.current.winner = isWinner;
                        }

                        const isWinner = finishingSeqRef.current.winner;
                        text = isWinner ? "¡VICTORIA!" : "¡DERROTA!";
                        color = isWinner ? "#22c55e" : "#ef4444";
                    }

                    ctx.save();
                    const scale = 1 + Math.sin(timeSinceFinish * 5) * 0.05;
                    ctx.translate(WIDTH / 2, HEIGHT / 2);
                    ctx.scale(scale, scale);

                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.fillRect(-WIDTH / 2, -50, WIDTH, 100);

                    ctx.font = 'bold 80px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 4;
                    ctx.strokeText(text, 0, 0);
                    ctx.fillStyle = color;
                    ctx.fillText(text, 0, 0);
                    ctx.restore();
                }

                frameIdRef.current = requestAnimationFrame(render);
            } catch (e) {
                console.error("Render Loop Error:", e);
                frameIdRef.current = requestAnimationFrame(render);
            }
        };

        frameIdRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameIdRef.current);
    }, [status, isPaused, onFinish, settings.laps, settings.name, bestSpeed, viewMode, activeView, isMuted, trackDefinition, countdown]);

    return (
        <div className="relative w-full h-full touch-none select-none overflow-hidden">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full object-cover block" />

            {status === GameStatus.PLAYING && (
                <div className="absolute top-0 left-0 w-full p-2 md:p-6 flex justify-between items-start pointer-events-none z-20">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 md:gap-2 bg-black/50 backdrop-blur px-2 py-1 md:px-4 md:py-2 rounded-xl border border-cyan-500/30 shadow-lg">
                            <Gauge className="text-cyan-400 w-4 h-4 md:w-8 md:h-8" />
                            <span ref={speedRef} className="font-mono text-xl md:text-4xl font-bold text-white tracking-widest min-w-[3ch] text-right">0</span>
                            <span className="hidden md:inline text-sm text-cyan-400 font-bold mt-2">KM/H</span>
                        </div>
                    </div>

                    <div key={`hud-damage-${activeView}`} className="absolute left-1/2 transform -translate-x-1/2 top-2 md:top-6 flex flex-col items-center gap-1 md:gap-2">
                        <div className="flex items-center justify-center gap-1 md:gap-2 bg-black/60 backdrop-blur px-3 py-1 md:px-6 md:py-2 rounded-full border border-yellow-500/30 shadow-lg min-w-[110px] md:min-w-[160px]">
                            <Timer className="text-yellow-500 w-4 h-4 md:w-5 md:h-5" />
                            <span ref={timeRef} className="font-mono text-xl md:text-3xl font-bold text-yellow-400 tracking-wider text-center">0.00</span>
                        </div>

                        {activeView === 2 ? (
                            <div key="split-damage" className="w-full flex mt-1">
                                <div className="w-1/2 mr-10 flex justify-center">
                                    <div className="w-24 md:w-48 h-2 md:h-4 bg-gray-900 rounded-full border border-gray-600 relative overflow-hidden shadow-lg">
                                        <div className="absolute inset-0 flex items-center justify-center z-10 hidden md:flex">
                                            <Skull size={10} className="text-white/50 mr-1" />
                                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">P1 DMG</span>
                                        </div>
                                        <div ref={damageRef} className="h-full bg-green-500 transition-all duration-300 w-0"></div>
                                    </div>
                                </div>
                                <div className="w-1/2 flex justify-center">
                                    <div className="w-24 md:w-48 h-2 md:h-4 bg-gray-900 rounded-full border border-gray-600 relative overflow-hidden shadow-lg">
                                        <div className="absolute inset-0 flex items-center justify-center z-10 hidden md:flex">
                                            <Skull size={10} className="text-white/50 mr-1" />
                                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">CPU DMG</span>
                                        </div>
                                        <div ref={rivalDamageRef} className="h-full bg-green-500 transition-all duration-300 w-0"></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div key="single-damage" className="w-24 md:w-48 h-2 md:h-4 bg-gray-900 rounded-full border border-gray-600 relative overflow-hidden mt-1 shadow-lg">
                                <div className="absolute inset-0 flex items-center justify-center z-10 hidden md:flex">
                                    <Skull size={10} className="text-white/50 mr-1" />
                                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">DAMAGE</span>
                                </div>
                                <div ref={damageRef} className="h-full bg-green-500 transition-all duration-300 w-0"></div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-1 md:gap-2 pointer-events-auto">
                        <div className="flex items-center gap-1 md:gap-2 bg-black/50 backdrop-blur px-2 py-1 md:px-4 md:py-2 rounded-xl border border-green-500/30 shadow-lg">
                            <span className="hidden md:inline text-sm text-green-400 font-bold mt-1">LAP</span>
                            <span ref={lapRef} className="font-mono text-lg md:text-3xl font-bold text-white tracking-widest">1/{settings.laps}</span>
                            <Flag className="text-green-500 w-4 h-4 md:w-6 md:h-6" />
                        </div>

                        <div className="flex gap-1 md:gap-2">
                            <button
                                onClick={toggleMute}
                                className="bg-white/10 hover:bg-white/20 p-1 md:p-2 rounded-lg border border-white/20 transition-colors"
                            >
                                {isMuted ? <VolumeX className="text-red-400 w-4 h-4 md:w-6 md:h-6" /> : <Volume2 className="text-white w-4 h-4 md:w-6 md:h-6" />}
                            </button>
                            <button
                                onClick={() => setViewMode(prev => prev === '3D' ? 'MAP' : '3D')}
                                className="bg-white/10 hover:bg-white/20 p-1 md:p-2 rounded-lg border border-white/20 transition-colors"
                            >
                                <MapIcon className="text-white w-4 h-4 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {status === GameStatus.PLAYING && !isPaused && (
                <div className="absolute inset-0 z-20 pointer-events-none lg:hidden flex flex-col justify-end p-6">
                    <div className="flex justify-between items-end">
                        <div className="flex gap-6 pointer-events-auto">
                            <button
                                className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:bg-white/30 transition-transform active:scale-95 shadow-xl"
                                onPointerDown={(e) => { e.preventDefault(); handleTouchInput('left', true); }}
                                onPointerUp={(e) => { e.preventDefault(); handleTouchInput('left', false); }}
                                onPointerLeave={(e) => { e.preventDefault(); handleTouchInput('left', false); }}
                            >
                                <ArrowLeft className="w-10 h-10 text-white" />
                            </button>
                            <button
                                className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center active:bg-white/30 transition-transform active:scale-95 shadow-xl"
                                onPointerDown={(e) => { e.preventDefault(); handleTouchInput('right', true); }}
                                onPointerUp={(e) => { e.preventDefault(); handleTouchInput('right', false); }}
                                onPointerLeave={(e) => { e.preventDefault(); handleTouchInput('right', false); }}
                            >
                                <ArrowRight className="w-10 h-10 text-white" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 pointer-events-auto items-center">
                            <button
                                className="w-24 h-24 rounded-full bg-green-500/20 backdrop-blur-md border border-green-500/40 flex items-center justify-center active:bg-green-500/40 transition-transform active:scale-95 shadow-xl"
                                onPointerDown={(e) => { e.preventDefault(); handleTouchInput('up', true); }}
                                onPointerUp={(e) => { e.preventDefault(); handleTouchInput('up', false); }}
                                onPointerLeave={(e) => { e.preventDefault(); handleTouchInput('up', false); }}
                            >
                                <ArrowUp className="w-12 h-12 text-green-100" />
                            </button>
                            <button
                                className="w-16 h-16 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/40 flex items-center justify-center active:bg-red-500/40 transition-transform active:scale-95 shadow-xl"
                                onPointerDown={(e) => { e.preventDefault(); handleTouchInput('down', true); }}
                                onPointerUp={(e) => { e.preventDefault(); handleTouchInput('down', false); }}
                                onPointerLeave={(e) => { e.preventDefault(); handleTouchInput('down', false); }}
                            >
                                <ArrowDown className="w-8 h-8 text-red-100" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameCanvas;
