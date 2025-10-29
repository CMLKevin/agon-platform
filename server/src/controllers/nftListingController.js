import db from '../config/database.js';

// List NFT for sale
export const listNFT = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { ask_price } = req.body;

    if (!ask_price || parseFloat(ask_price) <= 0) {
      return res.status(400).json({ message: 'Valid ask price is required' });
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

      const updateRows = await client.query(
        `UPDATE nfts 
         SET is_listed = TRUE, ask_price = $1, listed_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [parseFloat(ask_price), id]
      );

      await client.exec(
        `INSERT INTO nft_transactions (
          nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, userId, userId, 0, 0, 0, 'list', `Listed for ${ask_price} Agon`]
      );

      return updateRows[0];
    });

    res.json({
      message: 'NFT listed successfully',
      nft: result
    });

  } catch (error) {
    console.error('List NFT error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                       error.message.includes('do not own') ? 403 : 500;
    res.status(statusCode).json({ message: error.message || 'Error listing NFT' });
  }
};

// Unlist NFT from sale
export const unlistNFT = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.tx(async (client) => {
      const nftRows = await client.query('SELECT * FROM nfts WHERE id = $1', [id]);

      if (nftRows.length === 0) {
        throw new Error('NFT not found');
      }

      const nft = nftRows[0];

      if (nft.current_owner_id !== userId) {
        throw new Error('You do not own this NFT');
      }

      const updateRows = await client.query(
        `UPDATE nfts 
         SET is_listed = FALSE, ask_price = NULL
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      await client.exec(
        `INSERT INTO nft_transactions (
          nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, userId, userId, 0, 0, 0, 'unlist', 'Unlisted from marketplace']
      );

      return updateRows[0];
    });

    res.json({
      message: 'NFT unlisted successfully',
      nft: result
    });

  } catch (error) {
    console.error('Unlist NFT error:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                       error.message.includes('do not own') ? 403 : 500;
    res.status(statusCode).json({ message: error.message || 'Error unlisting NFT' });
  }
};
