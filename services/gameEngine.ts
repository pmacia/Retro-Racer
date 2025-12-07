
import { Car, Segment, Point3D, ProjectPoint, Difficulty, TrackDefinition } from '../types';
import { SEGMENT_LENGTH, ROAD_WIDTH, COLORS, OBSTACLES } from '../constants';

// --- Math Helpers ---
const easeIn = (a: number, b: number, percent: number) => a + (b - a) * Math.pow(percent, 2);
const easeOut = (a: number, b: number, percent: number) => a + (b - a) * (1 - Math.pow(1 - percent, 2));
const easeInOut = (a: number, b: number, percent: number) => a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);

export const project = (p: Point3D, cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number, width: number, height: number, roadWidth: number): ProjectPoint => {
  let dist = p.z - cameraZ;
  // Clip behind camera. If dist is too small, clamp it to avoid infinity/inversion.
  // Using a small positive number pushes it just in front of the lens.
  if (dist < 10) dist = 10;

  let scale = cameraDepth / dist;
  
  let x = (1 + scale * (p.x - cameraX)) * width / 2;
  let y = (1 - scale * (p.y - cameraY)) * height / 2;
  let w = scale * roadWidth * width / 2;
  
  return { x, y, w };
};

// --- Track Generation ---
export const createTrack = (trackDef: TrackDefinition): Segment[] => {
  const segments: Segment[] = [];
  const layout = trackDef.layout;

  // 1. Create Segments from Layout
  layout.forEach(section => {
    const curveStrength = section.curve || 0;
    
    for (let i = 0; i < section.length; i++) {
       const segment: Segment = {
          index: segments.length,
          p1: { x: 0, y: 0, z: segments.length * SEGMENT_LENGTH },
          p2: { x: 0, y: 0, z: (segments.length + 1) * SEGMENT_LENGTH },
          curve: curveStrength, 
          mapX: 0, 
          mapY: 0,
          color: { road: '', grass: '', rumble: '' },
          sprites: [],
       };
       
       // Smooth curve entry/exit
       if (Math.abs(curveStrength) > 0) {
           if (i < 10) segment.curve = easeIn(0, curveStrength, i/10);
           else if (i > section.length - 10) segment.curve = easeOut(curveStrength, 0, (i - (section.length - 10))/10);
       }
       
       // Colors
       const isLight = Math.floor(segments.length / 3) % 2 !== 0;
       segment.color = {
         road: isLight ? COLORS.LIGHT.road : COLORS.DARK.road,
         grass: isLight ? COLORS.LIGHT.grass : COLORS.DARK.grass,
         rumble: isLight ? COLORS.LIGHT.rumble : COLORS.DARK.rumble,
         lane: isLight ? COLORS.LIGHT.lane : undefined
       };

       segments.push(segment);
    }
  });

  // 2. Map Generation (2D Coordinates)
  let mapX = 0;
  let mapY = 0;
  let mapAngle = 0; // 0 is North
  
  // Calculate total curve integral to roughly close the loop or at least display relative direction
  const totalCurveIntegral = segments.reduce((acc, s) => acc + s.curve, 0);
  // Empirically, ~300 curve units is a full circle in this engine logic, 
  // but since we allow arbitrary tracks, we just normalize step for visibility.
  const anglePerCurveUnit = 0.015; // Adjusted scale for mini-map rotation

  segments.forEach(seg => {
      seg.mapX = mapX;
      seg.mapY = mapY;
      
      const angleStep = seg.curve * anglePerCurveUnit;
      mapAngle += angleStep;
      
      // Move 'forward' relative to map coordinates. 
      const mapScale = 0.5; 
      mapX += Math.sin(mapAngle) * mapScale;
      mapY -= Math.cos(mapAngle) * mapScale;
  });

  // 3. Decoration & Obstacles
  // Add Start/Finish Line
  segments[0].color = COLORS.START;
  segments[1].color = COLORS.START;
  for(let i = 0; i < 3; i++) segments[segments.length - 1 - i].color = COLORS.FINISH;

  // Add Random Obstacles
  segments.forEach((seg, i) => {
      // Don't put obstacles at start or end
      if (i > 50 && i < segments.length - 50) {
          // Probability
          if (i % 20 === 0 && Math.random() > 0.4) {
              const type = Math.random() > 0.5 ? 'BOULDER' : 'TREE';
              const spriteData = OBSTACLES.find(o => o.type === type);
              if (spriteData) {
                  const offset = (Math.random() * 3 + 1.2) * (Math.random() > 0.5 ? 1 : -1);
                  seg.sprites.push({
                      source: type,
                      offset: offset,
                      width: spriteData.width,
                      height: spriteData.height
                  });
              }
          }
      }
  });

  return segments;
};

