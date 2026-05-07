import React from 'react';

const TABS = [
  { value: 'for-you', label: 'For You' },
  { value: 'trending', label: 'Trending' },
  { value: 'recent', label: 'Recent' },
  { value: 'love', label: 'Love' },
  { value: 'college', label: 'College' },
  { value: 'secrets', label: 'Secrets' },
  { value: 'life', label: 'Life' },
];

const CategoryFilter = ({ selected, onChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5" data-testid="category-filter">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
            selected === tab.value
              ? 'bg-[#E63946] text-white shadow-[0_0_14px_rgba(230,57,70,0.3)]'
              : 'bg-[#1A1010] text-white/50 border border-white/[0.05] hover:text-white/80 hover:bg-white/[0.06]'
          }`}
          data-testid={`category-filter-${tab.value}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
