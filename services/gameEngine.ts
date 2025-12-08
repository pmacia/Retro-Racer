
import { Car, Segment, Point3D, ProjectPoint, Difficulty, TrackDefinition } from '../types';
import { SEGMENT_LENGTH, ROAD_WIDTH, COLORS, OBSTACLES, PHYSICS, DAMAGE } from '../constants';

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
      // Avoid obstacles on start/finish lines
      if (i > 50 && i < segments.length - 50) {
          if (i % 20 === 0 && Math.random() > 0.4) {
              const r = Math.random();
              let type = 'TREE';
              if (r < 0.2) type = 'BOULDER';
              else if (r < 0.4) type = 'BARREL';
              else if (r < 0.6) type = 'TIRE';

              const spriteData = OBSTACLES.find(o => o.type === type);
              if (spriteData) {
                  // Random offset, but keep some on the road occasionally for tires/barrels
                  let offset = (Math.random() * 3 + 1.2) * (Math.random() > 0.5 ? 1 : -1);
                  
                  // Tires and Barrels can be on the road
                  if (type === 'TIRE' || type === 'BARREL') {
                      if (Math.random() > 0.7) {
                          offset = (Math.random() * 1.5 - 0.75); // On road
                      }
                  }

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
      width: 0.5,
      damage: 0,
      exploded: false
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
      width: 0.5,
      damage: 0,
      exploded: false
    }
  ];
};

