
import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Heart, Trophy, ArrowLeft, ArrowRight, Volume2, VolumeX, List, Edit2, CheckCircle2, AlertCircle, Loader2, Coins, ShoppingBag, LogIn, Home, Zap } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameState, LeaderboardEntry } from './types';
import { SKINS, SKILL_DATA } from './constants';
import { generateGameCommentary } from './services/geminiService';
import { audio } from './services/audioService';
import { getLeaderboard, loginUser, syncUserData } from './services/leaderboardService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [aiCommentary, setAiCommentary] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [gameKey, setGameKey] = useState(0); 
  const [isMuted, setIsMuted] = useState(false);

  // Shop & Currency
  const [totalCoins, setTotalCoins] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [ownedSkins, setOwnedSkins] = useState<string[]>(['default']);
  const [currentSkinId, setCurrentSkinId] = useState('default');
  const [showShop, setShowShop] = useState(false);

  // User & Cloud State
  const [inputName, setInputName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [autoSubmitStatus, setAutoSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Input State
  const [isLeftPressed, setIsLeftPressed] = useState(false);
  const [isRightPressed, setIsRightPressed] = useState(false);
  const [skillTriggerCount, setSkillTriggerCount] = useState(0); // Incremented to signal skill use
  const [skillCooldownPct, setSkillCooldownPct] = useState(0); // 0 to 1

  // Load name from local storage to auto-fill input, but don't login yet
  useEffect(() => {
    const savedName = localStorage.getItem('ADS_PLAYER_NAME');
    if (savedName) {
      setInputName(savedName);
    }
  }, []);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      if (e.key === 'ArrowLeft') setIsLeftPressed(true);
      if (e.key === 'ArrowRight') setIsRightPressed(true);
      if (e.key === ' ') handleTriggerSkill(); // Spacebar for Skill
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

  const handleTriggerSkill = () => {
      setSkillTriggerCount(prev => prev + 1);
  };

  const handleLogin = async () => {
    if (!inputName.trim()) return;
    const cleanName = inputName.trim().toUpperCase();
    
    setIsLoggingIn(true);
    const userData = await loginUser(cleanName);
    setIsLoggingIn(false);

    if (userData) {
      setPlayerName(cleanName);
      setTotalCoins(userData.coins || 0);
      setOwnedSkins(userData.skins && userData.skins.length > 0 ? userData.skins : ['default']);
      setHighScore(userData.score || 0);
      setIsLoggedIn(true);
      
      localStorage.setItem('ADS_PLAYER_NAME', cleanName);
      
      // Auto-equip the first owned skin if current one is invalid
      if (!userData.skins?.includes(currentSkinId)) {
        setCurrentSkinId('default');
      }
    } else {
      alert("連線失敗，請檢查網路或稍後再試。");
    }
  };

  const handleStartGame = () => {
    if (!isLoggedIn) {
      handleLogin().then(() => {
        // Only start if login was successful
      });
      return;
    }

    audio.init();
    audio.startBgm();

    // Reset inputs to prevent stuck movement bug on restart
    setIsLeftPressed(false);
    setIsRightPressed(false);
    setSkillTriggerCount(0);
    setSkillCooldownPct(0);

    setGameKey(prev => prev + 1);
    setGameState(GameState.PLAYING);
    setScore(0);
    setSessionCoins(0);
    setHp(100);
    setAiCommentary(null);
    setIsLoadingAi(false);
    setShowLeaderboard(false);
    setShowShop(false);
    setAutoSubmitStatus('idle');
  };

  const handleReturnToHome = () => {
    setGameState(GameState.START);
    audio.stopBgm(); 
  };

  const handleChangeName = () => {
    setIsLoggedIn(false);
    setPlayerName('');
  };

  const handleGameOver = useCallback(async (finalScore: number, reason: string) => {
    setGameState(GameState.GAME_OVER);
    setIsLeftPressed(false);
    setIsRightPressed(false);
    setIsLoadingAi(true);

    const newTotalCoins = totalCoins + sessionCoins;
    setTotalCoins(newTotalCoins);
    const newHighScore = Math.max(highScore, finalScore);
    setHighScore(newHighScore);
    
    setAutoSubmitStatus('submitting');
    const success = await syncUserData(
      playerName,
      finalScore, 
      Math.floor(finalScore / 10),
      newTotalCoins,
      ownedSkins
    );

    if (success) {
      setAutoSubmitStatus('success');
      setIsLoadingLeaderboard(true);
      getLeaderboard().then(data => {
        setLeaderboard(data);
        setIsLoadingLeaderboard(false);
      });
    } else {
      setAutoSubmitStatus('error');
    }

    generateGameCommentary(finalScore, Math.floor(finalScore / 10), reason)
      .then(comment => {
        setAiCommentary(comment);
        setIsLoadingAi(false);
      });

  }, [playerName, totalCoins, sessionCoins, ownedSkins, highScore]);

  const handleScoreUpdate = useCallback((newScore: number, newHp: number, coins: number, cooldownPct: number) => {
    setScore(newScore);
    setHp(newHp);
    setSessionCoins(coins);
    setSkillCooldownPct(cooldownPct);
  }, []);

  const buySkin = async (skinId: string, price: number) => {
    if (totalCoins >= price && !ownedSkins.includes(skinId)) {
        const newTotal = totalCoins - price;
        const newOwned = [...ownedSkins, skinId];
        
        setTotalCoins(newTotal);
        setOwnedSkins(newOwned);
        setCurrentSkinId(skinId);
        audio.playCoin(); 

        await syncUserData(playerName, highScore, Math.floor(highScore/10), newTotal, newOwned);
    }
  };

  const equipSkin = (skinId: string) => {
      setCurrentSkinId(skinId);
  };

  const renderSkinIcon = (skin: typeof SKINS[0]) => {
     // (Existing skin render logic, compacted for brevity in XML but functionally identical)
     const baseClass = "w-12 h-12 rounded relative flex items-center justify-center overflow-hidden mb-1";
      switch(skin.id) {
          case 'ninja': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="absolute top-2 w-full h-3 bg-red-300"></div></div>;
          case 'alien': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="flex gap-2 mb-1"><div className="w-2 h-3 bg-black rounded-full rotate-[-20deg]"></div><div className="w-2 h-3 bg-black rounded-full rotate-[20deg]"></div></div></div>;
          case 'gold': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="w-6 h-2 bg-black flex justify-center items-center mb-1"><div className="w-1 h-full bg-yellow-300"></div></div><div className="absolute bottom-1 text-[8px] text-white">$</div></div>;
          case 'ice': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="absolute top-4 w-full h-2 bg-white"></div></div>;
          case 'zombie': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="flex gap-2 items-end mb-1"><div className="w-2.5 h-2.5 bg-yellow-400 rounded-full border border-black"></div><div className="w-1.5 h-1.5 bg-yellow-400 rounded-full border border-black"></div></div></div>;
          case 'devil': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="absolute top-0 left-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-red-500"></div><div className="absolute top-0 right-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-red-500"></div></div>;
          case 'panda': return <div className={`${baseClass} bg-white border-2 border-black`}><div className="absolute top-0 left-0 w-3 h-3 bg-black rounded-full -translate-x-1 -translate-y-1"></div><div className="absolute top-0 right-0 w-3 h-3 bg-black rounded-full translate-x-1 -translate-y-1"></div></div>;
          case 'robot': return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="absolute -top-2 w-px h-3 bg-slate-400"></div><div className="w-6 h-2 bg-cyan-400 mt-1"></div></div>;
          case 'ghost': return <div className={`${baseClass} opacity-70`} style={{ backgroundColor: skin.color }}><div className="flex gap-2 mt-1"><div className="w-1.5 h-1.5 bg-black rounded-full"></div><div className="w-1.5 h-1.5 bg-black rounded-full"></div></div></div>;
          default: return <div className={`${baseClass}`} style={{ backgroundColor: skin.color }}><div className="flex gap-2"><div className="w-2 h-2 bg-white rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-black rounded-full"></div></div><div className="w-2 h-2 bg-white rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-black rounded-full"></div></div></div></div>;
      }
  }

  const currentSkill = SKILL_DATA[currentSkinId];

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center font-sans relative overflow-hidden select-none touch-none">
      
      {/* Visual Overlay Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md px-4 flex flex-col h-[100dvh] py-2 md:py-4">
        
        {/* Header Stats */}
        <div className="flex justify-between items-center mb-2 bg-slate-900/80 p-3 rounded-2xl backdrop-blur-md border border-slate-700 shadow-lg shrink-0">
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
                <div className="flex items-center gap-1">
                    <Trophy size={14} className="text-yellow-400" />
                    <span className="text-xl font-black text-white">{gameState === GameState.PLAYING ? score : highScore}</span>
                </div>
                {gameState === GameState.PLAYING && (
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Coins size={12} />
                        <span>+{sessionCoins}</span>
                    </div>
                )}
             </div>
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
            currentSkinId={currentSkinId}
            skillTriggerCount={skillTriggerCount}
          />

          {/* GAMEPLAY UI OVERLAY */}
          {gameState === GameState.PLAYING && (
            <>
                {/* Touch Controls Layer */}
                <div className="absolute inset-0 flex z-10 pointer-events-none">
                    <div className="flex-1 pointer-events-auto active:bg-white/5 transition-colors touch-none"
                        onPointerDown={() => setIsLeftPressed(true)}
                        onPointerUp={() => setIsLeftPressed(false)}
                        onPointerLeave={() => setIsLeftPressed(false)}
                        onPointerCancel={() => setIsLeftPressed(false)}
                    />
                    <div className="flex-1 pointer-events-auto active:bg-white/5 transition-colors touch-none"
                        onPointerDown={() => setIsRightPressed(true)}
                        onPointerUp={() => setIsRightPressed(false)}
                        onPointerLeave={() => setIsRightPressed(false)}
                        onPointerCancel={() => setIsRightPressed(false)}
                    />
                </div>
                
                {/* SKILL BUTTON (Bottom Right) */}
                <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
                    <button
                        onClick={handleTriggerSkill}
                        disabled={skillCooldownPct > 0}
                        className={`w-16 h-16 rounded-full flex items-center justify-center relative shadow-xl transition-all
                            ${skillCooldownPct > 0 ? 'bg-slate-700' : 'bg-indigo-500 active:scale-95 hover:bg-indigo-400 hover:scale-105'}
                        `}
                    >
                        {/* Cooldown Overlay */}
                        {skillCooldownPct > 0 && (
                             <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                                <circle
                                    cx="32" cy="32" r="30"
                                    fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="60"
                                    strokeDasharray="188"
                                    strokeDashoffset={188 * skillCooldownPct} // Inverted fill
                                />
                             </svg>
                        )}
                        
                        {/* Icon */}
                        <Zap size={28} className={skillCooldownPct > 0 ? 'text-slate-500' : 'text-white animate-pulse'} fill={skillCooldownPct > 0 ? 'none' : 'currentColor'} />
                        
                        {/* Label */}
                        <div className="absolute -top-8 right-0 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap backdrop-blur-sm">
                            {currentSkill?.name || 'Skill'}
                        </div>
                    </button>
                </div>
            </>
          )}

          {/* Overlay: Start Screen */}
          {gameState === GameState.START && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-950/80 backdrop-blur-sm rounded-lg p-4">
              {!showShop ? (
              <>
                <div className="animate-bounce mb-6">
                    <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-xl shadow-[0_0_40px_rgba(236,72,153,0.5)] flex items-center justify-center transform rotate-3">
                    <span className="text-4xl">👻</span>
                    </div>
                </div>
                <h1 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic text-center">
                    DOWN<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">STAIRS</span>
                </h1>
                
                {isLoggedIn && (
                  <div className="mb-4 flex items-center gap-2 bg-slate-900/50 px-4 py-1 rounded-full text-amber-400 border border-slate-700/50 animate-in fade-in zoom-in">
                      <Coins size={16} />
                      <span className="font-mono font-bold">{totalCoins}</span>
                  </div>
                )}

                {!isLoggedIn ? (
                    <div className="mb-6 w-full max-w-xs flex flex-col gap-2">
                        <label className="text-slate-400 text-xs font-bold uppercase tracking-widest block text-center">
                            請輸入玩家名字 (雲端存檔)
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                maxLength={10}
                                placeholder="NAME" 
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 uppercase font-bold text-center text-xl placeholder:text-slate-600 shadow-inner"
                            />
                            <button 
                                onClick={handleLogin}
                                disabled={!inputName.trim() || isLoggingIn}
                                className="bg-pink-500 hover:bg-pink-400 disabled:bg-slate-700 text-white rounded-xl px-4 font-bold flex items-center justify-center transition-all"
                            >
                                {isLoggingIn ? <Loader2 className="animate-spin" /> : <LogIn />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 text-slate-400 text-sm flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700 shadow-md">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>已登入: <span className="text-white font-bold font-mono text-base">{playerName}</span></span>
                        <button onClick={handleChangeName} className="p-1.5 hover:bg-slate-600 rounded-full text-pink-400 hover:text-white transition-colors" title="更換帳號">
                            <Edit2 size={14} />
                        </button>
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={handleStartGame}
                        disabled={!isLoggedIn && !inputName.trim()}
                        className="group relative px-10 py-4 bg-white disabled:bg-slate-600 disabled:text-slate-400 text-slate-950 rounded-full font-black text-xl transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-95 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center gap-2"
                    >
                        {!isLoggedIn ? '登入並開始' : '開始遊戲'}
                    </button>
                    {isLoggedIn && (
                        <button
                            onClick={() => setShowShop(true)}
                            className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all hover:scale-110 shadow-lg flex items-center justify-center"
                            title="造型商店"
                        >
                            <ShoppingBag size={24} />
                        </button>
                    )}
                </div>
              </>
              ) : (
                  // SHOP UI
                  <div className="w-full max-w-xs h-full py-2 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                              <ShoppingBag size={24} className="text-indigo-400" /> 造型商店
                          </h3>
                          <div className="flex items-center gap-1 text-amber-400 bg-slate-900 px-3 py-1 rounded-full font-mono">
                              <Coins size={14} /> {totalCoins}
                          </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 p-1">
                          {SKINS.map(skin => {
                              const isOwned = ownedSkins.includes(skin.id);
                              const isEquipped = currentSkinId === skin.id;
                              const skillInfo = SKILL_DATA[skin.id];
                              
                              return (
                                  <button
                                      key={skin.id}
                                      onClick={() => isOwned ? equipSkin(skin.id) : buySkin(skin.id, skin.price)}
                                      className={`relative p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all
                                        ${isEquipped 
                                            ? 'border-green-500 bg-green-500/10' 
                                            : isOwned 
                                                ? 'border-slate-700 bg-slate-800 hover:border-slate-500'
                                                : 'border-slate-800 bg-slate-900 opacity-80 hover:opacity-100'
                                        }
                                      `}
                                  >
                                      {/* Skin Preview Icon */}
                                      {renderSkinIcon(skin)}

                                      <div className="text-center w-full">
                                          <div className="font-bold text-sm text-white">{skin.name}</div>
                                          
                                          {/* Skill Info */}
                                          <div className="bg-slate-950/50 rounded px-1 py-0.5 my-1 text-[9px] text-cyan-400 font-mono border border-slate-700/50">
                                            {skillInfo?.name || '無技能'}
                                          </div>

                                          <div className="text-[10px] text-slate-400 mb-1 leading-tight">{skin.description}</div>
                                          
                                          {isEquipped ? (
                                              <div className="text-xs font-bold text-green-400 flex items-center gap-1 justify-center">
                                                  <CheckCircle2 size={12} /> 使用中
                                              </div>
                                          ) : isOwned ? (
                                              <div className="text-xs text-slate-300">已擁有</div>
                                          ) : (
                                              <div className={`text-xs font-bold flex items-center gap-1 justify-center ${totalCoins >= skin.price ? 'text-amber-400' : 'text-slate-500'}`}>
                                                  <Coins size={12} /> {skin.price}
                                              </div>
                                          )}
                                      </div>
                                  </button>
                              )
                          })}
                      </div>

                      <button
                        onClick={() => setShowShop(false)}
                        className="mt-4 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowLeft size={20} /> 返回
                      </button>
                  </div>
              )}
            </div>
          )}

          {/* Overlay: Game Over */}
          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center rounded-lg z-20 px-4 text-center animate-in fade-in zoom-in duration-300 overflow-y-auto">
              {!showLeaderboard ? (
                <>
                  <h2 className="text-3xl font-black text-white mb-1 drop-shadow-lg">遊戲結束</h2>
                  <div className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 text-5xl font-mono font-bold mb-2 drop-shadow-sm">{score}</div>
                  <div className="flex items-center gap-2 text-amber-400 mb-4 bg-slate-800/50 px-3 py-1 rounded-full text-sm">
                      <Coins size={14} /> 本局獲得: {sessionCoins}
                  </div>
                  
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4 w-full max-w-xs shadow-xl backdrop-blur-xl relative overflow-hidden">
                    <div className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-2 flex items-center justify-center gap-2">
                       <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span> AI 毒舌講評
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

                  <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 mb-6 w-full max-w-xs">
                       <div className="flex justify-between items-center text-sm mb-3">
                          <span className="text-slate-400">玩家: <strong className="text-white font-mono text-lg ml-1">{playerName}</strong></span>
                       </div>
                       
                       <div className={`flex items-center justify-center gap-2 text-sm font-bold h-10 rounded-lg transition-colors duration-300
                         ${autoSubmitStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                           autoSubmitStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                           'bg-slate-900/50 text-slate-400'}`}>
                          
                          {autoSubmitStatus === 'submitting' && (
                             <><Loader2 size={16} className="animate-spin" /> 雲端同步中...</>
                          )}
                          {autoSubmitStatus === 'success' && (
                             <><CheckCircle2 size={16} /> 存檔已更新！</>
                          )}
                          {autoSubmitStatus === 'error' && (
                             <><AlertCircle size={16} /> 同步失敗</>
                          )}
                       </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={handleStartGame}
                      className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-white rounded-xl font-bold text-lg transition-all shadow-[0_4px_0_rgb(190,24,93)] active:translate-y-0 active:shadow-none flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={20} /> 再玩一次
                    </button>
                    <button
                      onClick={() => { setShowLeaderboard(true); setIsLoadingLeaderboard(true); getLeaderboard().then(data => { setLeaderboard(data); setIsLoadingLeaderboard(false); }); }}
                      className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                    >
                      <List size={20} /> 排行榜
                    </button>
                    <button
                      onClick={handleReturnToHome}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Home size={20} /> 返回首頁
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full max-w-xs h-full py-4 flex flex-col">
                  <h3 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                    <Trophy size={24} /> 排行榜 Top 10
                  </h3>
                  <div className="flex-1 overflow-y-auto bg-slate-800/50 rounded-xl border border-slate-700 p-2 mb-4 scrollbar-thin scrollbar-thumb-slate-600 shadow-inner">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400 border-b border-slate-700 bg-slate-800/80 sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">名字</th>
                          <th className="p-2 text-right">分數</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.length === 0 ? (
                          <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">
                             {isLoadingLeaderboard ? <Loader2 size={24} className="animate-spin mx-auto mb-2" /> : "尚無紀錄..."}
                          </td></tr>
                        ) : (
                          leaderboard.map((entry, i) => (
                            <tr key={i} className={`border-b border-slate-700/50 last:border-0 ${entry.name === playerName ? 'bg-yellow-500/10 text-yellow-200' : 'text-slate-300'}`}>
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
        </div>
        
        {/* Hint */}
        {gameState === GameState.PLAYING && (
            <div className="text-center text-slate-500 text-xs mt-2 opacity-50">
            點擊螢幕左右側移動 • 空白鍵發動技能
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
