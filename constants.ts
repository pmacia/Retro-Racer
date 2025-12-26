
// --- SCREEN & ENGINE ---
export const FPS = 60;
export const STEP = 1 / FPS;
export const WIDTH = 1024;
export const HEIGHT = 768;

// --- TRACK & VIEW ---
export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000;
export const VISIBILITY = 300;
export const CAMERA_DEPTH = 0.84;
export const CAMERA_HEIGHT = 1500;
export const VIEWING_DISTANCE = 15000; // max distance to draw particles/sprites
export const CAMERA_VIEWS = {
  PLAYER: 0,
  RIVAL: 1,
  SPLIT_V: 2,
  SPLIT_H: 3,
  MAP: 4
};

// --- COLORS ---
export const COLORS = {
  SKY: '#72D7EE',
  TREE: '#005108',
  FOG: '#005108',
  MOUNTAIN: '#5D4037',
  LIGHT: { road: '#6B6B6B', grass: '#009A17', rumble: '#555555', lane: '#CCCCCC' },
  DARK: { road: '#696969', grass: '#009A17', rumble: '#BBBBBB' },
  START: { road: '#FFF', grass: '#009A17', rumble: '#FFF' },
  FINISH: { road: '#000', grass: '#009A17', rumble: '#000' },
  OIL_STAIN: '#1a0f00',
  MINIMAP_BG: 'rgba(7, 11, 20, 0.8)',
  MINIMAP_BORDER: 'rgba(34, 197, 94, 0.8)',
  MINIMAP_TRACK: '#334155',
  MINIMAP_PLAYER: '#22c55e',
  MINIMAP_RIVAL: '#ef4444',
  SEPARATOR: '#000'
};

// --- OBSTACLES & DAMAGE ---
export const OBSTACLES = [
  { type: 'BOULDER', width: 500, height: 400 },
  { type: 'TREE', width: 700, height: 1000 },
  { type: 'BARREL', width: 450, height: 350 },
  { type: 'TIRE', width: 450, height: 250 },
  { type: 'OIL', width: 600, height: 100 },
  { type: 'PUDDLE', width: 800, height: 150 },
  { type: 'REPAIR', width: 400, height: 400 }
];

export const DAMAGE = {
  MAX: 100,
  HIT_TREE: 25,
  HIT_BOULDER: 30,
  HIT_BARREL: 15,
  HIT_TIRE: 10,
  HIT_CAR_REAR: 3,
  HIT_CAR_SIDE: 3,
  HIT_CAR_STOPPED: 30,
  REPAIR_AMOUNT: -20
};

// --- PHYSICS ---
export const PHYSICS = {
  MAX_SPEED: 24000,
  ACCEL: 100,
  BRAKING: 250,
  DECEL_COAST: 15,
  DECEL_OFFROAD: 800,
  SPEED_GRIP_LOSS: 12000,
  DRIFT_FACTOR: 0.90,
  CENTRIFUGAL_FORCE: 0.35,
  STEERING_SPEED: 6.0,
  SPEED_STEERING_DAMPING: 0.4,
  OFFROAD_LIMIT: 0.75,
  PUDDLE_FRICTION: 0.90,
  COLLISION_BOX: { width: 0.45, length: 700 },
  DRAFTING: {
    DISTANCE: 2500,
    OFFSET: 0.35,
    SPEED_BOOST: 1.10,
    ACCEL_BOOST: 1.25
  },
  CHECKPOINTS_PER_LAP: 3
};

// --- PARTICLES ---
export const PARTICLES = {
  GRAVITY: {
    HEAVY: 0.8,
    MEDIUM: 0.5,
    LIGHT: 0.2
  },
  FRICTION: {
    AIR: 0.98,
    SMOKE: 0.96,
    FIRE: 0.95
  },
  PROJECTION: {
    SELF_HEIGHT: 1150,
    SPLASH_HEIGHT: 200,
    DEPTH_OFFSET: 1800
  },
  DECAY: {
    SMOKE: 0.006,
    FIRE: 0.012,
    SPARK: 0.05,
    DEBRIS: 0.03,
    WATER: 0.02,
    OIL: 0.02
  }
};

// --- AI CONFIG ---
export const AI = {
  LOOKAHEAD: 45,
  OVERTAKE_DISTANCE_Z: 2500,
  LATERAL_BLOCK_LIMIT: 1.2,
  SAFETY_GAP: 600,
  SCAN_DISTANCE: 30,
  REPAIR_SCAN: 50,
  SPEED_MULTIPLIERS: {
    ROOKIE: 16000,
    AMATEUR_BASE: 20000,
    PRO_BASE: 23500
  }
};

// --- AUDIO ---
export const AUDIO = {
  MASTER_VOLUME: 0.5,
  ENGINE: {
    IDLE_FREQ: 60,
    MAX_FREQ: 300,
    IDLE_RUMBLE: 15,
    MAX_RUMBLE: 50,
    RUMBLE_DEPTH: 20,
    VOLUME: 0.2,
    FILTER_FREQ: 400
  }
};

// --- GAMEPLAY SCENARIOS ---
export const COUNTDOWN_DURATION = 3;
export const OIL_DECAY_RATE = 0.005;
export const FIREWORK_CHANCE = 0.08;
export const FINISH_SEQUENCE_MS = 1500;
export const MIN_LAP_COUNT = 3;

// --- HUD & UI ---
export const MINIMAP = {
  WIDTH_RATIO: 0.25,
  MIN_WIDTH: 150,
  MAX_WIDTH: 250,
  ASPECT_RATIO: 0.75,
  OFFSET_X: 20,
  OFFSET_Y: 120
};
