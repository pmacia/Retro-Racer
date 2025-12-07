
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
