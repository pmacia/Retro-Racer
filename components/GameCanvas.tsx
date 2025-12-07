
import React, { useRef, useEffect, useState } from 'react';
import { GameStatus, PlayerSettings, Car, Segment } from '../types';
import { createTrack, createCars, updateGame, project } from '../services/gameEngine';
import { WIDTH, HEIGHT, TRACK_LENGTH, SEGMENT_LENGTH, ROAD_WIDTH, CAMERA_DEPTH, VISIBILITY, COLORS } from '../constants';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface GameCanvasProps {
  status: GameStatus;
  settings: PlayerSettings;
  onFinish: (time: number) => void;
  isPaused: boolean;
  bestSpeed?: number; // Passed to adjust AI difficulty if needed
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, settings, onFinish, isPaused, bestSpeed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const carsRef = useRef<Car[]>([]);
  const trackRef = useRef<Segment[]>([]);
  const inputRef = useRef({ left: false, right: false, up: false, down: false });
  const startTimeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // Countdown State
  const [countdown, setCountdown] = useState<number>(3);
  const isRacingRef = useRef<boolean>(false);

  // Initialize
  useEffect(() => {
    if (status === GameStatus.PLAYING && carsRef.current.length === 0) {
      // Create cars using difficulty and passing the best recorded speed
      carsRef.current = createCars(settings.color, settings.name, settings.difficulty, bestSpeed);
      trackRef.current = createTrack();
      
      // Reset Countdown
      setCountdown(3);
      isRacingRef.current = false;
      
      // Start Countdown Timer
      let count = 3;
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          isRacingRef.current = true;
          startTimeRef.current = Date.now();
          lastTimeRef.current = Date.now(); // Avoid huge dt jump
        }
      }, 1000);

      return () => clearInterval(interval);

    } else if (status === GameStatus.MENU) {
      carsRef.current = [];
      trackRef.current = [];
      isRacingRef.current = false;
    }
  }, [status, settings, bestSpeed]);

  // Inputs
  useEffect(() => {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) inputRef.current.left = isDown;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) inputRef.current.right = isDown;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) inputRef.current.up = isDown;
      if (['ArrowDown', 's', 'S'].includes(e.key)) inputRef.current.down = isDown;
    };
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    return () => {
      window.removeEventListener('keydown', (e) => handleKey(e, true));
      window.removeEventListener('keyup', (e) => handleKey(e, false));
    };
  }, []);

  const handleTouchInput = (action: 'up' | 'down' | 'left' | 'right', isPressed: boolean) => {
      inputRef.current[action] = isPressed;
  };

  // Main Loop
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Helper: Draw Polygon
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

    // Helper: Draw Car Model
    const drawCar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y - h*0.05, w * 0.55, h * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wheels
        const wheelW = w * 0.13;
        const wheelH = h * 0.35;
        const wheelY = y - wheelH * 0.85;
        const wheelOffsetX = w * 0.4;
        
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - wheelOffsetX - wheelW, wheelY, wheelW, wheelH); // L
        ctx.fillRect(x + wheelOffsetX, wheelY, wheelW, wheelH); // R

        // Body (Main block)
        const bodyH = h * 0.6;
        const bodyY = y - bodyH * 1.1; // Lift slightly for wheels
        ctx.fillStyle = color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - w/2, bodyY, w, bodyH, w*0.08);
        else ctx.rect(x - w/2, bodyY, w, bodyH);
        ctx.fill();

        // Cabin (Top)
        const cabinW = w * 0.65;
        const cabinH = h * 0.35;
        const cabinY = bodyY - cabinH * 0.9;
        ctx.fillStyle = '#222';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - cabinW/2, cabinY, cabinW, cabinH, [w*0.1, w*0.1, 0, 0]);
        else ctx.rect(x - cabinW/2, cabinY, cabinW, cabinH);
        ctx.fill();

        // Lights
        const lightW = w * 0.16;
        const lightH = h * 0.15;
        const lightY = bodyY + bodyH * 0.3;
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(x - w*0.4, lightY, lightW, lightH);
        ctx.fillRect(x + w*0.4 - lightW, lightY, lightW, lightH);
        
        // Shine/Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - w*0.4, bodyY, w*0.8, bodyH*0.2, w*0.02);
        ctx.fill();
    };

    const render = () => {
      if (isPaused) {
          frameIdRef.current = requestAnimationFrame(render);
          return;
      }

      const now = Date.now();
      const dt = Math.min(1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Update Physics ONLY if countdown is finished
      if (isRacingRef.current) {
        updateGame(carsRef.current, trackRef.current, inputRef.current, dt, settings.laps);
      }
      
      const player = carsRef.current[0];
      
      // Check Finish
      if (player.finished) {
          const totalTime = (Date.now() - startTimeRef.current) / 1000;
          onFinish(totalTime);
          return; // Stop rendering
      }

      // --- Rendering ---
      ctx.fillStyle = COLORS.SKY;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      
      // Solid Ground
      ctx.fillStyle = COLORS.LIGHT.grass;
      ctx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);

      // Camera
      // cameraX represents the lateral offset of the camera from the road center.
      // player.offset is normalized (-1 to 1).
      const cameraX = player.offset * ROAD_WIDTH;
      const cameraY = 1500; // Camera Height
      const cameraZ = player.z; // Camera position on track
      
      const baseSegmentIndex = Math.floor(cameraZ / SEGMENT_LENGTH) % TRACK_LENGTH;
      const baseSegment = trackRef.current[baseSegmentIndex];
      const basePercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
      
      let maxY = HEIGHT; // Clipping buffer for occlusion
      let x = 0; // Curve accumulator
      let dx = -(baseSegment.curve * basePercent); // Smooth curve start

      // --- DRAW ROAD ---
      for (let n = 0; n < VISIBILITY; n++) {
        const i = (baseSegmentIndex + n) % TRACK_LENGTH;
        const segment = trackRef.current[i];
        
        // Z-Coordinate relative to camera
        const loopZ = (i < baseSegmentIndex) ? TRACK_LENGTH * SEGMENT_LENGTH : 0;
        const segmentZ = (segment.index * SEGMENT_LENGTH + loopZ) - cameraZ;

        // Project
        segment.clip = maxY;
        const p1 = project({x: x - cameraX, y: 0, z: segmentZ}, 0, cameraY, 0, CAMERA_DEPTH, WIDTH, HEIGHT, ROAD_WIDTH);
        const p2 = project({x: x + dx - cameraX, y: 0, z: segmentZ + SEGMENT_LENGTH}, 0, cameraY, 0, CAMERA_DEPTH, WIDTH, HEIGHT, ROAD_WIDTH);
        
        x += dx;
        dx += segment.curve;

        // Save screen coords for sprites
        segment.screen = { x: p1.x, y: p1.y, w: p1.w };

        // Clipping check:
        if (p2.y >= maxY || p2.y >= p1.y) continue;
        
        // Draw Road (w is half-width)
        drawPoly(ctx, p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, segment.color.road);
        
        // Draw Rumble
        const r1 = p1.w * 1.2;
        const r2 = p2.w * 1.2;
        drawPoly(ctx, p1.x - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - r2, p2.y, segment.color.rumble);
        drawPoly(ctx, p1.x + p1.w, p1.y, p1.x + r1, p1.y, p2.x + r2, p2.y, p2.x + p2.w, p2.y, segment.color.rumble);

        // Draw Lane
        if (segment.color.lane) {
            const l1 = p1.w * 0.05;
            const l2 = p2.w * 0.05;
            drawPoly(ctx, p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, segment.color.lane);
        }

        maxY = p2.y; // Update Horizon clip to top of this segment
      }

      // --- DRAW SPRITES & CARS ---
      // Paint back to front
      for (let n = VISIBILITY - 1; n >= 0; n--) {
        const i = (baseSegmentIndex + n) % TRACK_LENGTH;
        const segment = trackRef.current[i];
        
        if (!segment.screen) continue;

        // 1. Static Sprites (Obstacles)
        segment.sprites.forEach(sprite => {
            // Calculate scale based on road width ratio
            const scale = segment.screen!.w / (ROAD_WIDTH / 2); 
            
            const spriteX = segment.screen!.x + (sprite.offset * segment.screen!.w); 
            const spriteY = segment.screen!.y;
            
            const sW = sprite.width * scale; 
            const sH = sprite.height * scale;
            
            // Render Trees
            if (sprite.source === 'TREE') {
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(spriteX, spriteY, sW * 0.4, sW * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();

                // Trunk
                const trunkW = sW * 0.2;
                const trunkH = sH * 0.2;
                ctx.fillStyle = '#4A3728'; // Dark wood
                ctx.fillRect(spriteX - trunkW/2, spriteY - trunkH, trunkW, trunkH);

                // Foliage layers (Pine style)
                const drawLayer = (y: number, w: number, h: number, color: string) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(spriteX - w/2, y);
                    ctx.lineTo(spriteX, y - h);
                    ctx.lineTo(spriteX + w/2, y);
                    ctx.closePath();
                    ctx.fill();
                };

                const startY = spriteY - trunkH * 0.8;
                // Bottom
                drawLayer(startY, sW, sH * 0.35, '#0d4013');
                // Middle
                drawLayer(startY - sH * 0.25, sW * 0.8, sH * 0.35, '#14521b');
                // Top
                drawLayer(startY - sH * 0.5, sW * 0.6, sH * 0.35, '#1a6622');
            } 
            // Render Boulders
            else if (sprite.source === 'BOULDER') {
                 // Shadow
                 ctx.fillStyle = 'rgba(0,0,0,0.3)';
                 ctx.beginPath();
                 ctx.ellipse(spriteX, spriteY, sW * 0.5, sW * 0.15, 0, 0, Math.PI * 2);
                 ctx.fill();

                 // Rock body
                 ctx.fillStyle = '#666';
                 ctx.beginPath();
                 ctx.arc(spriteX, spriteY - sH * 0.4, sW * 0.4, 0, Math.PI, true);
                 ctx.lineTo(spriteX - sW * 0.4, spriteY);
                 ctx.fill();
                 
                 // Highlight
                 ctx.fillStyle = '#888';
                 ctx.beginPath();
                 ctx.arc(spriteX - sW * 0.1, spriteY - sH * 0.5, sW * 0.15, 0, Math.PI * 2);
                 ctx.fill();
            }
        });

        // 2. Cars (Rivals)
        carsRef.current.forEach(car => {
            if (car === player) return; // Draw player last
            const carSegIdx = Math.floor(car.z / SEGMENT_LENGTH) % TRACK_LENGTH;
            if (carSegIdx === i) {
                const scale = segment.screen!.w / (ROAD_WIDTH / 2);
                const carX = segment.screen!.x + (car.offset * segment.screen!.w); 
                const carY = segment.screen!.y;
                
                // Scale width based on road width reference.
                const cW = 400 * scale; 
                const cH = cW * 0.45; // Aspect ratio

                drawCar(ctx, carX, carY, cW, cH, car.color);
            }
        });
      }

      // --- DRAW PLAYER ---
      const playerScreenY = HEIGHT - 80;
      const playerW = 340;
      const playerH = 140;
      // Bounce effect only when moving
      const bounce = (2 * Math.random() * (player.speed / player.maxSpeed) * HEIGHT / 480) * (Math.random() > 0.5 ? 1 : -1);
      const pY = playerScreenY + (isRacingRef.current ? bounce : 0);

      drawCar(ctx, WIDTH/2, pY, playerW, playerH, player.color);

      // --- DRAW COUNTDOWN ---
      if (!isRacingRef.current && countdown > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        ctx.fillStyle = countdown === 0 ? '#22c55e' : '#eab308';
        ctx.font = 'bold 200px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        ctx.strokeText(countdown.toString(), WIDTH/2, HEIGHT/2);
        ctx.fillText(countdown.toString(), WIDTH/2, HEIGHT/2);
      }
      if (!isRacingRef.current && countdown === 0) {
         // Display "GO!" briefly
         ctx.fillStyle = '#22c55e';
         ctx.font = 'bold 200px sans-serif';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.strokeStyle = 'white';
         ctx.lineWidth = 8;
         ctx.strokeText("YA!", WIDTH/2, HEIGHT/2);
         ctx.fillText("YA!", WIDTH/2, HEIGHT/2);
      }


      // --- HUD ---
      if (isRacingRef.current) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px monospace';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        
        // Speed
        ctx.textAlign = 'left';
        ctx.fillText(`SPEED: ${Math.floor(player.speed / 100)} km/h`, 30, 50);
        
        // Time
        const time = (Date.now() - startTimeRef.current) / 1000;
        ctx.textAlign = 'center';
        ctx.fillText(`TIME: ${time.toFixed(2)}`, WIDTH/2, 50);
        
        // Laps
        ctx.textAlign = 'right';
        ctx.fillText(`VUELTA ${player.lap} / ${settings.laps}`, WIDTH - 30, 50);
        ctx.shadowBlur = 0;
      }

      // --- MINI MAP ---
      const mapSize = 160;
      const mapPadding = 20;
      const mapX = WIDTH - mapSize - mapPadding;
      const mapY = 80;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(mapX, mapY, mapSize, mapSize);

      ctx.save();
      // Center map in box
      ctx.translate(mapX + mapSize/2, mapY + mapSize/2);
      
      // Auto-scale map to fit
      ctx.scale(0.045, 0.045);

      // Draw Track Segments
      ctx.lineWidth = 60;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      
      // Move to first point
      if (trackRef.current.length > 0) {
          ctx.moveTo(trackRef.current[0].mapX, trackRef.current[0].mapY);
          for (let k = 1; k < trackRef.current.length; k++) {
              ctx.lineTo(trackRef.current[k].mapX, trackRef.current[k].mapY);
          }
          ctx.closePath();
      }
      ctx.stroke();

      // Highlight Road
      ctx.lineWidth = 40;
      ctx.strokeStyle = '#999';
      ctx.stroke();

      // Draw Player Dot
      const playerSeg = trackRef.current[baseSegmentIndex];
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(playerSeg.mapX, playerSeg.mapY, 80, 0, Math.PI*2);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'white';
      ctx.stroke();

      // Draw Rival Dot
      const rival = carsRef.current[1];
      const rivalSegIdx = Math.floor(rival.z / SEGMENT_LENGTH) % TRACK_LENGTH;
      const rivalSeg = trackRef.current[rivalSegIdx];
      ctx.fillStyle = rival.color;
      ctx.beginPath();
      ctx.arc(rivalSeg.mapX, rivalSeg.mapY, 80, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();

      frameIdRef.current = requestAnimationFrame(render);
    };

    frameIdRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [status, isPaused, onFinish, settings.laps, settings.difficulty, bestSpeed, countdown]);

  return (
    <div className="relative w-full h-full touch-none select-none">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full object-cover block" />
      
      {/* Mobile Controls Overlay */}
      {status === GameStatus.PLAYING && !isPaused && (
          <div className="absolute inset-0 z-20 pointer-events-none lg:hidden flex flex-col justify-end p-6">
              <div className="flex justify-between items-end">
                  {/* Steering */}
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
                  
                  {/* Pedals */}
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
