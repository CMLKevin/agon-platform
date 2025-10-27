import { useCallback, useRef, useState } from 'react';
import { generateSound } from '../utils/sounds';

/**
 * Custom hook for playing game sounds using Web Audio API
 * @returns {object} Sound control functions
 */
export const useSound = () => {
  const audioContextRef = useRef(null);
  const [isMuted, setIsMuted] = useState(() => {
    // Load mute state from localStorage
    const saved = localStorage.getItem('gameSoundsMuted');
    return saved === 'true';
  });

  // Initialize Audio Context lazily (only when first sound is played)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.error('Web Audio API not supported:', error);
        return null;
      }
    }
    
    // Resume context if it's suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  /**
   * Play a sound effect
   * @param {string} soundType - Type of sound from SOUNDS constants
   * @param {number} volume - Volume multiplier (0-1), default 1
   */
  const playSound = useCallback((soundType, volume = 1) => {
    if (isMuted) return;
    
    const context = getAudioContext();
    if (!context) return;

    try {
      // Create a gain node for volume control
      const masterGain = context.createGain();
      masterGain.gain.value = Math.max(0, Math.min(1, volume));
      masterGain.connect(context.destination);
      
      // Temporarily disconnect and reconnect to destination through our gain node
      // This is handled in generateSound, so we just call it
      generateSound(soundType, context);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [isMuted, getAudioContext]);

  /**
   * Toggle mute state
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      localStorage.setItem('gameSoundsMuted', newState.toString());
      return newState;
    });
  }, []);

  /**
   * Set mute state explicitly
   */
  const setMute = useCallback((muted) => {
    setIsMuted(muted);
    localStorage.setItem('gameSoundsMuted', muted.toString());
  }, []);

  return {
    playSound,
    isMuted,
    toggleMute,
    setMute,
  };
};
