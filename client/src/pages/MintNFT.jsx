import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { walletAPI, nftAPI } from '../services/api';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import { useToast } from '../components/Toast';
import Breadcrumb from '../components/Breadcrumb';

const MintNFT = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [wallet, setWallet] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    stoneworks_tags: '',
    edition_number: 1,
    edition_total: 1
  });
  
  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const MINT_COST = 100;

  useEffect(() => {
    loadWallet();
    loadCategories();
  }, []);

  const loadWallet = async () => {
    try {
      const res = await walletAPI.getWallet();
      setWallet(res.data.wallet);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await nftAPI.getCategories();
      setCategories(res.data.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError('Image must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile) {
      showError('Please select an image');
      return;
    }
    
    if (!formData.name.trim()) {
      showError('Please enter an NFT name');
      return;
    }
    
    if (wallet.agon < MINT_COST) {
      showError(`Insufficient Agon balance. Minting costs ${MINT_COST} Agon.`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create FormData
      const data = new FormData();
      data.append('image', imageFile);
      data.append('name', formData.name.trim());
      data.append('description', formData.description.trim());
      data.append('category', formData.category);
      data.append('stoneworks_tags', formData.stoneworks_tags);
      data.append('edition_number', formData.edition_number);
      data.append('edition_total', formData.edition_total);
      
      const res = await nftAPI.mintNFT(data);
      
      success('NFT minted successfully! 🎉');
      navigate(`/nft/${res.data.nft.id}`);
    } catch (error) {
      console.error('Minting error:', error);
      showError(error.response?.data?.message || 'Failed to mint NFT');
    } finally {
      setIsLoading(false);
    }
  };

  const breadcrumbItems = [
    { label: 'NFT Market', href: '/nft-market' },
    { label: 'Mint NFT' }
  ];

  return (
    <div className="min-h-screen bg-phantom-bg-primary">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-phantom-text-primary mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Mint NFT
          </h1>
          <p className="text-phantom-text-secondary">
            Create a new NFT for {getCurrencySymbol('agon')} {MINT_COST} Agon
          </p>
        </div>

        {/* Balance Display */}
        <div className="mb-6 p-4 bg-phantom-bg-secondary border border-phantom-border rounded-xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-phantom-text-secondary">Your Agon Balance</p>
              <p className="text-2xl font-bold text-phantom-text-primary">
                {getCurrencySymbol('agon')} {formatCurrency(wallet?.agon || 0)}
              </p>
            </div>
            {wallet && wallet.agon < MINT_COST && (
              <div className="text-red-500 text-sm">
                ⚠️ Insufficient balance
              </div>
            )}
          </div>
        </div>

        {/* Mint Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl p-8">
            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-phantom-text-primary font-medium mb-2">
                NFT Image *
              </label>
              <div className="border-2 border-dashed border-phantom-border rounded-xl p-6 text-center hover:border-phantom-accent-primary transition-colors">
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-96 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg className="w-16 h-16 mx-auto mb-4 text-phantom-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="file"
                      id="image"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="image"
                      className="cursor-pointer inline-block px-6 py-3 bg-phantom-accent-primary hover:bg-phantom-accent-secondary text-white font-medium rounded-xl transition-colors"
                    >
                      Choose Image
                    </label>
                    <p className="mt-2 text-sm text-phantom-text-tertiary">
                      JPEG, PNG, GIF, or WEBP (Max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="mb-6">
              <label className="block text-phantom-text-primary font-medium mb-2">
                NFT Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Adramis National Flag"
                maxLength={255}
                required
                className="w-full px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary placeholder:text-phantom-text-tertiary focus:border-phantom-accent-primary focus:outline-none"
              />
              <p className="mt-1 text-sm text-phantom-text-tertiary">
                {formData.name.length}/255 characters
              </p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-phantom-text-primary font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your NFT and its connection to Stoneworks..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary placeholder:text-phantom-text-tertiary focus:border-phantom-accent-primary focus:outline-none resize-none"
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-phantom-text-primary font-medium mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stoneworks Tags */}
            <div className="mb-6">
              <label className="block text-phantom-text-primary font-medium mb-2">
                Stoneworks Tags
              </label>
              <input
                type="text"
                name="stoneworks_tags"
                value={formData.stoneworks_tags}
                onChange={handleInputChange}
                placeholder="e.g., Adramis, Nation, Flag (comma-separated)"
                className="w-full px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary placeholder:text-phantom-text-tertiary focus:border-phantom-accent-primary focus:outline-none"
              />
              <p className="mt-1 text-sm text-phantom-text-tertiary">
                Separate multiple tags with commas
              </p>
            </div>

            {/* Edition Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-phantom-text-primary font-medium mb-2">
                  Edition Number
                </label>
                <input
                  type="number"
                  name="edition_number"
                  value={formData.edition_number}
                  onChange={handleInputChange}
                  min={1}
                  max={formData.edition_total}
                  className="w-full px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-phantom-text-primary font-medium mb-2">
                  Total Editions
                </label>
                <input
                  type="number"
                  name="edition_total"
                  value={formData.edition_total}
                  onChange={handleInputChange}
                  min={1}
                  className="w-full px-4 py-3 rounded-xl bg-phantom-bg-tertiary border-2 border-phantom-border text-phantom-text-primary focus:border-phantom-accent-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Mint Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/nft-market')}
                className="flex-1 px-6 py-3 bg-phantom-bg-tertiary hover:bg-phantom-bg-primary border-2 border-phantom-border text-phantom-text-primary font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !imageFile || !formData.name.trim() || (wallet && wallet.agon < MINT_COST)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Minting...
                  </span>
                ) : (
                  `Mint NFT (${MINT_COST} Agon)`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MintNFT;
