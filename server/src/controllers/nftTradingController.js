import db from '../config/database.js';

export const placeBid = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { bid_amount } = req.body;
    
    if (!bid_amount || parseFloat(bid_amount) <= 0) {
      return res.status(400).json({ message: 'Valid bid amount is required' });
    }
    const bidAmount = parseFloat(bid_amount);
    
    // Validate bid amount (prevent overflow and unrealistic values)
    if (isNaN(bidAmount) || bidAmount > 1000000000) {
      return res.status(400).json({ message: 'Invalid bid amount' });
    }
    
    const result = await db.tx(async (client) => {
      const nftRows = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
      if (nftRows.length === 0) {
        throw new Error('NFT not found');
      }
      const nft = nftRows[0];
      if (nft.current_owner_id === userId) {
        throw new Error('You cannot bid on your own NFT');
      }
      const wallet = await client.queryOne('SELECT agon FROM wallets WHERE user_id = $1', [userId]);
      if (!wallet || wallet.agon < bidAmount) {
        throw new Error('Insufficient Agon balance');
      }
      await client.exec(`UPDATE nft_bids SET status = 'cancelled' WHERE nft_id = $1 AND bidder_id = $2 AND status = 'active'`, [id, userId]);
      const bidRows = await client.query(`INSERT INTO nft_bids (nft_id, bidder_id, bid_amount, status) VALUES ($1, $2, $3, 'active') RETURNING *`, [id, userId, bidAmount]);
      return bidRows[0];
    });
    
    res.json({ message: 'Bid placed successfully', bid: result });
  } catch (error) {
    console.error('Place bid error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                       error.message.includes('Insufficient') || error.message.includes('cannot bid') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Error placing bid' });
  }
};

export const cancelBid = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bidId } = req.params;
    
    await db.tx(async (client) => {
      const bidRows = await client.query('SELECT * FROM nft_bids WHERE id = $1', [bidId]);
      if (bidRows.length === 0) {
        throw new Error('Bid not found');
      }
      const bid = bidRows[0];
      if (bid.bidder_id !== userId) {
        throw new Error('You do not own this bid');
      }
      if (bid.status !== 'active') {
        throw new Error('Bid is not active');
      }
      await client.exec(`UPDATE nft_bids SET status = 'cancelled' WHERE id = $1`, [bidId]);
    });
    
    res.json({ message: 'Bid cancelled successfully' });
  } catch (error) {
    console.error('Cancel bid error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                       error.message.includes('do not own') ? 403 :
                       error.message.includes('not active') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Error cancelling bid' });
  }
};

