-- Migration: Add NFT Marketplace tables
-- Created: 2024-10-29
-- Description: Creates tables for NFT minting, trading, bidding, and transaction tracking

-- Create NFT categories enum
CREATE TYPE nft_category AS ENUM (
  'nation_flags',
  'notable_builds', 
  'memes_moments',
  'player_avatars',
  'event_commemorations',
  'achievement_badges',
  'map_art',
  'historical_documents',
  'other'
);

-- Create NFT transaction type enum
CREATE TYPE nft_transaction_type AS ENUM (
  'mint',
  'sale',
  'bid_accepted',
  'transfer',
  'list',
  'unlist'
);

-- Create nfts table
CREATE TABLE IF NOT EXISTS nfts (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category nft_category NOT NULL DEFAULT 'other',
  stoneworks_tags TEXT[], -- Array of Stoneworks-related tags
  edition_number INTEGER DEFAULT 1,
  edition_total INTEGER DEFAULT 1,
  
  -- Trading info
  is_listed BOOLEAN NOT NULL DEFAULT FALSE,
  ask_price DECIMAL(20, 2), -- Immediate buy price in Agon
  
  -- Metadata
  mint_price DECIMAL(20, 2) NOT NULL DEFAULT 100.00, -- Cost to mint (100 Agon)
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  listed_at TIMESTAMPTZ,
  last_traded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_edition CHECK (edition_number > 0 AND edition_number <= edition_total),
  CONSTRAINT valid_ask_price CHECK (ask_price IS NULL OR ask_price > 0),
  CONSTRAINT listed_requires_price CHECK (
    (is_listed = FALSE) OR 
    (is_listed = TRUE AND ask_price IS NOT NULL)
  )
);

-- Create nft_bids table
CREATE TABLE IF NOT EXISTS nft_bids (
  id SERIAL PRIMARY KEY,
  nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
  bidder_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bid_amount DECIMAL(20, 2) NOT NULL CHECK (bid_amount > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, cancelled, accepted, expired
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate active bids from same user
  CONSTRAINT unique_active_bid UNIQUE (nft_id, bidder_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create nft_transactions table
CREATE TABLE IF NOT EXISTS nft_transactions (
  id SERIAL PRIMARY KEY,
  nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL for mints
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(20, 2) NOT NULL CHECK (amount >= 0),
  fee DECIMAL(20, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount DECIMAL(20, 2) NOT NULL CHECK (net_amount >= 0), -- amount - fee
  transaction_type nft_transaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  bid_id INTEGER REFERENCES nft_bids(id) ON DELETE SET NULL,
  notes TEXT
);

-- Create nft_likes table for user favorites
CREATE TABLE IF NOT EXISTS nft_likes (
  id SERIAL PRIMARY KEY,
  nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_like UNIQUE (nft_id, user_id)
);

-- Create indexes for performance

-- NFTs indexes
CREATE INDEX IF NOT EXISTS idx_nfts_creator ON nfts(creator_id);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_nfts_category ON nfts(category);
CREATE INDEX IF NOT EXISTS idx_nfts_listed ON nfts(is_listed) WHERE is_listed = TRUE;
CREATE INDEX IF NOT EXISTS idx_nfts_minted_at ON nfts(minted_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfts_ask_price ON nfts(ask_price) WHERE is_listed = TRUE;
CREATE INDEX IF NOT EXISTS idx_nfts_tags ON nfts USING GIN(stoneworks_tags);

-- Composite index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_nfts_marketplace ON nfts(is_listed, category, ask_price) 
  WHERE is_listed = TRUE;

-- Bids indexes
CREATE INDEX IF NOT EXISTS idx_bids_nft ON nft_bids(nft_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON nft_bids(bidder_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON nft_bids(nft_id, bid_amount DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bids_created ON nft_bids(created_at DESC);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_nft ON nft_transactions(nft_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON nft_transactions(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON nft_transactions(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON nft_transactions(transaction_type, created_at DESC);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_nft ON nft_likes(nft_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON nft_likes(user_id);

-- Add table comments
COMMENT ON TABLE nfts IS 'Stores all minted NFTs with metadata and trading information';
COMMENT ON TABLE nft_bids IS 'Tracks all bids placed on NFTs with orderbook functionality';
COMMENT ON TABLE nft_transactions IS 'Complete history of all NFT-related transactions';
COMMENT ON TABLE nft_likes IS 'User favorites/likes for NFTs';

COMMENT ON COLUMN nfts.creator_id IS 'Original minter of the NFT';
COMMENT ON COLUMN nfts.current_owner_id IS 'Current owner of the NFT';
COMMENT ON COLUMN nfts.stoneworks_tags IS 'Array of Stoneworks-related tags (nations, events, players)';
COMMENT ON COLUMN nfts.edition_number IS 'Edition number if part of a series (1 of 10, etc)';
COMMENT ON COLUMN nfts.ask_price IS 'Immediate buy price in Agon, NULL if not listed';
COMMENT ON COLUMN nft_bids.status IS 'active, cancelled, accepted, expired';
COMMENT ON COLUMN nft_transactions.net_amount IS 'Amount after platform fee deduction';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER nfts_updated_at
  BEFORE UPDATE ON nfts
  FOR EACH ROW
  EXECUTE FUNCTION update_nft_updated_at();

CREATE TRIGGER nft_bids_updated_at
  BEFORE UPDATE ON nft_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_nft_updated_at();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_nft_views(nft_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE nfts SET view_count = view_count + 1 WHERE id = nft_id_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_nft_views IS 'Efficiently increments view count for an NFT';
