// Refined sound effect system using Web Audio API
// Procedurally generated sounds with professional quality enhancements

export const SOUNDS = {
  // Coin Flip sounds
  COIN_FLIP: 'coinFlip',
  COIN_SPIN: 'coinSpin',
  COIN_LAND: 'coinLand',
  
  // Blackjack sounds
  CARD_DEAL: 'cardDeal',
  CARD_FLIP: 'cardFlip',
  BLACKJACK_WIN: 'blackjackWin',
  
  // Plinko sounds
  PLINKO_DROP: 'plinkoDrop',
  PLINKO_BOUNCE: 'plinkoBounce',
  PLINKO_LAND: 'plinkoLand',
  
  // Crash sounds
  CRASH_START: 'crashStart',
  CRASH_TICK: 'crashTick',
  CRASH_CASHOUT: 'crashCashout',
  CRASH_EXPLODE: 'crashExplode',
  
  // Shared result sounds
  GAME_WIN: 'gameWin',
  GAME_LOSS: 'gameLoss',
  BUST: 'bust',
  PUSH: 'push',
};

// Helper function to create filtered noise
const createNoise = (context, duration, filterFreq = 1000, volume = 0.3) => {
  const bufferSize = duration * context.sampleRate;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Generate white noise with envelope
  for (let i = 0; i < bufferSize; i++) {
    const envelope = 1 - (i / bufferSize); // Fade out
    data[i] = (Math.random() * 2 - 1) * envelope;
  }
  
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  
  // Apply band-pass filter
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 1;
  
  const gain = context.createGain();
  gain.gain.value = volume;
  
  noise.connect(filter).connect(gain).connect(context.destination);
  return noise;
};

// Helper function to create oscillator with envelope
const createTone = (context, type, freq, startTime, duration, volume = 0.3, pitchBend = null) => {
  const osc = context.createOscillator();
  const gain = context.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  if (pitchBend) {
    osc.frequency.exponentialRampToValueAtTime(pitchBend, startTime + duration);
  }
  
  // ADSR envelope
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01); // Attack
  gain.gain.exponentialRampToValueAtTime(volume * 0.7, startTime + duration * 0.3); // Decay
  gain.gain.setValueAtTime(volume * 0.7, startTime + duration * 0.7); // Sustain
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // Release
  
  osc.connect(gain).connect(context.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
  
  return { osc, gain };
};

