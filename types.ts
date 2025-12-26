
export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export enum Difficulty {
  ROOKIE = 'ROOKIE',   // Principiante
  AMATEUR = 'AMATEUR', // Medio
  PRO = 'PRO'          // Profesional
}

export interface PlayerSettings {
  name: string;
  color: string;
  laps: number;
  difficulty: Difficulty;
  trackId: string; // ID of the selected track
}

export interface TrackSection {
  type: 'STRAIGHT' | 'CURVE';
  length: number; // Number of segments
  curve?: number; // Strength: Negative = Left, Positive = Right. E.g., -2 (Easy Left), 6 (Hard Right)
}

export interface TrackDefinition {
  id: string;
  name: string;
  description: string;
  layout: TrackSection[];
}

export interface Score {
  name: string;
  avgSpeed: number; // km/h (average)
  date: string;
  trackName?: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectPoint {
  x: number;
  y: number;
  w: number; // scale/width
}

export interface Segment {
  index: number;
  p1: Point3D;
  p2: Point3D;
  curve: number;
  // World coordinates for the Mini-Map
  mapX: number;
  mapY: number;
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane?: string;
  };
  sprites: Sprite[];
  clip?: number;
  screen?: { x: number; y: number; w: number };
}

export interface Sprite {
  source: string; // Helper for color/type
  offset: number; // -1 to 1 (x position relative to road center)
  width: number;
  height: number;
  z?: number; // Calculated render Z
}

export interface Car {
  offset: number; // X position (-1 to 1)
  z: number; // Distance along track
  speed: number;
  maxSpeed: number;
  accel: number;
  name: string;
  color: string;
  isPlayer: boolean;
  isNpc: boolean;
  lap: number; // Current lap (starts at 1)
  lapTime: number;
  finished: boolean;
  width: number; // Width of the car in world units (0-1 range relative to road)
  damage: number; // 0 to 100
  exploded: boolean; // True if damage >= 100
  nextCheckpointIndex: number; // For tracking partial lap progress
  evasionState?: 'normal' | 'blocked' | 'evading' | 'overtaking'; // AI evasion state
  isManualControl?: boolean;
}

export interface OilStain {
  alpha: number;
  seed: number;
}
