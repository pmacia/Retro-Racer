
import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Trophy, CarFront, Flag } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, PlayerSettings, Score } from './types';
import { saveScore, getScores } from './services/storageService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [settings, setSettings] = useState<PlayerSettings>({ 
    name: 'Jugador 1', 
    color: '#0000FF',
    laps: 3 
  });
  const [scores, setScores] = useState<Score[]>(getScores());
  const [finalTime, setFinalTime] = useState<number>(0);

  const startGame = () => setStatus(GameStatus.PLAYING);
  
  const pauseGame = () => {
    if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
    else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
  };

  const handleFinish = (time: number) => {
    const newScores = saveScore({
      name: settings.name,
      time: time,
      date: new Date().toLocaleDateString()
    });
    setScores(newScores);
    setFinalTime(time);
    setStatus(GameStatus.GAME_OVER);
  };

  const resetGame = () => {
    setStatus(GameStatus.MENU);
  };

  return (
    <div className="relative w-screen h-screen bg-gray-900 flex items-center justify-center overflow-hidden">
      
      {/* Game Layer */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          status={status} 
          settings={settings} 
          onFinish={handleFinish} 
          isPaused={status === GameStatus.PAUSED}
        />
      </div>

      {/* UI Overlay: Pause Button (Always visible when playing) */}
      {status === GameStatus.PLAYING && (
        <button 
          onClick={pauseGame}
          className="absolute top-4 right-4 z-20 bg-yellow-500 hover:bg-yellow-600 text-black p-3 rounded-full shadow-lg transition"
        >
          <Pause size={24} />
        </button>
      )}

      {/* UI Overlay: Menu */}
      {status === GameStatus.MENU && (
        <div className="relative z-10 bg-black/80 backdrop-blur-md p-8 rounded-xl border border-blue-500/30 shadow-2xl w-full max-w-md text-white">
          <div className="flex items-center justify-center mb-6 text-blue-400">
             <CarFront size={48} className="mr-3" />
             <h1 className="text-4xl font-black tracking-tighter italic">RETRO RACER</h1>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-400">NOMBRE PILOTO</label>
              <input 
                type="text" 
                value={settings.name}
                onChange={(e) => setSettings({...settings, name: e.target.value})}
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 focus:border-blue-500 outline-none transition"
                maxLength={10}
              />
            </div>
            
            <div>
               <label className="block text-sm font-bold mb-1 text-gray-400">VUELTAS</label>
               <div className="flex gap-2">
                 {[1, 3, 5, 10].map(lap => (
                   <button
                     key={lap}
                     onClick={() => setSettings({...settings, laps: lap})}
                     className={`flex-1 py-1 rounded border ${settings.laps === lap ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                   >
                     {lap}
                   </button>
                 ))}
               </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-400">COLOR COCHE</label>
              <div className="flex gap-2">
                {['#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'].map(c => (
                  <button
                    key={c}
                    onClick={() => setSettings({...settings, color: c})}
                    className={`w-8 h-8 rounded-full border-2 ${settings.color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    style={{backgroundColor: c}}
                  />
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded shadow-[0_0_15px_rgba(37,99,235,0.5)] transform transition hover:scale-[1.02] flex items-center justify-center"
          >
            <Play size={24} className="mr-2" /> INICIAR CARRERA
          </button>

          {scores.length > 0 && (
            <div className="mt-8 border-t border-gray-700 pt-4">
               <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center"><Trophy size={16} className="mr-1 text-yellow-500"/> TOP RECORDS</h3>
               <ul className="text-sm space-y-1">
                 {scores.slice(0, 3).map((s, i) => (
                   <li key={i} className="flex justify-between text-gray-300">
                     <span>{i+1}. {s.name}</span>
                     <span className="font-mono text-yellow-500">{s.time.toFixed(2)}s</span>
                   </li>
                 ))}
               </ul>
            </div>
          )}
        </div>
      )}

      {/* UI Overlay: Pause */}
      {status === GameStatus.PAUSED && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-gray-900 p-8 rounded-lg border border-yellow-500 text-center shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-6">JUEGO PAUSADO</h2>
              <button 
                onClick={pauseGame}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full flex items-center mx-auto"
              >
                <Play size={20} className="mr-2" /> CONTINUAR
              </button>
              <button 
                onClick={resetGame}
                className="mt-4 text-red-400 hover:text-red-300 underline text-sm"
              >
                Salir al Menú
              </button>
           </div>
        </div>
      )}

      {/* UI Overlay: Game Over */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-xl border-2 border-green-500 text-center w-full max-w-lg shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <h2 className="text-4xl font-black text-white mb-2 italic">¡CARRERA FINALIZADA!</h2>
            <div className="flex justify-center items-center gap-2 mb-4">
                 <Flag className="text-white" size={24}/>
                 <span className="text-white font-bold">{settings.laps} VUELTAS</span>
            </div>
            <div className="text-6xl font-mono text-green-400 mb-6 drop-shadow-lg">
              {finalTime.toFixed(3)}<span className="text-2xl">s</span>
            </div>

            <div className="bg-gray-900 rounded p-4 mb-6 text-left max-h-48 overflow-y-auto">
               <h3 className="text-gray-400 text-xs font-bold mb-2 uppercase tracking-widest border-b border-gray-700 pb-1">Tabla de Líderes</h3>
               {scores.map((s, i) => (
                 <div key={i} className={`flex justify-between py-1 ${s.time === finalTime && s.name === settings.name ? 'bg-green-900/50 text-green-200 px-2 -mx-2 rounded' : 'text-gray-400'}`}>
                   <span>{i+1}. {s.name}</span>
                   <span className="font-mono">{s.time.toFixed(2)}</span>
                 </div>
               ))}
            </div>

            <button 
              onClick={resetGame}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded flex items-center justify-center mx-auto transition hover:scale-105"
            >
              <RotateCcw size={20} className="mr-2" /> VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