// Refined sound generation with improved quality
export const generateSound = (type, audioContext) => {
  const now = audioContext.currentTime;
  
  switch (type) {
    // ============ COIN FLIP SOUNDS ============
    case SOUNDS.COIN_FLIP:
      // Initial flip with metallic ring
      createTone(audioContext, 'square', 800, now, 0.08, 0.2, 600);
      createNoise(audioContext, 0.1, 2000, 0.15).start(now);
      break;
      
    case SOUNDS.COIN_SPIN:
      // Spinning coin sound - rapid frequency modulation
      for (let i = 0; i < 3; i++) {
        const freq = 600 + Math.random() * 200;
        createTone(audioContext, 'sine', freq, now + i * 0.04, 0.04, 0.1);
      }
      break;
      
    case SOUNDS.COIN_LAND:
      // Coin landing with metallic bounce
      createTone(audioContext, 'triangle', 300, now, 0.15, 0.25, 200);
      createTone(audioContext, 'triangle', 250, now + 0.08, 0.1, 0.15, 180);
      createNoise(audioContext, 0.08, 800, 0.1).start(now);
      break;
    
    // ============ BLACKJACK SOUNDS ============
    case SOUNDS.CARD_DEAL:
      // Card swoosh with paper texture
      createTone(audioContext, 'sine', 220, now, 0.12, 0.25, 120);
      createNoise(audioContext, 0.1, 400, 0.1).start(now);
      break;
      
    case SOUNDS.CARD_FLIP:
      // Sharp flip with snap
      createTone(audioContext, 'square', 450, now, 0.06, 0.2, 250);
      createNoise(audioContext, 0.05, 1200, 0.12).start(now);
      break;
      
    case SOUNDS.BLACKJACK_WIN:
      // Triumphant ascending arpeggio (C-E-G major chord)
      const bjNotes = [523.25, 659.25, 783.99];
      bjNotes.forEach((freq, i) => {
        createTone(audioContext, 'sine', freq, now + i * 0.1, 0.35, 0.28);
        // Add harmonic richness
        createTone(audioContext, 'sine', freq * 2, now + i * 0.1, 0.35, 0.1);
      });
      break;
      
    // ============ SHARED RESULT SOUNDS ============
    case SOUNDS.GAME_WIN:
      // Pleasant ascending arpeggio
      createTone(audioContext, 'sine', 440, now, 0.25, 0.25, 660);
      createTone(audioContext, 'sine', 550, now + 0.08, 0.2, 0.2);
      break;
      
    case SOUNDS.GAME_LOSS:
      // Gentle descending tone (not too harsh)
      createTone(audioContext, 'sine', 330, now, 0.35, 0.18, 220);
      break;
      
    case SOUNDS.BUST:
      // Breaking/crashing sound
      createTone(audioContext, 'sawtooth', 220, now, 0.25, 0.28, 60);
      createNoise(audioContext, 0.15, 600, 0.2).start(now);
      break;
      
    case SOUNDS.PUSH:
      // Neutral double beep
      createTone(audioContext, 'sine', 440, now, 0.08, 0.18);
      createTone(audioContext, 'sine', 440, now + 0.1, 0.08, 0.18);
      break;
      
    // ============ PLINKO SOUNDS ============
    case SOUNDS.PLINKO_DROP:
      // Ball release with whoosh
      createTone(audioContext, 'sine', 350, now, 0.18, 0.28, 180);
      createNoise(audioContext, 0.15, 800, 0.15).start(now);
      break;
      
    case SOUNDS.PLINKO_BOUNCE:
      // Crisp peg hit with pitch variation
      const bouncePitch = 900 + Math.random() * 500;
      createTone(audioContext, 'sine', bouncePitch, now, 0.05, 0.15);
      // Add slight harmonic
      createTone(audioContext, 'sine', bouncePitch * 1.5, now, 0.04, 0.08);
      break;
      
    case SOUNDS.PLINKO_LAND:
      // Satisfying thud with depth
      createTone(audioContext, 'triangle', 160, now, 0.25, 0.35, 90);
      createTone(audioContext, 'sine', 80, now, 0.2, 0.2, 60);
      createNoise(audioContext, 0.12, 400, 0.15).start(now);
      break;
      
    // ============ CRASH SOUNDS ============
    case SOUNDS.CRASH_START:
      // Rising anticipation whoosh
      createTone(audioContext, 'sine', 220, now, 0.35, 0.22, 480);
      createTone(audioContext, 'triangle', 110, now, 0.35, 0.15, 240);
      break;
      
    case SOUNDS.CRASH_TICK:
      // Minimal UI tick
      createTone(audioContext, 'square', 1100, now, 0.025, 0.08);
      break;
      
    case SOUNDS.CRASH_CASHOUT:
      // Success arpeggio (E-G)
      const cashNotes = [659.25, 783.99];
      cashNotes.forEach((freq, i) => {
        createTone(audioContext, 'sine', freq, now + i * 0.08, 0.25, 0.28);
        createTone(audioContext, 'sine', freq * 2, now + i * 0.08, 0.2, 0.1);
      });
      break;
      
    case SOUNDS.CRASH_EXPLODE:
      // Dramatic explosion with bass
      createTone(audioContext, 'sawtooth', 100, now, 0.35, 0.35, 40);
      createNoise(audioContext, 0.35, 500, 0.3).start(now);
      // Add high frequency crack
      createTone(audioContext, 'square', 2000, now, 0.1, 0.2, 800);
      break;
      
    default:
      console.warn(`Unknown sound type: ${type}`);
      break;
  }
};

