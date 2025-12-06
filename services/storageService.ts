import { Score } from '../types';

const STORAGE_KEY = 'retro_racer_scores';

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
  // Sort by time (ascending) and keep top 10
  scores.sort((a, b) => a.time - b.time);
  const top10 = scores.slice(0, 10);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
  } catch (e) {
    console.error("Failed to save score", e);
  }
  return top10;
};