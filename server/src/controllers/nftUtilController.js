import db from '../config/database.js';

// Like/Unlike NFT
export const likeNFT = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.tx(async (client) => {
      // Check if NFT exists
      const nftCheck = await client.query('SELECT id FROM nfts WHERE id = $1', [id]);
      if (nftCheck.length === 0) {
        throw new Error('NFT not found');
      }

      // Try to insert like
      const result = await client.query(
        `INSERT INTO nft_likes (nft_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (nft_id, user_id) DO NOTHING
         RETURNING id`,
        [id, userId]
      );

      if (result.length > 0) {
        // Like was inserted, increment like count
        await client.exec('UPDATE nfts SET like_count = like_count + 1 WHERE id = $1', [id]);
      }
    });

    res.json({ message: 'NFT liked successfully' });
  } catch (error) {
    console.error('Like NFT error:', error);
    const statusCode = error.message === 'NFT not found' ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Error liking NFT' });
  }
};

export const unlikeNFT = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.tx(async (client) => {
      const result = await client.query(
        'DELETE FROM nft_likes WHERE nft_id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      if (result.length > 0) {
        // Like was deleted, decrement like count
        await client.exec('UPDATE nfts SET like_count = like_count - 1 WHERE id = $1', [id]);
      }
    });

    res.json({ message: 'NFT unliked successfully' });
  } catch (error) {
    console.error('Unlike NFT error:', error);
    res.status(500).json({ message: 'Error unliking NFT', error: error.message });
  }
};

// Get NFT categories
export const getCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'nation_flags', label: 'Nation Flags & Emblems', icon: '🏴' },
      { value: 'notable_builds', label: 'Notable Builds', icon: '🏛️' },
      { value: 'memes_moments', label: 'Memes & Moments', icon: '😂' },
      { value: 'player_avatars', label: 'Player Avatars', icon: '👤' },
      { value: 'event_commemorations', label: 'Event Commemorations', icon: '🎉' },
      { value: 'achievement_badges', label: 'Achievement Badges', icon: '🏆' },
      { value: 'map_art', label: 'Map Art', icon: '🗺️' },
      { value: 'historical_documents', label: 'Historical Documents', icon: '📜' },
      { value: 'other', label: 'Other', icon: '✨' }
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};
