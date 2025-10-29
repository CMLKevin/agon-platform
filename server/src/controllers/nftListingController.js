import db from '../config/database.js';

// List NFT for sale
export const listNFT = async (req, res) => {
  const client = await db.pool.getClient();
  
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { ask_price } = req.body;

    if (!ask_price || parseFloat(ask_price) <= 0) {
      return res.status(400).json({ message: 'Valid ask price is required' });
    }

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

    const updateResult = await client.query(
      `UPDATE nfts 
       SET is_listed = TRUE, ask_price = $1, listed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [parseFloat(ask_price), id]
    );

    await client.query(
      `INSERT INTO nft_transactions (
        nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, userId, userId, 0, 0, 0, 'list', `Listed for ${ask_price} Agon`]
    );

    await client.query('COMMIT');

    res.json({
      message: 'NFT listed successfully',
      nft: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('List NFT error:', error);
    res.status(500).json({ message: 'Error listing NFT', error: error.message });
  } finally {
    client.release();
  }
};

// Unlist NFT from sale
export const unlistNFT = async (req, res) => {
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

    if (nft.current_owner_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'You do not own this NFT' });
    }

    const updateResult = await client.query(
      `UPDATE nfts 
       SET is_listed = FALSE, ask_price = NULL
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO nft_transactions (
        nft_id, from_user_id, to_user_id, amount, fee, net_amount, transaction_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, userId, userId, 0, 0, 0, 'unlist', 'Unlisted from marketplace']
    );

    await client.query('COMMIT');

    res.json({
      message: 'NFT unlisted successfully',
      nft: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Unlist NFT error:', error);
    res.status(500).json({ message: 'Error unlisting NFT', error: error.message });
  } finally {
    client.release();
  }
};
