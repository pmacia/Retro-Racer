import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, PlayerSettings, TrackDefinition } from '../types';

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Gauge, Timer, Flag, Map as MapIcon, Skull, Volume2, VolumeX } from 'lucide-react';
import { Game } from '../core/Game';

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
    const gameRef = useRef<Game | null>(null);

    // HUD Refs to pass to Game Engine
    const speedRef = useRef<HTMLSpanElement>(null);
    const timeRef = useRef<HTMLSpanElement>(null);
    const lapRef = useRef<HTMLSpanElement>(null);
    const damageRef = useRef<HTMLDivElement>(null);
    const rivalDamageRef = useRef<HTMLDivElement>(null);

    const [countdown, setCountdown] = useState<number>(3);
    const [activeView, setActiveView] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    // Toggle mute handler
    const toggleMute = () => {
        setIsMuted(prev => {
            const newState = !prev;
            if (gameRef.current) gameRef.current.setMuted(newState);
            return newState;
        });
    };

    const prevStatusRef = useRef<GameStatus>(status);

    // Initialize Game Engine and handle Resize
    useEffect(() => {
        if (!canvasRef.current) return;

        // Instantiate Game once
        const game = new Game(
            canvasRef.current,
            { speed: speedRef, time: timeRef, lap: lapRef, damage: damageRef, rivalDamage: rivalDamageRef },
            onFinish,
            setCountdown // Connect countdown callback
        );
        game.onViewChange = setActiveView;
        gameRef.current = game;

        // Resize Handler
        const handleResize = () => {
            if (canvasRef.current && gameRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvasRef.current.width = parent.clientWidth;
                    canvasRef.current.height = parent.clientHeight;
                    gameRef.current.resize(parent.clientWidth, parent.clientHeight);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial sizing

        return () => {
            window.removeEventListener('resize', handleResize);
            game.stop();
            gameRef.current = null;
        };
    }, []); // Run once on mount

    // Handle Status Changes (Start / Pause / Resume)
    useEffect(() => {
        if (!gameRef.current) return;

        const prevStatus = prevStatusRef.current;
        prevStatusRef.current = status;

        if (status === GameStatus.PLAYING) {
            if (prevStatus === GameStatus.MENU || prevStatus === GameStatus.GAME_OVER) {
                // FRESH START
                gameRef.current.start(settings, trackDefinition, playerName, bestSpeed);
                gameRef.current.setMuted(isMuted);
            } else if (isPaused) {
                gameRef.current.setPaused(true);
            } else {
                gameRef.current.setPaused(false);
            }
        } else if (status === GameStatus.PAUSED) {
            gameRef.current.setPaused(true);
        } else {
            gameRef.current.stop();
        }
    }, [status, isPaused, settings, trackDefinition, playerName, bestSpeed]); // Added all deps to single effect for clarity

    // Input Handling (Touch)
    const handleTouchInput = (action: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
        if (gameRef.current) {
            gameRef.current.handleTouchInput(action, isPressed);
        }
    };

    return (
        <div className="relative w-full h-full touch-none select-none overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {status === GameStatus.PLAYING && (
                <div className="absolute top-0 left-0 w-full p-2 md:p-6 flex justify-between items-start pointer-events-none z-20">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 md:gap-2 bg-black/50 backdrop-blur px-2 py-1 md:px-4 md:py-2 rounded-xl border border-cyan-500/30 shadow-lg">
                            <Gauge className="text-cyan-400 w-4 h-4 md:w-8 md:h-8" />
                            <span ref={speedRef} className="font-mono text-xl md:text-4xl font-bold text-white tracking-widest min-w-[3ch] text-right">0</span>
                            <span className="hidden md:inline text-sm text-cyan-400 font-bold mt-2">KM/H</span>
                        </div>
                    </div>

                    <div className="absolute left-1/2 transform -translate-x-1/2 top-2 md:top-6 flex flex-col items-center gap-1 md:gap-2">
                        <div className="flex items-center justify-center gap-1 md:gap-2 bg-black/60 backdrop-blur px-3 py-1 md:px-6 md:py-2 rounded-full border border-yellow-500/30 shadow-lg min-w-[110px] md:min-w-[160px]">
                            <Timer className="text-yellow-500 w-4 h-4 md:w-5 md:h-5" />
                            <span ref={timeRef} className="font-mono text-xl md:text-3xl font-bold text-yellow-400 tracking-wider text-center">0.00</span>
                        </div>

                        {activeView === 2 || activeView === 3 ? (
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
                                onClick={() => gameRef.current?.toggleMap()}
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

            {/* Visual Overlays for Countdown and Victory would ideally be passed from Game or handled via state here */}
            {/* Since I removed the rendering logic from here, I can't easily draw text on canvas unless GraphicsEngine does it */}
            {/* Wait, the original code drew "YA!" and "VICTORY" on the canvas using the 2D context. */}
            {/* My GraphicsEngine only handles the 3D scene and map. */}
            {/* I should probably add UI rendering to GraphicsEngine OR keep it here as DOM overlays. */}
            {/* The original code had DOM overlays for HUD but Canvas Text for "YA!" and "VICTORY". */}
            {/* For now, to keep strict separation, GraphicsEngine should handle visual text if it's "in-game". */}
            {/* Or better, make them DOM elements for cleaner separation. */}

            {status === GameStatus.PLAYING && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="text-[#eab308] text-9xl font-bold font-sans drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
                        {countdown}
                    </div>
                </div>
            )}

        </div>
    );
};

export default GameCanvas;