export const updateGame = (
    cars: Car[], 
    track: Segment[], 
    input: { left: boolean, right: boolean, up: boolean, down: boolean }, 
    dt: number, 
    totalLaps: number,
    callbacks: {
        onObstacleHit: (type: string) => void;
        onCarHit: (type: 'REAR' | 'SIDE', severity: number) => void;
    }
) => {
  const player = cars[0];
  const trackLength = track.length * SEGMENT_LENGTH;
  
  // If exploded, stop everything for player
  if (player.exploded) {
      player.speed = 0;
      return;
  }

  // --- 1. COLLISION WITH OBSTACLES ---
  const currentSegIdx = Math.floor(player.z / SEGMENT_LENGTH);
  
  // Scan forward 2 segments to catch obstacles that are visually close
  for (let n = 0; n <= 2; n++) {
      const checkIdx = (currentSegIdx + n) % track.length;
      const segment = track[checkIdx];

      for (let i = segment.sprites.length - 1; i >= 0; i--) {
          const sprite = segment.sprites[i];
          const spriteW = (sprite.width / ROAD_WIDTH) * 0.6;
          
          if (Math.abs(player.offset - sprite.offset) < (spriteW + 0.15)) {
              
              const segZ = checkIdx * SEGMENT_LENGTH;
              let distZ = player.z - segZ;
              if (distZ < -trackLength/2) distZ += trackLength;
              if (distZ > trackLength/2) distZ -= trackLength;

              // Check if physically close
              if (Math.abs(distZ) < SEGMENT_LENGTH) {
                  let dmg = 0;
                  if (sprite.source === 'TREE') dmg = DAMAGE.HIT_TREE;
                  else if (sprite.source === 'BOULDER') dmg = DAMAGE.HIT_BOULDER;
                  else if (sprite.source === 'BARREL') dmg = DAMAGE.HIT_BARREL;
                  else if (sprite.source === 'TIRE') dmg = DAMAGE.HIT_TIRE;

                  if (player.speed > 1000) {
                      if (sprite.source === 'BARREL' || sprite.source === 'TIRE') {
                          segment.sprites.splice(i, 1);
                          player.damage += dmg;
                          callbacks.onObstacleHit(sprite.source);
                      } else {
                          // Solid Hit
                          player.damage += dmg;
                          player.speed = 0;
                          callbacks.onObstacleHit(sprite.source);
                      }
                      if (player.damage >= DAMAGE.MAX) player.exploded = true;
                  }
              }
          }
      }
  }

  // --- 2. COLLISION WITH RIVAL ---
  const rival = cars[1];
  if (rival && !rival.finished && !player.finished) {
      let distZ = player.z - rival.z;
      // Handle Loop Wrapping
      if (distZ > trackLength / 2) distZ -= trackLength;
      if (distZ < -trackLength / 2) distZ += trackLength;

      // Detection Box
      const CAR_HIT_LENGTH = 700; 
      const CAR_HIT_WIDTH = 0.8; 

      if (Math.abs(distZ) < CAR_HIT_LENGTH) {
          if (Math.abs(player.offset - rival.offset) < CAR_HIT_WIDTH) {
              
              const isLongitudinalHit = Math.abs(distZ) > 250; 
              const playerIsBehind = distZ < 0; 

              if (isLongitudinalHit) {
                  // --- REAR/FRONT COLLISION (BOUNCE BACK) ---
                  if (playerIsBehind) {
                      // Player hits Rival's rear
                      if (player.speed > rival.speed) {
                          player.damage += DAMAGE.HIT_CAR_REAR;
                          // Brake hard to avoid passing through
                          player.speed = rival.speed * 0.75; 
                          rival.speed += 500; // Push rival forward slightly
                          
                          // Force Z separation
                          let newZ = rival.z - (CAR_HIT_LENGTH + 20);
                          if (newZ < 0) newZ += trackLength;
                          player.z = newZ;
                          
                          callbacks.onCarHit('REAR', 1.0);
                      }
                  } else {
                      // Rival hits Player's rear
                      if (rival.speed > player.speed) {
                          // Minimal Damage
                          player.damage += 0.5; 
                          
                          // AI Brakes hard to stop pushing
                          rival.speed = player.speed * 0.85; 
                          player.speed += 300; // Small boost for player
                          
                          // Strict Separation
                          let newZ = player.z - 750; 
                          if (newZ < 0) newZ += trackLength;
                          rival.z = newZ;
                          
                          callbacks.onCarHit('REAR', 0.5);
                      }
                  }
              } else {
                  // --- SIDE COLLISION (DEFLECT) ---
                  player.damage += DAMAGE.HIT_CAR_SIDE;
                  
                  // Deflect in opposite directions
                  const pushDir = player.offset > rival.offset ? 1 : -1;
                  const pushForce = 0.3; 

                  player.offset += pushDir * pushForce;
                  rival.offset -= pushDir * pushForce;
                  
                  // Slight speed penalty for friction
                  player.speed *= 0.98;
                  rival.speed *= 0.98;
                  
                  callbacks.onCarHit('SIDE', 0.5);
              }

              if (player.damage >= DAMAGE.MAX) player.exploded = true;
          }
      }
  }


  // --- PHYSICS ENGINE ---
  
  // 1. Longitudinal (Accel/Brake)
  if (input.up) {
      player.speed += player.accel;
  } else if (input.down) {
      player.speed -= PHYSICS.BRAKING; 
  } else {
      player.speed -= PHYSICS.DECEL_COAST; 
  }

  // Offroad friction (Quadratic)
  const offroadDist = Math.abs(player.offset) - 0.75;
  if (offroadDist > 0) {
     const depth = Math.min(1.0, offroadDist / 0.5); 
     player.speed -= (depth * depth * PHYSICS.DECEL_OFFROAD);
  }

  player.speed = Math.max(0, Math.min(player.speed, player.maxSpeed));
  
  // Normalized Speed (0.0 to 1.0)
  const speedRatio = player.speed / player.maxSpeed; 

  // 2. Lateral (Tangent Drift + Centrifugal)
  const playerSegment = track[Math.floor(player.z / SEGMENT_LENGTH) % track.length];
  const curve = playerSegment.curve;
  
  if (player.speed > 0 && curve !== 0) {
      const geometricForce = curve * speedRatio * PHYSICS.DRIFT_FACTOR;
      const centrifugalForce = curve * (speedRatio * speedRatio) * PHYSICS.CENTRIFUGAL_FORCE;
      
      const totalDrift = (geometricForce + centrifugalForce) * dt;
      player.offset -= totalDrift;
  }

  // 3. Steering Input
  const steeringInput = input.left ? -1 : input.right ? 1 : 0;
  if (steeringInput !== 0) {
      let effectiveRatio = Math.max(0.1, speedRatio); 
      
      if (speedRatio > 0.8) {
          const dampFactor = (speedRatio - 0.8) / 0.2; 
          effectiveRatio *= (1.0 - (dampFactor * PHYSICS.SPEED_STEERING_DAMPING));
      }

      const steer = steeringInput * PHYSICS.STEERING_SPEED * effectiveRatio * dt;
      player.offset += steer;
  }

  // Bounds clamping
  if (player.offset < -3) player.offset = -3;
  if (player.offset > 3) player.offset = 3;

  // 4. POSITION UPDATE
  player.z += player.speed * dt;

  // --- 5. RIVAL AI LOGIC ---
  const ai = cars[1]; // CPU
  if (ai && !ai.finished && !ai.exploded) {
      const aiSegment = track[Math.floor(ai.z / SEGMENT_LENGTH) % track.length];
      
      // AI Physics Model
      // 1. Acceleration
      const lookAhead = 20;
      const futureSegment = track[(Math.floor(ai.z / SEGMENT_LENGTH) + lookAhead) % track.length];
      const futureCurve = Math.abs(futureSegment.curve);
      
      let targetSpeed = ai.maxSpeed;
      if (futureCurve > 2) {
          targetSpeed = ai.maxSpeed * (1 - (futureCurve / 15)); // Slow down for corners
      }

      if (ai.speed < targetSpeed) {
          ai.speed += ai.accel;
      } else {
          ai.speed -= PHYSICS.BRAKING * 0.5;
      }
      
      // 2. Steering / Lateral Control
      const aiSpeedRatio = ai.speed / ai.maxSpeed;
      const aiCurve = aiSegment.curve;
      
      if (ai.speed > 0 && aiCurve !== 0) {
           const drift = aiCurve * aiSpeedRatio * PHYSICS.DRIFT_FACTOR * dt;
           ai.offset -= drift;
      }

      // 3. DODGING LOGIC
      let targetOffset = -0.4; // Default preference

      let distToPlayer = player.z - ai.z;
      if (distToPlayer < -trackLength/2) distToPlayer += trackLength;
      if (distToPlayer > trackLength/2) distToPlayer -= trackLength;

      if (distToPlayer > 0 && distToPlayer < 1500) {
          if (ai.speed > player.speed) {
              if (player.offset > 0.1) targetOffset = -0.6;
              else if (player.offset < -0.1) targetOffset = 0.6;
              else targetOffset = ai.offset > 0 ? 0.6 : -0.6;
          }
      }

      const diff = targetOffset - ai.offset;
      const steerPower = PHYSICS.STEERING_SPEED * 0.8; 
      
      if (Math.abs(diff) > 0.1) {
          const dir = diff > 0 ? 1 : -1;
          ai.offset += dir * steerPower * aiSpeedRatio * dt;
      }

      if (ai.offset < -2) ai.offset = -2;
      if (ai.offset > 2) ai.offset = 2;

      ai.z += ai.speed * dt;
  }

  // --- 6. LAP MANAGEMENT ---
  cars.forEach(car => {
      if (car.z >= trackLength) {
          car.z -= trackLength;
          car.lap++;
          if (car.lap > totalLaps && !car.finished) {
              car.finished = true;
          }
      }
      else if (car.z < 0) {
          car.z += trackLength;
          car.lap--;
      }
  });
};
