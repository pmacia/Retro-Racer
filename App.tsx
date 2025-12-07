
import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Trophy, CarFront, Flag, Signal, Gauge, Zap } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, PlayerSettings, Score, Difficulty } from './types';
import { saveScore, getScores } from './services/storageService';
import { TRACK_LENGTH, SEGMENT_LENGTH } from './constants';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [settings, setSettings] = useState<PlayerSettings>({ 
    name: 'JUGADOR 1', 
    color: '#3b82f6', // Default Blue
    laps: 3,
    difficulty: Difficulty.AMATEUR
  });
  const [scores, setScores] = useState<Score[]>(getScores());
  const [finalTime, setFinalTime] = useState<number>(0);
  const [finalSpeed, setFinalSpeed] = useState<number>(0);

  // Calculate best speed to pass to game engine for AI scaling
  const bestSpeed = scores.length > 0 ? scores[0].avgSpeed : 0;

  const startGame = () => setStatus(GameStatus.PLAYING);
  
  const pauseGame = () => {
    if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
    else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
  };

  const handleFinish = (time: number) => {
    const totalDistance = TRACK_LENGTH * SEGMENT_LENGTH * settings.laps;
    const avgSpeedUnits = totalDistance / time;
    const avgSpeedKmh = avgSpeedUnits / 100;

    const newScores = saveScore({
      name: settings.name.toUpperCase(),
      avgSpeed: avgSpeedKmh,
      date: new Date().toLocaleDateString()
    });
    setScores(newScores);
    setFinalTime(time);
    setFinalSpeed(avgSpeedKmh);
    setStatus(GameStatus.GAME_OVER);
  };

  const resetGame = () => {
    setStatus(GameStatus.MENU);
  };

  return (
    <div className="relative w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans">
      
      {/* --- BACKGROUND ANIMATION (Synthwave Grid) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         {/* Sky Gradient */}
         <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-purple-900 to-black opacity-80" />
         
         {/* Sun */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-yellow-400 to-pink-600 rounded-full blur-3xl opacity-20 transform -translate-y-1/2" />

         {/* Moving Grid */}
         <div className="absolute inset-0 perspective-grid opacity-30">
            <style>{`
              .perspective-grid {
                background-image: 
                  linear-gradient(to right, rgba(6,182,212, 0.5) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(236,72,153, 0.5) 1px, transparent 1px);
                background-size: 40px 40px;
                transform: perspective(500px) rotateX(60deg);
                transform-origin: center 0%;
                height: 200%;
                width: 100%;
                position: absolute;
                bottom: -100%;
                animation: gridMove 1s linear infinite;
              }
              @keyframes gridMove {
                0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
                100% { transform: perspective(500px) rotateX(60deg) translateY(40px); }
              }
              /* Neon Text Shadow */
              .neon-text {
                text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #0ff, 0 0 30px #0ff, 0 0 40px #0ff;
              }
              .neon-box {
                box-shadow: 0 0 10px rgba(6,182,212,0.5), inset 0 0 20px rgba(6,182,212,0.2);
              }
            `}</style>
         </div>
      </div>

      {/* Game Layer */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${status === GameStatus.MENU ? 'opacity-40' : 'opacity-100'}`}>
        <GameCanvas 
          status={status} 
          settings={settings} 
          onFinish={handleFinish} 
          isPaused={status === GameStatus.PAUSED}
          bestSpeed={bestSpeed}
        />
      </div>

      {/* UI Overlay: Pause Button */}
      {status === GameStatus.PLAYING && (
        <button 
          onClick={pauseGame}
          className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/80 text-white border border-cyan-500 p-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)] transition backdrop-blur-md"
        >
          <Pause size={24} />
        </button>
      )}

      {/* --- MENU PRINCIPAL --- */}
      {status === GameStatus.MENU && (
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl h-full p-4 animate-in fade-in zoom-in duration-500">
          
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/50 p-8 md:p-12 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] w-full max-w-lg neon-box relative overflow-hidden">
            
            {/* Decorative Lines */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>

            {/* Header */}
            <div className="text-center mb-8 relative">
               <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 drop-shadow-sm transform -skew-x-12 pb-2">
                 RETRO RACER
               </h1>
               <div className="text-pink-500 font-bold tracking-[0.5em] text-xs uppercase animate-pulse">
                 2.5D Arcade Simulation
               </div>
            </div>

            <div className="space-y-6">
              
              {/* Name Input */}
              <div className="relative group">
                <input 
                  type="text" 
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value.toUpperCase()})}
                  className="w-full bg-gray-900/50 border-b-2 border-gray-600 focus:border-cyan-400 text-white text-center font-bold text-xl p-3 outline-none transition-all placeholder-gray-600 uppercase tracking-wider"
                  placeholder="PILOTO"
                  maxLength={10}
                />
                <label className="absolute -top-2 left-0 w-full text-center text-xs font-bold text-cyan-500 uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Nombre del Piloto</label>
              </div>
              
              {/* Difficulty */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-pink-500 uppercase tracking-widest">Nivel de Habilidad</span>
                 </div>
                 <div className="flex gap-1 bg-gray-900/80 p-1 rounded-lg border border-gray-700">
                   {[
                     { id: Difficulty.ROOKIE, label: 'ROOKIE' },
                     { id: Difficulty.AMATEUR, label: 'PRO' },
                     { id: Difficulty.PRO, label: 'ELITE' }
                   ].map(level => (
                     <button
                       key={level.id}
                       onClick={() => setSettings({...settings, difficulty: level.id})}
                       className={`flex-1 py-2 text-xs font-black italic uppercase rounded-md transition-all duration-300 ${
                         settings.difficulty === level.id 
                           ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                           : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                       }`}
                     >
                       {level.label}
                     </button>
                   ))}
                 </div>
              </div>

              {/* Laps & Color Row */}
              <div className="grid grid-cols-2 gap-4">
                 {/* Laps */}
                 <div>
                    <span className="block text-xs font-bold text-pink-500 uppercase tracking-widest mb-2">Vueltas</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 3, 5, 10].map(lap => (
                        <button
                          key={lap}
                          onClick={() => setSettings({...settings, laps: lap})}
                          className={`aspect-square flex items-center justify-center font-bold text-sm rounded border transition-all ${
                            settings.laps === lap 
                              ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]' 
                              : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                          }`}
                        >
                          {lap}
                        </button>
                      ))}
                    </div>
                 </div>

                 {/* Colors */}
                 <div>
                    <span className="block text-xs font-bold text-pink-500 uppercase tracking-widest mb-2">Vehículo</span>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#d946ef', '#06b6d4'].map(c => (
                        <button
                          key={c}
                          onClick={() => setSettings({...settings, color: c})}
                          className={`w-8 h-8 rounded transform transition-transform duration-200 ${
                            settings.color === c ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100'
                          }`}
                          style={{backgroundColor: c}}
                        />
                      ))}
                    </div>
                 </div>
              </div>

              {/* START BUTTON */}
              <button 
                onClick={startGame}
                className="group relative w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black italic text-2xl py-5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transform transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] border-t border-cyan-400 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <Play size={28} className="mr-3 fill-current" /> 
                  START ENGINE
                </span>
                {/* Shine effect */}
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine transition-all" />
              </button>

            </div>
          </div>
          
          {/* Leaderboard (Bottom) */}
          {scores.length > 0 && (
             <div className="mt-6 w-full max-w-lg bg-black/60 backdrop-blur-md border-t border-gray-800 rounded-xl p-4 animate-in slide-in-from-bottom-10 fade-in duration-700">
                <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center justify-center uppercase tracking-[0.2em]">
                  <Trophy size={14} className="mr-2 text-yellow-500"/> Hall of Fame
                </h3>
                <div className="space-y-2">
                  {scores.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-sm group hover:bg-white/5 p-1 rounded transition">
                      <div className="flex items-center">
                        <span className={`w-6 h-6 flex items-center justify-center rounded font-bold mr-3 ${i===0 ? 'bg-yellow-500 text-black' : i===1 ? 'bg-gray-400 text-black' : 'bg-orange-700 text-white'}`}>
                          {i+1}
                        </span>
                        <span className="text-gray-300 font-mono tracking-wide">{s.name}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400">{s.avgSpeed.toFixed(0)} <span className="text-xs text-gray-600">KM/H</span></span>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      )}

      {/* --- PAUSE MENU --- */}
      {status === GameStatus.PAUSED && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-md flex items-center justify-center">
           <div className="bg-gray-900/90 p-10 rounded-2xl border-2 border-yellow-500/50 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <h2 className="text-4xl font-black italic text-white mb-8 tracking-tighter">PAUSED</h2>
              <div className="space-y-4">
                <button 
                  onClick={pauseGame}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded flex items-center justify-center transition hover:scale-105"
                >
                  <Play size={20} className="mr-2 fill-current" /> RESUME
                </button>
                <button 
                  onClick={resetGame}
                  className="w-full bg-transparent border border-gray-600 hover:border-red-500 text-gray-400 hover:text-red-500 font-bold py-3 px-8 rounded flex items-center justify-center transition"
                >
                   EXIT RACE
                </button>
              </div>
           </div>
        </div>
      )}

      {/* --- GAME OVER --- */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-in zoom-in duration-300">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-cyan-500 to-green-400"></div>

            <h2 className="text-5xl font-black text-center text-white mb-2 italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              FINISH LINE
            </h2>
            
            <div className="flex justify-center mb-8">
               <div className="bg-gray-800 rounded-full px-4 py-1 flex items-center gap-2 border border-gray-700">
                  <Flag className="text-green-500" size={16}/>
                  <span className="text-gray-300 font-bold text-sm tracking-widest">{settings.laps} LAPS COMPLETED</span>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800 text-center">
                    <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Time</p>
                    <p className="text-3xl font-mono text-white tracking-widest">{finalTime.toFixed(2)}<span className="text-sm text-gray-600">s</span></p>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-green-900/50 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-green-500/5"></div>
                    <p className="text-green-500 text-xs font-bold uppercase mb-1">Avg Speed</p>
                    <p className="text-3xl font-mono text-green-400 tracking-widest drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                      {finalSpeed.toFixed(0)} <span className="text-sm text-green-700">km/h</span>
                    </p>
                </div>
            </div>

            <div className="bg-black/40 rounded-xl p-6 mb-8 border border-gray-800">
               <h3 className="text-gray-500 text-xs font-bold mb-4 uppercase tracking-[0.2em] text-center border-b border-gray-800 pb-2">Session Ranking</h3>
               <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                 {scores.map((s, i) => (
                   <div key={i} className={`flex justify-between items-center py-2 px-3 rounded ${s.avgSpeed === finalSpeed && s.name === settings.name ? 'bg-green-900/20 border border-green-500/30' : ''}`}>
                     <div className="flex items-center">
                        <span className="text-gray-500 font-mono w-6 text-sm">{i+1}.</span>
                        <span className={`font-mono text-sm ${s.name === settings.name ? 'text-white font-bold' : 'text-gray-400'}`}>{s.name}</span>
                     </div>
                     <span className="font-mono text-cyan-500 text-sm">{s.avgSpeed.toFixed(0)} km/h</span>
                   </div>
                 ))}
               </div>
            </div>

            <button 
              onClick={resetGame}
              className="w-full bg-white text-black hover:bg-gray-200 font-black italic text-xl py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition transform hover:scale-[1.02] flex items-center justify-center"
            >
              <RotateCcw size={24} className="mr-2" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
