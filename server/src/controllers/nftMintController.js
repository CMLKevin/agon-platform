import db from '../config/database.js';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// Helper function to generate thumbnail
async function generateThumbnail(imagePath) {
  const thumbnailPath = imagePath.replace(/(\.[^.]+)$/, '-thumb$1');
  
  try {
    console.log('Sharp: Attempting to resize image:', imagePath);
    
    // Check if Sharp is available
    if (!sharp) {
      console.warn('Sharp library not available, skipping thumbnail generation');
      return null;
    }
    
    await sharp(imagePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .toFile(thumbnailPath);
    
    console.log('Sharp: Thumbnail created successfully:', thumbnailPath);
    return thumbnailPath;
  } catch (error) {
    console.error('Thumbnail generation error:', error.message);
    console.error('Sharp error stack:', error.stack);
    // Return null to continue without thumbnail - not a critical failure
    return null;
  }
}

// Mint new NFT
export const mintNFT = async (req, res) => {
  try {
    console.log('=== Mint NFT Request Start ===');
    console.log('User ID:', req.user?.id);
    console.log('File:', req.file ? 'Present' : 'Missing');
    console.log('Body:', req.body);
    
    const userId = req.user.id;
    const { name, description, category, stoneworks_tags, edition_number, edition_total } = req.body;
    
    if (!req.file) {
      console.error('ERROR: No file uploaded');
      return res.status(400).json({ message: 'Image file is required' });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'NFT name is required' });
    }

    if (name.length > 255) {
      return res.status(400).json({ message: 'NFT name must be 255 characters or less' });
    }

    // Validate edition numbers
    const editionNum = parseInt(edition_number) || 1;
    const editionTot = parseInt(edition_total) || 1;
    
    if (editionNum < 1 || editionTot < 1) {
      return res.status(400).json({ message: 'Edition numbers must be positive' });
    }
    
    if (editionNum > editionTot) {
      return res.status(400).json({ message: 'Edition number cannot exceed total editions' });
    }

    // Validate category
    const validCategories = ['nation_flags', 'notable_builds', 'memes_moments', 'player_avatars', 'event_commemorations', 'achievement_badges', 'map_art', 'historical_documents', 'other'];
    const selectedCategory = category || 'other';
    if (!validCategories.includes(selectedCategory)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const MINT_COST = 100; // 100 Agon

    // Generate thumbnail
    console.log('Generating image URLs...');
    console.log('File path:', req.file.path);
    const imageUrl = `/uploads/nfts/${path.basename(req.file.path)}`;
    let thumbnailUrl = null;
    
    try {
      console.log('Generating thumbnail...');
      const thumbnailPath = await generateThumbnail(req.file.path);
      if (thumbnailPath) {
        thumbnailUrl = `/uploads/nfts/${path.basename(thumbnailPath)}`;
        console.log('Thumbnail generated:', thumbnailUrl);
      } else {
        console.log('Thumbnail generation returned null');
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

    // Execute transaction using db.tx wrapper
    console.log('Starting transaction...');
    const result = await db.tx(async (client) => {
      // Check user's Agon balance
      console.log('Checking wallet balance...');
      const walletCheck = await client.queryOne(
        'SELECT agon FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (!walletCheck || walletCheck.agon < MINT_COST) {
        console.error('ERROR: Insufficient balance');
        throw new Error('Insufficient Agon balance. Minting costs 100 Agon.');
      }
      
      console.log('Balance OK, deducting minting cost...');
      // Deduct minting cost from user's wallet
      await client.exec(
        'UPDATE wallets SET agon = agon - $1 WHERE user_id = $2',
        [MINT_COST, userId]
      );

      // Insert NFT
      console.log('Inserting NFT into database...');
      console.log('NFT data:', { name: name.trim(), category: selectedCategory, editionNum, editionTot });
      
      const nftRows = await client.query(
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
          selectedCategory,
          tagsArray,
          editionNum,
          editionTot,
          MINT_COST
        ]
      );

      const nft = nftRows[0];
      console.log('NFT inserted with ID:', nft.id);

      // Record transaction
      console.log('Recording transaction...');
      await client.exec(
        `INSERT INTO nft_transactions (
          nft_id, to_user_id, amount, fee, net_amount, transaction_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [nft.id, userId, MINT_COST, 0, MINT_COST, 'mint', 'NFT minted']
      );

      // Get updated wallet
      const updatedWallet = await client.queryOne(
        'SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1',
        [userId]
      );

      return { nft, wallet: updatedWallet };
    });

    console.log('Transaction committed successfully');

    res.status(201).json({
      message: 'NFT minted successfully!',
      nft: result.nft,
      wallet: result.wallet
    });

  } catch (error) {
    console.error('=== MINT NFT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        console.log('Cleaning up uploaded file:', req.file.path);
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    // Return appropriate status code
    const statusCode = error.message.includes('Insufficient') ? 400 : 500;
    
    res.status(statusCode).json({ 
      message: error.message || 'Error minting NFT',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
