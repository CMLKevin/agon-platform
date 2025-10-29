import db from '../config/database.js';

// Get all NFTs with filters
export const getAllNFTs = async (req, res) => {
  try {
    const {
      category,
      listed_only,
      search,
      min_price,
      max_price,
      sort_by,
      order,
      limit,
      offset,
      creator_id,
      owner_id
    } = req.query;

    let query = `
      SELECT 
        n.*,
        creator.username as creator_username,
        owner.username as owner_username,
        (SELECT COUNT(*) FROM nft_bids WHERE nft_id = n.id AND status = 'active') as active_bids_count,
        (SELECT MAX(bid_amount) FROM nft_bids WHERE nft_id = n.id AND status = 'active') as highest_bid
      FROM nfts n
      JOIN users creator ON n.creator_id = creator.id
      JOIN users owner ON n.current_owner_id = owner.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND n.category = $${paramCount}`;
      params.push(category);
    }

    if (listed_only === 'true') {
      query += ` AND n.is_listed = TRUE`;
    }

    if (creator_id) {
      paramCount++;
      query += ` AND n.creator_id = $${paramCount}`;
      params.push(parseInt(creator_id));
    }

    if (owner_id) {
      paramCount++;
      query += ` AND n.current_owner_id = $${paramCount}`;
      params.push(parseInt(owner_id));
    }

    if (search) {
      paramCount++;
      query += ` AND (n.name ILIKE $${paramCount} OR n.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (min_price) {
      paramCount++;
      query += ` AND n.ask_price >= $${paramCount}`;
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      paramCount++;
      query += ` AND n.ask_price <= $${paramCount}`;
      params.push(parseFloat(max_price));
    }

    // Sorting
    const validSortFields = ['minted_at', 'ask_price', 'view_count', 'like_count', 'name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'minted_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY n.${sortField} ${sortOrder}`;

    // Pagination
    const limitValue = Math.min(parseInt(limit) || 50, 100);
    const offsetValue = parseInt(offset) || 0;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limitValue);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offsetValue);

    const nfts = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM nfts n WHERE 1=1`;
    const countParams = [];
    let countParamCount = 0;

    if (category) {
      countParamCount++;
      countQuery += ` AND n.category = $${countParamCount}`;
      countParams.push(category);
    }

    if (listed_only === 'true') {
      countQuery += ` AND n.is_listed = TRUE`;
    }

    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult[0].count);

    res.json({
      nfts: nfts,
      pagination: {
        total: totalCount,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + limitValue < totalCount
      }
    });

  } catch (error) {
    console.error('Get all NFTs error:', error);
    res.status(500).json({ message: 'Error fetching NFTs', error: error.message });
  }
};

// Get single NFT details
export const getNFTById = async (req, res) => {
  try {
    const { id } = req.params;

    const nftResult = await db.query(
      `SELECT 
        n.*,
        creator.username as creator_username,
        owner.username as owner_username,
        owner.id as owner_id
      FROM nfts n
      JOIN users creator ON n.creator_id = creator.id
      JOIN users owner ON n.current_owner_id = owner.id
      WHERE n.id = $1`,
      [id]
    );

    if (nftResult.length === 0) {
      return res.status(404).json({ message: 'NFT not found' });
    }

    const nft = nftResult[0];

    // Get active bids (orderbook)
    const bids = await db.query(
      `SELECT 
        b.*,
        u.username as bidder_username
      FROM nft_bids b
      JOIN users u ON b.bidder_id = u.id
      WHERE b.nft_id = $1 AND b.status = 'active'
      ORDER BY b.bid_amount DESC, b.created_at ASC`,
      [id]
    );

    // Get transaction history
    const transactions = await db.query(
      `SELECT 
        t.*,
        from_user.username as from_username,
        to_user.username as to_username
      FROM nft_transactions t
      LEFT JOIN users from_user ON t.from_user_id = from_user.id
      JOIN users to_user ON t.to_user_id = to_user.id
      WHERE t.nft_id = $1
      ORDER BY t.created_at DESC
      LIMIT 20`,
      [id]
    );

    // Increment view count
    db.query('SELECT increment_nft_views($1)', [id]).catch(err => 
      console.error('Error incrementing views:', err)
    );

    res.json({
      nft: nft,
      bids: bids,
      transactions: transactions
    });

  } catch (error) {
    console.error('Get NFT by ID error:', error);
    res.status(500).json({ message: 'Error fetching NFT details', error: error.message });
  }
};

// Get user's NFT collection
export const getUserNFTs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { include_created } = req.query;

    let query = `
      SELECT 
        n.*,
        creator.username as creator_username,
        (SELECT COUNT(*) FROM nft_bids WHERE nft_id = n.id AND status = 'active') as active_bids_count,
        (SELECT MAX(bid_amount) FROM nft_bids WHERE nft_id = n.id AND status = 'active') as highest_bid
      FROM nfts n
      JOIN users creator ON n.creator_id = creator.id
      WHERE n.current_owner_id = $1
    `;

    if (include_created === 'true') {
      query += ` OR n.creator_id = $1`;
    }

    query += ` ORDER BY n.minted_at DESC`;

    const nfts = await db.query(query, [userId]);

    // Get user stats
    const statsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT CASE WHEN current_owner_id = $1 THEN id END) as owned_count,
        COUNT(DISTINCT CASE WHEN creator_id = $1 THEN id END) as created_count,
        COALESCE(SUM(CASE WHEN current_owner_id = $1 AND ask_price IS NOT NULL THEN ask_price ELSE 0 END), 0) as total_value
      FROM nfts
      WHERE current_owner_id = $1 OR creator_id = $1`,
      [userId]
    );

    res.json({
      nfts: nfts,
      stats: statsResult[0]
    });

  } catch (error) {
    console.error('Get user NFTs error:', error);
    res.status(500).json({ message: 'Error fetching user NFTs', error: error.message });
  }
};
