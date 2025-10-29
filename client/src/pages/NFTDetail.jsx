import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { nftAPI, walletAPI, authAPI } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import ImageLightbox from '../components/ImageLightbox';
import ShareNFT from '../components/ShareNFT';
import Breadcrumb from '../components/Breadcrumb';

const NFTDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nft, setNFT] = useState(null);
  const [bids, setBids] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLightbox, setShowLightbox] = useState(false);
  
  // Action states
  const [bidAmount, setBidAmount] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks
  const { success, error: showError } = useToast();
  const { addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    loadNFTDetails();
    loadWallet();
    loadUser();
  }, [id]);

  const loadNFTDetails = async () => {
    setIsLoading(true);
    try {
      const res = await nftAPI.getNFTById(id);
      setNFT(res.data.nft);
      setBids(res.data.bids);
      setTransactions(res.data.transactions);
      if (res.data.nft.ask_price) {
        setAskPrice(res.data.nft.ask_price);
      }
      // Add to recently viewed
      addToRecentlyViewed(res.data.nft);
    } catch (error) {
      console.error('Failed to load NFT:', error);
      showError('NFT not found');
      navigate('/nft-market');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const res = await walletAPI.getWallet();
      setWallet(res.data.wallet);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const loadUser = async () => {
    try {
      const res = await authAPI.getProfile();
      setCurrentUser(res.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const isOwner = currentUser && nft && currentUser.id === nft.owner_id;
  const canBuy = !isOwner && nft?.is_listed && nft?.ask_price;
  const canBid = !isOwner && nft;

  const handleListNFT = async () => {
    if (!askPrice || parseFloat(askPrice) <= 0) {
      alert('Please enter a valid ask price');
      return;
    }

    setIsSubmitting(true);
    try {
      await nftAPI.listNFT(id, parseFloat(askPrice));
      alert('NFT listed successfully!');
      loadNFTDetails();
    } catch (error) {
      console.error('List error:', error);
      alert(error.response?.data?.message || 'Failed to list NFT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlistNFT = async () => {
    if (!confirm('Are you sure you want to unlist this NFT?')) return;

    setIsSubmitting(true);
    try {
      await nftAPI.unlistNFT(id);
      alert('NFT unlisted successfully!');
      loadNFTDetails();
    } catch (error) {
      console.error('Unlist error:', error);
      alert(error.response?.data?.message || 'Failed to unlist NFT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    const bid = parseFloat(bidAmount);
    if (wallet.agon < bid) {
      alert('Insufficient Agon balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await nftAPI.placeBid(id, bid);
      alert('Bid placed successfully!');
      setBidAmount('');
      loadNFTDetails();
      loadWallet();
    } catch (error) {
      console.error('Bid error:', error);
      alert(error.response?.data?.message || 'Failed to place bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptBid = async (bidId) => {
    if (!confirm('Accept this bid? The NFT will be transferred immediately.')) return;

    setIsSubmitting(true);
    try {
      const res = await nftAPI.acceptBid(id, bidId);
      alert(`Bid accepted! You received ${getCurrencySymbol('agon')} ${formatCurrency(res.data.sale.received)} Agon`);
      loadNFTDetails();
      loadWallet();
    } catch (error) {
      console.error('Accept bid error:', error);
      alert(error.response?.data?.message || 'Failed to accept bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNFT = async () => {
    if (!confirm(`Buy this NFT for ${getCurrencySymbol('agon')} ${formatCurrency(nft.ask_price)} Agon?`)) return;

    if (wallet.agon < nft.ask_price) {
      alert('Insufficient Agon balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await nftAPI.buyNFT(id);
      alert('NFT purchased successfully!');
      loadNFTDetails();
      loadWallet();
    } catch (error) {
      console.error('Buy error:', error);
      alert(error.response?.data?.message || 'Failed to buy NFT');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-phantom-bg-primary">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-phantom-accent-primary"></div>
          <p className="mt-4 text-phantom-text-secondary">Loading NFT...</p>
        </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="min-h-screen bg-phantom-bg-primary">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-phantom-text-secondary">NFT not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-phantom-bg-primary">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-phantom-text-secondary hover:text-phantom-accent-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image */}
          <div>
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl overflow-hidden">
              <img
                src={nft.image_url}
                alt={nft.name}
                className="w-full aspect-square object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzJhMmEzYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjY2NzgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>

            {/* Description */}
            {nft.description && (
              <div className="mt-6 bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-phantom-text-primary mb-2">Description</h3>
                <p className="text-phantom-text-secondary whitespace-pre-wrap">{nft.description}</p>
              </div>
            )}

            {/* Transaction History */}
            <div className="mt-6 bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-phantom-text-primary mb-4">Transaction History</h3>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-sm text-phantom-text-tertiary">No transactions yet</p>
                ) : (
                  transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-phantom-text-primary capitalize">{tx.transaction_type.replace('_', ' ')}</span>
                        <span className="text-phantom-text-tertiary ml-2">
                          {tx.from_username ? `${tx.from_username} → ${tx.to_username}` : tx.to_username}
                        </span>
                      </div>
                      {tx.amount > 0 && (
                        <span className="text-phantom-accent-primary font-medium">
                          {getCurrencySymbol('agon')} {formatCurrency(tx.amount)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Details & Trading */}
          <div>
            {/* NFT Info */}
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-phantom-text-primary mb-2">{nft.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-phantom-text-secondary">
                    <Link to={`/user/${nft.creator_id}`} className="hover:text-phantom-accent-primary">
                      By {nft.creator_username}
                    </Link>
                    {nft.creator_id !== nft.owner_id && (
                      <>
                        <span>•</span>
                        <Link to={`/user/${nft.owner_id}`} className="hover:text-phantom-accent-primary">
                          Owned by {nft.owner_username}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                {nft.edition_total > 1 && (
                  <div className="px-3 py-1 bg-phantom-accent-primary/20 text-phantom-accent-primary rounded-lg">
                    {nft.edition_number}/{nft.edition_total}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 py-4 border-y border-phantom-border">
                <div>
                  <p className="text-xs text-phantom-text-tertiary mb-1">Views</p>
                  <p className="text-lg font-bold text-phantom-text-primary">{nft.view_count}</p>
                </div>
                <div>
                  <p className="text-xs text-phantom-text-tertiary mb-1">Likes</p>
                  <p className="text-lg font-bold text-phantom-text-primary">{nft.like_count}</p>
                </div>
                <div>
                  <p className="text-xs text-phantom-text-tertiary mb-1">Category</p>
                  <p className="text-lg font-bold text-phantom-text-primary capitalize">{nft.category.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Tags */}
              {nft.stoneworks_tags && nft.stoneworks_tags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-phantom-text-tertiary mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {nft.stoneworks_tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-phantom-bg-tertiary text-phantom-text-secondary text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price & Actions */}
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6 mb-6">
              {nft.is_listed && nft.ask_price ? (
                <div className="mb-6">
                  <p className="text-sm text-phantom-text-tertiary mb-1">Current Price</p>
                  <p className="text-4xl font-bold text-phantom-accent-primary">
                    {getCurrencySymbol('agon')} {formatCurrency(nft.ask_price)}
                  </p>
                  <p className="text-sm text-phantom-text-tertiary mt-1">
                    Platform fee: 2.5% ({getCurrencySymbol('agon')} {formatCurrency(nft.ask_price * 0.025)})
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-lg text-phantom-text-secondary">Not listed for sale</p>
                </div>
              )}

              {/* Owner Actions */}
              {isOwner && (
                <div className="space-y-4">
                  {nft.is_listed ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                          Update Ask Price
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={askPrice}
                            onChange={(e) => setAskPrice(e.target.value)}
                            placeholder="Ask price in Agon"
                            className="flex-1 px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none"
                          />
                          <button
                            onClick={handleListNFT}
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleUnlistNFT}
                        disabled={isSubmitting}
                        className="w-full px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        Unlist NFT
                      </button>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                        List for Sale
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={askPrice}
                          onChange={(e) => setAskPrice(e.target.value)}
                          placeholder="Ask price in Agon"
                          className="flex-1 px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none"
                        />
                        <button
                          onClick={handleListNFT}
                          disabled={isSubmitting}
                          className="px-6 py-3 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          List
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Buyer Actions */}
              {!isOwner && (
                <div className="space-y-4">
                  {canBuy && (
                    <button
                      onClick={handleBuyNFT}
                      disabled={isSubmitting || !wallet || wallet.agon < nft.ask_price}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {wallet && wallet.agon < nft.ask_price ? 'Insufficient Balance' : 'Buy Now'}
                    </button>
                  )}

                  {canBid && (
                    <div>
                      <label className="block text-sm font-medium text-phantom-text-primary mb-2">
                        Place Bid
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder="Bid amount in Agon"
                          className="flex-1 px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none"
                        />
                        <button
                          onClick={handlePlaceBid}
                          disabled={isSubmitting || !bidAmount || !wallet}
                          className="px-6 py-3 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          Bid
                        </button>
                      </div>
                      {wallet && (
                        <p className="text-xs text-phantom-text-tertiary mt-1">
                          Balance: {getCurrencySymbol('agon')} {formatCurrency(wallet.agon)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bid Orderbook */}
            <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-phantom-text-primary mb-4">
                Bids ({bids.length})
              </h3>
              {bids.length === 0 ? (
                <p className="text-sm text-phantom-text-tertiary">No bids yet</p>
              ) : (
                <div className="space-y-3">
                  {bids.map((bid, idx) => (
                    <div key={bid.id} className="flex justify-between items-center p-3 bg-phantom-bg-tertiary rounded-lg">
                      <div>
                        <p className="text-phantom-text-primary font-medium">
                          {getCurrencySymbol('agon')} {formatCurrency(bid.bid_amount)}
                        </p>
                        <p className="text-xs text-phantom-text-tertiary">
                          by {bid.bidder_username}
                        </p>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleAcceptBid(bid.id)}
                          disabled={isSubmitting}
                          className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          Accept
                        </button>
                      )}
                      {idx === 0 && (
                        <span className="text-xs text-phantom-accent-primary font-medium">Highest</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetail;
