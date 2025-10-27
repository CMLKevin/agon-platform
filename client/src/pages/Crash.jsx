import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import { walletAPI } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import api from '../services/api';
import { useSound } from '../hooks/useSound';
import { SOUNDS } from '../utils/sounds';

const Crash = () => {
  const [wallet, setWallet] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [cashOutAt, setCashOutAt] = useState('2.00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [gameResult, setGameResult] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [gamePhase, setGamePhase] = useState('ready'); // ready, rising, crashed
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const [graphPoints, setGraphPoints] = useState([]);
  const { playSound, isMuted, toggleMute } = useSound();

  const loadWallet = useCallback(async () => {
    try {
      const res = await walletAPI.getWallet();
      setWallet(res.data.wallet);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  }, []);

  const loadRecentGames = useCallback(async () => {
    try {
      const res = await api.get('/games/history', { params: { limit: 10 } });
      const filtered = (res.data.games || []).filter(g => g.game_type === 'crash');
      setRecentGames(filtered);
    } catch (error) {
      console.error('Failed to load game history:', error);
    }
  }, []);

  useEffect(() => {
    loadWallet();
    loadRecentGames();
  }, [loadWallet, loadRecentGames]);

  const animateMultiplier = (crashPoint, onComplete) => {
    startTimeRef.current = Date.now();
    setGamePhase('rising');
    setGraphPoints([]);
    
    // Play start sound
    playSound(SOUNDS.CRASH_START);
    
    // Play subtle tick sounds during rise
    let tickCount = 0;
    tickIntervalRef.current = setInterval(() => {
      tickCount++;
      if (tickCount % 8 === 0) { // Every 8th tick
        playSound(SOUNDS.CRASH_TICK, 0.5);
      }
    }, 100);
    
    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      
      // Exponential growth: multiplier = e^(k*t) where k controls speed
      const growthRate = 0.15;
      const mult = Math.pow(Math.E, growthRate * elapsed);
      
      // Add point to graph
      setGraphPoints(prev => [...prev, { time: elapsed, mult: Math.min(mult, crashPoint) }]);
      
      if (mult >= crashPoint) {
        // Crash!
        setCurrentMultiplier(crashPoint);
        setGamePhase('crashed');
        setIsPlaying(false);
        
        // Clear tick interval
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        // Play crash sound
        playSound(SOUNDS.CRASH_EXPLODE);
        
        // Call completion callback
        if (onComplete) onComplete();
        return;
      }
      
      setCurrentMultiplier(Math.min(mult, crashPoint));
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const handlePlay = async (e) => {
    e.preventDefault();

    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    const cashOutMultiplier = parseFloat(cashOutAt);
    if (!cashOutMultiplier || cashOutMultiplier < 1.01 || cashOutMultiplier > 5.0) {
      alert('Auto cashout must be between 1.01x and 5.00x');
      return;
    }

    const betAmountRounded = Math.round(parseFloat(betAmount) * 100) / 100;
    const balanceRounded = Math.round((wallet?.stoneworks_dollar || 0) * 100) / 100;
    
    if (betAmountRounded > balanceRounded) {
      alert('Insufficient Game Chips balance');
      return;
    }

    setIsPlaying(true);
    setGameResult(null);
    setCurrentMultiplier(1.0);
    setGamePhase('ready');

    try {
      const res = await api.post('/games/crash', {
        betAmount: parseFloat(betAmount),
        cashOutAt: cashOutMultiplier
      });

      // Start animation with callback
      animateMultiplier(res.data.crashPoint, () => {
        // Show result after crash animation completes
        timeoutRef.current = setTimeout(() => {
          // Play result sound
          if (res.data.won) {
            playSound(SOUNDS.CRASH_CASHOUT);
          } else {
            playSound(SOUNDS.GAME_LOSS);
          }
          setGameResult(res.data);
          loadWallet();
          loadRecentGames();
        }, 500);
      });

    } catch (error) {
      setIsPlaying(false);
      setGamePhase('ready');
      console.error('Crash error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to play game';
      alert(errorMsg);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, []);

  const getMultiplierColor = () => {
    if (gamePhase === 'crashed') return 'text-red-500';
    if (currentMultiplier >= parseFloat(cashOutAt)) return 'text-green-500';
    return 'text-cyan-400';
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-phantom bg-clip-text text-transparent mb-3">Crash</h1>
          <p className="text-phantom-text-secondary text-lg">Watch the multiplier rise and cash out before it crashes!</p>
        </div>

        {/* Game Chips Balance */}
        <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-card">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Available Game Chips</p>
              <h2 className="text-3xl font-bold tracking-tight">
                {getCurrencySymbol('stoneworks_dollar')} {formatCurrency(wallet?.stoneworks_dollar || 0)}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <button
                onClick={toggleMute}
                className="p-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
                title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {isMuted ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Display */}
          <div className="lg:col-span-2 bg-phantom-bg-secondary/60 backdrop-blur-xl rounded-3xl shadow-card border border-phantom-border p-8">
            {/* Multiplier Display */}
            <div className={`relative w-full aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-4 flex items-center justify-center overflow-hidden ${
              gamePhase === 'crashed' ? 'border-red-500' : gamePhase === 'rising' ? 'border-cyan-500' : 'border-phantom-border'
            }`}>
              {/* Background grid pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full" style={{
                  backgroundImage: 'linear-gradient(rgba(100, 200, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 200, 255, 0.3) 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}></div>
              </div>

              {/* Rising line visualization */}
              {(gamePhase === 'rising' || gamePhase === 'crashed') && graphPoints.length > 0 && (
                <div className="absolute inset-0 p-6">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Draw the curve */}
                    <polyline
                      points={graphPoints.map((point, idx) => {
                        const x = (idx / Math.max(graphPoints.length - 1, 1)) * 100;
                        const y = 100 - ((point.mult - 1) / Math.max(currentMultiplier - 1, 0.1)) * 80;
                        return `${x},${Math.max(20, Math.min(100, y))}`;
                      }).join(' ')}
                      stroke={gamePhase === 'crashed' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 211, 238, 0.8)'}
                      strokeWidth="0.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Fill area under curve */}
                    <polygon
                      points={`0,100 ${graphPoints.map((point, idx) => {
                        const x = (idx / Math.max(graphPoints.length - 1, 1)) * 100;
                        const y = 100 - ((point.mult - 1) / Math.max(currentMultiplier - 1, 0.1)) * 80;
                        return `${x},${Math.max(20, Math.min(100, y))}`;
                      }).join(' ')} 100,100`}
                      fill={gamePhase === 'crashed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 211, 238, 0.1)'}
                    />
                  </svg>
                </div>
              )}

              {/* Main multiplier text */}
              <div className="relative z-10 text-center">
                <div className={`text-8xl font-black tracking-tight transition-all duration-100 ${getMultiplierColor()} ${
                  gamePhase === 'rising' ? 'animate-pulse' : ''
                }`} style={{
                  textShadow: gamePhase === 'rising' 
                    ? `0 0 20px ${currentMultiplier >= parseFloat(cashOutAt) ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 211, 238, 0.5)'}`
                    : gamePhase === 'crashed' 
                    ? '0 0 20px rgba(239, 68, 68, 0.5)'
                    : 'none'
                }}>
                  {currentMultiplier.toFixed(2)}x
                </div>
                
                {gamePhase === 'crashed' && (
                  <div className="mt-4 space-y-2 animate-bounce">
                    <div className="text-5xl">💥</div>
                    <div className="text-3xl font-bold text-red-400">CRASHED!</div>
                  </div>
                )}
                
                {gamePhase === 'rising' && currentMultiplier >= parseFloat(cashOutAt) && (
                  <div className="mt-4 text-2xl font-bold text-green-400 animate-pulse">
                    🎯 CASHING OUT...
                  </div>
                )}
                
                {gamePhase === 'ready' && !gameResult && (
                  <div className="mt-4 text-xl text-phantom-text-secondary">
                    Place your bet to start
                  </div>
                )}
              </div>

              {/* Cashout indicator */}
              {gamePhase === 'rising' && (
                <div className={`absolute top-4 right-4 px-5 py-3 rounded-xl border-2 transition-all ${
                  currentMultiplier >= parseFloat(cashOutAt)
                    ? 'bg-green-500/20 border-green-500 animate-pulse shadow-lg shadow-green-500/50'
                    : 'bg-black/60 backdrop-blur-sm border-green-500/50'
                }`}>
                  <p className="text-xs text-green-400 mb-1 font-semibold">
                    {currentMultiplier >= parseFloat(cashOutAt) ? '✓ CASHING OUT' : 'Auto Cash Out'}
                  </p>
                  <p className="text-xl font-bold text-green-500">{parseFloat(cashOutAt).toFixed(2)}x</p>
                </div>
              )}
            </div>

            {/* Result Display */}
            {gameResult && (
              <div className={`mt-6 p-6 rounded-2xl border-2 animate-fade-in ${
                gameResult.won 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="text-center space-y-3">
                  <div className={`text-6xl ${gameResult.won ? '🎉' : '😢'}`}>
                    {gameResult.won ? '🎉' : '😢'}
                  </div>
                  <p className={`text-3xl font-bold ${
                    gameResult.won ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gameResult.won ? 'You Won!' : 'You Lost'}
                  </p>
                  <p className="text-lg text-phantom-text-secondary">
                    Crashed at <span className="font-bold text-phantom-text-primary">{gameResult.crashPoint}x</span>
                  </p>
                  <div className={`text-3xl font-black ${
                    gameResult.amountChange >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {gameResult.amountChange >= 0 ? '+' : ''}{getCurrencySymbol('stoneworks_dollar')} {formatCurrency(Math.abs(gameResult.amountChange))}
                  </div>
                  <p className="text-sm text-phantom-text-secondary">
                    {gameResult.won 
                      ? `Successfully cashed out at ${gameResult.cashOutAt}x` 
                      : `Target was ${gameResult.cashOutAt}x but crashed early`}
                  </p>
                  <div className="pt-3 border-t border-phantom-border">
                    <p className="text-sm text-phantom-text-tertiary">
                      New Balance: <span className="font-semibold text-phantom-text-primary">{getCurrencySymbol('stoneworks_dollar')} {formatCurrency(gameResult.newBalance)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setGameResult(null);
                      setGamePhase('ready');
                      setCurrentMultiplier(1.0);
                      setGraphPoints([]);
                    }}
                    className="mt-4 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-glow transition-all duration-200"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Betting Form */}
            <div className="bg-phantom-bg-secondary/60 backdrop-blur-xl rounded-3xl shadow-card border border-phantom-border p-6">
              <h3 className="text-xl font-bold text-phantom-text-primary mb-4">Game Settings</h3>
              
              <form onSubmit={handlePlay} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                    Bet Amount
                  </label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlaying}
                    placeholder="Enter amount..."
                    className="w-full px-4 py-3 bg-phantom-bg-tertiary border-2 border-phantom-border rounded-2xl text-phantom-text-primary placeholder-phantom-text-tertiary focus:border-phantom-accent-primary focus:ring-0 transition-colors disabled:opacity-50"
                    step="0.01"
                    min="0.01"
                  />
                  <div className="mt-2 flex gap-2">
                    {[1, 5, 10, 50].map(amount => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setBetAmount(amount.toString())}
                        disabled={isPlaying}
                        className="flex-1 px-2 py-1 text-sm bg-phantom-bg-tertiary border border-phantom-border rounded-lg text-phantom-text-secondary hover:border-phantom-accent-primary hover:text-phantom-text-primary transition-all disabled:opacity-50"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                    Auto Cash Out At
                  </label>
                  <input
                    type="number"
                    value={cashOutAt}
                    onChange={(e) => setCashOutAt(e.target.value)}
                    disabled={isPlaying}
                    placeholder="2.00"
                    className="w-full px-4 py-3 bg-phantom-bg-tertiary border-2 border-phantom-border rounded-2xl text-phantom-text-primary placeholder-phantom-text-tertiary focus:border-phantom-accent-primary focus:ring-0 transition-colors disabled:opacity-50"
                    step="0.01"
                    min="1.01"
                    max="5.00"
                  />
                  <div className="mt-2 flex gap-2">
                    {[1.5, 2.0, 3.0, 5.0].map(mult => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setCashOutAt(mult.toFixed(2))}
                        disabled={isPlaying}
                        className="flex-1 px-2 py-1 text-sm bg-phantom-bg-tertiary border border-phantom-border rounded-lg text-phantom-text-secondary hover:border-phantom-accent-primary hover:text-phantom-text-primary transition-all disabled:opacity-50"
                      >
                        {mult}x
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPlaying || !betAmount || !cashOutAt}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-2xl hover:shadow-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlaying ? 'Playing...' : 'Place Bet'}
                </button>
              </form>
            </div>

            {/* Info Card */}
            <div className="bg-phantom-bg-secondary/60 backdrop-blur-xl rounded-3xl shadow-card border border-phantom-border p-6">
              <h3 className="text-xl font-bold text-phantom-text-primary mb-4">📊 Game Info</h3>
              <div className="space-y-2 text-sm text-phantom-text-secondary">
                <div className="flex justify-between">
                  <span>House Edge:</span>
                  <span className="text-phantom-text-primary font-semibold">10%</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Multiplier:</span>
                  <span className="text-phantom-text-primary font-semibold">5.00x</span>
                </div>
                <div className="flex justify-between">
                  <span>Instant Crash:</span>
                  <span className="text-phantom-text-primary font-semibold">20% @ 1.0x</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-xs text-yellow-200">
                  ⚠️ Set your auto cash out multiplier before playing. The game will automatically cash out when the multiplier reaches your target!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-phantom-bg-secondary/60 backdrop-blur-xl rounded-3xl shadow-card border border-phantom-border p-8">
          <h2 className="text-2xl font-bold text-phantom-text-primary mb-6 flex items-center gap-3">
            <svg className="w-7 h-7 text-phantom-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Games
          </h2>
          
          {recentGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-phantom-text-secondary">No games played yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentGames.slice(0, 10).map((game, index) => {
                const crashPoint = parseFloat(game.result) || 1.0;
                const betAmount = parseFloat(game.bet_amount) || 0;
                const isWin = game.won === true || game.won === 1 || game.won === 'true';
                
                let gameData = {};
                try {
                  if (game.choice && typeof game.choice === 'string') {
                    gameData = JSON.parse(game.choice);
                  } else if (game.choice && typeof game.choice === 'object') {
                    gameData = game.choice;
                  }
                } catch (error) {
                  console.error('Failed to parse game choice:', error);
                }
                
                const cashOutAt = gameData.cashOutAt || 0;
                const profit = isWin ? betAmount * (cashOutAt - 1) : -betAmount;
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-phantom-bg-tertiary/50 rounded-2xl border border-phantom-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isWin ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {isWin ? '✓' : '✗'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-phantom-text-primary">
                          Crashed @ {crashPoint}x
                          {cashOutAt > 0 && (
                            <span className="text-phantom-text-secondary"> • Target: {cashOutAt}x</span>
                          )}
                        </p>
                        <p className="text-xs text-phantom-text-tertiary">
                          {new Date(game.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        isWin ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {profit >= 0 ? '+' : ''}{getCurrencySymbol('stoneworks_dollar')} {formatCurrency(Math.abs(profit))}
                      </p>
                      <p className="text-xs text-phantom-text-tertiary">
                        Bet: {getCurrencySymbol('stoneworks_dollar')} {formatCurrency(betAmount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Crash;
