// Sound effect URLs and configurations
// Using Web Audio API to generate sounds procedurally for reliability

export const SOUNDS = {
  // Blackjack sounds
  CARD_DEAL: 'cardDeal',
  CARD_FLIP: 'cardFlip',
  BLACKJACK_WIN: 'blackjackWin',
  GAME_WIN: 'gameWin',
  GAME_LOSS: 'gameLoss',
  BUST: 'bust',
  PUSH: 'push',
  
  // Plinko sounds
  PLINKO_DROP: 'plinkoDrop',
  PLINKO_BOUNCE: 'plinkoBounce',
  PLINKO_LAND: 'plinkoLand',
  
  // Crash sounds
  CRASH_START: 'crashStart',
  CRASH_TICK: 'crashTick',
  CRASH_CASHOUT: 'crashCashout',
  CRASH_EXPLODE: 'crashExplode',
};

// Generate sound using Web Audio API
export const generateSound = (type, audioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch (type) {
    case SOUNDS.CARD_DEAL:
      // Quick swoosh sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
      
    case SOUNDS.CARD_FLIP:
      // Sharp flip sound
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
      break;
      
    case SOUNDS.BLACKJACK_WIN:
      // Triumphant ascending arpeggio
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
        osc.start(audioContext.currentTime + i * 0.1);
        osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
      });
      return; // Early return since we handled it differently
      
    case SOUNDS.GAME_WIN:
      // Pleasant ascending tone
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      break;
      
    case SOUNDS.GAME_LOSS:
      // Descending tone
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
      
    case SOUNDS.BUST:
      // Breaking sound
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      break;
      
    case SOUNDS.PUSH:
      // Neutral beep
      oscillator.type = 'sine';
      oscillator.frequency.value = 440;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
      
    case SOUNDS.PLINKO_DROP:
      // Launch sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
      
    case SOUNDS.PLINKO_BOUNCE:
      // Quick plink
      oscillator.type = 'sine';
      oscillator.frequency.value = 800 + Math.random() * 400; // Random pitch for variety
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
      break;
      
    case SOUNDS.PLINKO_LAND:
      // Satisfying thud
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      break;
      
    case SOUNDS.CRASH_START:
      // Rising tension
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
      
    case SOUNDS.CRASH_TICK:
      // Subtle tick
      oscillator.type = 'square';
      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.02);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.02);
      break;
      
    case SOUNDS.CRASH_CASHOUT:
      // Success chime
      const cashoutNotes = [659.25, 783.99]; // E5, G5
      cashoutNotes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.08 + 0.2);
        osc.start(audioContext.currentTime + i * 0.08);
        osc.stop(audioContext.currentTime + i * 0.08 + 0.2);
      });
      return;
      
    case SOUNDS.CRASH_EXPLODE:
      // Explosion
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = audioContext.createGain();
      noiseSource.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      noiseGain.gain.setValueAtTime(0.3, audioContext.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      noiseSource.start(audioContext.currentTime);
      noiseSource.stop(audioContext.currentTime + 0.3);
      return;
      
    default:
      oscillator.stop();
      return;
  }
};
