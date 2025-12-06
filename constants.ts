
export const FPS = 60;
export const STEP = 1 / FPS;
export const WIDTH = 1024;
export const HEIGHT = 768;
export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000; // Balanced width
export const VISIBILITY = 50; // How many segments to draw
export const CAMERA_DEPTH = 0.84; // Field of view

export const COLORS = {
  SKY: '#72D7EE',
  TREE: '#005108',
  FOG: '#005108',
  // Grass colors are now unified (LIGHT.grass == DARK.grass) to create solid terrain
  LIGHT: { road: '#6B6B6B', grass: '#009A17', rumble: '#555555', lane: '#CCCCCC' },
  DARK: { road: '#696969', grass: '#009A17', rumble: '#BBBBBB' },
  START: { road: '#FFF', grass: '#009A17', rumble: '#FFF' },
  FINISH: { road: '#000', grass: '#009A17', rumble: '#000' },
};

export const OBSTACLES = [
  { type: 'BOULDER', width: 500, height: 400 },
  { type: 'TREE', width: 700, height: 1000 }
];

// Define track geometry to create a closed loop.
// A perfect circle or rectangle with rounded corners requires the accumulated angle to be 2*PI (360 degrees).
// In our engine, 'curve' is roughly the change in x-projected coordinate, but we map it to angle for the minimap.
// Layout: Straight -> Right 90 -> Straight -> Right 90 -> Straight -> Right 90 -> Straight -> Right 90.
export const TRACK_LAYOUT = [
  // Start Straight (Bottom)
  { type: 'STRAIGHT', length: 50, curve: 0 },
  
  // Turn 1 (Right 90deg)
  { type: 'CURVE_RIGHT', length: 50, curve: 3 },
  
  // Right Straight
  { type: 'STRAIGHT', length: 80, curve: 0 },
  
  // Turn 2 (Right 90deg)
  { type: 'CURVE_RIGHT', length: 50, curve: 3 },
  
  // Top Straight
  { type: 'STRAIGHT', length: 50, curve: 0 },

  // Turn 3 (Right 90deg)
  { type: 'CURVE_RIGHT', length: 50, curve: 3 },

  // Left Straight (with Chicane)
  { type: 'STRAIGHT', length: 20, curve: 0 },
  { type: 'CHICANE_L', length: 20, curve: -2 },
  { type: 'CHICANE_R', length: 20, curve: 2 },
  { type: 'STRAIGHT', length: 20, curve: 0 },

  // Turn 4 (Right 90deg)
  { type: 'CURVE_RIGHT', length: 50, curve: 3 },

  // Finish Straight to Start
  { type: 'STRAIGHT', length: 30, curve: 0 },
];

// Calculated total segments based on layout
export const TRACK_LENGTH = TRACK_LAYOUT.reduce((acc, section) => acc + section.length, 0);