export const createCars = (playerColor: string, playerName: string, difficulty: Difficulty, referenceAvgSpeedKmh: number = 0): Car[] => {
  
  // Calculate AI Max Speed based on Difficulty and Records
  let aiMaxSpeed = 22000; // Default fallback
  const referenceSpeedUnits = referenceAvgSpeedKmh * 100; // Convert km/h back to engine units

  switch (difficulty) {
    case Difficulty.ROOKIE:
      // Fixed slow speed (~160 km/h)
      aiMaxSpeed = 16000; 
      break;
    
    case Difficulty.AMATEUR:
      // 90% of best record, or default 200 km/h if no record
      if (referenceSpeedUnits > 0) {
        aiMaxSpeed = referenceSpeedUnits * 0.90;
      } else {
        aiMaxSpeed = 20000;
      }
      break;

    case Difficulty.PRO:
      // 105% of best record (Hard!), or default 235 km/h
      if (referenceSpeedUnits > 0) {
        aiMaxSpeed = referenceSpeedUnits * 1.05;
      } else {
        aiMaxSpeed = 23500;
      }
      // Cap at logical engine max to prevent physics breaking
      aiMaxSpeed = Math.min(aiMaxSpeed, 25000); 
      break;
  }

  return [
    {
      offset: 0,
      z: 0,
      speed: 0,
      maxSpeed: 24000, // Player max ~240km/h
      accel: 100,
      name: playerName,
      color: playerColor,
      isPlayer: true,
      isNpc: false,
      lap: 1,
      lapTime: 0,
      finished: false,
      width: 0.5
    },
    {
      offset: -0.5,
      z: 2000, // Start slightly ahead
      speed: aiMaxSpeed * 0.8, // Start with some speed
      maxSpeed: aiMaxSpeed,
      accel: 80,
      name: `CPU [${difficulty === Difficulty.PRO ? 'PRO' : difficulty === Difficulty.AMATEUR ? 'AVG' : 'NOOB'}]`,
      color: '#FF0000',
      isPlayer: false,
      isNpc: true,
      lap: 1,
      lapTime: 0,
      finished: false,
      width: 0.5
    }
  ];
};

export const updateGame = (cars: Car[], track: Segment[], input: { left: boolean, right: boolean, up: boolean, down: boolean }, dt: number, totalLaps: number) => {
  const player = cars[0];
  const trackLength = track.length * SEGMENT_LENGTH;

  // --- PLAYER PHYSICS ---
  const playerSegment = track[Math.floor(player.z / SEGMENT_LENGTH) % track.length];
  
  // Acceleration
  if (input.up) player.speed += player.accel;
  else if (input.down) player.speed -= player.accel * 3;
  else player.speed -= player.accel / 2; // Friction

  // Clamp speed
  player.speed = Math.max(0, Math.min(player.speed, player.maxSpeed));

  // Steering & Centrifugal Force
  const speedRatio = (player.speed / player.maxSpeed);
  // Increase steering sensitivity (was 2)
  const dx = dt * 2.8 * speedRatio; 
  
  if (input.left) player.offset -= dx;
  if (input.right) player.offset += dx;
  
  // Centrifugal force in curves (pulls car outwards)
  // Drastically reduced effect to prevent "drift to left" feeling (was 1.15)
  if (playerSegment.curve !== 0 && player.speed > 0) {
      player.offset -= (dx * playerSegment.curve * speedRatio * 0.15);
  }

  // Off-road deceleration
  if ((player.offset < -1 || player.offset > 1) && player.speed > 8000) {
      player.speed -= player.accel * 2; // Slow down faster on grass
  }
  
  // Move Player Z
  player.z += player.speed * dt;
  
  // Lap counting
  if (player.z >= trackLength) {
      player.z -= trackLength;
      player.lap++;
      if (player.lap > totalLaps && !player.finished) {
          player.finished = true;
      }
  }

  // --- RIVAL AI ---
  const rival = cars[1];
  if (rival && !rival.finished) {
      const rivalSeg = track[Math.floor(rival.z / SEGMENT_LENGTH) % track.length];
      
      // AI Physics
      rival.speed = Math.min(rival.speed + rival.accel, rival.maxSpeed);
      
      // Look ahead for curves
      const lookAheadIdx = (Math.floor(rival.z / SEGMENT_LENGTH) + 20) % track.length;
      const futureCurve = track[lookAheadIdx].curve;
      
      // Intelligent cornering
      let targetOffset = 0;
      let braking = false;

      // Prepare for curve
      if (Math.abs(futureCurve) > 2) {
         // Sharp curve ahead, slow down slightly
         braking = true;
         // Hug the inside
         targetOffset = futureCurve > 0 ? 0.7 : -0.7; 
      } else if (Math.abs(futureCurve) > 0) {
         // Mild curve, just steer
         targetOffset = futureCurve > 0 ? 0.4 : -0.4;
      }

      // Brake if needed
      if (braking && rival.speed > rival.maxSpeed * 0.7) {
          rival.speed -= rival.accel * 1.5;
      }
      
      // Steer towards target (Apex)
      if (rival.offset < targetOffset) rival.offset += dx * 0.9; // Slightly less agile than player
      if (rival.offset > targetOffset) rival.offset -= dx * 0.9;
      
      // Apply curve force to AI too (balanced with player physics)
      if (rivalSeg.curve !== 0) {
           rival.offset -= (dx * rivalSeg.curve * speedRatio * 0.15);
      }
      
      // Basic collision avoidance (keep in bounds)
      if (rival.offset < -0.9) rival.offset += dx;
      if (rival.offset > 0.9) rival.offset -= dx;

      rival.z += rival.speed * dt;
      if (rival.z >= trackLength) {
          rival.z -= trackLength;
          rival.lap++;
          if (rival.lap > totalLaps) rival.finished = true;
      }
  }
};
