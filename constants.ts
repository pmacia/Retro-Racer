
export const FPS = 60;
export const STEP = 1 / FPS;
export const WIDTH = 1024;
export const HEIGHT = 768;
export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000; // Balanced width
export const VISIBILITY = 300; // Increased to reach horizon
export const CAMERA_DEPTH = 0.84; // Field of view

export const COLORS = {
  SKY: '#72D7EE',
  TREE: '#005108',
  FOG: '#005108',
  MOUNTAIN: '#5D4037', // Brown mountains
  LIGHT: { road: '#6B6B6B', grass: '#009A17', rumble: '#555555', lane: '#CCCCCC' },
  DARK: { road: '#696969', grass: '#009A17', rumble: '#BBBBBB' },
  START: { road: '#FFF', grass: '#009A17', rumble: '#FFF' },
  FINISH: { road: '#000', grass: '#009A17', rumble: '#000' },
};

export const OBSTACLES = [
  { type: 'BOULDER', width: 500, height: 400 },
  { type: 'TREE', width: 700, height: 1000 },
  { type: 'BARREL', width: 450, height: 350 },
  { type: 'TIRE', width: 450, height: 250 },
  { type: 'OIL', width: 600, height: 100 },    // New: Oil slick
  { type: 'PUDDLE', width: 800, height: 150 }, // New: Water puddle
  { type: 'REPAIR', width: 400, height: 400 }  // New: Repair kit
];

export const DAMAGE = {
  MAX: 100,
  HIT_TREE: 25,
  HIT_BOULDER: 30,
  HIT_BARREL: 15,
  HIT_TIRE: 10,
  HIT_CAR_REAR: 3,  // Reduced from 5
  HIT_CAR_SIDE: 3,
  HIT_CAR_STOPPED: 30,
  REPAIR_AMOUNT: -20 // Negative damage = healing
};

// --- PHYSICS CONFIGURATION ---
export const PHYSICS = {
  MAX_SPEED: 24000,     // ~240 km/h (internal units)
  ACCEL: 100,           // Acceleration rate
  BRAKING: 250,         // Braking power 
  DECEL_COAST: 15,      // Natural friction when letting go of gas (Coast)
  DECEL_OFFROAD: 800,   // High friction when off-road (slows down fast)

  // Speed Thresholds
  SPEED_GRIP_LOSS: 12000,

  // 1. GEOMETRIC DRIFT (The Tangent Effect)
  // This factor determines how fast the car moves laterally if you don't steer in a curve.
  // Value 0.55 means in a sharp curve (6) at max speed (1.0), 
  // you move ~0.1 unit per frame.
  // Road is 2.0 units wide (-1 to 1). 
  // You will cross the half-width (1.0) in ~30 frames (0.5 seconds).
  // This effectively breaks the "rail effect" without being instant teleportation.
  DRIFT_FACTOR: 0.90,

  // 2. CENTRIFUGAL FORCE 
  // Grows exponentially with speed. Adds weight/inertia.
  CENTRIFUGAL_FORCE: 0.35,

  // 3. STEERING SENSITIVITY
  // Must be high enough to counter the Drift Factor.
  // 3.5 allows crossing the full road in ~0.6 seconds at max speed.
  STEERING_SPEED: 6.0,

  // 4. SPEED DAMPING
  // Reduces steering effectiveness at max speed (Understeer)
  SPEED_STEERING_DAMPING: 0.4
};