export const acceptBid = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { bid_id } = req.body;
    
    if (!bid_id) {
      return res.status(400).json({ message: 'Bid ID is required' });
    }
    
    const result = await db.tx(async (client) => {
      const nftRows = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
      if (nftRows.length === 0) {
        throw new Error('NFT not found');
      }
      
      const nft = nftRows[0];
      if (nft.current_owner_id !== userId) {
        throw new Error('You do not own this NFT');
      }
      
      const bidRows = await client.query(
        'SELECT * FROM nft_bids WHERE id = $1 AND nft_id = $2 AND status = $3',
        [bid_id, id, 'active']
      );
      if (bidRows.length === 0) {
        throw new Error('Active bid not found');
      }
      
      const bid = bidRows[0];
      const buyerId = bid.bidder_id;
      const salePrice = parseFloat(bid.bid_amount);
      const platformFee = Math.floor(salePrice * 0.025 * 100) / 100;
      const sellerReceives = salePrice - platformFee;
      
      const buyerWallet = await client.queryOne('SELECT agon FROM wallets WHERE user_id = $1', [buyerId]);
      if (!buyerWallet || buyerWallet.agon < salePrice) {
        throw new Error('Buyer has insufficient Agon balance');
      }
      
      await client.exec('UPDATE wallets SET agon = agon - $1 WHERE user_id = $2 AND agon >= $1', [salePrice, buyerId]);
      const buyerCheck = await client.queryOne('SELECT agon FROM wallets WHERE user_id = $1', [buyerId]);
      if (buyerCheck.agon < 0) {
        throw new Error('Buyer has insufficient balance (race condition detected)');
      }
      
      await client.exec('UPDATE wallets SET agon = agon + $1 WHERE user_id = $2', [sellerReceives, userId]);
      await client.exec(
        `UPDATE nfts SET current_owner_id = $1, is_listed = FALSE, ask_price = NULL, last_traded_at = NOW() WHERE id = $2`,
        [buyerId, id]
      );
      await client.exec(`UPDATE nft_bids SET status = 'accepted' WHERE id = $1`, [bid_id]);
      await client.exec(
        `UPDATE nft_bids SET status = 'cancelled' WHERE nft_id = $1 AND id != $2 AND status = 'active'`,
        [id, bid_id]
      );
      await client.exec(
        `INSERT INTO nft_transactions (nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, bid_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, userId, buyerId, salePrice, platformFee, sellerReceives, 'bid_accepted', bid_id, `Bid accepted for ${salePrice} Agon`]
      );
      
      const updatedNFT = await client.queryOne('SELECT * FROM nfts WHERE id = $1', [id]);
      const sellerWallet = await client.queryOne('SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1', [userId]);
      
      return { nft: updatedNFT, wallet: sellerWallet, sale: { price: salePrice, fee: platformFee, received: sellerReceives } };
    });
    
    res.json({ message: 'Bid accepted! NFT sold.', ...result });
  } catch (error) {
    console.error('Accept bid error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('do not own') ? 403 :
                       error.message.includes('Insufficient') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Error accepting bid' });
  }
};

export const buyNFT = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await db.tx(async (client) => {
      const nftRows = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
      if (nftRows.length === 0) {
        throw new Error('NFT not found');
      }
      
      const nft = nftRows[0];
      if (!nft.is_listed || !nft.ask_price) {
        throw new Error('NFT is not listed for sale');
      }
      if (nft.current_owner_id === userId) {
        throw new Error('You cannot buy your own NFT');
      }
      
      const salePrice = parseFloat(nft.ask_price);
      const platformFee = Math.floor(salePrice * 0.025 * 100) / 100;
      const sellerReceives = salePrice - platformFee;
      const sellerId = nft.current_owner_id;
      
      const buyerWallet = await client.queryOne('SELECT agon FROM wallets WHERE user_id = $1', [userId]);
      if (!buyerWallet || buyerWallet.agon < salePrice) {
        throw new Error('Insufficient Agon balance');
      }
      
      await client.exec('UPDATE wallets SET agon = agon - $1 WHERE user_id = $2 AND agon >= $1', [salePrice, userId]);
      const buyerCheck = await client.queryOne('SELECT agon FROM wallets WHERE user_id = $1', [userId]);
      if (buyerCheck.agon < 0) {
        throw new Error('Insufficient balance (race condition detected)');
      }
      
      await client.exec('UPDATE wallets SET agon = agon + $1 WHERE user_id = $2', [sellerReceives, sellerId]);
      await client.exec(
        `UPDATE nfts SET current_owner_id = $1, is_listed = FALSE, ask_price = NULL, last_traded_at = NOW() WHERE id = $2`,
        [userId, id]
      );
      await client.exec(`UPDATE nft_bids SET status = 'cancelled' WHERE nft_id = $1 AND status = 'active'`, [id]);
      await client.exec(
        `INSERT INTO nft_transactions (nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, sellerId, userId, salePrice, platformFee, sellerReceives, 'sale', `Instant buy for ${salePrice} Agon`]
      );
      
      const updatedNFT = await client.queryOne('SELECT * FROM nfts WHERE id = $1', [id]);
      const buyerWalletUpdated = await client.queryOne('SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1', [userId]);
      
      return { nft: updatedNFT, wallet: buyerWalletUpdated, purchase: { price: salePrice, fee: platformFee } };
    });
    
    res.json({ message: 'NFT purchased successfully!', ...result });
  } catch (error) {
    console.error('Buy NFT error:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('not listed') || error.message.includes('cannot buy') || error.message.includes('Insufficient') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Error buying NFT' });
  }
};
