import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { walletAPI } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import api from '../services/api';
import { useSound } from '../hooks/useSound';
import { SOUNDS } from '../utils/sounds';

const CoinFlip = () => {
  const [wallet, setWallet] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [selectedSide, setSelectedSide] = useState('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [recentGames, setRecentGames] = useState([]);
  const { playSound, isMuted, toggleMute } = useSound();

  useEffect(() => {
    loadWallet();
    loadRecentGames();
  }, []);

  const loadWallet = async () => {
    try {
      const res = await walletAPI.getWallet();
      setWallet(res.data.wallet);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const loadRecentGames = async () => {
    try {
      const res = await api.get('/games/history');
      const filtered = (res.data.games || []).filter(g => g.game_type === 'coinflip');
      setRecentGames(filtered);
    } catch (error) {
      console.error('Failed to load game history:', error);
    }
  };

  const handleCoinFlip = async (e) => {
    e.preventDefault();
    
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    // Round to 2 decimal places to handle floating point precision issues
    const betAmountRounded = Math.round(parseFloat(betAmount) * 100) / 100;
    const balanceRounded = Math.round((wallet?.stoneworks_dollar || 0) * 100) / 100;
    
    if (betAmountRounded > balanceRounded) {
      alert('Insufficient Game Chips balance');
      return;
    }

    setIsFlipping(true);
    setShowResult(false);
    setGameResult(null);
    
    // Play initial flip sound
    playSound(SOUNDS.COIN_FLIP);

    try {
      const res = await api.post('/games/coinflip', {
        betAmount: parseFloat(betAmount),
        choice: selectedSide
      });

      // Play spinning sounds during animation
      setTimeout(() => playSound(SOUNDS.COIN_SPIN), 400);
      setTimeout(() => playSound(SOUNDS.COIN_SPIN), 800);
      setTimeout(() => playSound(SOUNDS.COIN_SPIN), 1200);

      // Play landing sound and show result
      setTimeout(() => {
        playSound(SOUNDS.COIN_LAND);
        
        setTimeout(() => {
          setGameResult(res.data);
          setShowResult(true);
          setIsFlipping(false);
          
          // Play result sound
          if (res.data?.won) {
            playSound(SOUNDS.GAME_WIN);
          } else {
            playSound(SOUNDS.GAME_LOSS);
          }
          
          loadWallet();
          loadRecentGames();
        }, 200);
      }, 1600);
    } catch (error) {
      setIsFlipping(false);
      alert(error.response?.data?.message || 'Failed to play game');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-phantom bg-clip-text text-transparent mb-3">Coin Flip</h1>
          <p className="text-phantom-text-secondary text-lg">Test your luck with Game Chips!</p>
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
                <svg className="w-8 h-8 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="2" fill="currentColor"/>
                  <circle cx="12" cy="7" r="1" fill="currentColor"/>
                  <circle cx="12" cy="17" r="1" fill="currentColor"/>
                  <circle cx="7" cy="12" r="1" fill="currentColor"/>
                  <circle cx="17" cy="12" r="1" fill="currentColor"/>
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

        {/* Coin Flip Game */}
        <div className="bg-phantom-bg-secondary/60 backdrop-blur-xl rounded-3xl shadow-card border border-phantom-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-phantom-text-primary">Coin Flip</h2>
              <p className="text-sm text-phantom-text-secondary">House Edge: 10% • Win Rate: 45%</p>
            </div>
          </div>

          {/* Coin Animation */}
          <div className="flex justify-center mb-8">
            <div className={`relative w-40 h-40 coin-3d ${isFlipping ? 'animate-coin-flip' : ''}`}>
              <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full shadow-glow flex items-center justify-center border-4 border-amber-300">
                {!isFlipping && !showResult && (
                  <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {showResult && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white mb-1">
                      {gameResult?.result === 'heads' ? '👑' : '🎯'}
                    </p>
                    <p className="text-lg font-bold text-white capitalize">
                      {gameResult?.result}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result Display */}
          {showResult && gameResult && (
            <div className={`mb-6 p-6 rounded-2xl border-2 ${
              gameResult.won 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="text-center">
                <p className={`text-2xl font-bold mb-2 ${
                  gameResult.won ? 'text-green-500' : 'text-red-500'
                }`}>
                  {gameResult.won ? '🎉 You Won!' : '😔 You Lost'}
                </p>
                <p className="text-phantom-text-primary">
                  {gameResult.won ? '+' : '-'}{getCurrencySymbol('stoneworks_dollar')} {formatCurrency(Math.abs(gameResult.amountChange))}
                </p>
                <p className="text-sm text-phantom-text-secondary mt-2">
                  New Balance: {getCurrencySymbol('stoneworks_dollar')} {formatCurrency(gameResult.newBalance)}
                </p>
              </div>
            </div>
          )}

          {/* Betting Form */}
          <form onSubmit={handleCoinFlip} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                Choose Side
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedSide('heads')}
                  disabled={isFlipping}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                    selectedSide === 'heads'
                      ? 'bg-phantom-accent-primary/20 border-phantom-accent-primary text-phantom-text-primary shadow-glow-sm'
                      : 'bg-phantom-bg-tertiary border-phantom-border text-phantom-text-secondary hover:border-phantom-accent-primary'
                  }`}
                >
                  <div className="text-3xl mb-2">👑</div>
                  <p className="font-semibold">Heads</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSide('tails')}
                  disabled={isFlipping}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                    selectedSide === 'tails'
                      ? 'bg-phantom-accent-primary/20 border-phantom-accent-primary text-phantom-text-primary shadow-glow-sm'
                      : 'bg-phantom-bg-tertiary border-phantom-border text-phantom-text-secondary hover:border-phantom-accent-primary'
                  }`}
                >
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="font-semibold">Tails</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                Bet Amount (Game Chips)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isFlipping}
                placeholder="Enter amount..."
                className="w-full px-4 py-3 bg-phantom-bg-tertiary border-2 border-phantom-border rounded-2xl text-phantom-text-primary placeholder-phantom-text-tertiary focus:border-phantom-accent-primary focus:ring-0 transition-colors disabled:opacity-50"
                step="0.01"
                min="0.01"
              />
              <div className="mt-2 flex gap-2">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setBetAmount(amount.toString())}
                    disabled={isFlipping}
                    className="px-3 py-1 text-sm bg-phantom-bg-tertiary border border-phantom-border rounded-lg text-phantom-text-secondary hover:border-phantom-accent-primary hover:text-phantom-text-primary transition-all disabled:opacity-50"
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isFlipping || !betAmount}
              className="w-full py-4 bg-gradient-phantom text-white font-bold rounded-2xl hover:shadow-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFlipping ? 'Flipping...' : 'Flip Coin'}
            </button>
          </form>
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
            <div className="space-y-3">
              {recentGames.map((game, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-phantom-bg-tertiary/50 rounded-2xl border border-phantom-border"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      game.won ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {game.won ? '✓' : '✗'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-phantom-text-primary">
                        {game.choice} • {game.result}
                      </p>
                      <p className="text-xs text-phantom-text-tertiary">
                        {new Date(game.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      game.won ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {game.won ? '+' : '-'}{getCurrencySymbol('stoneworks_dollar')} {formatCurrency(game.bet_amount * (game.won ? 1.0 : 1))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoinFlip;

