
import { Car, Segment, Point3D, ProjectPoint, Difficulty, TrackDefinition } from '../types';
import { SEGMENT_LENGTH, ROAD_WIDTH, COLORS, OBSTACLES, PHYSICS } from '../constants';

// --- Math Helpers ---
const easeIn = (a: number, b: number, percent: number) => a + (b - a) * Math.pow(percent, 2);
const easeOut = (a: number, b: number, percent: number) => a + (b - a) * (1 - Math.pow(1 - percent, 2));
const easeInOut = (a: number, b: number, percent: number) => a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);

export const project = (p: Point3D, cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number, width: number, height: number, roadWidth: number): ProjectPoint => {
  let dist = p.z - cameraZ;
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
       
       if (Math.abs(curveStrength) > 0) {
           if (i < 10) segment.curve = easeIn(0, curveStrength, i/10);
           else if (i > section.length - 10) segment.curve = easeOut(curveStrength, 0, (i - (section.length - 10))/10);
       }
       
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

  // 2. Loop Closure & Map Generation (2D Coordinates)
  let rawMapX = 0;
  let rawMapY = 0;
  let rawAngle = 0;
  const anglePerCurveUnit = 0.015; 
  const mapScale = 0.5;

  segments.forEach(seg => {
      const angleStep = seg.curve * anglePerCurveUnit;
      rawAngle += angleStep;
      rawMapX += Math.sin(rawAngle) * mapScale;
      rawMapY -= Math.cos(rawAngle) * mapScale;
  });

  const xCorrectionPerSegment = -rawMapX / segments.length;
  const yCorrectionPerSegment = -rawMapY / segments.length;

  let mapX = 0;
  let mapY = 0;
  let mapAngle = 0;

  segments.forEach((seg, i) => {
      seg.mapX = mapX;
      seg.mapY = mapY;
      
      const angleStep = seg.curve * anglePerCurveUnit;
      mapAngle += angleStep;
      
      mapX += Math.sin(mapAngle) * mapScale;
      mapY -= Math.cos(mapAngle) * mapScale;

      mapX += xCorrectionPerSegment;
      mapY += yCorrectionPerSegment;
  });

  // 4. Decoration
  segments[0].color = COLORS.START;
  segments[1].color = COLORS.START;
  for(let i = 0; i < 3; i++) segments[segments.length - 1 - i].color = COLORS.FINISH;

  segments.forEach((seg, i) => {
      if (i > 50 && i < segments.length - 50) {
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
  let aiMaxSpeed = 22000; 
  const referenceSpeedUnits = referenceAvgSpeedKmh * 100; 

  switch (difficulty) {
    case Difficulty.ROOKIE:
      aiMaxSpeed = 16000; 
      break;
    case Difficulty.AMATEUR:
      if (referenceSpeedUnits > 0) aiMaxSpeed = referenceSpeedUnits * 0.90;
      else aiMaxSpeed = 20000;
      break;
    case Difficulty.PRO:
      if (referenceSpeedUnits > 0) aiMaxSpeed = referenceSpeedUnits * 1.05;
      else aiMaxSpeed = 23500;
      aiMaxSpeed = Math.min(aiMaxSpeed, PHYSICS.MAX_SPEED + 1000); 
      break;
  }

  return [
    {
      offset: 0,
      z: 0,
      speed: 0,
      maxSpeed: PHYSICS.MAX_SPEED, 
      accel: PHYSICS.ACCEL,
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
      z: 2000, 
      speed: aiMaxSpeed * 0.8,
      maxSpeed: aiMaxSpeed,
      accel: PHYSICS.ACCEL * 0.9,
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

  // --- PHYSICS ENGINE REFACTOR (Geometric Tangent Only) ---
  const playerSegment = track[Math.floor(player.z / SEGMENT_LENGTH) % track.length];
  
  // 1. Longitudinal (Accel/Brake)
  if (input.up) {
      player.speed += player.accel;
  } else if (input.down) {
      player.speed -= PHYSICS.BRAKING; 
  } else {
      player.speed -= PHYSICS.DECEL_COAST; 
  }

  // Offroad friction
  if ((player.offset < -1 || player.offset > 1)) {
     if (player.speed > 2000) { 
        player.speed -= PHYSICS.DECEL_OFFROAD;
     }
  }
  player.speed = Math.max(0, Math.min(player.speed, player.maxSpeed));
  
  // Normalized Speed (0.0 to 1.0) is KEY for consistent physics at all speeds
  const speedRatio = player.speed / player.maxSpeed; 

  // 2. Lateral (Tangent Drift)
  // Logic: If track curves Right (Positive curve), track moves Right relative to straight car.
  // Visual result: Car moves Left relative to track center.
  // Formula: offset -= curve * speedRatio * factor.
  // Higher speed = Faster geometric drift (you cover more curved ground per second).
  const curve = playerSegment.curve;
  if (player.speed > 0 && curve !== 0) {
      const tangentDrift = curve * speedRatio * dt * PHYSICS.DRIFT_FACTOR;
      player.offset -= tangentDrift;
  }

  // 3. Steering Input
  // Must be stronger than drift to allow cornering.
  // Input also scaled by speedRatio (standard for racing games: harder to turn wheel when stopped, more effective when moving)
  // We clamp speedRatio to a minimum (0.1) so you can still steer at crawl speeds.
  const steeringInput = input.left ? -1 : input.right ? 1 : 0;
  if (steeringInput !== 0) {
      const effectiveRatio = Math.max(0.2, speedRatio); 
      const steer = steeringInput * PHYSICS.STEERING_SPEED * effectiveRatio * dt;
      player.offset += steer;
  }

  // Bounds clamping
  if (player.offset < -3) player.offset = -3;
  if (player.offset > 3) player.offset = 3;
  
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

  // --- RIVAL AI (Adjusted for stronger drift) ---
  const rival = cars[1];
  if (rival && !rival.finished) {
      // Rival accel
      rival.speed = Math.min(rival.speed + rival.accel, rival.maxSpeed);

      // Lookahead
      const lookAheadIdx = (Math.floor(rival.z / SEGMENT_LENGTH) + 20) % track.length;
      const futureCurve = track[lookAheadIdx].curve;
      
      // Brake for corners
      if (Math.abs(futureCurve) > 3 && rival.speed > rival.maxSpeed * 0.8) {
          rival.speed -= rival.accel * 2; 
      }

      // Rival Lateral Logic
      const rivalSpeedRatio = rival.speed / rival.maxSpeed;
      const rivalSeg = track[Math.floor(rival.z / SEGMENT_LENGTH) % track.length];

      // 1. Apply same geometric drift as player
      if (rivalSeg.curve !== 0) {
          rival.offset -= rivalSeg.curve * rivalSpeedRatio * dt * PHYSICS.DRIFT_FACTOR;
      }

      // 2. AI Steering (Counteract drift + Aim for lane center)
      let targetOffset = 0;
      if (Math.abs(futureCurve) > 1) {
         // Inside line
         targetOffset = futureCurve > 0 ? 0.5 : -0.5; 
      }

      // AI Steering power needs to be enough to beat the drift
      const aiSteerPower = PHYSICS.STEERING_SPEED * Math.max(0.2, rivalSpeedRatio) * dt;

      if (rival.offset < targetOffset) rival.offset += aiSteerPower;
      if (rival.offset > targetOffset) rival.offset -= aiSteerPower;
      
      // Bounds
      if (rival.offset < -0.9) rival.offset += aiSteerPower * 1.5;
      if (rival.offset > 0.9) rival.offset -= aiSteerPower * 1.5;
      
      rival.z += rival.speed * dt;
      if (rival.z >= trackLength) {
          rival.z -= trackLength;
          rival.lap++;
          if (rival.lap > totalLaps) rival.finished = true;
      }
  }
};
