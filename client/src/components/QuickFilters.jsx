const QuickFilters = ({ onFilterChange, activeFilter }) => {
  const filters = [
    {
      id: 'all',
      label: 'All NFTs',
      icon: '🎨',
      filters: { listed_only: '', sort_by: 'minted_at', order: 'desc' }
    },
    {
      id: 'new',
      label: 'New Listings',
      icon: '✨',
      filters: { listed_only: 'true', sort_by: 'minted_at', order: 'desc' }
    },
    {
      id: 'low-to-high',
      label: 'Price: Low to High',
      icon: '📈',
      filters: { listed_only: 'true', sort_by: 'ask_price', order: 'asc' }
    },
    {
      id: 'high-to-low',
      label: 'Price: High to Low',
      icon: '📉',
      filters: { listed_only: 'true', sort_by: 'ask_price', order: 'desc' }
    },
    {
      id: 'most-viewed',
      label: 'Most Viewed',
      icon: '👁️',
      filters: { listed_only: '', sort_by: 'view_count', order: 'desc' }
    },
    {
      id: 'most-liked',
      label: 'Most Liked',
      icon: '❤️',
      filters: { listed_only: '', sort_by: 'like_count', order: 'desc' }
    }
  ];

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-phantom-text-secondary mb-3">Quick Filters</p>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.filters)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeFilter === filter.id
                ? 'bg-phantom-accent-primary text-white shadow-glow'
                : 'bg-phantom-bg-tertiary text-phantom-text-secondary hover:bg-phantom-bg-primary hover:text-phantom-text-primary border border-phantom-border'
            }`}
          >
            <span className="mr-2">{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickFilters;
