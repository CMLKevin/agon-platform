import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin
router.use(authenticateToken, requireAdmin);

// Users list with balances and stats
router.get('/users', async (req, res) => {
  try {
    const users = await db.query(`
      SELECT u.id, u.username, u.created_at, u.is_admin, u.disabled,
        w.agon, w.stoneworks_dollar,
        (
          SELECT COUNT(1) FROM transactions t 
          WHERE t.from_user_id = u.id OR t.to_user_id = u.id
        ) AS transaction_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Force-end an auction (admin testing utility)
router.post('/auctions/:id/force-end', async (req, res) => {
  try {
    const { id } = req.params;

    const auction = await db.queryOne('SELECT * FROM auctions WHERE id = $1', [id]);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    // Mark as ended if there is a highest bidder; else keep it active
    await db.exec('UPDATE auctions SET status = $1, end_date = NOW() WHERE id = $2', ['ended', id]);

    // Log admin action
    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_force_end_auction', JSON.stringify({ auctionId: id })
    ]);

    res.json({ message: 'Auction force-ended for testing.' });
  } catch (e) {
    console.error('Force end auction error:', e);
    res.status(500).json({ error: 'Failed to force end auction' });
  }
});

// Toggle disable/enable user
router.post('/users/:id/toggle-disabled', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.queryOne('SELECT disabled, username FROM users WHERE id = $1', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newVal = !user.disabled;
    await db.exec('UPDATE users SET disabled = $1 WHERE id = $2', [newVal, id]);
    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_toggle_disabled', JSON.stringify({ targetUserId: id, targetUsername: user.username, disabled: newVal })
    ]);
    res.json({ id: Number(id), disabled: newVal });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Promote/demote admin
router.post('/users/:id/toggle-admin', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.queryOne('SELECT is_admin, username FROM users WHERE id = $1', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newVal = !user.is_admin;
    await db.exec('UPDATE users SET is_admin = $1 WHERE id = $2', [newVal, id]);
    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_toggle_admin', JSON.stringify({ targetUserId: id, targetUsername: user.username, is_admin: newVal })
    ]);
    res.json({ id: Number(id), is_admin: newVal });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update user admin status' });
  }
});

// Adjust user balance (admin)
router.post('/users/:id/adjust-balance', async (req, res) => {
  try {
    const { id } = req.params;
    const { currency, amount } = req.body;

    if (!['agon', 'stoneworks_dollar'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const delta = Number(amount);
    if (!isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: 'Amount must be non-zero number' });
    }

    const wallet = await db.queryOne('SELECT agon, stoneworks_dollar FROM wallets WHERE user_id = $1', [id]);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const newBalance = (parseFloat(wallet[currency]) || 0) + delta;
    if (newBalance < 0) {
      return res.status(400).json({ error: 'Resulting balance cannot be negative' });
    }

    await db.exec(`UPDATE wallets SET ${currency} = $1 WHERE user_id = $2`, [newBalance, id]);

    // Record transaction for audit
    await db.exec(
      `INSERT INTO transactions (from_user_id, to_user_id, transaction_type, currency, amount, description)
       VALUES ($1, $2, 'admin_adjust', $3, $4, $5)`,
      [req.user.id, id, currency, Math.abs(delta), delta > 0 ? 'Admin credit' : 'Admin debit']
    );

    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_adjust_balance', JSON.stringify({ targetUserId: id, currency, amount: delta })
    ]);

    const updated = await db.queryOne('SELECT * FROM wallets WHERE user_id = $1', [id]);
    res.json({ message: 'Balance updated', wallet: updated });
  } catch (e) {
    console.error('Adjust balance error:', e);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

// Aggregated metrics
router.get('/metrics', async (req, res) => {
  try {
    const totals = await db.queryOne(`
      SELECT 
        (SELECT COUNT(1) FROM users) AS total_users,
        (SELECT COUNT(1) FROM users WHERE disabled = TRUE) AS disabled_users,
        (SELECT COUNT(1) FROM users WHERE is_admin = TRUE) AS admin_users,
        (SELECT COUNT(1) FROM transactions) AS total_transactions,
        (SELECT COUNT(1) FROM transactions WHERE transaction_type = 'payment') AS payment_count,
        (SELECT COUNT(1) FROM transactions WHERE transaction_type = 'swap') AS swap_count,
        (SELECT COUNT(1) FROM transactions WHERE transaction_type = 'auction') AS auction_count,
        (SELECT COUNT(1) FROM transactions WHERE transaction_type = 'commission') AS commission_count,
        (SELECT SUM(amount) FROM transactions WHERE transaction_type = 'payment') AS total_payment_volume,
        (SELECT AVG(amount) FROM transactions WHERE transaction_type = 'payment') AS avg_payment,
        (SELECT SUM(amount) FROM transactions WHERE transaction_type = 'commission') AS total_commission_collected,
        (SELECT SUM(agon) FROM wallets) AS sum_agon,
        (SELECT SUM(stoneworks_dollar) FROM wallets) AS sum_sw
    `);

    // Coin Flip totals
    const coinflipTotalsRow = await db.queryOne(`
      SELECT 
        COUNT(1) AS total_games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        COUNT(DISTINCT user_id) AS unique_players,
        SUM(bet_amount) AS total_bet,
        SUM(CASE WHEN won = TRUE THEN bet_amount ELSE 0 END) AS total_bet_won
      FROM game_history
      WHERE game_type = 'coinflip'
    `);

    const coinflipTotals = coinflipTotalsRow ? {
      total_games: Number(coinflipTotalsRow.total_games || 0),
      wins: Number(coinflipTotalsRow.wins || 0),
      losses: Number(coinflipTotalsRow.losses || 0),
      unique_players: Number(coinflipTotalsRow.unique_players || 0),
      total_bet: Number(parseFloat(coinflipTotalsRow.total_bet || 0).toFixed(2)),
      total_bet_won: Number(parseFloat(coinflipTotalsRow.total_bet_won || 0).toFixed(2)),
      win_rate: coinflipTotalsRow.total_games ? Number(((coinflipTotalsRow.wins || 0) / coinflipTotalsRow.total_games * 100).toFixed(2)) : 0,
      // House profit: losses collected minus wins paid out
      // Players who lose contribute their bet, players who win get their bet back as profit
      house_profit: Number((parseFloat(coinflipTotalsRow.total_bet || 0) - parseFloat(coinflipTotalsRow.total_bet_won || 0) * 2).toFixed(2))
    } : {
      total_games: 0, wins: 0, losses: 0, unique_players: 0, total_bet: 0, total_bet_won: 0, win_rate: 0, house_profit: 0
    };

    // Blackjack totals
    const blackjackTotalsRow = await db.queryOne(`
      SELECT 
        COUNT(1) AS total_games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        COUNT(DISTINCT user_id) AS unique_players,
        SUM(bet_amount) AS total_bet,
        SUM(CASE WHEN won = TRUE THEN bet_amount ELSE 0 END) AS total_bet_won,
        SUM(CASE WHEN result = 'blackjack' THEN 1 ELSE 0 END) AS blackjacks,
        SUM(CASE WHEN result = 'push' THEN 1 ELSE 0 END) AS pushes
      FROM game_history
      WHERE game_type = 'blackjack'
    `);

    const blackjackTotals = blackjackTotalsRow ? {
      total_games: Number(blackjackTotalsRow.total_games || 0),
      wins: Number(blackjackTotalsRow.wins || 0),
      losses: Number(blackjackTotalsRow.losses || 0),
      unique_players: Number(blackjackTotalsRow.unique_players || 0),
      total_bet: Number(parseFloat(blackjackTotalsRow.total_bet || 0).toFixed(2)),
      total_bet_won: Number(parseFloat(blackjackTotalsRow.total_bet_won || 0).toFixed(2)),
      blackjacks: Number(blackjackTotalsRow.blackjacks || 0),
      pushes: Number(blackjackTotalsRow.pushes || 0),
      win_rate: blackjackTotalsRow.total_games ? Number(((blackjackTotalsRow.wins || 0) / blackjackTotalsRow.total_games * 100).toFixed(2)) : 0,
      house_profit: Number((parseFloat(blackjackTotalsRow.total_bet || 0) - parseFloat(blackjackTotalsRow.total_bet_won || 0) * 2).toFixed(2))
    } : {
      total_games: 0, wins: 0, losses: 0, unique_players: 0, total_bet: 0, total_bet_won: 0, blackjacks: 0, pushes: 0, win_rate: 0, house_profit: 0
    };

    // Coin flip games by day (last 14 days)
    const coinflipByDay = await db.query(`
      SELECT created_at::date AS day,
        COUNT(1) AS games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        SUM(bet_amount) AS total_bet,
        SUM(CASE WHEN won = TRUE THEN bet_amount ELSE 0 END) AS bet_won
      FROM game_history
      WHERE game_type = 'coinflip'
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    // Blackjack games by day (last 14 days)
    const blackjackByDay = await db.query(`
      SELECT created_at::date AS day,
        COUNT(1) AS games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        SUM(bet_amount) AS total_bet,
        SUM(CASE WHEN won = TRUE THEN bet_amount ELSE 0 END) AS bet_won
      FROM game_history
      WHERE game_type = 'blackjack'
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    // Top coin flip players
    const topCoinflipPlayers = await db.query(`
      SELECT u.id, u.username,
        COUNT(gh.id) AS games_played,
        SUM(CASE WHEN gh.won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(gh.bet_amount) AS total_bet,
        SUM(CASE WHEN gh.won = TRUE THEN gh.bet_amount ELSE -gh.bet_amount END) AS player_net
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      WHERE gh.game_type = 'coinflip'
      GROUP BY u.id
      ORDER BY games_played DESC
      LIMIT 10
    `);

    // Top blackjack players
    const topBlackjackPlayers = await db.query(`
      SELECT u.id, u.username,
        COUNT(gh.id) AS games_played,
        SUM(CASE WHEN gh.won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(gh.bet_amount) AS total_bet,
        SUM(CASE WHEN gh.won = TRUE THEN gh.bet_amount ELSE -gh.bet_amount END) AS player_net
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      WHERE gh.game_type = 'blackjack'
      GROUP BY u.id
      ORDER BY games_played DESC
      LIMIT 10
    `);

    // Plinko totals
    const plinkoTotalsRow = await db.queryOne(`
      SELECT 
        COUNT(1) AS total_games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        COUNT(DISTINCT user_id) AS unique_players,
        SUM(bet_amount) AS total_bet,
        AVG(CAST(result AS NUMERIC)) AS avg_multiplier,
        MAX(CAST(result AS NUMERIC)) AS max_multiplier,
        MIN(CAST(result AS NUMERIC)) AS min_multiplier
      FROM game_history
      WHERE game_type = 'plinko'
    `);

    const plinkoTotals = plinkoTotalsRow ? {
      total_games: Number(plinkoTotalsRow.total_games || 0),
      wins: Number(plinkoTotalsRow.wins || 0),
      losses: Number(plinkoTotalsRow.losses || 0),
      unique_players: Number(plinkoTotalsRow.unique_players || 0),
      total_bet: Number(parseFloat(plinkoTotalsRow.total_bet || 0).toFixed(2)),
      avg_multiplier: Number(parseFloat(plinkoTotalsRow.avg_multiplier || 0).toFixed(2)),
      max_multiplier: Number(parseFloat(plinkoTotalsRow.max_multiplier || 0).toFixed(2)),
      min_multiplier: Number(parseFloat(plinkoTotalsRow.min_multiplier || 0).toFixed(2)),
      win_rate: plinkoTotalsRow.total_games ? Number(((plinkoTotalsRow.wins || 0) / plinkoTotalsRow.total_games * 100).toFixed(2)) : 0,
    } : {
      total_games: 0, wins: 0, losses: 0, unique_players: 0, total_bet: 0, avg_multiplier: 0, max_multiplier: 0, min_multiplier: 0, win_rate: 0
    };

    // Calculate Plinko house profit separately
    const plinkoGames = await db.query(`
      SELECT bet_amount, CAST(result AS NUMERIC) AS multiplier
      FROM game_history
      WHERE game_type = 'plinko'
    `);

    let plinkoHouseProfit = 0;
    plinkoGames.forEach(game => {
      const payout = parseFloat(game.bet_amount) * parseFloat(game.multiplier);
      plinkoHouseProfit += parseFloat(game.bet_amount) - payout;
    });

    plinkoTotals.house_profit = Number(plinkoHouseProfit.toFixed(2));

    // Plinko games by day (last 14 days)
    const plinkoByDay = await db.query(`
      SELECT created_at::date AS day,
        COUNT(1) AS games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        SUM(bet_amount) AS total_bet,
        AVG(CAST(result AS NUMERIC)) AS avg_multiplier
      FROM game_history
      WHERE game_type = 'plinko'
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    // Top plinko players
    const topPlinkoPlayers = await db.query(`
      SELECT u.id, u.username,
        COUNT(gh.id) AS games_played,
        SUM(CASE WHEN gh.won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(gh.bet_amount) AS total_bet,
        AVG(CAST(gh.result AS NUMERIC)) AS avg_multiplier,
        MAX(CAST(gh.result AS NUMERIC)) AS max_multiplier
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      WHERE gh.game_type = 'plinko'
      GROUP BY u.id
      ORDER BY games_played DESC
      LIMIT 10
    `);

    // Plinko risk distribution
    const plinkoRiskDistribution = await db.query(`
      SELECT 
        choice->>'risk' AS risk_level,
        choice->>'rows' AS rows,
        COUNT(1) AS games,
        AVG(CAST(result AS NUMERIC)) AS avg_multiplier,
        SUM(bet_amount) AS total_bet
      FROM game_history
      WHERE game_type = 'plinko'
      GROUP BY risk_level, rows
      ORDER BY games DESC
    `);

    // Crash totals
    const crashTotalsRow = await db.queryOne(`
      SELECT 
        COUNT(1) AS total_games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        COUNT(DISTINCT user_id) AS unique_players,
        SUM(bet_amount) AS total_bet,
        AVG(CAST(result AS NUMERIC)) AS avg_crash_point,
        MAX(CAST(result AS NUMERIC)) AS max_crash_point,
        MIN(CAST(result AS NUMERIC)) AS min_crash_point
      FROM game_history
      WHERE game_type = 'crash'
    `);

    const crashTotals = crashTotalsRow ? {
      total_games: Number(crashTotalsRow.total_games || 0),
      wins: Number(crashTotalsRow.wins || 0),
      losses: Number(crashTotalsRow.losses || 0),
      unique_players: Number(crashTotalsRow.unique_players || 0),
      total_bet: Number(parseFloat(crashTotalsRow.total_bet || 0).toFixed(2)),
      avg_crash_point: Number(parseFloat(crashTotalsRow.avg_crash_point || 0).toFixed(2)),
      max_crash_point: Number(parseFloat(crashTotalsRow.max_crash_point || 0).toFixed(2)),
      min_crash_point: Number(parseFloat(crashTotalsRow.min_crash_point || 0).toFixed(2)),
      win_rate: crashTotalsRow.total_games ? Number(((crashTotalsRow.wins || 0) / crashTotalsRow.total_games * 100).toFixed(2)) : 0,
    } : {
      total_games: 0, wins: 0, losses: 0, unique_players: 0, total_bet: 0, avg_crash_point: 0, max_crash_point: 0, min_crash_point: 0, win_rate: 0
    };

    // Calculate Crash house profit and payout separately
    const crashGames = await db.query(`
      SELECT bet_amount, won, choice, CAST(result AS NUMERIC) AS crash_point
      FROM game_history
      WHERE game_type = 'crash'
    `);

    let crashHouseProfit = 0;
    let crashTotalPayout = 0;
    crashGames.forEach(game => {
      const betAmount = parseFloat(game.bet_amount);
      if (game.won) {
        // Player won - parse cashOutAt from choice
        let cashOutAt = 1.0;
        try {
          const choice = typeof game.choice === 'string' ? JSON.parse(game.choice) : game.choice;
          cashOutAt = parseFloat(choice.cashOutAt || 1.0);
        } catch (e) {
          console.error('Failed to parse crash game choice:', e);
        }
        const payout = betAmount * cashOutAt;
        crashTotalPayout += payout;
        crashHouseProfit += betAmount - payout;
      } else {
        // Player lost - house keeps entire bet
        crashHouseProfit += betAmount;
      }
    });

    crashTotals.house_profit = Number(crashHouseProfit.toFixed(2));
    crashTotals.total_payout = Number(crashTotalPayout.toFixed(2));
    crashTotals.actual_rtp = crashTotals.total_bet > 0 
      ? Number((crashTotalPayout / crashTotals.total_bet * 100).toFixed(2))
      : 0;

    // Crash games by day (last 14 days)
    const crashByDay = await db.query(`
      SELECT created_at::date AS day,
        COUNT(1) AS games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN won = FALSE THEN 1 ELSE 0 END) AS losses,
        SUM(bet_amount) AS total_bet,
        AVG(CAST(result AS NUMERIC)) AS avg_crash_point
      FROM game_history
      WHERE game_type = 'crash'
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    // Top crash players
    const topCrashPlayers = await db.query(`
      SELECT u.id, u.username,
        COUNT(gh.id) AS games_played,
        SUM(CASE WHEN gh.won = TRUE THEN 1 ELSE 0 END) AS wins,
        SUM(gh.bet_amount) AS total_bet,
        AVG(CAST(gh.result AS NUMERIC)) AS avg_crash_point,
        MAX(CAST(gh.result AS NUMERIC)) AS max_crash_point
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      WHERE gh.game_type = 'crash'
      GROUP BY u.id
      ORDER BY games_played DESC
      LIMIT 10
    `);

    const activity24h = await db.query(`
      SELECT action, COUNT(1) as count
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '1 day'
      GROUP BY action
      ORDER BY count DESC
    `);

    const volumeByDay = await db.query(`
      SELECT created_at::date as day,
        SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) as payment_volume,
        SUM(CASE WHEN transaction_type = 'swap' THEN amount ELSE 0 END) as swap_volume,
        COUNT(CASE WHEN transaction_type = 'payment' THEN 1 END) as payment_count,
        COUNT(CASE WHEN transaction_type = 'swap' THEN 1 END) as swap_count
      FROM transactions
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    const userGrowth = await db.query(`
      SELECT created_at::date as day, COUNT(1) as new_users
      FROM users
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    const topUsers = await db.query(`
      SELECT u.id, u.username,
        (SELECT COUNT(1) FROM transactions t WHERE t.from_user_id = u.id) as sent_count,
        (SELECT COUNT(1) FROM transactions t WHERE t.to_user_id = u.id) as received_count,
        (SELECT SUM(amount) FROM transactions t WHERE t.from_user_id = u.id AND t.transaction_type = 'payment') as total_sent,
        w.agon, w.stoneworks_dollar
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.disabled = FALSE
      ORDER BY (SELECT COUNT(1) FROM transactions t WHERE t.from_user_id = u.id OR t.to_user_id = u.id) DESC
      LIMIT 10
    `);

    const recentTransactions = await db.query(`
      SELECT t.*, 
        uf.username as from_username, 
        ut.username as to_username
      FROM transactions t
      LEFT JOIN users uf ON uf.id = t.from_user_id
      LEFT JOIN users ut ON ut.id = t.to_user_id
      ORDER BY t.created_at DESC
      LIMIT 20
    `);

    // Auction metrics
    const auctionTotals = await db.queryOne(`
      SELECT 
        (SELECT COUNT(1) FROM auctions) AS total_auctions,
        (SELECT COUNT(1) FROM auctions WHERE status = 'active') AS active_auctions,
        (SELECT COUNT(1) FROM auctions WHERE status = 'ended') AS ended_auctions,
        (SELECT COUNT(1) FROM auctions WHERE status = 'completed') AS completed_auctions,
        (SELECT COUNT(1) FROM bids) AS total_bids,
        (SELECT COUNT(DISTINCT bidder_id) FROM bids) AS unique_bidders,
        (SELECT AVG(current_bid) FROM auctions WHERE status IN ('completed', 'ended')) AS avg_final_bid,
        (SELECT SUM(current_bid) FROM auctions WHERE status = 'completed') AS total_auction_revenue,
        (SELECT AVG(bid_count) FROM (
          SELECT COUNT(1) as bid_count FROM bids GROUP BY auction_id
        ) AS subq) AS avg_bids_per_auction
    `);

    const auctionsByDay = await db.query(`
      SELECT created_at::date as day,
        COUNT(1) as auctions_created,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'completed' THEN current_bid ELSE 0 END) as revenue
      FROM auctions
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    const bidsByDay = await db.query(`
      SELECT created_at::date as day,
        COUNT(1) as bids_placed,
        COUNT(DISTINCT bidder_id) as unique_bidders
      FROM bids
      GROUP BY created_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    const topAuctions = await db.query(`
      SELECT a.id, a.item_name, a.rarity, a.starting_price, a.current_bid, a.status,
        u.username as seller_username,
        (SELECT COUNT(1) FROM bids WHERE auction_id = a.id) as bid_count
      FROM auctions a
      LEFT JOIN users u ON u.id = a.seller_id
      ORDER BY a.current_bid DESC
      LIMIT 10
    `);

    const topBidders = await db.query(`
      SELECT u.id, u.username,
        COUNT(DISTINCT b.auction_id) as auctions_participated,
        COUNT(b.id) as total_bids_placed,
        SUM(b.amount) as total_bid_amount,
        COUNT(CASE WHEN a.highest_bidder_id = u.id AND a.status = 'completed' THEN 1 END) as auctions_won
      FROM users u
      JOIN bids b ON b.bidder_id = u.id
      LEFT JOIN auctions a ON a.id = b.auction_id
      WHERE u.disabled = FALSE
      GROUP BY u.id
      ORDER BY auctions_won DESC, total_bids_placed DESC
      LIMIT 10
    `);

    const rarityDistribution = await db.query(`
      SELECT rarity, COUNT(1) as count,
        AVG(current_bid) as avg_price,
        SUM(CASE WHEN status = 'completed' THEN current_bid ELSE 0 END) as total_revenue
      FROM auctions
      GROUP BY rarity
      ORDER BY count DESC
    `);

    // Trading Analytics (All Assets)
    const tradingTotalsRow = await db.queryOne(`
      SELECT 
        COUNT(1) AS total_positions,
        COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_positions,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_positions,
        COUNT(DISTINCT user_id) AS unique_traders,
        SUM(margin_agon) FILTER (WHERE status = 'open') AS locked_margin,
        SUM(margin_agon) FILTER (WHERE status = 'closed') AS total_volume,
        SUM(realized_pnl) FILTER (WHERE status = 'closed') AS total_pnl,
        SUM(realized_pnl) FILTER (WHERE status = 'closed' AND realized_pnl > 0) AS total_profit,
        ABS(SUM(realized_pnl) FILTER (WHERE status = 'closed' AND realized_pnl < 0)) AS total_loss,
        COUNT(CASE WHEN status = 'closed' AND realized_pnl > 0 THEN 1 END) AS winning_positions,
        COUNT(CASE WHEN status = 'closed' AND realized_pnl < 0 THEN 1 END) AS losing_positions,
        AVG(leverage) AS avg_leverage,
        SUM(commission_agon) AS total_commissions,
        SUM(total_maintenance_fees) AS total_maintenance_fees
      FROM crypto_positions
    `);

    const tradingTotals = tradingTotalsRow ? {
      total_positions: Number(tradingTotalsRow.total_positions || 0),
      open_positions: Number(tradingTotalsRow.open_positions || 0),
      closed_positions: Number(tradingTotalsRow.closed_positions || 0),
      unique_traders: Number(tradingTotalsRow.unique_traders || 0),
      locked_margin: Number(tradingTotalsRow.locked_margin || 0),
      total_volume: Number(tradingTotalsRow.total_volume || 0),
      total_pnl: Number(tradingTotalsRow.total_pnl || 0),
      total_profit: Number(tradingTotalsRow.total_profit || 0),
      total_loss: Number(tradingTotalsRow.total_loss || 0),
      winning_positions: Number(tradingTotalsRow.winning_positions || 0),
      losing_positions: Number(tradingTotalsRow.losing_positions || 0),
      avg_leverage: Number(Number(tradingTotalsRow.avg_leverage || 0).toFixed(2)),
      win_rate: tradingTotalsRow.closed_positions > 0 
        ? Number(((tradingTotalsRow.winning_positions || 0) / tradingTotalsRow.closed_positions * 100).toFixed(2))
        : 0,
      total_commissions: Number(tradingTotalsRow.total_commissions || 0),
      total_maintenance_fees: Number(tradingTotalsRow.total_maintenance_fees || 0),
      total_fees: Number((tradingTotalsRow.total_commissions || 0)) + Number((tradingTotalsRow.total_maintenance_fees || 0)),
      // House P&L = inverse of player P&L + all commissions and fees
      house_pnl: Number(-(tradingTotalsRow.total_pnl || 0)) + Number((tradingTotalsRow.total_commissions || 0)) + Number((tradingTotalsRow.total_maintenance_fees || 0))
    } : {
      total_positions: 0, open_positions: 0, closed_positions: 0, unique_traders: 0,
      locked_margin: 0, total_volume: 0, total_pnl: 0, total_profit: 0, total_loss: 0,
      winning_positions: 0, losing_positions: 0, avg_leverage: 0, win_rate: 0, 
      total_commissions: 0, total_maintenance_fees: 0, total_fees: 0, house_pnl: 0
    };

    // Crypto positions by coin
    const cryptoByCoin = await db.query(`
      SELECT coin_id,
        COUNT(1) AS positions,
        COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_count,
        SUM(margin_agon) FILTER (WHERE status = 'closed') AS volume,
        SUM(realized_pnl) FILTER (WHERE status = 'closed') AS net_pnl
      FROM crypto_positions
      GROUP BY coin_id
      ORDER BY positions DESC
    `);

    // Trading positions by day (last 14 days)
    const tradingByDay = await db.query(`
      SELECT opened_at::date AS day,
        COUNT(1) AS positions_opened,
        SUM(margin_agon) AS volume,
        COUNT(CASE WHEN position_type = 'long' THEN 1 END) AS long_positions,
        COUNT(CASE WHEN position_type = 'short' THEN 1 END) AS short_positions
      FROM crypto_positions
      WHERE opened_at >= NOW() - INTERVAL '14 days'
      GROUP BY opened_at::date
      ORDER BY day DESC
      LIMIT 14
    `);

    // Top traders
    const topTraders = await db.query(`
      SELECT u.id, u.username,
        COUNT(cp.id) AS total_positions,
        COUNT(CASE WHEN cp.status = 'open' THEN 1 END) AS open_positions,
        COUNT(CASE WHEN cp.status = 'closed' THEN 1 END) AS closed_positions,
        SUM(cp.margin_agon) FILTER (WHERE cp.status = 'closed') AS total_volume,
        SUM(cp.realized_pnl) FILTER (WHERE cp.status = 'closed') AS net_pnl,
        COUNT(CASE WHEN cp.status = 'closed' AND cp.realized_pnl > 0 THEN 1 END) AS wins
      FROM users u
      JOIN crypto_positions cp ON cp.user_id = u.id
      WHERE u.disabled = FALSE
      GROUP BY u.id
      ORDER BY total_positions DESC
      LIMIT 10
    `);

    // Leverage distribution
    const leverageDistribution = await db.query(`
      SELECT 
        CASE 
          WHEN leverage < 2 THEN '1x'
          WHEN leverage < 3 THEN '2x'
          WHEN leverage < 5 THEN '3-4x'
          WHEN leverage < 8 THEN '5-7x'
          ELSE '8-10x'
        END AS leverage_range,
        COUNT(1) AS positions,
        AVG(leverage) AS avg_leverage,
        SUM(margin_agon) FILTER (WHERE status = 'closed') AS volume
      FROM crypto_positions
      GROUP BY leverage_range
      ORDER BY avg_leverage
    `);

    res.json({ 
      totals, 
      activity24h, 
      volumeByDay, 
      userGrowth,
      topUsers,
      recentTransactions,
      auctionTotals,
      auctionsByDay,
      bidsByDay,
      topAuctions,
      topBidders,
      rarityDistribution,
      coinflipTotals,
      coinflipByDay,
      topCoinflipPlayers,
      blackjackTotals,
      blackjackByDay,
      topBlackjackPlayers,
      plinkoTotals,
      plinkoByDay,
      topPlinkoPlayers,
      plinkoRiskDistribution,
      crashTotals,
      crashByDay,
      topCrashPlayers,
      tradingTotals,
      cryptoByCoin,
      tradingByDay,
      topTraders,
      leverageDistribution
    });
  } catch (e) {
    console.error('Metrics error:', e);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Activity logs (paginated)
router.get('/activity', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const rows = await db.query(
      `SELECT a.*, u.username
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    res.json({ activity: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get all invite codes
router.get('/invite-codes', async (req, res) => {
  try {
    const codes = await db.query(`
      SELECT ic.*, 
        creator.username as created_by_username,
        used_user.username as used_by_username
      FROM invite_codes ic
      LEFT JOIN users creator ON creator.id = ic.created_by
      LEFT JOIN users used_user ON used_user.id = ic.used_by
      ORDER BY ic.created_at DESC
    `);
    res.json({ codes });
  } catch (e) {
    console.error('Fetch invite codes error:', e);
    res.status(500).json({ error: 'Failed to fetch invite codes' });
  }
});

// Create new invite code
router.post('/invite-codes', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Check if code already exists
    const existing = await db.queryOne('SELECT id FROM invite_codes WHERE code = $1', [code]);
    if (existing) {
      return res.status(400).json({ error: 'This invite code already exists' });
    }

    // Create invite code
    const inserted = await db.queryOne('INSERT INTO invite_codes (code, created_by) VALUES ($1, $2) RETURNING id', [code, req.user.id]);
    
    // Log activity
    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_create_invite_code', JSON.stringify({ code })
    ]);

    // Fetch the created code with details
    const newCode = await db.queryOne(`
      SELECT ic.*, 
        creator.username as created_by_username
      FROM invite_codes ic
      LEFT JOIN users creator ON creator.id = ic.created_by
      WHERE ic.id = $1
    `, [inserted.id]);

    res.status(201).json({ code: newCode });
  } catch (e) {
    console.error('Create invite code error:', e);
    res.status(500).json({ error: 'Failed to create invite code' });
  }
});

// Generate random invite code
router.post('/invite-codes/generate', async (req, res) => {
  try {
    // Generate a random 8-character alphanumeric code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists (unlikely but possible)
    const existing = await db.queryOne('SELECT id FROM invite_codes WHERE code = $1', [code]);
    if (existing) {
      // Recursive retry if collision (very rare)
      return router.post('/invite-codes/generate')(req, res);
    }

    // Create invite code
    const inserted = await db.queryOne('INSERT INTO invite_codes (code, created_by) VALUES ($1, $2) RETURNING id', [code, req.user.id]);
    
    // Log activity
    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_generate_invite_code', JSON.stringify({ code })
    ]);

    // Fetch the created code with details
    const newCode = await db.queryOne(`
      SELECT ic.*, 
        creator.username as created_by_username
      FROM invite_codes ic
      LEFT JOIN users creator ON creator.id = ic.created_by
      WHERE ic.id = $1
    `, [inserted.id]);

    res.status(201).json({ code: newCode });
  } catch (e) {
    console.error('Generate invite code error:', e);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// Delete invite code (only if unused)
router.delete('/invite-codes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const code = await db.queryOne('SELECT code, is_used FROM invite_codes WHERE id = $1', [id]);
    if (!code) {
      return res.status(404).json({ error: 'Invite code not found' });
    }

    if (code.is_used) {
      return res.status(400).json({ error: 'Cannot delete used invite codes' });
    }

    await db.exec('DELETE FROM invite_codes WHERE id = $1', [id]);
    
    // Log activity
    await db.exec('INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)', [
      req.user.id, 'admin_delete_invite_code', JSON.stringify({ code: code.code })
    ]);

    res.json({ message: 'Invite code deleted successfully' });
  } catch (e) {
    console.error('Delete invite code error:', e);
    res.status(500).json({ error: 'Failed to delete invite code' });
  }
});

export default router;


