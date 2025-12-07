
import { TrackDefinition, TrackSection } from '../types';

export const PRESET_TRACKS: TrackDefinition[] = [
  {
    id: 'gp_circuit',
    name: 'Grand Prix XL',
    description: 'Versión extendida. Rectas para alcanzar velocidad máxima y horquillas técnicas.',
    layout: [
      { type: 'STRAIGHT', length: 100 }, // Long start
      { type: 'CURVE', length: 60, curve: 3 }, 
      { type: 'STRAIGHT', length: 80 },
      { type: 'CURVE', length: 40, curve: -4 }, 
      { type: 'STRAIGHT', length: 150 }, // High speed zone
      { type: 'CURVE', length: 100, curve: 5 }, // Long sweeping turn (near 180)
      { type: 'STRAIGHT', length: 50 },
      { type: 'CURVE', length: 40, curve: -3 }, 
      { type: 'STRAIGHT', length: 30 },
      { type: 'CURVE', length: 30, curve: 6 }, // Sharp
      { type: 'STRAIGHT', length: 200 }, // Massive straight
      { type: 'CURVE', length: 80, curve: -2 }, 
      { type: 'STRAIGHT', length: 50 },
    ]
  },
  {
    id: 'spiral',
    name: 'Endurance Spiral',
    description: 'Rectas infinitas y curvas de 360 grados que ponen a prueba tu paciencia.',
    layout: [
      { type: 'STRAIGHT', length: 200 },
      { type: 'CURVE', length: 200, curve: 3 }, // The 360 Loop (Right)
      { type: 'STRAIGHT', length: 100 },
      { type: 'CURVE', length: 50, curve: -2 },
      { type: 'STRAIGHT', length: 150 },
      { type: 'CURVE', length: 180, curve: -4 }, // Tight Long Loop (Left)
      { type: 'STRAIGHT', length: 200 },
      { type: 'CURVE', length: 40, curve: 5 }, // Sharp exit
      { type: 'STRAIGHT', length: 80 },
    ]
  },
  {
    id: 'oval_xl',
    name: 'Super Speedway',
    description: 'Un óvalo gigante. Velocidad pura sin apenas frenar.',
    layout: [
      { type: 'STRAIGHT', length: 300 },
      { type: 'CURVE', length: 150, curve: -2 }, // Banked turn feel
      { type: 'STRAIGHT', length: 300 },
      { type: 'CURVE', length: 150, curve: -2 },
      { type: 'STRAIGHT', length: 50 },
    ]
  },
  {
    id: 'snake',
    name: 'The Viper',
    description: 'Puras curvas. Un infierno de zig-zag sin apenas descanso.',
    layout: [
      { type: 'STRAIGHT', length: 50 },
      { type: 'CURVE', length: 40, curve: 4 },
      { type: 'CURVE', length: 40, curve: -4 },
      { type: 'CURVE', length: 50, curve: 5 },
      { type: 'CURVE', length: 50, curve: -5 },
      { type: 'STRAIGHT', length: 20 },
      { type: 'CURVE', length: 60, curve: 3 },
      { type: 'CURVE', length: 60, curve: -3 },
      { type: 'CURVE', length: 100, curve: 6 }, // Hard long turn
      { type: 'STRAIGHT', length: 50 },
    ]
  }
];

export const generateRandomTrack = (): TrackDefinition => {
  const sections: TrackSection[] = [];
  // Significantly increased number of sections for longer gameplay
  const totalSections = Math.floor(Math.random() * 20) + 20; // 20 to 40 sections
  
  // Start with a decent straight
  sections.push({ type: 'STRAIGHT', length: 100 });

  for (let i = 0; i < totalSections; i++) {
    const r = Math.random();
    
    if (r < 0.4) {
      // STRAIGHTS: Now much longer
      // Random length between 50 and 250
      sections.push({ type: 'STRAIGHT', length: Math.floor(Math.random() * 200) + 50 });
    } else {
      // CURVES
      const direction = Math.random() > 0.5 ? 1 : -1;
      const isLoop = Math.random() > 0.8; // 20% chance of a massive loop
      
      let strength = Math.floor(Math.random() * 6) + 2; // 2 to 8
      let length = Math.floor(Math.random() * 60) + 40; // Standard curve length

      if (isLoop) {
          // 360-degree loop logic: High length with consistent curve
          length = Math.floor(Math.random() * 150) + 120; // Very long
          strength = Math.floor(Math.random() * 3) + 2; // Moderate curve over long distance creates a loop
      } else if (Math.random() > 0.7) {
          // Sharp hairpin
          strength = 8;
          length = 50;
      }

      sections.push({ 
        type: 'CURVE', 
        length: length, 
        curve: strength * direction 
      });
    }
  }

  // Finish line run-up
  sections.push({ type: 'STRAIGHT', length: 100 });

  return {
    id: 'random',
    name: 'Random Marathon',
    description: 'Un circuito generado proceduralmente. Largo, impredecible y desafiante.',
    layout: sections
  };
};

export const getTrackById = (id: string): TrackDefinition => {
  if (id === 'random') return generateRandomTrack();
  return PRESET_TRACKS.find(t => t.id === id) || PRESET_TRACKS[0];
};
