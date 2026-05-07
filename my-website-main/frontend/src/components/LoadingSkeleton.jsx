import React from 'react';

const LoadingSkeleton = () => {
  return (
    <div data-testid="loading-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="mx-3 my-2 rounded-2xl bg-[#0F0A0A]/60 border border-white/[0.05] px-5 py-5">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-10 h-10 rounded-full skeleton-shimmer" />
            <div className="flex-1">
              <div className="h-4 w-28 skeleton-shimmer rounded-full mb-1.5" />
              <div className="h-3 w-20 skeleton-shimmer rounded-full" />
            </div>
          </div>
          <div className="space-y-2.5 mb-4">
            <div className="h-4 w-full skeleton-shimmer rounded-full" />
            <div className="h-4 w-4/5 skeleton-shimmer rounded-full" />
            <div className="h-4 w-2/3 skeleton-shimmer rounded-full" />
          </div>
          <div className="flex items-center gap-8 pt-3 border-t border-white/[0.04]">
            <div className="h-4 w-14 skeleton-shimmer rounded-full" />
            <div className="h-4 w-18 skeleton-shimmer rounded-full" />
            <div className="h-4 w-14 skeleton-shimmer rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
