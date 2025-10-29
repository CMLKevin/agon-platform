import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

const MarketStats = ({ nfts }) => {
  // Calculate stats from NFT data
  const listed = nfts.filter(nft => nft.is_listed && nft.ask_price);
  const prices = listed.map(nft => parseFloat(nft.ask_price));
  
  const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const totalVolume = listed.reduce((sum, nft) => sum + parseFloat(nft.ask_price || 0), 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const totalListed = listed.length;

  const stats = [
    {
      label: 'Floor Price',
      value: floorPrice > 0 ? `${getCurrencySymbol('agon')} ${formatCurrency(floorPrice)}` : 'N/A',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      label: 'Total Listed',
      value: totalListed.toLocaleString(),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Avg Price',
      value: avgPrice > 0 ? `${getCurrencySymbol('agon')} ${formatCurrency(avgPrice)}` : 'N/A',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: 'Total Volume',
      value: totalVolume > 0 ? `${getCurrencySymbol('agon')} ${formatCurrency(totalVolume)}` : 'N/A',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-xl p-4 hover:border-phantom-accent-primary/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-phantom-accent-primary/20 rounded-lg text-phantom-accent-primary">
              {stat.icon}
            </div>
            <p className="text-xs text-phantom-text-tertiary font-medium">{stat.label}</p>
          </div>
          <p className="text-lg font-bold text-phantom-text-primary">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default MarketStats;
