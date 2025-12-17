import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Trophy, Flag, ChevronDown, ChevronUp, Map, Save, Download, Trash2, X } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, PlayerSettings, Score, Difficulty, TrackDefinition } from './types';
import { saveScore, getScores, getCustomTracks, saveCustomTrack, deleteCustomTrack, getSettings, saveSettings } from './services/storageService';
import { PRESET_TRACKS, generateRandomTrack, getAllTracks, getTrackById } from './services/trackService';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);

  // Initialize settings from LocalStorage or Default
  const [settings, setSettings] = useState<PlayerSettings>(() => {
    const saved = getSettings();
    return saved || {
      name: 'JUGADOR 1',
      color: '#3b82f6', // Default Blue
      laps: 3,
      difficulty: Difficulty.AMATEUR,
      trackId: 'gp_circuit'
    };
  });

  const [scores, setScores] = useState<Score[]>(getScores());
  const [customTracks, setCustomTracks] = useState<TrackDefinition[]>(getCustomTracks());

  // Game State
  const [activeTrack, setActiveTrack] = useState<TrackDefinition | null>(null);

  // Results
  const [finalTime, setFinalTime] = useState<number>(0);
  const [finalSpeed, setFinalSpeed] = useState<number>(0);
  const [finalRank, setFinalRank] = useState<number>(1);
  const [winnerName, setWinnerName] = useState<string>('');

  // UI State
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState<boolean>(false);
  const [showSaveTrackModal, setShowSaveTrackModal] = useState<boolean>(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackDesc, setNewTrackDesc] = useState('');

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Calculate best speed to pass to game engine for AI scaling
  const bestSpeed = scores.length > 0 ? scores[0].avgSpeed : 0;

  // Combine Presets + Custom
  const allTracks = getAllTracks(customTracks);
  const selectedTrackInfo = allTracks.find(t => t.id === settings.trackId) || (settings.trackId === 'random' ? { name: 'RANDOM', description: 'Circuito Sorpresa generado proceduralmente' } : PRESET_TRACKS[0]);

  // Determine if the currently selected track ID exists in the customTracks array
  const isCustomSelected = customTracks.some(t => t.id === settings.trackId);

  const startGame = () => {
    let trackToPlay: TrackDefinition;

    if (settings.trackId === 'random') {
      // Generate new random track and store it in activeTrack
      trackToPlay = generateRandomTrack();
    } else {
      // Get existing track (Preset or Custom)
      trackToPlay = getTrackById(settings.trackId, customTracks);
    }

    setActiveTrack(trackToPlay);
    setStatus(GameStatus.PLAYING);
  };

  const pauseGame = () => {
    if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
    else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
  };

  const handleFinish = (time: number, totalDistance: number, rank: number, winner: string) => {
    // Note: totalDistance is passed from GameCanvas based on the generated track length
    const avgSpeedUnits = totalDistance / time;
    const avgSpeedKmh = avgSpeedUnits / 100;

    setFinalTime(time);
    setFinalSpeed(avgSpeedKmh);
    setFinalRank(rank);
    setWinnerName(winner);

    // Only save score if Player 1 Won (Rank 1)
    if (rank === 1) {
      const newScores = saveScore({
        name: settings.name.toUpperCase(),
        avgSpeed: avgSpeedKmh,
        date: new Date().toLocaleDateString()
      });
      setScores(newScores);
    }

    setStatus(GameStatus.GAME_OVER);
  };

  const resetGame = () => {
    setStatus(GameStatus.MENU);
    setShowSaveTrackModal(false);
  };

  const handleDeleteTrack = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // CRITICAL: Stop event from bubbling to parent select/div

    if (window.confirm("¿Seguro que quieres borrar este circuito permanentemente?")) {
      const updated = deleteCustomTrack(id);
      setCustomTracks(updated);

      // If we deleted the selected one, reset to default to avoid UI errors
      if (settings.trackId === id) {
        setSettings(prev => ({ ...prev, trackId: 'gp_circuit' }));
      }
    }
  };

  const handleSaveTrack = () => {
    if (!activeTrack || !newTrackName) return;

    const newId = `custom_${Date.now()}`;
    const trackToSave: TrackDefinition = {
      ...activeTrack,
      id: newId,
      name: newTrackName.toUpperCase(),
      description: newTrackDesc || 'Circuito personalizado'
    };

    const updatedTracks = saveCustomTrack(trackToSave);
    setCustomTracks(updatedTracks);

    // Auto-select the newly saved track in settings so it appears in the menu
    setSettings(prev => ({ ...prev, trackId: newId }));

    // Also download JSON
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trackToSave, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${newTrackName.toLowerCase().replace(/\s/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    setShowSaveTrackModal(false);
    setNewTrackName('');
    setNewTrackDesc('');

    alert("Circuito guardado en LocalStorage y descargado.");
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
              .neon-text {
                text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #0ff, 0 0 30px #0ff, 0 0 40px #0ff;
              }
              .neon-box {
                box-shadow: 0 0 10px rgba(6,182,212,0.5), inset 0 0 20px rgba(6,182,212,0.2);
              }
              .custom-scrollbar::-webkit-scrollbar { width: 6px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.5); border-radius: 4px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.8); }
            `}</style>
        </div>
      </div>

      {/* Game Layer */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${status === GameStatus.MENU ? 'opacity-40' : 'opacity-100'}`}>
        {/* Only render GameCanvas if we have an active track or we are in playing/pause/over states where activeTrack persists */}
        {activeTrack && (
          <GameCanvas
            status={status}
            settings={settings}
            trackDefinition={activeTrack}
            onFinish={handleFinish}
            isPaused={status === GameStatus.PAUSED}
            bestSpeed={bestSpeed}
          />
        )}
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

          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/50 p-6 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] w-full max-w-lg neon-box relative overflow-hidden">

            {/* Decorative Lines */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent"></div>

            {/* Header */}
            <div className="text-center mb-6 relative">
              <h1 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 drop-shadow-sm transform -skew-x-12 pb-2">
                RETRO RACER
              </h1>
              <div className="text-pink-500 font-bold tracking-[0.5em] text-xs uppercase animate-pulse">
                2.5D Arcade Simulation
              </div>
            </div>

            <div className="space-y-4">

              {/* Name Input */}
              <div className="relative group">
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-900/50 border-b-2 border-gray-600 focus:border-cyan-400 text-white text-center font-bold text-xl p-2 outline-none transition-all placeholder-gray-600 uppercase tracking-wider"
                  placeholder="PILOTO"
                  maxLength={10}
                />
              </div>

              {/* TRACK SELECTOR */}
              <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700">
                <span className="block text-xs font-bold text-pink-500 uppercase tracking-widest mb-2 flex items-center">
                  <Map size={12} className="mr-1" /> CIRCUITO
                </span>
                <div className="flex items-center gap-2">
                  <select
                    id="trackSelect"
                    name="trackSelect"
                    value={settings.trackId}
                    onChange={(e) => setSettings({ ...settings, trackId: e.target.value })}
                    className="flex-1 bg-black text-white p-2 rounded border border-cyan-500/30 font-mono text-sm uppercase focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <optgroup label="Oficiales">
                      {PRESET_TRACKS.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                    {customTracks.length > 0 && (
                      <optgroup label="Mis Circuitos">
                        {customTracks.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Procedural">
                      <option value="random">⚡ Generar Aleatorio ⚡</option>
                    </optgroup>
                  </select>

                  {isCustomSelected && (
                    <button
                      onClick={(e) => handleDeleteTrack(e, settings.trackId)}
                      title="Eliminar Circuito"
                      className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-500 p-2 rounded transition cursor-pointer flex-shrink-0 z-10"
                      type="button"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <p className="text-gray-400 text-xs italic border-l-2 border-gray-600 pl-2 mt-2 h-8 flex items-center">
                  {selectedTrackInfo?.description || '...'}
                </p>
              </div>

              {/* Difficulty */}
              <div>
                <span className="text-xs font-bold text-pink-500 uppercase tracking-widest block mb-1">Dificultad</span>
                <div className="flex gap-1 bg-gray-900/80 p-1 rounded-lg border border-gray-700">
                  {[
                    { id: Difficulty.ROOKIE, label: 'ROOKIE' },
                    { id: Difficulty.AMATEUR, label: 'PRO' },
                    { id: Difficulty.PRO, label: 'ELITE' }
                  ].map(level => (
                    <button
                      key={level.id}
                      onClick={() => setSettings({ ...settings, difficulty: level.id })}
                      className={`flex-1 py-1 text-xs font-black italic uppercase rounded-md transition-all duration-300 ${settings.difficulty === level.id
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
                  <span className="block text-xs font-bold text-pink-500 uppercase tracking-widest mb-1">Vueltas</span>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 3, 5, 10].map(lap => (
                      <button
                        key={lap}
                        onClick={() => setSettings({ ...settings, laps: lap })}
                        className={`aspect-square flex items-center justify-center font-bold text-xs rounded border transition-all ${settings.laps === lap
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
                  <span className="block text-xs font-bold text-pink-500 uppercase tracking-widest mb-1">Vehículo</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#d946ef', '#06b6d4'].map(c => (
                      <button
                        key={c}
                        onClick={() => setSettings({ ...settings, color: c })}
                        className={`w-6 h-6 rounded transform transition-transform duration-200 ${settings.color === c ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-60 hover:opacity-100'
                          }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* START BUTTON */}
              <button
                onClick={startGame}
                className="group relative w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black italic text-xl py-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transform transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] border-t border-cyan-400 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <Play size={24} className="mr-3 fill-current" />
                  START ENGINE
                </span>
                {/* Shine effect */}
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine transition-all" />
              </button>

            </div>
          </div>

          {/* Leaderboard (Collapsible) */}
          {scores.length > 0 && (
            <div className="mt-4 w-full max-w-lg bg-black/60 backdrop-blur-md border-t border-gray-800 rounded-xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-700 transition-all shadow-lg">
              <button
                onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
                className="w-full flex justify-between items-center p-3 hover:bg-white/5 transition-colors focus:outline-none"
              >
                <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
                  <Trophy size={14} className="mr-2 text-yellow-500" />
                  HALL OF FAME
                </div>
                {isLeaderboardExpanded ? <ChevronUp size={16} className="text-cyan-500" /> : <ChevronDown size={16} className="text-cyan-500" />}
              </button>

              {/* Expanded List */}
              {isLeaderboardExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                    {scores.map((s, i) => (
                      <div key={i} className={`flex justify-between items-center text-sm p-2 rounded border border-transparent hover:border-white/10 hover:bg-white/5 transition ${i === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}`}>
                        <div className="flex items-center">
                          <span className={`w-6 h-6 flex items-center justify-center rounded font-bold mr-3 ${i === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-500'}`}>
                            {i + 1}
                          </span>
                          <span className={`font-mono tracking-wide ${i === 0 ? 'text-yellow-100 font-bold' : 'text-gray-300'}`}>{s.name}</span>
                        </div>
                        <span className={`font-mono font-bold ${i === 0 ? 'text-yellow-400' : 'text-cyan-600'}`}>{s.avgSpeed.toFixed(0)} <span className="text-xs text-gray-600">KM/H</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          <div className={`bg-gray-900 border p-8 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden ${finalRank === 1 ? 'border-yellow-500/50' : 'border-red-500/50'}`}>

            {/* Background Glow */}
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${finalRank === 1 ? 'from-green-400 via-yellow-500 to-green-400' : 'from-red-900 via-red-600 to-red-900'}`}></div>

            <h2 className={`text-6xl font-black text-center mb-2 italic tracking-tighter drop-shadow-lg ${finalRank === 1 ? 'text-yellow-400' : 'text-red-500'}`}>
              {finalRank === 1 ? 'VICTORY' : winnerName === 'CRASHED' ? 'DESTROYED' : 'DEFEAT'}
            </h2>

            <p className="text-center text-gray-400 mb-6 font-bold tracking-widest uppercase text-sm">
              {finalRank === 1 ? 'CHAMPION OF THE TRACK' : winnerName === 'CRASHED' ? 'VEHICLE DESTROYED' : `WINNER: ${winnerName}`}
            </p>

            <div className="flex justify-center mb-8">
              <div className="bg-gray-800 rounded-full px-4 py-1 flex items-center gap-2 border border-gray-700">
                <Flag className={finalRank === 1 ? "text-yellow-500" : "text-red-500"} size={16} />
                <span className="text-gray-300 font-bold text-sm tracking-widest">{settings.laps} LAPS COMPLETED</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800 text-center">
                <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Time</p>
                <p className="text-3xl font-mono text-white tracking-widest">{finalTime.toFixed(2)}<span className="text-sm text-gray-600">s</span></p>
              </div>
              <div className={`bg-black/40 p-4 rounded-xl border text-center relative overflow-hidden ${finalRank === 1 ? 'border-green-900/50' : 'border-red-900/50'}`}>
                <div className={`absolute inset-0 ${finalRank === 1 ? 'bg-green-500/5' : 'bg-red-500/5'}`}></div>
                <p className={`text-xs font-bold uppercase mb-1 ${finalRank === 1 ? 'text-green-500' : 'text-red-500'}`}>Avg Speed</p>
                <p className={`text-3xl font-mono tracking-widest ${finalRank === 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {finalSpeed.toFixed(0)} <span className={`text-sm ${finalRank === 1 ? 'text-green-700' : 'text-red-700'}`}>km/h</span>
                </p>
              </div>
            </div>

            {/* SAVE TRACK BUTTON (If it was random) */}
            {activeTrack && activeTrack.id.startsWith('random_') && (
              <div className="mb-4">
                <button
                  onClick={() => setShowSaveTrackModal(true)}
                  className="w-full bg-cyan-900/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 font-bold py-2 rounded flex items-center justify-center transition"
                >
                  <Save size={18} className="mr-2" /> GUARDAR CIRCUITO ALEATORIO
                </button>
              </div>
            )}

            <button
              onClick={resetGame}
              className={`w-full text-black font-black italic text-xl py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition transform hover:scale-[1.02] flex items-center justify-center ${finalRank === 1 ? 'bg-yellow-400 hover:bg-yellow-300' : 'bg-gray-300 hover:bg-white'
                }`}
            >
              <RotateCcw size={24} className="mr-2" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* --- SAVE TRACK MODAL --- */}
      {showSaveTrackModal && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur flex items-center justify-center">
          <div className="bg-gray-900 border border-cyan-500 p-6 rounded-xl w-full max-w-sm shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center"><Save className="mr-2 text-cyan-400" /> GUARDAR CIRCUITO</h3>
              <button onClick={() => setShowSaveTrackModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-cyan-500 uppercase mb-1">Nombre</label>
                <input
                  type="text"
                  id="newTrackName"
                  name="newTrackName"
                  className="w-full bg-black/50 border border-gray-700 text-white p-2 rounded focus:border-cyan-500 outline-none"
                  placeholder="Ej: Mi Pista Loca"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-500 uppercase mb-1">Descripción</label>
                <textarea
                  id="newTrackDesc"
                  name="newTrackDesc"
                  className="w-full bg-black/50 border border-gray-700 text-white p-2 rounded focus:border-cyan-500 outline-none resize-none h-20 text-sm"
                  placeholder="Descripción breve..."
                  value={newTrackDesc}
                  onChange={(e) => setNewTrackDesc(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="bg-gray-800 p-2 rounded text-xs text-gray-400 flex items-start">
                <Download size={14} className="mr-2 mt-1 flex-shrink-0" />
                Al guardar, también se descargará el archivo .json para copia de seguridad.
              </div>
              <button
                onClick={handleSaveTrack}
                disabled={!newTrackName}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2 rounded shadow-lg transition"
              >
                GUARDAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;