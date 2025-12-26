
import { Car, Segment, Point3D, ProjectPoint, Difficulty, TrackDefinition } from '../types';
import { SEGMENT_LENGTH, ROAD_WIDTH, COLORS, OBSTACLES, PHYSICS, DAMAGE } from '../constants';

// --- Math Helpers ---
const easeIn = (a: number, b: number, percent: number) => a + (b - a) * Math.pow(percent, 2);
const easeOut = (a: number, b: number, percent: number) => a + (b - a) * (1 - Math.pow(1 - percent, 2));

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
                if (i < 10) segment.curve = easeIn(0, curveStrength, i / 10);
                else if (i > section.length - 10) segment.curve = easeOut(curveStrength, 0, (i - (section.length - 10)) / 10);
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

    segments.forEach((seg) => {
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
    for (let i = 0; i < 3; i++) segments[segments.length - 1 - i].color = COLORS.FINISH;

    segments.forEach((seg, i) => {
        // Avoid obstacles on start/finish lines
        if (i > 50 && i < segments.length - 50) {
            if (i % 15 === 0 && Math.random() > 0.15) {
                const r = Math.random();
                let type = 'TREE';
                if (r < 0.30) type = 'BOULDER';
                else if (r < 0.40) type = 'BARREL';
                else if (r < 0.50) type = 'TIRE';
                else if (r < 0.55) type = 'OIL';
                else if (r < 0.60) type = 'PUDDLE';
                // REPAIR removed from here to be independent

                const spriteData = OBSTACLES.find(o => o.type === type);
                if (spriteData) {
                    // Random offset
                    let offset = (Math.random() * 3 + 1.2) * (Math.random() > 0.5 ? 1 : -1);

                    // Road-based obstacles
                    const onRoadTypes = ['TIRE', 'BARREL', 'OIL', 'PUDDLE', 'REPAIR'];
                    if (onRoadTypes.includes(type)) {
                        if (Math.random() > 0.5) {
                            offset = (Math.random() * 1.6 - 0.8); // On road
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

        // Independent Repair Kit Generation (Every 150 segments, independent of other obstacles)
        if (i > 50 && i < segments.length - 50 && i % 150 === 0 && Math.random() > 0.5) {
            const spriteData = OBSTACLES.find(o => o.type === 'REPAIR');
            if (spriteData) {
                seg.sprites.push({
                    source: 'REPAIR',
                    offset: (Math.random() * 1.6 - 0.8),
                    width: spriteData.width,
                    height: spriteData.height
                });
            }
        }
    });

    return segments;
}

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
            exploded: false,
            nextCheckpointIndex: 1
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
            exploded: false,
            nextCheckpointIndex: 1
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
        onObstacleHit: (car: Car, type: string, worldX: number, worldY: number, worldZ: number) => void;
        onCarHit: (type: 'REAR' | 'SIDE', severity: number, worldX: number, worldY: number, worldZ: number) => void;
        onCheckpoint: (car: Car) => void;
        onLap: (car: Car) => void;
        onDrafting: (car: Car, target: Car) => void; // New: Notification for visuals/physics feedback
    }
) => {
    const player = cars[0];
    const rival = cars[1];
    const trackLength = track.length * SEGMENT_LENGTH;

    // If exploded, stop everything for player
    if (player.exploded) {
        player.speed = 0;
        return;
    }

    // --- 1. COLLISION WITH OBSTACLES ---
    cars.forEach(car => {
        if (car.exploded || car.finished) return;

        const currentSegIdx = Math.floor(car.z / SEGMENT_LENGTH);
        const speedRatio = car.speed / car.maxSpeed;

        // Scan forward 2 segments
        for (let n = 0; n <= 2; n++) {
            const checkIdx = (currentSegIdx + n) % track.length;
            const segment = track[checkIdx];

            for (let i = segment.sprites.length - 1; i >= 0; i--) {
                const sprite = segment.sprites[i];
                const spriteW = (sprite.width / ROAD_WIDTH) * 0.6;

                // Collision detection (Car width is ~0.3 units in offset space)
                if (Math.abs(car.offset - sprite.offset) < (spriteW + 0.15)) {

                    const segZ = checkIdx * SEGMENT_LENGTH;
                    let distZ = car.z - segZ;
                    if (distZ > trackLength / 2) distZ -= trackLength;
                    if (distZ < -trackLength / 2) distZ += trackLength;

                    // Physical proximity check
                    if (Math.abs(distZ) < 500) {
                        let baseDmg = 0;
                        let stopCar = false;
                        let destroySprite = false;

                        // Handle specific obstacle effects
                        switch (sprite.source) {
                            case 'TREE': baseDmg = DAMAGE.HIT_TREE; stopCar = true; break;
                            case 'BOULDER': baseDmg = DAMAGE.HIT_BOULDER; stopCar = true; break;
                            case 'BARREL': baseDmg = DAMAGE.HIT_BARREL; destroySprite = true; break;
                            case 'TIRE': baseDmg = DAMAGE.HIT_TIRE; destroySprite = true; break;
                            case 'OIL':
                                car.offset += (car.offset > sprite.offset ? 0.2 : -0.2);
                                break;
                            case 'PUDDLE':
                                car.speed *= 0.90; // Increased penalty (was 0.95)
                                // Hydroplaning: slight lateral pull
                                car.offset += (Math.random() - 0.5) * 0.12;
                                break;
                            case 'REPAIR':
                                car.damage = Math.max(0, car.damage + DAMAGE.REPAIR_AMOUNT);
                                destroySprite = true;
                                break;
                        }

                        const isNonDestructive = ['REPAIR', 'PUDDLE', 'OIL'].includes(sprite.source);
                        if (car.speed > 1000 || isNonDestructive) {
                            const actualDmg = baseDmg > 0 ? baseDmg * (0.5 + speedRatio * 0.5) : 0;
                            car.damage += actualDmg;

                            if (destroySprite) {
                                segment.sprites.splice(i, 1);
                            }

                            if (stopCar) {
                                car.speed = 0;
                                // Bounce back to avoid stuck loops
                                car.z -= 300;
                                // Push away from obstacle
                                const pushDir = car.offset > sprite.offset ? 1 : -1;
                                car.offset += pushDir * 0.5;
                            }

                            callbacks.onObstacleHit(car, sprite.source, sprite.offset * ROAD_WIDTH, 0, segZ);

                            if (car.damage >= DAMAGE.MAX) car.exploded = true;
                        }
                    }
                }
            }
        }
    });

    // --- 2. COLLISION WITH RIVAL ---
    if (rival && !rival.finished && !player.finished && !rival.exploded) {
        let distZ = player.z - rival.z;
        // Handle Loop Wrapping
        if (distZ > trackLength / 2) distZ -= trackLength;
        if (distZ < -trackLength / 2) distZ += trackLength;

        // Detection Box
        const CAR_HIT_LENGTH = 700;
        const CAR_HIT_WIDTH = 0.45; // Reduced from 0.6 to allow tighter overtaking

        if (Math.abs(distZ) < CAR_HIT_LENGTH) {
            if (Math.abs(player.offset - rival.offset) < CAR_HIT_WIDTH) {

                const isLongitudinalHit = Math.abs(distZ) > 350; // Balanced rear vs side
                const playerIsBehind = distZ < 0;

                if (isLongitudinalHit) {
                    // --- REAR/FRONT COLLISION (BOUNCE BACK) ---
                    const speedRatio = Math.max(player.speed / player.maxSpeed, rival.speed / rival.maxSpeed);
                    const scaledDmg = DAMAGE.HIT_CAR_REAR * (0.5 + speedRatio * 0.5);

                    if (playerIsBehind) {
                        // Player hits Rival's rear
                        if (player.speed > rival.speed) {
                            player.damage += scaledDmg;
                            rival.damage += scaledDmg * 0.5;

                            player.speed = rival.speed * 0.75;
                            rival.speed += 500;

                            let newZ = rival.z - (CAR_HIT_LENGTH + 20);
                            if (newZ < 0) newZ += trackLength;
                            player.z = newZ;

                            callbacks.onCarHit('REAR', 1.0, player.offset * ROAD_WIDTH, 0, player.z);
                        }
                    } else {
                        // Rival hits Player's rear
                        if (rival.speed > player.speed) {
                            player.damage += scaledDmg * 0.2;
                            rival.damage += scaledDmg;

                            rival.speed = player.speed * 0.85;
                            player.speed += 300;

                            let newZ = player.z - 750;
                            if (newZ < 0) newZ += trackLength;
                            rival.z = newZ;

                            callbacks.onCarHit('REAR', 0.5, player.offset * ROAD_WIDTH, 0, player.z);
                        }
                    }
                } else {
                    // --- SIDE COLLISION (DEFLECT) ---
                    const speedRatio = Math.max(player.speed / player.maxSpeed, rival.speed / rival.maxSpeed);
                    const scaledDmg = DAMAGE.HIT_CAR_SIDE * (0.5 + speedRatio * 0.5);

                    player.damage += scaledDmg;
                    rival.damage += scaledDmg;

                    // Deflect in opposite directions
                    const pushDir = player.offset > rival.offset ? 1 : -1;
                    const speedDiffFactor = Math.abs(player.speed - rival.speed) / 10000;
                    const pushForce = 0.4 + (speedDiffFactor * 0.2);

                    player.offset += pushDir * pushForce;
                    rival.offset -= pushDir * pushForce;

                    player.speed *= 0.97;
                    rival.speed *= 0.97;

                    callbacks.onCarHit('SIDE', 0.5, player.offset * ROAD_WIDTH, 0, player.z);
                }

                if (player.damage >= DAMAGE.MAX) player.exploded = true;
                if (rival.damage >= DAMAGE.MAX) rival.exploded = true;
            }
        }
    }


    // --- PHYSICS ENGINE ---

    // --- DRAFTING PHYSICS (SPEED BOOST) ---
    let effectiveMaxSpeed = player.maxSpeed;
    let accelerationMultiplier = 1.0;

    if (rival && !rival.exploded && !rival.finished) {
        let distZ = player.z - rival.z;
        if (distZ > trackLength / 2) distZ -= trackLength;
        if (distZ < -trackLength / 2) distZ += trackLength;

        // Player is behind rival and close laterally
        if (distZ < 0 && distZ > -2500 && Math.abs(player.offset - rival.offset) < 0.35) {
            effectiveMaxSpeed *= 1.10; // 10% more top speed
            accelerationMultiplier = 1.25; // 25% more punch
            callbacks.onDrafting(player, rival);
        }
    }

    // 1. Longitudinal (Accel/Brake)
    if (input.up) {
        player.speed += player.accel * accelerationMultiplier;
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

    player.speed = Math.max(0, Math.min(player.speed, effectiveMaxSpeed));

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
    cars.forEach(car => {
        if (car.isPlayer || car.finished || car.exploded) {
            if (car.exploded) car.speed = 0;
            return;
        }

        const ai = car;
        const aiSegment = track[Math.floor(ai.z / SEGMENT_LENGTH) % track.length];

        // AI Physics Model
        // --- AI DRAFTING ---
        let aiMaxSpeedMultiplier = 1.0;
        let aiAccelMultiplier = 1.0;
        let distToPlayer = player.z - ai.z;
        if (distToPlayer < -trackLength / 2) distToPlayer += trackLength;
        if (distToPlayer > trackLength / 2) distToPlayer -= trackLength;

        if (distToPlayer > 0 && distToPlayer < 2500 && Math.abs(ai.offset - player.offset) < 0.35) {
            aiMaxSpeedMultiplier = 1.10;
            aiAccelMultiplier = 1.25;
            callbacks.onDrafting(ai, player);
        }

        // 1. Acceleration & Braking (Look Ahead)
        const lookAhead = 45;
        const futureSegment = track[(Math.floor(ai.z / SEGMENT_LENGTH) + lookAhead) % track.length];
        const futureCurve = Math.abs(futureSegment.curve);

        let targetSpeed = ai.maxSpeed * aiMaxSpeedMultiplier;
        if (futureCurve > 2) {
            const cornerFactor = 1 - (futureCurve / 8);
            targetSpeed = (ai.maxSpeed * aiMaxSpeedMultiplier) * Math.max(0.25, cornerFactor);
        }



        // Initialize evasion state if not set
        if (!ai.evasionState) ai.evasionState = 'normal';

        // === STATE-BASED OVERTAKING LOGIC ===
        const isPlayerInFront = distToPlayer > 0 && distToPlayer < 2500;
        const lateralDistance = Math.abs(player.offset - ai.offset);
        const isPlayerBlocking = isPlayerInFront && lateralDistance < 1.2; // More sensitive blocking detection

        // STATE TRANSITIONS
        if (ai.evasionState === 'normal') {
            if (isPlayerBlocking && distToPlayer < 2000) {
                ai.evasionState = 'blocked';
            }
        } else if (ai.evasionState === 'blocked') {
            if (!isPlayerBlocking || distToPlayer > 2500) {
                ai.evasionState = 'normal';
            } else {
                // Immediately start evading when blocked
                ai.evasionState = 'evading';
            }
        } else if (ai.evasionState === 'evading') {
            // Check if we found a gap - more realistic detection
            const hasLeftGap = player.offset > 0.3 && ai.offset < -0.3;
            const hasRightGap = player.offset < -0.3 && ai.offset > 0.3;

            if (hasLeftGap || hasRightGap) {
                ai.evasionState = 'overtaking';
            } else if (!isPlayerInFront || distToPlayer > 2500) {
                ai.evasionState = 'normal';
            } else if (!isPlayerBlocking && distToPlayer < 1500) {
                // If player moved aside but we're still close, go for overtake
                ai.evasionState = 'overtaking';
            }
        } else if (ai.evasionState === 'overtaking') {
            // Check if we successfully passed or got blocked again
            if (distToPlayer < 0 || distToPlayer > 3000) {
                ai.evasionState = 'normal';
            } else if (isPlayerBlocking && distToPlayer < 1200) {
                ai.evasionState = 'evading'; // Player blocked us again
            }
        }

        // SPEED CONTROL BASED ON STATE
        if (ai.evasionState === 'blocked') {
            // Brake to maintain safe distance, but keep minimum speed
            const safetyGap = 600;
            const minBlockedSpeed = (ai.maxSpeed * aiMaxSpeedMultiplier) * 0.2;

            if (distToPlayer < safetyGap) {
                ai.speed -= PHYSICS.BRAKING * 1.8; // Hard brake
                if (ai.speed < minBlockedSpeed) ai.speed = minBlockedSpeed;
            } else {
                const targetSpeed = Math.max(minBlockedSpeed, player.speed * 0.85);
                ai.speed = Math.min(ai.speed, targetSpeed);
            }
        } else if (ai.evasionState === 'evading') {
            // Maintain minimum speed for evasion maneuvers, even if player is stopped
            const minEvasionSpeed = (ai.maxSpeed * aiMaxSpeedMultiplier) * 0.3;
            const targetEvasionSpeed = Math.max(minEvasionSpeed, player.speed * 0.9);

            if (ai.speed > targetEvasionSpeed + 10) {
                ai.speed -= PHYSICS.BRAKING * 0.5;
            } else if (ai.speed < targetEvasionSpeed - 10) {
                ai.speed += ai.accel * aiAccelMultiplier * 0.8;
            }
        } else if (ai.evasionState === 'overtaking') {
            // ACCELERATE DECISIVELY
            ai.speed += ai.accel * aiAccelMultiplier * 1.5; // Boost acceleration
            if (ai.speed > (ai.maxSpeed * aiMaxSpeedMultiplier) * 1.1) ai.speed = (ai.maxSpeed * aiMaxSpeedMultiplier) * 1.1;
        } else {
            // Normal speed control
            if (ai.speed < targetSpeed) {
                ai.speed += ai.accel * aiAccelMultiplier;
            } else {
                ai.speed -= PHYSICS.BRAKING * 0.5;
            }
        }

        // 2. Steering / Lateral Control
        const aiSpeedRatio = ai.speed / ai.maxSpeed;
        const aiCurve = aiSegment.curve;

        if (ai.speed > 0 && aiCurve !== 0) {
            const drift = aiCurve * aiSpeedRatio * PHYSICS.DRIFT_FACTOR * dt;
            ai.offset -= drift;
        }

        // 3. DODGING & AVOIDANCE LOGIC
        let targetOffset = -0.4; // Default preference

        // A. Scan for Objects (Obstacles & Repair Kits)
        const scanDistance = 30; // Obstacle scan
        const repairScanDistance = 50; // Proactive repair scan
        const currentAIIdx = Math.floor(ai.z / SEGMENT_LENGTH);
        let obstacleToAvoid = null;
        let repairKitToSeek = null;
        let distToObstacle = 0;

        for (let n = 1; n <= repairScanDistance; n++) {
            const checkIdx = (currentAIIdx + n) % track.length;
            const segment = track[checkIdx];
            for (const sprite of segment.sprites) {
                const spriteW = (sprite.width / ROAD_WIDTH) * 0.6;

                // Prioritize Repair Kit if damage > 5%
                if (sprite.source === 'REPAIR' && ai.damage > 5) {
                    if (!repairKitToSeek) {
                        repairKitToSeek = sprite;
                    }
                }

                // Obstacle detection (only within scanDistance)
                if (n <= scanDistance) {
                    if (sprite.source !== 'REPAIR' && Math.abs(ai.offset - sprite.offset) < (spriteW + 0.5)) {
                        if (!obstacleToAvoid) {
                            obstacleToAvoid = sprite;
                            distToObstacle = n;
                        }
                    }
                }
            }
            // If we found an obstacle very close, prioritize avoidance over repair
            if (obstacleToAvoid && distToObstacle < 10) break;
        }

        if (obstacleToAvoid) {
            // Obstacle avoidance always takes priority
            const urgency = 1.0 - (distToObstacle / scanDistance);
            const safetyMargin = 0.7 + (urgency * 0.3);

            if (ai.offset > obstacleToAvoid.offset) targetOffset = Math.min(2.0, obstacleToAvoid.offset + safetyMargin);
            else targetOffset = Math.max(-2.0, obstacleToAvoid.offset - safetyMargin);
        } else if (repairKitToSeek && ai.evasionState === 'normal') {
            // Seek repair kit only when not in evasion mode
            targetOffset = repairKitToSeek.offset;
        } else if (ai.evasionState === 'evading') {
            // ULTRA-AGGRESSIVE REACTIVE EVASION
            // Detect which side player is on and move to opposite side FAST
            const playerSide = player.offset > 0 ? 1 : -1;
            const aiSide = ai.offset > 0 ? 1 : -1;

            // Use time-based oscillation for rapid movement but with SAFER amplitude
            const time = Date.now() / 1000;
            const rapidOscillation = Math.sin(time * 8) * 1.5; // 8 Hz oscillation, amplitude 1.5 (down from 4.5)

            // If player is on same side as AI, move to opposite side immediately
            if (playerSide === aiSide) {
                targetOffset = -playerSide * 1.8; // Move to safe opposite lane, not extreme off-road (-3.5 -> -1.8)
            } else {
                // Player is on opposite side, use rapid oscillation to find gap
                targetOffset = rapidOscillation;
            }

            // Add position-based component for variety with REDUCED amplitude
            const positionZigZag = Math.sin(ai.z * 0.05) * 1.2;
            targetOffset = (targetOffset + positionZigZag) / 2; // Combine both for unpredictability
        } else if (ai.evasionState === 'overtaking') {
            // COMMIT TO OVERTAKING SIDE (Safely)
            if (player.offset > 0) {
                targetOffset = -1.3; // Pass on the left (Safe lane)
            } else {
                targetOffset = 1.3; // Pass on the right (Safe lane)
            }
        } else if (ai.evasionState === 'blocked') {
            // Stay behind but prepare to evade
            targetOffset = ai.offset; // Maintain current position
        } else {
            // Normal driving - avoid player if close
            distToPlayer = player.z - ai.z;
            if (distToPlayer < -trackLength / 2) distToPlayer += trackLength;
            if (distToPlayer > trackLength / 2) distToPlayer -= trackLength;

            if (distToPlayer > 0 && distToPlayer < 3000 && ai.speed > player.speed * 0.7) {
                if (player.offset > 0.1) targetOffset = -1.0;
                else if (player.offset < -0.1) targetOffset = 1.0;
                else targetOffset = ai.offset > 0 ? 1.0 : -1.0;
            }
        }

        // --- OFF-ROAD RECOVERY OVERRIDE ---
        // If we are slipping off-road (offset > 1.2), force recovery unless dodging immediate death
        if (!obstacleToAvoid && Math.abs(ai.offset) > 1.4) {
            targetOffset = 0; // Center the car
        }

        // Clamping Target Offset for general safety (Keep on road/shoulder)
        if (!obstacleToAvoid) {
            targetOffset = Math.max(-1.8, Math.min(1.8, targetOffset));
        }

        const diff = targetOffset - ai.offset;
        let steerPower = PHYSICS.STEERING_SPEED * 0.5;

        // Boost steering in evasion and overtaking states
        if (ai.evasionState === 'evading') {
            steerPower *= 2.5; // Increased steering but controlled (down from 5.0)
        } else if (ai.evasionState === 'overtaking') {
            steerPower *= 2.0; // Decisive steering during overtake
        }

        // Emergency boost for obstacles
        const isEmergency = (obstacleToAvoid && distToObstacle < 5);
        if (isEmergency) {
            steerPower *= 1.8;
        }

        if (Math.abs(diff) > 0.05) {
            const dir = diff > 0 ? 1 : -1;
            // Apply steering with a bit of "inertia" by limiting max change per frame
            const steerAmount = Math.min(Math.abs(diff), dir * steerPower * aiSpeedRatio * dt);
            ai.offset += dir * Math.abs(steerAmount);
        }

        if (ai.offset < -2.5) ai.offset = -2.5;
        if (ai.offset > 2.5) ai.offset = 2.5;

        ai.z += ai.speed * dt;
    });

    // --- 6. LAP MANAGEMENT ---
    cars.forEach(car => {
        if (!car.exploded && !car.finished) {
            car.lapTime += dt;
        }

        // Checkpoint Logic (3 checkpoints per lap)
        const CHECKPOINTS_PER_LAP = 3;
        const checkpointInterval = trackLength / CHECKPOINTS_PER_LAP;

        // If car passes the next checkpoint distance
        if (car.z > car.nextCheckpointIndex * checkpointInterval) {
            // Only trigger if we haven't finished the lap yet (handled below)
            if (car.nextCheckpointIndex < CHECKPOINTS_PER_LAP) {
                callbacks.onCheckpoint(car);
                car.nextCheckpointIndex++;
            }
        }

        if (car.z >= trackLength) {
            car.z -= trackLength;
            car.lap++;
            car.nextCheckpointIndex = 1; // Reset for next lap
            callbacks.onLap(car);
            if (car.lap > totalLaps && !car.finished) {
                car.finished = true;
            }
        }
        else if (car.z < 0) {
            car.z += trackLength;
            car.lap--;
            // If going backwards across start line, reset to last checkpoint
            car.nextCheckpointIndex = CHECKPOINTS_PER_LAP;
        }
    });
};
