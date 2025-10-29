import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { nftAPI, authAPI } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

const MyNFTs = () => {
  const [nfts, setNFTs] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('owned'); // owned, created

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNFTs();
    }
  }, [currentUser, tab]);

  const loadUser = async () => {
    try {
      const res = await authAPI.getProfile();
      setCurrentUser(res.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadNFTs = async () => {
    setIsLoading(true);
    try {
      const res = await nftAPI.getUserNFTs(currentUser.id, true);
      setNFTs(res.data.nfts);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNFTs = nfts.filter(nft => {
    if (tab === 'owned') {
      return nft.current_owner_id === currentUser?.id;
    } else {
      return nft.creator_id === currentUser?.id;
    }
  });

  return (
    <div className="min-h-screen bg-phantom-bg-primary">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-phantom-text-primary mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            My NFT Collection
          </h1>
          <p className="text-phantom-text-secondary">
            Manage your NFTs and view your portfolio
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6">
              <p className="text-sm text-phantom-text-tertiary mb-1">NFTs Owned</p>
              <p className="text-3xl font-bold text-phantom-text-primary">{stats.owned_count}</p>
            </div>
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6">
              <p className="text-sm text-phantom-text-tertiary mb-1">NFTs Created</p>
              <p className="text-3xl font-bold text-phantom-text-primary">{stats.created_count}</p>
            </div>
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6">
              <p className="text-sm text-phantom-text-tertiary mb-1">Portfolio Value</p>
              <p className="text-3xl font-bold text-phantom-accent-primary">
                {getCurrencySymbol('agon')} {formatCurrency(stats.total_value)}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b-2 border-phantom-border">
            <button
              onClick={() => setTab('owned')}
              className={`px-6 py-3 font-medium transition-colors ${
                tab === 'owned'
                  ? 'text-phantom-accent-primary border-b-2 border-phantom-accent-primary -mb-0.5'
                  : 'text-phantom-text-secondary hover:text-phantom-text-primary'
              }`}
            >
              Owned ({stats?.owned_count || 0})
            </button>
            <button
              onClick={() => setTab('created')}
              className={`px-6 py-3 font-medium transition-colors ${
                tab === 'created'
                  ? 'text-phantom-accent-primary border-b-2 border-phantom-accent-primary -mb-0.5'
                  : 'text-phantom-text-secondary hover:text-phantom-text-primary'
              }`}
            >
              Created ({stats?.created_count || 0})
            </button>
          </div>
        </div>

        {/* NFT Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-phantom-accent-primary"></div>
            <p className="mt-4 text-phantom-text-secondary">Loading your NFTs...</p>
          </div>
        ) : filteredNFTs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-24 h-24 mx-auto mb-4 text-phantom-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-phantom-text-secondary mb-4">
              {tab === 'owned' ? 'You don\'t own any NFTs yet' : 'You haven\'t created any NFTs yet'}
            </p>
            <Link
              to={tab === 'owned' ? '/nft-market' : '/nft/mint'}
              className="inline-block px-6 py-3 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white font-medium rounded-xl transition-colors"
            >
              {tab === 'owned' ? 'Browse Marketplace' : 'Mint Your First NFT'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNFTs.map((nft) => (
              <div key={nft.id} className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl overflow-hidden hover:border-phantom-accent-primary transition-all group">
                {/* NFT Image */}
                <Link to={`/nft/${nft.id}`} className="block">
                  <div className="aspect-square bg-phantom-bg-tertiary overflow-hidden">
                    <img
                      src={nft.thumbnail_url || nft.image_url}
                      alt={nft.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzJhMmEzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NzgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                      }}
                    />
                  </div>
                </Link>

                {/* NFT Info */}
                <div className="p-4">
                  <Link to={`/nft/${nft.id}`}>
                    <h3 className="text-lg font-bold text-phantom-text-primary mb-1 truncate hover:text-phantom-accent-primary transition-colors">
                      {nft.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-phantom-text-secondary mb-3">
                    {tab === 'owned' && nft.creator_id !== currentUser?.id && (
                      <span>by {nft.creator_username}</span>
                    )}
                    {tab === 'created' && nft.current_owner_id !== currentUser?.id && (
                      <span>owned by {nft.owner_username}</span>
                    )}
                  </p>

                  {/* Listing Status */}
                  {nft.is_listed && nft.ask_price ? (
                    <div className="mb-2">
                      <p className="text-xs text-phantom-text-tertiary">Listed for</p>
                      <p className="text-lg font-bold text-phantom-accent-primary">
                        {getCurrencySymbol('agon')} {formatCurrency(nft.ask_price)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-phantom-text-tertiary mb-2">Not listed</p>
                  )}

                  {/* Bids */}
                  {nft.active_bids_count > 0 && (
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-phantom-text-tertiary">
                        {nft.active_bids_count} {nft.active_bids_count === 1 ? 'bid' : 'bids'}
                      </span>
                      {nft.highest_bid && (
                        <span className="text-phantom-accent-primary font-medium">
                          Top: {getCurrencySymbol('agon')} {formatCurrency(nft.highest_bid)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-phantom-border">
                    <Link
                      to={`/nft/${nft.id}`}
                      className="block w-full px-4 py-2 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white text-center font-medium rounded-lg transition-colors text-sm"
                    >
                      {tab === 'owned' ? 'Manage' : 'View Details'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyNFTs;
