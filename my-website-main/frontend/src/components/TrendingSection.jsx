import React from 'react';
import { Fire, TrendUp } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';

const TrendingSection = ({ confessions, onConfessionClick }) => {
  if (!confessions || confessions.length === 0) return null;

  return (
    <div className="mb-6 animate-fade-in" data-testid="trending-section">
      <div className="flex items-center gap-2 mb-4">
        <div className="gradient-purple-blue p-2 rounded-xl">
          <Fire size={24} weight="fill" className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Trending Today
          </h2>
          <p className="text-xs text-gradient font-semibold">Most popular confessions</p>
        </div>
      </div>

      <div className="space-y-3">
        {confessions.slice(0, 3).map((confession, index) => (
          <div
            key={confession.id}
            onClick={() => onConfessionClick(confession)}
            className="glass-card rounded-2xl p-4 cursor-pointer hover-lift btn-press relative overflow-hidden"
            data-testid={`trending-card-${index}`}
          >
            <div className="absolute top-3 left-3 gradient-purple-blue w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shadow-lg">
              {index + 1}
            </div>

            <div className="ml-12">
              <p className="text-white font-semibold text-sm line-clamp-2 mb-2">{confession.text}</p>
              
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <TrendUp size={14} weight="bold" />
                  {confession.likes} likes
                </span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;