import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { nftAPI } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import NFTCardSkeleton from '../components/NFTCardSkeleton';
import MarketStats from '../components/MarketStats';
import QuickFilters from '../components/QuickFilters';

const NFTMarket = () => {
  const navigate = useNavigate();
  const [nfts, setNfts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuickFilter, setActiveQuickFilter] = useState('new');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 24,
    offset: 0,
    hasMore: false
  });
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    listed_only: 'true',
    search: '',
    min_price: '',
    max_price: '',
    sort_by: 'minted_at',
    order: 'desc'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadNFTs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.offset]);

  const loadCategories = async () => {
    try {
      const res = await nftAPI.getCategories();
      setCategories(res.data.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadNFTs = async () => {
    setIsLoading(true);
    try {
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
      const res = await nftAPI.getAllNFTs(params);
      setNfts(res.data.nfts);
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination.total,
        hasMore: res.data.pagination.hasMore
      }));
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleQuickFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadNFTs();
  };

  const loadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  return (
    <div className="min-h-screen bg-phantom-bg-primary">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-phantom-text-primary mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              NFT Marketplace
            </h1>
            <p className="text-phantom-text-secondary">
              Discover, collect, and trade unique Stoneworks NFTs
            </p>
          </div>
          <Link
            to="/nft/mint"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all"
          >
            + Mint NFT
          </Link>
        </div>

        {/* Market Stats */}
        {!isLoading && nfts.length > 0 && <MarketStats nfts={nfts} />}

        {/* Quick Filters */}
        <QuickFilters 
          onFilterChange={handleQuickFilterChange}
          activeFilter={activeQuickFilter}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6 sticky top-4">
              <h2 className="text-xl font-bold text-phantom-text-primary mb-4">Filters</h2>
              
              {/* Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search NFTs..."
                  className="w-full px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary placeholder:text-phantom-text-tertiary focus:border-phantom-accent-primary focus:outline-none text-sm"
                />
              </form>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                  Status
                </label>
                <select
                  value={filters.listed_only}
                  onChange={(e) => handleFilterChange('listed_only', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none text-sm"
                >
                  <option value="">All NFTs</option>
                  <option value="true">Listed Only</option>
                </select>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                  Price Range (Agon)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={filters.min_price}
                    onChange={(e) => handleFilterChange('min_price', e.target.value)}
                    placeholder="Min"
                    className="px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary placeholder:text-phantom-text-tertiary focus:border-phantom-accent-primary focus:outline-none text-sm"
                  />
                  <input
                    type="number"
                    value={filters.max_price}
                    onChange={(e) => handleFilterChange('max_price', e.target.value)}
                    placeholder="Max"
                    className="px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary placeholder:text-phantom-text-tertiary focus:border-phantom-accent-primary focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none text-sm mb-2"
                >
                  <option value="minted_at">Recently Minted</option>
                  <option value="ask_price">Price</option>
                  <option value="view_count">Most Viewed</option>
                  <option value="like_count">Most Liked</option>
                  <option value="name">Name</option>
                </select>
                <select
                  value={filters.order}
                  onChange={(e) => handleFilterChange('order', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-phantom-bg-tertiary border border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none text-sm"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setFilters({
                    category: '',
                    listed_only: 'true',
                    search: '',
                    min_price: '',
                    max_price: '',
                    sort_by: 'minted_at',
                    order: 'desc'
                  });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-2 bg-phantom-bg-tertiary hover:bg-phantom-bg-primary border border-phantom-border text-phantom-text-secondary rounded-lg transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* NFT Grid */}
          <div className="lg:col-span-3">
            {/* Results Count */}
            <div className="mb-4 text-phantom-text-secondary">
              {pagination.total} {pagination.total === 1 ? 'NFT' : 'NFTs'} found
            </div>

            {isLoading && pagination.offset === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <NFTCardSkeleton key={i} />
                ))}
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-24 h-24 mx-auto mb-4 text-phantom-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-phantom-text-secondary mb-2">No NFTs found</p>
                <p className="text-sm text-phantom-text-tertiary">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {nfts.map((nft) => (
                    <Link
                      key={nft.id}
                      to={`/nft/${nft.id}`}
                      className="bg-phantom-bg-secondary border-2 border-phantom-border hover:border-phantom-accent-primary rounded-2xl overflow-hidden transition-all hover:shadow-glow group"
                    >
                      {/* NFT Image */}
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

                      {/* NFT Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-phantom-text-primary mb-1 truncate">
                              {nft.name}
                            </h3>
                            <p className="text-sm text-phantom-text-secondary">
                              by {nft.creator_username}
                            </p>
                          </div>
                          {nft.edition_total > 1 && (
                            <div className="ml-2 px-2 py-1 bg-phantom-accent-primary/20 text-phantom-accent-primary text-xs rounded">
                              {nft.edition_number}/{nft.edition_total}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        {nft.is_listed && nft.ask_price ? (
                          <div className="mb-3">
                            <p className="text-xs text-phantom-text-tertiary mb-1">Price</p>
                            <p className="text-xl font-bold text-phantom-accent-primary">
                              {getCurrencySymbol('agon')} {formatCurrency(nft.ask_price)}
                            </p>
                          </div>
                        ) : (
                          <div className="mb-3">
                            <p className="text-sm text-phantom-text-tertiary">Not listed</p>
                          </div>
                        )}

                        {/* Bids */}
                        {nft.active_bids_count > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-phantom-text-tertiary">
                              {nft.active_bids_count} {nft.active_bids_count === 1 ? 'bid' : 'bids'}
                            </span>
                            {nft.highest_bid && (
                              <span className="text-phantom-text-secondary">
                                Highest: {getCurrencySymbol('agon')} {formatCurrency(nft.highest_bid)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-phantom-border text-xs text-phantom-text-tertiary">
                          <span>❤️ {nft.like_count}</span>
                          <span>👁️ {nft.view_count}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Load More */}
                {pagination.hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="px-8 py-3 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTMarket;
