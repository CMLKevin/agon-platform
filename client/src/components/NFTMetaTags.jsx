import { Helmet } from 'react-helmet-async';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

const NFTMetaTags = ({ nft }) => {
  if (!nft) return null;

  const baseUrl = window.location.origin;
  const nftUrl = `${baseUrl}/nft/${nft.id}`;
  const imageUrl = nft.image_url?.startsWith('http') 
    ? nft.image_url 
    : `${baseUrl}${nft.image_url}`;

  // Create description
  const priceText = nft.is_listed && nft.ask_price 
    ? `Listed for ${getCurrencySymbol('agon')} ${formatCurrency(nft.ask_price)}`
    : 'Not currently listed';
  
  const description = nft.description 
    ? `${nft.description.substring(0, 150)}${nft.description.length > 150 ? '...' : ''}`
    : `${nft.name} - ${priceText}. View this Stoneworks NFT on Agon Marketplace.`;

  const title = `${nft.name} | Agon NFT Marketplace`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={nftUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Agon NFT Marketplace" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={nftUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={imageUrl} />

      {/* Discord Embed */}
      <meta name="theme-color" content="#8B5CF6" />
      
      {/* Additional Meta for Better Previews */}
      <meta property="og:locale" content="en_US" />
      {nft.creator_username && (
        <meta property="article:author" content={nft.creator_username} />
      )}
      {nft.stoneworks_tags && nft.stoneworks_tags.length > 0 && (
        <meta property="article:tag" content={nft.stoneworks_tags.join(', ')} />
      )}
    </Helmet>
  );
};

export default NFTMetaTags;
