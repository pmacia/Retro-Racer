import { Score, TrackDefinition, PlayerSettings } from '../types';

const SCORES_KEY = 'retro_racer_scores_v2';
const TRACKS_KEY = 'retro_racer_custom_tracks_v1';
const SETTINGS_KEY = 'retro_racer_settings_v1';

// --- SETTINGS (Player Preferences) ---

export const getSettings = (): PlayerSettings | null => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load settings", e);
    return null;
  }
};

export const saveSettings = (settings: PlayerSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};

// --- SCORES ---

export const getScores = (): Score[] => {
  try {
    const data = localStorage.getItem(SCORES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load scores", e);
    return [];
  }
};

export const saveScore = (newScore: Score): Score[] => {
  const scores = getScores();
  scores.push(newScore);
  // Sort by Average Speed (Descending: Faster is better)
  scores.sort((a, b) => b.avgSpeed - a.avgSpeed);
  const top10 = scores.slice(0, 10);
  
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(top10));
  } catch (e) {
    console.error("Failed to save score", e);
  }
  return top10;
};

// --- CUSTOM TRACKS ---

export const getCustomTracks = (): TrackDefinition[] => {
  try {
    const data = localStorage.getItem(TRACKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load custom tracks", e);
    return [];
  }
};

export const saveCustomTrack = (track: TrackDefinition): TrackDefinition[] => {
  const tracks = getCustomTracks();
  // Check if update or new
  const index = tracks.findIndex(t => t.id === track.id);
  if (index >= 0) {
    tracks[index] = track;
  } else {
    tracks.push(track);
  }
  
  try {
    localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.error("Failed to save custom track", e);
  }
  return tracks;
};

export const deleteCustomTrack = (trackId: string): TrackDefinition[] => {
  let tracks = getCustomTracks();
  tracks = tracks.filter(t => t.id !== trackId);
  
  try {
    localStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.error("Failed to delete custom track", e);
  }
  return tracks;
};