const NFTCardSkeleton = () => {
  return (
    <div className="bg-phantom-bg-secondary border-2 border-phantom-border rounded-2xl overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square bg-phantom-bg-tertiary"></div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-6 bg-phantom-bg-tertiary rounded w-3/4"></div>
        
        {/* Creator */}
        <div className="h-4 bg-phantom-bg-tertiary rounded w-1/2"></div>
        
        {/* Price */}
        <div className="space-y-1">
          <div className="h-3 bg-phantom-bg-tertiary rounded w-1/4"></div>
          <div className="h-7 bg-phantom-bg-tertiary rounded w-2/3"></div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 pt-3 border-t border-phantom-border">
          <div className="h-3 bg-phantom-bg-tertiary rounded w-12"></div>
          <div className="h-3 bg-phantom-bg-tertiary rounded w-12"></div>
        </div>
      </div>
    </div>
  );
};

export default NFTCardSkeleton;
