import db from '../config/database.js';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// Helper function to generate thumbnail
async function generateThumbnail(imagePath) {
  const thumbnailPath = imagePath.replace(/(\.[^.]+)$/, '-thumb$1');
  
  try {
    await sharp(imagePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return null;
  }
}

// Mint new NFT
export const mintNFT = async (req, res) => {
  const client = await db.pool.getClient();
  
  try {
    const userId = req.user.id;
    const { name, description, category, stoneworks_tags, edition_number, edition_total } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'NFT name is required' });
    }

    if (name.length > 255) {
      return res.status(400).json({ message: 'NFT name must be 255 characters or less' });
    }

    const MINT_COST = 100; // 100 Agon

    await client.query('BEGIN');

    // Check user's Agon balance
    const walletResult = await client.query(
      'SELECT agon FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (!walletResult.rows[0] || walletResult.rows[0].agon < MINT_COST) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient Agon balance. Minting costs 100 Agon.' });
    }

    // Deduct minting cost from user's wallet
    await client.query(
      'UPDATE wallets SET agon = agon - $1 WHERE user_id = $2',
      [MINT_COST, userId]
    );

    // Generate thumbnail
    const imageUrl = `/uploads/nfts/${path.basename(req.file.path)}`;
    let thumbnailUrl = null;
    
    try {
      const thumbnailPath = await generateThumbnail(req.file.path);
      if (thumbnailPath) {
        thumbnailUrl = `/uploads/nfts/${path.basename(thumbnailPath)}`;
      }
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      // Continue without thumbnail
    }

    // Parse tags
    let tagsArray = [];
    if (stoneworks_tags) {
      if (typeof stoneworks_tags === 'string') {
        tagsArray = stoneworks_tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(stoneworks_tags)) {
        tagsArray = stoneworks_tags;
      }
    }

    // Insert NFT
    const nftResult = await client.query(
      `INSERT INTO nfts (
        creator_id, current_owner_id, name, description, image_url, thumbnail_url,
        category, stoneworks_tags, edition_number, edition_total, mint_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        userId,
        name.trim(),
        description?.trim() || null,
        imageUrl,
        thumbnailUrl,
        category || 'other',
        tagsArray,
        edition_number || 1,
        edition_total || 1,
        MINT_COST
      ]
    );

    const nft = nftResult.rows[0];

    // Record transaction
    await client.query(
      `INSERT INTO nft_transactions (
        nft_id, to_user_id, amount, fee, net_amount, transaction_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [nft.id, userId, MINT_COST, 0, MINT_COST, 'mint', 'NFT minted']
    );

    await client.query('COMMIT');

    // Get updated wallet
    const updatedWallet = await client.query(
      'SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1',
      [userId]
    );

    res.status(201).json({
      message: 'NFT minted successfully!',
      nft: nft,
      wallet: updatedWallet.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mint NFT error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Error minting NFT', error: error.message });
  } finally {
    client.release();
  }
};
