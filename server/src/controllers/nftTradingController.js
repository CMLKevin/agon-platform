import db from '../config/database.js';

export const placeBid = async (req, res) => {
  const client = await db.pool.getClient();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { bid_amount } = req.body;
    if (!bid_amount || parseFloat(bid_amount) <= 0) {
      return res.status(400).json({ message: 'Valid bid amount is required' });
    }
    const bidAmount = parseFloat(bid_amount);
    await client.query('BEGIN');
    const nftResult = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
    if (nftResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'NFT not found' });
    }
    const nft = nftResult.rows[0];
    if (nft.current_owner_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You cannot bid on your own NFT' });
    }
    const walletResult = await client.query('SELECT agon FROM wallets WHERE user_id = $1', [userId]);
    if (!walletResult.rows[0] || walletResult.rows[0].agon < bidAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient Agon balance' });
    }
    await client.query(`UPDATE nft_bids SET status = 'cancelled' WHERE nft_id = $1 AND bidder_id = $2 AND status = 'active'`, [id, userId]);
    const bidResult = await client.query(`INSERT INTO nft_bids (nft_id, bidder_id, bid_amount, status) VALUES ($1, $2, $3, 'active') RETURNING *`, [id, userId, bidAmount]);
    await client.query('COMMIT');
    res.json({ message: 'Bid placed successfully', bid: bidResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Place bid error:', error);
    res.status(500).json({ message: 'Error placing bid', error: error.message });
  } finally {
    client.release();
  }
};

export const cancelBid = async (req, res) => {
  const client = await db.pool.getClient();
  try {
    const userId = req.user.id;
    const { bidId } = req.params;
    await client.query('BEGIN');
    const bidResult = await client.query('SELECT * FROM nft_bids WHERE id = $1', [bidId]);
    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Bid not found' });
    }
    const bid = bidResult.rows[0];
    if (bid.bidder_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'You do not own this bid' });
    }
    if (bid.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Bid is not active' });
    }
    await client.query(`UPDATE nft_bids SET status = 'cancelled' WHERE id = $1`, [bidId]);
    await client.query('COMMIT');
    res.json({ message: 'Bid cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel bid error:', error);
    res.status(500).json({ message: 'Error cancelling bid', error: error.message });
  } finally {
    client.release();
  }
};

export const acceptBid = async (req, res) => {
  const client = await db.pool.getClient();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { bid_id } = req.body;
    if (!bid_id) return res.status(400).json({ message: 'Bid ID is required' });
    await client.query('BEGIN');
    const nftResult = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
    if (nftResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'NFT not found' });
    }
    const nft = nftResult.rows[0];
    if (nft.current_owner_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'You do not own this NFT' });
    }
    const bidResult = await client.query('SELECT * FROM nft_bids WHERE id = $1 AND nft_id = $2 AND status = \'active\'', [bid_id, id]);
    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Active bid not found' });
    }
    const bid = bidResult.rows[0];
    const buyerId = bid.bidder_id;
    const salePrice = parseFloat(bid.bid_amount);
    const platformFee = salePrice * 0.025;
    const sellerReceives = salePrice - platformFee;
    const buyerWallet = await client.query('SELECT agon FROM wallets WHERE user_id = $1', [buyerId]);
    if (!buyerWallet.rows[0] || buyerWallet.rows[0].agon < salePrice) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Buyer has insufficient Agon balance' });
    }
    await client.query('UPDATE wallets SET agon = agon - $1 WHERE user_id = $2', [salePrice, buyerId]);
    await client.query('UPDATE wallets SET agon = agon + $1 WHERE user_id = $2', [sellerReceives, userId]);
    await client.query(`UPDATE nfts SET current_owner_id = $1, is_listed = FALSE, ask_price = NULL, last_traded_at = NOW() WHERE id = $2`, [buyerId, id]);
    await client.query(`UPDATE nft_bids SET status = 'accepted' WHERE id = $1`, [bid_id]);
    await client.query(`UPDATE nft_bids SET status = 'cancelled' WHERE nft_id = $1 AND id != $2 AND status = 'active'`, [id, bid_id]);
    await client.query(`INSERT INTO nft_transactions (nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, bid_id, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [id, userId, buyerId, salePrice, platformFee, sellerReceives, 'bid_accepted', bid_id, `Bid accepted for ${salePrice} Agon`]);
    await client.query('COMMIT');
    const updatedNFT = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
    const sellerWallet = await client.query('SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1', [userId]);
    res.json({ message: 'Bid accepted! NFT sold.', nft: updatedNFT.rows[0], wallet: sellerWallet.rows[0], sale: { price: salePrice, fee: platformFee, received: sellerReceives } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept bid error:', error);
    res.status(500).json({ message: 'Error accepting bid', error: error.message });
  } finally {
    client.release();
  }
};

export const buyNFT = async (req, res) => {
  const client = await db.pool.getClient();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await client.query('BEGIN');
    const nftResult = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
    if (nftResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'NFT not found' });
    }
    const nft = nftResult.rows[0];
    if (!nft.is_listed || !nft.ask_price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'NFT is not listed for sale' });
    }
    if (nft.current_owner_id === userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You cannot buy your own NFT' });
    }
    const salePrice = parseFloat(nft.ask_price);
    const platformFee = salePrice * 0.025;
    const sellerReceives = salePrice - platformFee;
    const sellerId = nft.current_owner_id;
    const buyerWallet = await client.query('SELECT agon FROM wallets WHERE user_id = $1', [userId]);
    if (!buyerWallet.rows[0] || buyerWallet.rows[0].agon < salePrice) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient Agon balance' });
    }
    await client.query('UPDATE wallets SET agon = agon - $1 WHERE user_id = $2', [salePrice, userId]);
    await client.query('UPDATE wallets SET agon = agon + $1 WHERE user_id = $2', [sellerReceives, sellerId]);
    await client.query(`UPDATE nfts SET current_owner_id = $1, is_listed = FALSE, ask_price = NULL, last_traded_at = NOW() WHERE id = $2`, [userId, id]);
    await client.query(`UPDATE nft_bids SET status = 'cancelled' WHERE nft_id = $1 AND status = 'active'`, [id]);
    await client.query(`INSERT INTO nft_transactions (nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [id, sellerId, userId, salePrice, platformFee, sellerReceives, 'sale', `Instant buy for ${salePrice} Agon`]);
    await client.query('COMMIT');
    const updatedNFT = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);
    const buyerWalletUpdated = await client.query('SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1', [userId]);
    res.json({ message: 'NFT purchased successfully!', nft: updatedNFT.rows[0], wallet: buyerWalletUpdated.rows[0], purchase: { price: salePrice, fee: platformFee } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Buy NFT error:', error);
    res.status(500).json({ message: 'Error buying NFT', error: error.message });
  } finally {
    client.release();
  }
};
