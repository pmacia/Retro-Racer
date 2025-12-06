
import React, { useRef, useEffect } from 'react';
import { GameStatus, PlayerSettings, Car, Segment } from '../types';
import { createTrack, createCars, updateGame, project } from '../services/gameEngine';
import { WIDTH, HEIGHT, TRACK_LENGTH, SEGMENT_LENGTH, ROAD_WIDTH, CAMERA_DEPTH, VISIBILITY, COLORS } from '../constants';

interface GameCanvasProps {
  status: GameStatus;
  settings: PlayerSettings;
  onFinish: (time: number) => void;
  isPaused: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ status, settings, onFinish, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State
  const carsRef = useRef<Car[]>([]);
  const trackRef = useRef<Segment[]>([]);
  const inputRef = useRef({ left: false, right: false, up: false, down: false });
  const startTimeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize
  useEffect(() => {
    if (status === GameStatus.PLAYING && carsRef.current.length === 0) {
      carsRef.current = createCars(settings.color, settings.name);
      trackRef.current = createTrack();
      startTimeRef.current = Date.now();
      lastTimeRef.current = Date.now();
    } else if (status === GameStatus.MENU) {
      carsRef.current = [];
      trackRef.current = [];
    }
  }, [status, settings]);

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

    const render = () => {
      if (isPaused) {
          frameIdRef.current = requestAnimationFrame(render);
          return;
      }

      const now = Date.now();
      const dt = Math.min(1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Update Physics
      updateGame(carsRef.current, trackRef.current, inputRef.current, dt, settings.laps);
      
      const player = carsRef.current[0];
      
      // Check Finish
      if (player.finished) {
          const totalTime = (Date.now() - startTimeRef.current) / 1000;
          onFinish(totalTime);
          return;
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
        // We project world coordinates relative to the camera.
        // WorldX of road center is 'x' (accumulated curve).
        // CameraX is 'cameraX'.
        // Input X = x - cameraX.
        // Input Y = 0 (Road is at ground level).
        segment.clip = maxY;
        const p1 = project({x: x - cameraX, y: 0, z: segmentZ}, 0, cameraY, 0, CAMERA_DEPTH, WIDTH, HEIGHT, ROAD_WIDTH);
        const p2 = project({x: x + dx - cameraX, y: 0, z: segmentZ + SEGMENT_LENGTH}, 0, cameraY, 0, CAMERA_DEPTH, WIDTH, HEIGHT, ROAD_WIDTH);
        
        x += dx;
        dx += segment.curve;

        // Save screen coords for sprites
        segment.screen = { x: p1.x, y: p1.y, w: p1.w };

        // Clipping check:
        // Skip if the segment is completely below the horizon/previous segment (p2.y >= maxY)
        // or if it's inverted/too close (p2.y >= p1.y in screen space, meaning "far" point is lower than "near" point)
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
            const spriteScale = segment.screen!.w / ROAD_WIDTH;
            // Correct sprite positioning: 
            // offset 0 is center. offset 1.0 is edge of road (w).
            const spriteX = segment.screen!.x + (sprite.offset * segment.screen!.w); 
            const spriteY = segment.screen!.y;
            
            // Adjust size to look proportional
            const sW = sprite.width * spriteScale * 5; 
            const sH = sprite.height * spriteScale * 5;
            
            // Only draw if visible above ground
            if (segment.clip !== undefined && spriteY > segment.clip) { 
                 // optional strict clipping
            }
            
            ctx.fillStyle = sprite.source === 'BOULDER' ? '#555' : '#1e4d2b';
            ctx.fillRect(spriteX - sW/2, spriteY - sH, sW, sH);
            
            // Simple detail for tree
            if (sprite.source === 'TREE') {
                 ctx.fillStyle = '#0f2916';
                 ctx.beginPath();
                 ctx.moveTo(spriteX - sW/2, spriteY - sH * 0.3);
                 ctx.lineTo(spriteX, spriteY - sH);
                 ctx.lineTo(spriteX + sW/2, spriteY - sH * 0.3);
                 ctx.fill();
            }
        });

        // 2. Cars
        carsRef.current.forEach(car => {
            if (car === player) return; // Draw player last
            const carSegIdx = Math.floor(car.z / SEGMENT_LENGTH) % TRACK_LENGTH;
            if (carSegIdx === i) {
                const spriteScale = segment.screen!.w / ROAD_WIDTH;
                const carX = segment.screen!.x + (car.offset * segment.screen!.w); 
                const carY = segment.screen!.y;
                
                const cW = 800 * spriteScale;
                const cH = 400 * spriteScale;

                ctx.fillStyle = car.color;
                ctx.fillRect(carX - cW/2, carY - cH, cW, cH);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(carX - cW/2 + 2, carY - 4, cW - 4, 4); // shadow
            }
        });
      }

      // --- DRAW PLAYER ---
      const playerScreenY = HEIGHT - 80;
      const playerW = 340;
      const playerH = 140;
      // Bounce effect
      const bounce = (2 * Math.random() * (player.speed / player.maxSpeed) * HEIGHT / 480) * (Math.random() > 0.5 ? 1 : -1);
      
      const pY = playerScreenY + bounce;

      // Car Body
      ctx.fillStyle = player.color;
      // Main block
      ctx.beginPath();
      ctx.roundRect(WIDTH/2 - playerW/2, pY - playerH * 0.6, playerW, playerH * 0.6, 10);
      ctx.fill();

      // Top/Cabin
      ctx.fillStyle = '#111'; 
      ctx.beginPath();
      ctx.roundRect(WIDTH/2 - playerW/3, pY - playerH * 0.9, playerW * 0.66, playerH * 0.4, [10, 10, 0, 0]);
      ctx.fill();
      
      // Wheels
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(WIDTH/2 - playerW/2 - 10, pY - 45, 30, 45); // L
      ctx.fillRect(WIDTH/2 + playerW/2 - 20, pY - 45, 30, 45); // R
      
      // Lights
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(WIDTH/2 - playerW/2 + 10, pY - playerH * 0.4, 40, 15);
      ctx.fillRect(WIDTH/2 + playerW/2 - 50, pY - playerH * 0.4, 40, 15);

      // --- HUD ---
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
      
      // Auto-scale map to fit? We use fixed scale for now
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
  }, [status, isPaused, onFinish, settings.laps]);

  return <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="w-full h-full object-cover" />;
};

export default GameCanvas;
