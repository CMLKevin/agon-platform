import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'nft_recently_viewed';
const MAX_ITEMS = 10;

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentlyViewed(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recently viewed:', error);
    }
  }, []);

  const addToRecentlyViewed = useCallback((nft) => {
    setRecentlyViewed(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item.id !== nft.id);
      
      // Add to beginning
      const updated = [{
        id: nft.id,
        name: nft.name,
        image_url: nft.thumbnail_url || nft.image_url,
        ask_price: nft.ask_price,
        is_listed: nft.is_listed,
        viewedAt: new Date().toISOString()
      }, ...filtered].slice(0, MAX_ITEMS);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recently viewed:', error);
      }
      
      return updated;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recently viewed:', error);
    }
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed
  };
};
