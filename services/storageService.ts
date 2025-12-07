
import { Score } from '../types';

const STORAGE_KEY = 'retro_racer_scores_v2'; // Changed key to reset/migrate scores structure

export const getScores = (): Score[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
  } catch (e) {
    console.error("Failed to save score", e);
  }
  return top10;
};
