
import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Heart, Trophy, ArrowLeft, ArrowRight, Volume2, VolumeX, List, Send, Edit2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameState, LeaderboardEntry } from './types';
import { generateGameCommentary } from './services/geminiService';
import { audio } from './services/audioService';
import { submitScore, getLeaderboard } from './services/leaderboardService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [aiCommentary, setAiCommentary] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [gameKey, setGameKey] = useState(0); 
  const [isMuted, setIsMuted] = useState(false);

  // Leaderboard State
  const [playerName, setPlayerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [autoSubmitStatus, setAutoSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Input State
  const [isLeftPressed, setIsLeftPressed] = useState(false);
  const [isRightPressed, setIsRightPressed] = useState(false);

  // Load saved name on mount
  useEffect(() => {
    const savedName = localStorage.getItem('ADS_PLAYER_NAME');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if (e.key === 'ArrowLeft') setIsLeftPressed(true);
      if (e.key === 'ArrowRight') setIsRightPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIsLeftPressed(false);
      if (e.key === 'ArrowRight') setIsRightPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const toggleAudio = () => {
    setIsMuted(!isMuted);
    audio.toggleMute(!isMuted);
  };

  const handleStartGame = () => {
    audio.init();
    audio.startBgm();

    setGameKey(prev => prev + 1);
    setGameState(GameState.PLAYING);
    setScore(0);
    setHp(100);
    setAiCommentary(null);
    setIsLoadingAi(false);
    setShowLeaderboard(false);
    setAutoSubmitStatus('idle');
  };

  const handleGameOver = useCallback(async (finalScore: number, reason: string) => {
    setGameState(GameState.GAME_OVER);
    setIsLoadingAi(true);
    
    // Fetch leaderboard immediately
    getLeaderboard().then(data => setLeaderboard(data));

    // Generate Commentary
    generateGameCommentary(finalScore, Math.floor(finalScore / 10), reason)
      .then(comment => {
        setAiCommentary(comment);
        setIsLoadingAi(false);
      });

    // AUTO SUBMIT LOGIC
    // We read from localStorage directly to ensure we have the latest persisted name
    const savedName = localStorage.getItem('ADS_PLAYER_NAME');
    
    if (savedName && finalScore > 0) {
      setAutoSubmitStatus('submitting');
      setIsSubmitting(true);
      
      submitScore(savedName, finalScore, Math.floor(finalScore / 10))
        .then(success => {
          if (success) {
            setAutoSubmitStatus('success');
            // Refresh leaderboard to show new score
            getLeaderboard().then(data => setLeaderboard(data));
          } else {
            setAutoSubmitStatus('error');
          }
          setIsSubmitting(false);
        });
    }
  }, []);

  const handleManualSubmit = async () => {
    if (!playerName.trim() || isSubmitting) return;
    
    const cleanName = playerName.trim().toUpperCase();
    
    // Save name for future
    localStorage.setItem('ADS_PLAYER_NAME', cleanName);
    setPlayerName(cleanName);
    
    setIsSubmitting(true);
    setAutoSubmitStatus('submitting');
    
    const success = await submitScore(cleanName, score, Math.floor(score/10));
    if (success) {
      setAutoSubmitStatus('success');
      const updated = await getLeaderboard();
      setLeaderboard(updated);
      setShowLeaderboard(true);
    } else {
      setAutoSubmitStatus('error');
    }
    setIsSubmitting(false);
  };

  const handleChangeName = () => {
    // Clear saved name to allow re-entry
    localStorage.removeItem('ADS_PLAYER_NAME');
    // We keep the input value in playerName state for convenience, but reset status
    setAutoSubmitStatus('idle');
    // Force re-render of input field by ensuring we don't have a saved name in logic
  };

  // Helper to check if we have a valid saved name
  const hasSavedName = !!localStorage.getItem('ADS_PLAYER_NAME');

  const handleScoreUpdate = useCallback((newScore: number, newHp: number) => {
    setScore(newScore);
    setHp(newHp);
  }, []);

  return (
    // Use 100dvh for better mobile browser support
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center font-sans relative overflow-hidden select-none touch-none">
      
      {/* Visual Overlay Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      {/* Background Ambient Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse animation-delay-2000"></div>

      <div className="z-10 w-full max-w-md px-4 flex flex-col h-[100dvh] py-2 md:py-4">
        
        {/* Header Stats */}
        <div className="flex justify-between items-center mb-2 bg-slate-900/80 p-3 rounded-2xl backdrop-blur-md border border-slate-700 shadow-lg shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-lg">
               <Trophy size={20} className="text-yellow-400" />
            </div>
            <span className="text-3xl font-black font-mono tracking-tighter text-white">{score}</span>
          </div>
          
          <button 
            onClick={toggleAudio}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            <Heart size={20} className={`text-pink-500 ${hp < 30 ? "animate-ping" : ""}`} fill="currentColor" />
            <div className="w-24 h-3 bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-700">
              <div 
                className={`h-full transition-all duration-300 ${hp > 50 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-red-500 to-pink-500'}`}
                style={{ width: `${Math.max(0, hp)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative flex-grow flex flex-col items-center justify-center min-h-0 w-full">
          <GameCanvas 
            key={gameKey}
            gameState={gameState}
            setGameState={setGameState}
            onScoreUpdate={handleScoreUpdate}
            onGameOver={handleGameOver}
            isLeftPressed={isLeftPressed}
            isRightPressed={isRightPressed}
          />

          {/* Overlay: Start Screen */}
          {gameState === GameState.START && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-950/80 backdrop-blur-sm rounded-lg p-4">
              <div className="animate-bounce mb-6">
                <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-xl shadow-[0_0_40px_rgba(236,72,153,0.5)] flex items-center justify-center transform rotate-3">
                  <span className="text-4xl">👻</span>
                </div>
              </div>
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic text-center">
                DOWN<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">STAIRS</span>
              </h1>
              {hasSavedName && (
                <div className="mb-6 text-slate-400 text-sm flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700 shadow-md">
                  <span>嗨, <span className="text-white font-bold font-mono text-base">{localStorage.getItem('ADS_PLAYER_NAME')}</span></span>
                  <button onClick={handleChangeName} className="p-1.5 hover:bg-slate-600 rounded-full text-pink-400 hover:text-white transition-colors" title="變更名稱">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              <button
                onClick={handleStartGame}
                className="group relative px-10 py-4 bg-white text-slate-950 rounded-full font-black text-xl transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95"
              >
                開始遊戲
              </button>
            </div>
          )}

          {/* Overlay: Game Over & Leaderboard */}
          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center rounded-lg z-20 px-4 text-center animate-in fade-in zoom-in duration-300 overflow-y-auto">
              
              {!showLeaderboard ? (
                <>
                  <h2 className="text-3xl font-black text-white mb-1 drop-shadow-lg">遊戲結束</h2>
                  <div className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 text-5xl font-mono font-bold mb-4 drop-shadow-sm">{score}</div>
                  
                  {/* AI Commentary */}
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4 w-full max-w-xs shadow-xl backdrop-blur-xl relative overflow-hidden">
                    <div className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-2 flex items-center justify-center gap-2">
                       <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span> AI 評論
                    </div>
                    {isLoadingAi ? (
                      <div className="h-8 flex justify-center items-center gap-1">
                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animation-delay-150"></div>
                         <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce animation-delay-300"></div>
                      </div>
                    ) : (
                      <p className="text-slate-200 text-sm font-medium leading-snug">
                        "{aiCommentary || "..."}"
                      </p>
                    )}
                  </div>

                  {/* Auto Upload Status or Input */}
                  {hasSavedName ? (
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 mb-6 w-full max-w-xs">
                       <div className="flex justify-between items-center text-sm mb-3">
                          <span className="text-slate-400">玩家: <strong className="text-white font-mono text-lg ml-1">{localStorage.getItem('ADS_PLAYER_NAME')}</strong></span>
                          <button onClick={handleChangeName} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 hover:underline">
                            變更 <Edit2 size={10} />
                          </button>
                       </div>
                       
                       <div className={`flex items-center justify-center gap-2 text-sm font-bold h-10 rounded-lg transition-colors duration-300
                         ${autoSubmitStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                           autoSubmitStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                           'bg-slate-900/50 text-slate-400'}`}>
                          
                          {autoSubmitStatus === 'submitting' && (
                             <><Loader2 size={16} className="animate-spin" /> 上傳分數中...</>
                          )}
                          {autoSubmitStatus === 'success' && (
                             <><CheckCircle2 size={16} /> 分數已自動儲存!</>
                          )}
                          {autoSubmitStatus === 'error' && (
                             <><AlertCircle size={16} /> 上傳失敗</>
                          )}
                          {autoSubmitStatus === 'idle' && (
                             <span className="text-slate-500">就緒</span>
                          )}
                       </div>
                    </div>
                  ) : (
                    // New Player Input
                    <div className="flex flex-col gap-2 mb-6 w-full max-w-xs">
                      <div className="text-xs text-slate-400 uppercase font-bold tracking-widest text-left pl-1">新高分?</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="輸入名稱" 
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 uppercase font-bold text-center placeholder:text-slate-600 shadow-inner"
                        />
                        <button 
                          onClick={handleManualSubmit}
                          disabled={isSubmitting || !playerName.trim()}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg font-bold transition-all active:scale-95 shadow-lg shadow-green-500/20"
                        >
                          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={handleStartGame}
                      className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-white rounded-xl font-bold text-lg transition-all shadow-[0_4px_0_rgb(190,24,93)] active:translate-y-0 active:shadow-none flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={20} /> 再玩一次
                    </button>
                    <button
                      onClick={() => setShowLeaderboard(true)}
                      className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                      <List size={20} /> 排行榜
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full max-w-xs h-full py-4 flex flex-col">
                  <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                    <Trophy size={24} /> 前 10 名
                  </h3>
                  <div className="flex-1 overflow-y-auto bg-slate-800/50 rounded-xl border border-slate-700 p-2 mb-4 scrollbar-thin scrollbar-thumb-slate-600 shadow-inner">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400 border-b border-slate-700 bg-slate-800/80 sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">名稱</th>
                          <th className="p-2 text-right">分數</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.length === 0 ? (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">
                             {isSubmitting ? <Loader2 size={24} className="animate-spin mx-auto mb-2" /> : "尚無紀錄..."}
                          </td></tr>
                        ) : (
                          leaderboard.map((entry, i) => (
                            <tr key={i} className={`border-b border-slate-700/50 last:border-0 ${entry.name === localStorage.getItem('ADS_PLAYER_NAME') ? 'bg-yellow-500/10 text-yellow-200' : 'text-slate-300'}`}>
                              <td className="p-2 font-mono opacity-50">{i + 1}</td>
                              <td className="p-2 font-bold">{entry.name}</td>
                              <td className="p-2 text-right font-mono text-white">{entry.score}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={20} /> 返回
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Touch Controls (Mobile) */}
          {gameState === GameState.PLAYING && (
            <div className="absolute inset-0 flex z-10">
              <div 
                className="flex-1 active:bg-white/5 transition-colors touch-none"
                onPointerDown={() => setIsLeftPressed(true)}
                onPointerUp={() => setIsLeftPressed(false)}
                onPointerLeave={() => setIsLeftPressed(false)}
                onPointerCancel={() => setIsLeftPressed(false)}
              />
              <div 
                className="flex-1 active:bg-white/5 transition-colors touch-none"
                onPointerDown={() => setIsRightPressed(true)}
                onPointerUp={() => setIsRightPressed(false)}
                onPointerLeave={() => setIsRightPressed(false)}
                onPointerCancel={() => setIsRightPressed(false)}
              />
            </div>
          )}
        </div>
        
        {/* Mobile Hint */}
        <div className="text-center text-slate-500 text-xs mt-2 opacity-50">
          點擊左/右側移動 • 支援鍵盤方向鍵
        </div>

      </div>
    </div>
  );
};

export default App;
