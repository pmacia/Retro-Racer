
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
  { type: 'TREE', width: 700, height: 1000 }
];

// --- PHYSICS CONFIGURATION ---
export const PHYSICS = {
  MAX_SPEED: 24000,     // ~240 km/h (internal units)
  ACCEL: 100,           // Acceleration rate
  BRAKING: 250,         // Braking power 
  DECEL_COAST: 15,      // Natural friction when letting go of gas (Coast)
  DECEL_OFFROAD: 150,   // High friction when off-road (slows down fast)
  
  // Speed Thresholds
  SPEED_GRIP_LOSS: 12000, 
  
  // 1. GEOMETRIC DRIFT (The Tangent Effect)
  // This factor determines how fast the car moves laterally if you don't steer in a curve.
  // Value 0.55 means in a sharp curve (6) at max speed (1.0), 
  // you move ~0.1 unit per frame.
  // Road is 2.0 units wide (-1 to 1). 
  // You will cross the half-width (1.0) in ~30 frames (0.5 seconds).
  // This effectively breaks the "rail effect" without being instant teleportation.
  DRIFT_FACTOR: 1.55, 

  // 2. CENTRIFUGAL FORCE 
  // Kept at 0 for now to focus purely on geometry as requested.
  CENTRIFUGAL_FORCE: 0.0, 

  // 3. STEERING SENSITIVITY
  // Must be high enough to counter the Drift Factor.
  // 3.5 allows crossing the full road in ~0.6 seconds at max speed.
  STEERING_SPEED: 3.5, 
};
