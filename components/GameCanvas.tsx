
import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, PlayerSettings, Car, Segment, TrackDefinition } from '../types';
import { createTrack, createCars, updateGame, project } from '../services/gameEngine';
import { WIDTH, HEIGHT, SEGMENT_LENGTH, ROAD_WIDTH, CAMERA_DEPTH, VISIBILITY, COLORS } from '../constants';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Gauge, Timer, Flag, Map as MapIcon, Skull, Volume2, VolumeX } from 'lucide-react';
import { initAudio, startEngine, updateEngine, stopEngine, setMuted, isEngineRunning } from '../services/audio/audioEngine';
import { playSound } from '../services/audio/soundEffects';

interface GameCanvasProps {
    status: GameStatus;
    settings: PlayerSettings;
    trackDefinition: TrackDefinition; // Now receives the full definition object
    onFinish: (time: number, totalDistance: number, rank: number, winnerName: string) => void;
    isPaused: boolean;
    bestSpeed?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
    type: 'SMOKE' | 'FIRE' | 'DEBRIS' | 'SPARK' | 'LEAF' | 'FIREWORK';
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, settings, trackDefinition, onFinish, isPaused, bestSpeed }) => {
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
    }>({ active: false, startTime: 0, resultProcessed: false });

    const particlesRef = useRef<Particle[]>([]);

    // HUD Refs
    const speedRef = useRef<HTMLSpanElement>(null);
    const timeRef = useRef<HTMLSpanElement>(null);
    const lapRef = useRef<HTMLSpanElement>(null);
    const damageRef = useRef<HTMLDivElement>(null);
    const rivalDamageRef = useRef<HTMLDivElement>(null);

    const countdownRef = useRef<number>(3);
    const isRacingRef = useRef<boolean>(false);
    const [viewMode, setViewMode] = useState<'3D' | 'MAP'>('3D');
    const [activeView, setActiveView] = useState<number>(0); // 0=Player, 1=Rival, 2=Split
    const [isMuted, setIsMuted] = useState<boolean>(false);

    // Toggle mute handler using audio service
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
            stopEngine(); // Ensure engine stops on unmount
        };
    }, []);

    useEffect(() => {
        if (status === GameStatus.PLAYING && carsRef.current.length === 0) {
            carsRef.current = createCars(settings.color, settings.name, settings.difficulty, bestSpeed);
            // NOTE: We now use the passed trackDefinition directly
            trackRef.current = createTrack(trackDefinition);
            particlesRef.current = [];
            countdownRef.current = 3;
            isRacingRef.current = false;
            finishingSeqRef.current = { active: false, startTime: 0, resultProcessed: false };
            stopEngine();

            initAudio();

            let count = 3;
            playSound('REV');

            const interval = setInterval(() => {
                count--;
                countdownRef.current = count;
                if (count > 0) {
                    playSound('REV');
                } else if (count === 0) {
                    playSound('GO');
                    clearInterval(interval);
                    isRacingRef.current = true;
                    startTimeRef.current = Date.now();
                    lastTimeRef.current = Date.now();
                    startEngine();
                }
            }, 1000);
            return () => clearInterval(interval);
        } else if (status === GameStatus.MENU || status === GameStatus.GAME_OVER) {
            carsRef.current = [];
            trackRef.current = [];
            particlesRef.current = [];
            isRacingRef.current = false;
            finishingSeqRef.current = { active: false, startTime: 0, resultProcessed: false };
            stopEngine();
        }
    }, [status, settings, bestSpeed, trackDefinition]); // Added trackDefinition to deps

    // Input Handling...
    useEffect(() => {
        const handleKey = (e: KeyboardEvent, isDown: boolean) => {
            if (finishingSeqRef.current.active) return;

            if (['ArrowLeft', 'a', 'A'].includes(e.key)) inputRef.current.left = isDown;
            if (['ArrowRight', 'd', 'D'].includes(e.key)) inputRef.current.right = isDown;
            if (['ArrowUp', 'w', 'W'].includes(e.key)) inputRef.current.up = isDown;
            if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.down = isDown;

            if (isDown) {
                if (e.key === '1' || (e.altKey && e.key === '1')) { cameraViewRef.current = 0; setActiveView(0); }
                if (e.key === '2' || (e.altKey && e.key === '2')) { cameraViewRef.current = 1; setActiveView(1); }
                if (e.key === '3' || (e.altKey && e.key === '3')) { cameraViewRef.current = 2; setActiveView(2); } // Split Screen
                initAudio();
            }
        };
        window.addEventListener('keydown', (e) => handleKey(e, true));
        window.addEventListener('keyup', (e) => handleKey(e, false));
        return () => {
            window.removeEventListener('keydown', (e) => handleKey(e, true));
            window.removeEventListener('keyup', (e) => handleKey(e, false));
        };
    }, []);

    const handleTouchInput = (action: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
        if (finishingSeqRef.current.active) return;
        inputRef.current[action] = isPressed;
        initAudio();
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

        // Helper to draw polygons
        const drawPoly = (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) => {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
            c.lineTo(x3, y3);
            c.lineTo(x4, y4);
            c.closePath();
            c.fill();
        };

        // ... [Rest of drawing functions: drawCar, spawnFireworks, etc. are identical to previous version] ...

        const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, angle: number = 0) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(0, -h * 0.05, w * 0.55, h * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();

            const wheelW = w * 0.13;
            const wheelH = h * 0.35;
            const wheelY = -wheelH * 0.85;
            const wheelOffsetX = w * 0.4;

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(-wheelOffsetX - wheelW, wheelY, wheelW, wheelH);
            ctx.fillRect(wheelOffsetX, wheelY, wheelW, wheelH);

            const bodyH = h * 0.6;
            const bodyY = -bodyH * 1.1;
            ctx.fillStyle = color;
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(-w / 2, bodyY, w, bodyH, w * 0.08);
            else ctx.rect(-w / 2, bodyY, w, bodyH);
            ctx.fill();

            const cabinW = w * 0.65;
            const cabinH = h * 0.35;
            const cabinY = bodyY - cabinH * 0.9;
            ctx.fillStyle = '#222';
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(-cabinW / 2, cabinY, cabinW, cabinH, [w * 0.1, w * 0.1, 0, 0]);
            else ctx.rect(-cabinW / 2, cabinY, cabinW, cabinH);
            ctx.fill();

            const lightW = w * 0.16;
            const lightH = h * 0.15;
            const lightY = bodyY + bodyH * 0.3;
            ctx.fillStyle = '#cc0000';
            ctx.fillRect(-w * 0.4, lightY, lightW, lightH);
            ctx.fillRect(w * 0.4 - lightW, lightY, lightW, lightH);

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(-w * 0.4, bodyY, w * 0.8, bodyH * 0.2, w * 0.02);
            else ctx.rect(-w * 0.4, bodyY, w * 0.8, bodyH * 0.2);
            ctx.fill();
            ctx.restore();
        };

        const spawnFireworks = () => {
            const x = Math.random() * WIDTH;
            const y = Math.random() * (HEIGHT / 2);
            const color = `rgba(${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},${Math.floor(Math.random() * 255)},`;
            for (let i = 0; i < 30; i++) {
                particlesRef.current.push({
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 1.5,
                    size: Math.random() * 4 + 2,
                    color: color,
                    type: 'FIREWORK'
                });
            }
            playSound('BUMP');
        };

        const spawnDamageParticles = (x: number, y: number, damage: number, scale: number) => {
            if (damage < 20) return;
            let chance = 0.1;
            if (damage > 50) chance = 0.3;
            if (damage > 90) chance = 0.8;
            if (Math.random() > chance) return;
            const isCritical = damage > 90;
            const isHigh = damage > 60;
            particlesRef.current.push({
                x: x + (Math.random() * 20 - 10) * scale,
                y: y - (10 * scale),
                vx: (Math.random() * 2 - 1) * scale,
                vy: -(Math.random() * 3 + 1) * scale,
                life: 1.0,
                size: (Math.random() * 10 + 5) * scale,
                color: isHigh ? 'rgba(20,20,20,' : 'rgba(150,150,150,',
                type: 'SMOKE'
            });
            if (isCritical && Math.random() > 0.5) {
                particlesRef.current.push({
                    x: x + (Math.random() * 15 - 7.5) * scale,
                    y: y - (10 * scale),
                    vx: (Math.random() * 1 - 0.5) * scale,
                    vy: -(Math.random() * 2 + 0.5) * scale,
                    life: 0.5,
                    size: (Math.random() * 8 + 4) * scale,
                    color: 'rgba(255,' + Math.floor(Math.random() * 150) + ',0,',
                    type: 'FIRE'
                });
            }
        };

        const spawnParticles = (x: number, y: number, type: string) => {
            const count = 10;
            let color = 'rgba(100,100,100,';
            let pType: Particle['type'] = 'DEBRIS';
            if (type === 'BARREL') { color = 'rgba(185,28,28,'; }
            else if (type === 'TIRE') { color = 'rgba(30,30,30,'; }
            else if (type === 'SPARK') { color = 'rgba(255,255,0,'; pType = 'SPARK'; }
            else if (type === 'TREE') { color = 'rgba(20, 100, 20,'; pType = 'LEAF'; }
            for (let i = 0; i < count; i++) {
                particlesRef.current.push({
                    x: x,
                    y: y,
                    vx: (Math.random() * 10 - 5) * (pType === 'SPARK' ? 2 : 1),
                    vy: -(Math.random() * 10 + 5),
                    life: 1.0,
                    size: Math.random() * 5 + 3,
                    color: color,
                    type: pType
                });
            }
        };

        const updateParticles = () => {
            for (let i = particlesRef.current.length - 1; i >= 0; i--) {
                const p = particlesRef.current[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.type === 'DEBRIS' || p.type === 'LEAF') {
                    p.vy += 0.5; p.life -= 0.03;
                } else if (p.type === 'SPARK') {
                    p.vy += 0.2; p.life -= 0.05;
                } else if (p.type === 'FIREWORK') {
                    p.vy += 0.1; p.life -= 0.02;
                } else {
                    p.life -= 0.02; p.size *= 1.02;
                }
                if (p.life <= 0) {
                    particlesRef.current.splice(i, 1);
                }
            }
        };

        const drawParticles = (ctx: CanvasRenderingContext2D) => {
            for (let i = 0; i < particlesRef.current.length; i++) {
                const p = particlesRef.current[i];
                ctx.beginPath();
                if (p.type === 'DEBRIS' || p.type === 'LEAF') ctx.rect(p.x, p.y, p.size, p.size);
                else if (p.type === 'SPARK') {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                    ctx.strokeStyle = `rgba(255,255,0,${p.life})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    continue;
                }
                else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                if (p.type === 'FIRE') ctx.fillStyle = `${p.color}${p.life})`;
                else if (p.type === 'FIREWORK') ctx.fillStyle = `${p.color}${p.life})`;
                else ctx.fillStyle = `${p.color}${p.life * 0.8})`;
                ctx.fill();
            }
        };

        const renderView = (ctx: CanvasRenderingContext2D, cameraCar: Car, viewX: number, viewY: number, viewW: number, viewH: number) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(viewX, viewY, viewW, viewH);
            ctx.clip();

            ctx.fillStyle = COLORS.SKY;
            ctx.fillRect(viewX, viewY, viewW, viewH);

            const h = viewH / 2;
            ctx.fillStyle = COLORS.MOUNTAIN;
            ctx.beginPath();
            ctx.moveTo(viewX, viewY + h);
            for (let i = 0; i <= viewW; i += 20) {
                const seed = (i + viewX) * 0.05;
                const peakHeight = Math.sin(seed) * 10 + Math.cos(seed * 2.5) * 5 + 15;
                ctx.lineTo(viewX + i, viewY + h - peakHeight);
            }
            ctx.lineTo(viewX + viewW, viewY + h);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = COLORS.LIGHT.grass;
            ctx.fillRect(viewX, viewY + viewH / 2, viewW, viewH / 2);

            const trackLen = trackRef.current.length;
            const cameraX = cameraCar.offset * ROAD_WIDTH;
            const cameraY = 1500;
            const cameraZ = cameraCar.z;
            const baseSegmentIndex = Math.floor(cameraZ / SEGMENT_LENGTH) % trackLen;
            const baseSegment = trackRef.current[baseSegmentIndex];
            const basePercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
            let maxY = viewY + viewH;
            let x = 0;
            let dx = -(baseSegment.curve * basePercent);

            for (let n = 0; n < VISIBILITY; n++) {
                const i = (baseSegmentIndex + n) % trackLen;
                const segment = trackRef.current[i];
                const loopZ = (i < baseSegmentIndex) ? trackLen * SEGMENT_LENGTH : 0;
                const segmentZ = (segment.index * SEGMENT_LENGTH + loopZ) - cameraZ;
                segment.clip = maxY;

                const p1 = project({ x: x - cameraX, y: 0, z: segmentZ }, 0, cameraY, 0, CAMERA_DEPTH, viewW, viewH, ROAD_WIDTH);
                const p2 = project({ x: x + dx - cameraX, y: 0, z: segmentZ + SEGMENT_LENGTH }, 0, cameraY, 0, CAMERA_DEPTH, viewW, viewH, ROAD_WIDTH);

                p1.x += viewX;
                p2.x += viewX;
                p1.y += viewY;
                p2.y += viewY;

                x += dx;
                dx += segment.curve;
                segment.screen = { x: p1.x, y: p1.y, w: p1.w };

                if (p2.y >= maxY || p2.y >= p1.y) continue;

                drawPoly(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);
                const r1 = p1.w * 1.2;
                const r2 = p2.w * 1.2;
                drawPoly(ctx, p1.x - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - r2, p2.y, segment.color.rumble);
                drawPoly(ctx, p1.x + p1.w, p1.y, p1.x + r1, p1.y, p2.x + r2, p2.y, p2.x + p2.w, p2.y, segment.color.rumble);
                if (segment.color.lane) {
                    const l1 = p1.w * 0.05;
                    const l2 = p2.w * 0.05;
                    drawPoly(ctx, p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, segment.color.lane);
                }
                maxY = p2.y;
            }

            if (maxY > viewY + viewH / 2) {
                const lastSegIdx = (baseSegmentIndex + VISIBILITY) % trackLen;
                ctx.fillStyle = trackRef.current[lastSegIdx].color.road;
                ctx.fillRect(viewX, viewY + viewH / 2, viewW, maxY - (viewY + viewH / 2));
            }

            for (let n = VISIBILITY - 1; n >= 0; n--) {
                const i = (baseSegmentIndex + n) % trackLen;
                const segment = trackRef.current[i];
                if (!segment.screen) continue;

                segment.sprites.forEach(sprite => {
                    const scale = segment.screen!.w / (ROAD_WIDTH / 2);
                    const spriteX = segment.screen!.x + (sprite.offset * segment.screen!.w);
                    const spriteY = segment.screen!.y;
                    const sW = sprite.width * scale;
                    const sH = sprite.height * scale;

                    if (spriteX + sW / 2 < viewX || spriteX - sW / 2 > viewX + viewW) return;

                    if (sprite.source === 'TREE') {
                        ctx.fillStyle = 'rgba(0,0,0,0.3)';
                        ctx.beginPath();
                        ctx.ellipse(spriteX, spriteY, sW * 0.4, sW * 0.1, 0, 0, Math.PI * 2);
                        ctx.fill();
                        const trunkW = sW * 0.2;
                        const trunkH = sH * 0.2;
                        ctx.fillStyle = '#4A3728';
                        ctx.fillRect(spriteX - trunkW / 2, spriteY - trunkH, trunkW, trunkH);
                        const drawLayer = (y: number, w: number, h: number, color: string) => {
                            ctx.fillStyle = color;
                            ctx.beginPath();
                            ctx.moveTo(spriteX - w / 2, y);
                            ctx.lineTo(spriteX, y - h);
                            ctx.lineTo(spriteX + w / 2, y);
                            ctx.closePath();
                            ctx.fill();
                        };
                        const startY = spriteY - trunkH * 0.8;
                        drawLayer(startY, sW, sH * 0.35, '#0d4013');
                        drawLayer(startY - sH * 0.25, sW * 0.8, sH * 0.35, '#14521b');
                        drawLayer(startY - sH * 0.5, sW * 0.6, sH * 0.35, '#1a6622');
                    } else if (sprite.source === 'BOULDER') {
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.beginPath();
                        ctx.ellipse(spriteX, spriteY, sW * 0.55, sW * 0.15, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#666';
                        ctx.beginPath();
                        ctx.moveTo(spriteX - sW * 0.45, spriteY);
                        ctx.quadraticCurveTo(spriteX, spriteY - sH * 1.2, spriteX + sW * 0.45, spriteY);
                        ctx.closePath();
                        ctx.fill();
                        ctx.fillStyle = '#888';
                        ctx.beginPath();
                        ctx.ellipse(spriteX - sW * 0.15, spriteY - sH * 0.5, sW * 0.15, sH * 0.1, Math.PI / 4, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (sprite.source === 'BARREL') {
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.beginPath();
                        ctx.ellipse(spriteX, spriteY, sW * 0.3, sW * 0.1, 0, 0, Math.PI * 2);
                        ctx.fill();
                        const barrelW = sW * 0.5;
                        const barrelH = sH * 0.7;
                        ctx.fillStyle = '#b91c1c';
                        ctx.fillRect(spriteX - barrelW / 2, spriteY - barrelH, barrelW, barrelH);
                        ctx.fillStyle = '#7f1d1d';
                        ctx.fillRect(spriteX - barrelW / 2, spriteY - barrelH * 0.7, barrelW, barrelH * 0.1);
                        ctx.fillRect(spriteX - barrelW / 2, spriteY - barrelH * 0.3, barrelW, barrelH * 0.1);
                    } else if (sprite.source === 'TIRE') {
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.beginPath();
                        ctx.ellipse(spriteX, spriteY, sW * 0.3, sW * 0.1, 0, 0, Math.PI * 2);
                        ctx.fill();
                        const tireW = sW * 0.5;
                        const tireH = sH * 0.5;
                        ctx.fillStyle = '#111';
                        ctx.beginPath();
                        ctx.ellipse(spriteX, spriteY - tireH / 2, tireW / 2, tireH / 2, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#333';
                        ctx.beginPath();
                        ctx.ellipse(spriteX, spriteY - tireH / 2, tireW / 4, tireH / 4, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });

                carsRef.current.forEach(car => {
                    if (car === cameraCar) return;
                    const carSegIdx = Math.floor(car.z / SEGMENT_LENGTH) % trackLen;
                    if (carSegIdx === i) {
                        const scale = segment.screen!.w / (ROAD_WIDTH / 2);
                        const carX = segment.screen!.x + (car.offset * segment.screen!.w);
                        const carY = segment.screen!.y;
                        const cW = 400 * scale;
                        const cH = cW * 0.45;

                        if (carX + cW / 2 < viewX || carX - cW / 2 > viewX + viewW) return;

                        drawCar(ctx, carX, carY, cW, cH, car.color);
                        spawnDamageParticles(carX, carY, car.damage, scale);
                    }
                });
            }

            const playerScreenY = viewY + viewH - 80;
            const playerW = 340;
            const playerH = 140;
            let pY = playerScreenY;
            if (cameraCar.exploded) pY += (Math.random() - 0.5) * 5;
            else {
                const bounce = (2 * Math.random() * (cameraCar.speed / cameraCar.maxSpeed) * viewH / 480) * (Math.random() > 0.5 ? 1 : -1);
                pY += (isRacingRef.current ? bounce : 0);
            }
            const carColor = cameraCar.exploded ? '#2d2d2d' : cameraCar.color;
            drawCar(ctx, viewX + viewW / 2, pY, playerW, playerH, carColor);

            if (cameraCar.exploded) {
                spawnDamageParticles(viewX + viewW / 2, pY - 20, 100, 1.5);
                if (Math.random() > 0.3) {
                    particlesRef.current.push({
                        x: viewX + viewW / 2 + (Math.random() * 40 - 20),
                        y: pY - 30,
                        vx: (Math.random() * 2 - 1),
                        vy: -(Math.random() * 5 + 3),
                        life: 1.5,
                        size: Math.random() * 20 + 10,
                        color: 'rgba(20,20,20,',
                        type: 'SMOKE'
                    });
                }
            } else {
                spawnDamageParticles(viewX + viewW / 2, pY - 20, cameraCar.damage, 1.0);
            }

            drawParticles(ctx);
            ctx.restore();
        };

        const render = () => {
            try {
                // --- CRITICAL FIX START ---
                // If data is not yet initialized (Race Condition fix), wait for next frame.
                if (trackRef.current.length === 0 || carsRef.current.length === 0) {
                    frameIdRef.current = requestAnimationFrame(render);
                    return;
                }
                // --- CRITICAL FIX END ---

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
                const rival = carsRef.current[1]; // Might be undefined if only 1 car

                // Determine camera target
                const cameraTargetIndex = cameraViewRef.current < carsRef.current.length ? cameraViewRef.current : 0;
                const cameraCar = carsRef.current[cameraTargetIndex];

                if (!player || !cameraCar) {
                    frameIdRef.current = requestAnimationFrame(render);
                    return;
                }

                const anyCarFinished = carsRef.current.some(c => c.finished);
                const playerDead = player.exploded;
                const finishConditionMet = anyCarFinished || playerDead;

                if (finishConditionMet && !finishingSeqRef.current.active) {
                    finishingSeqRef.current.active = true;
                    finishingSeqRef.current.startTime = Date.now();
                    stopEngine();
                    if (playerDead) {
                        playSound('EXPLOSION');
                        setTimeout(() => playSound('DEFEAT'), 1000);
                    } else if (player.finished) {
                        const rank = player.finished && (rival && (!rival.finished || (rival.lapTime > player.lapTime))) ? 1 : 2;
                        if (rank === 1) playSound('VICTORY');
                        else playSound('DEFEAT');
                    } else {
                        playSound('DEFEAT');
                    }
                    inputRef.current = { up: false, down: false, left: false, right: false };
                }

                if (finishingSeqRef.current.active) {
                    const timeSinceFinish = Date.now() - finishingSeqRef.current.startTime;
                    if (player.finished && !playerDead) {
                        if (Math.random() < 0.05) spawnFireworks();
                    }
                    if (timeSinceFinish > 3500 && !finishingSeqRef.current.resultProcessed) {
                        finishingSeqRef.current.resultProcessed = true;
                        const totalTime = (Date.now() - startTimeRef.current) / 1000;
                        // Use passed track definition for calculations if needed
                        const totalDistance = trackRef.current.length * SEGMENT_LENGTH * settings.laps;
                        let rank = 2;
                        let winnerName = 'CPU';
                        if (playerDead) {
                            rank = 2; winnerName = 'CRASHED';
                        } else if (player.finished) {
                            if (rival && rival.finished && rival.lapTime < player.lapTime) {
                                rank = 2; winnerName = rival.name;
                            } else {
                                rank = 1; winnerName = player.name;
                            }
                        }
                        onFinish(totalTime, totalDistance, rank, winnerName);
                        return;
                    }
                }

                if (isRacingRef.current) {
                    updateGame(
                        carsRef.current,
                        trackRef.current,
                        inputRef.current,
                        dt,
                        settings.laps,
                        {
                            onObstacleHit: (type) => {
                                if (type === 'TREE') { spawnParticles(WIDTH / 2, HEIGHT - 100, 'TREE'); playSound('CRASH'); }
                                else if (type === 'BOULDER') { spawnParticles(WIDTH / 2, HEIGHT - 100, 'DEBRIS'); playSound('CRASH'); }
                                else if (type === 'BARREL') { spawnParticles(WIDTH / 2, HEIGHT - 100, 'BARREL'); playSound('BARREL'); }
                                else if (type === 'TIRE') { spawnParticles(WIDTH / 2, HEIGHT - 100, 'TIRE'); playSound('TIRE'); }
                            },
                            onCarHit: (_type, severity) => {
                                spawnParticles(WIDTH / 2, HEIGHT - 100, 'SPARK');
                                if (severity > 0.8) playSound('CRASH');
                                else playSound('BUMP');
                            }
                        }
                    );
                    if (isEngineRunning() && !finishingSeqRef.current.active) {
                        updateEngine(cameraCar.speed / cameraCar.maxSpeed);
                    }
                    if (speedRef.current) speedRef.current.innerText = `${Math.floor(cameraCar.speed / 100)}`;
                    if (timeRef.current) {
                        const t = (Date.now() - startTimeRef.current) / 1000;
                        timeRef.current.innerText = t.toFixed(2);
                    }
                    if (lapRef.current) lapRef.current.innerText = `${cameraCar.lap}/${settings.laps}`;
                    if (damageRef.current) {
                        const pct = Math.min(100, cameraCar.damage);
                        damageRef.current.style.width = `${pct}%`;
                        if (pct > 90) damageRef.current.style.backgroundColor = '#ef4444';
                        else if (pct > 50) damageRef.current.style.backgroundColor = '#f97316';
                        else damageRef.current.style.backgroundColor = '#22c55e';
                    }
                    if (rivalDamageRef.current && cameraViewRef.current === 2 && rival) {
                        const pct = Math.min(100, rival.damage);
                        rivalDamageRef.current.style.width = `${pct}%`;
                        if (pct > 90) rivalDamageRef.current.style.backgroundColor = '#ef4444';
                        else if (pct > 50) rivalDamageRef.current.style.backgroundColor = '#f97316';
                        else rivalDamageRef.current.style.backgroundColor = '#22c55e';
                    }
                }

                // Clear Screen
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);

                if (viewMode === 'MAP') {
                    // [MAP RENDERING CODE OMITTED FOR BREVITY - REMAINS THE SAME]
                    // Re-implementing Map for correctness
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, WIDTH, HEIGHT);
                    ctx.save();
                    let mmMinX = Infinity, mmMaxX = -Infinity, mmMinY = Infinity, mmMaxY = -Infinity;
                    trackRef.current.forEach(s => {
                        if (s.mapX < mmMinX) mmMinX = s.mapX;
                        if (s.mapX > mmMaxX) mmMaxX = s.mapX;
                        if (s.mapY < mmMinY) mmMinY = s.mapY;
                        if (s.mapY > mmMaxY) mmMaxY = s.mapY;
                    });
                    const mapW = mmMaxX - mmMinX;
                    const mapH = mmMaxY - mmMinY;
                    const scale = Math.min(WIDTH / mapW, HEIGHT / mapH) * 0.8;
                    ctx.translate(WIDTH / 2, HEIGHT / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-(mmMinX + mapW / 2), -(mmMinY + mapH / 2));
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#333';
                    ctx.beginPath();
                    ctx.moveTo(trackRef.current[0].mapX, trackRef.current[0].mapY);
                    trackRef.current.forEach(p => ctx.lineTo(p.mapX, p.mapY));
                    ctx.closePath();
                    ctx.stroke();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#666';
                    ctx.stroke();
                    trackRef.current.forEach(seg => {
                        seg.sprites.forEach(spr => {
                            const ox = seg.mapX + Math.cos(0) * spr.offset * 2;
                            const oy = seg.mapY + Math.sin(0) * spr.offset * 2;
                            ctx.fillStyle = spr.source === 'TREE' ? '#10b981' : '#9ca3af';
                            ctx.beginPath();
                            ctx.arc(ox, oy, 0.75, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    });
                    carsRef.current.forEach(car => {
                        const segIdx = Math.floor(car.z / SEGMENT_LENGTH) % trackRef.current.length;
                        const seg = trackRef.current[segIdx];
                        const nextSeg = trackRef.current[(segIdx + 5) % trackRef.current.length];
                        const angle = Math.atan2(nextSeg.mapY - seg.mapY, nextSeg.mapX - seg.mapX);
                        ctx.save();
                        ctx.translate(seg.mapX, seg.mapY);
                        ctx.rotate(angle + Math.PI / 2);
                        ctx.fillStyle = car.color;
                        const carW = 1;
                        const carH = 1.75;
                        ctx.fillRect(-carW / 2, -carH / 2, carW, carH);
                        ctx.lineWidth = 0.25;
                        ctx.strokeStyle = 'white';
                        ctx.strokeRect(-carW / 2, -carH / 2, carW, carH);
                        ctx.restore();
                    });
                    ctx.restore();
                } else {
                    updateParticles();

                    if (cameraViewRef.current === 2) {
                        // Split Screen
                        renderView(ctx, player, 0, 0, WIDTH / 2, HEIGHT);
                        if (rival) renderView(ctx, rival, WIDTH / 2, 0, WIDTH / 2, HEIGHT);

                        // Divider
                        ctx.fillStyle = '#000';
                        ctx.fillRect(WIDTH / 2 - 2, 0, 4, HEIGHT);
                    } else {
                        // Single View
                        renderView(ctx, cameraCar, 0, 0, WIDTH, HEIGHT);
                    }

                    // --- HUD MINI-MAP ---
                    // Only draw if we have track data
                    if (trackRef.current.length > 0) {
                        const mmSize = 120;
                        const mmX = 20; // Left aligned
                        const mmY = 140; // Below the speed gauge (approx)

                        // Calculate scale
                        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                        for (const s of trackRef.current) {
                            if (s.mapX < minX) minX = s.mapX;
                            if (s.mapX > maxX) maxX = s.mapX;
                            if (s.mapY < minY) minY = s.mapY;
                            if (s.mapY > maxY) maxY = s.mapY;
                        }
                        const w = maxX - minX;
                        const h = maxY - minY;
                        const scale = Math.min((mmSize - 10) / w, (mmSize - 10) / h);

                        ctx.save();
                        ctx.translate(mmX, mmY);

                        // Background
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)'; // Cyan tint border
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(0, 0, mmSize, mmSize, 8);
                        else ctx.rect(0, 0, mmSize, mmSize);
                        ctx.fill();
                        ctx.stroke();

                        // Center track
                        const offsetX = (mmSize - w * scale) / 2 - minX * scale;
                        const offsetY = (mmSize - h * scale) / 2 - minY * scale;

                        // Draw Track Line
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.lineWidth = 2;
                        for (let i = 0; i < trackRef.current.length; i++) {
                            const s = trackRef.current[i];
                            const sx = s.mapX * scale + offsetX;
                            const sy = s.mapY * scale + offsetY;
                            if (i === 0) ctx.moveTo(sx, sy);
                            else ctx.lineTo(sx, sy);
                        }
                        ctx.closePath();
                        ctx.stroke();

                        // Draw Cars
                        for (const car of carsRef.current) {
                            if (!car) continue;
                            const segIdx = Math.floor(car.z / SEGMENT_LENGTH) % trackRef.current.length;
                            // Safeguard against invalid segment index
                            if (segIdx < 0 || segIdx >= trackRef.current.length) continue;

                            const seg = trackRef.current[segIdx];
                            if (!seg) continue;

                            const cx = seg.mapX * scale + offsetX;
                            const cy = seg.mapY * scale + offsetY;

                            ctx.fillStyle = car.isPlayer ? '#22c55e' : '#ef4444'; // Green vs Red
                            ctx.beginPath();
                            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
                            ctx.fill();
                            // Stroke for visibility
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = 'white';
                            ctx.stroke();
                        }

                        ctx.restore();
                    }
                }
                if (!isRacingRef.current && countdownRef.current > 0) {
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(0, 0, WIDTH, HEIGHT);
                    ctx.fillStyle = countdownRef.current === 0 ? '#22c55e' : '#eab308';
                    ctx.font = 'bold 200px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 8;
                    ctx.strokeText(countdownRef.current.toString(), WIDTH / 2, HEIGHT / 2);
                    ctx.fillText(countdownRef.current.toString(), WIDTH / 2, HEIGHT / 2);
                }
                if (!isRacingRef.current && countdownRef.current === 0) {
                    ctx.fillStyle = '#22c55e';
                    ctx.font = 'bold 200px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 8;
                    ctx.strokeText("YA!", WIDTH / 2, HEIGHT / 2);
                    ctx.fillText("YA!", WIDTH / 2, HEIGHT / 2);
                }
                frameIdRef.current = requestAnimationFrame(render);
            } catch (e) {
                console.error("Render Loop Error:", e);
                // Attempt to recover by requesting next frame, but maybe with a delay or just stop to prevent spam
                // For now, let's just try to continue, but maybe it's safer to stop if it persists.
                // frameIdRef.current = requestAnimationFrame(render); 
            }
        };

        frameIdRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(frameIdRef.current);
    }, [status, isPaused, onFinish, settings.laps, settings.difficulty, settings.trackId, bestSpeed, viewMode, isMuted, trackDefinition]);

    return (
        <div className="relative w-full h-full touch-none select-none overflow-hidden">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full object-cover block" />

            {status === GameStatus.PLAYING && (
                <div className="absolute top-0 left-0 w-full p-2 md:p-6 flex justify-between items-start pointer-events-none z-20">
                    {/* HUD Elements... Same as before */}
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

                        {activeView === 2 ? (
                            <div className="w-full flex mt-1">
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
                            <div className="w-24 md:w-48 h-2 md:h-4 bg-gray-900 rounded-full border border-gray-600 relative overflow-hidden mt-1 shadow-lg">
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
