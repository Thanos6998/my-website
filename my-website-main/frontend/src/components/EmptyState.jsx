import React from 'react';
import { MessageCircle } from 'lucide-react';

const EmptyState = ({ icon: Icon = MessageCircle, title, description, action, onAction }) => {
  return (
    <div className="text-center py-24 px-8" data-testid="empty-state">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1A1010] rounded-2xl mb-5 border border-white/[0.05]">
        <Icon size={28} className="text-white/25" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>{title}</h3>
      <p className="text-white/35 text-sm mb-6 max-w-xs mx-auto leading-relaxed">{description}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="bg-[#E63946] text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-[#D62828] transition-all active:scale-95 shadow-[0_0_20px_rgba(230,57,70,0.2)]"
          data-testid="empty-state-action-btn"
        >
          {action}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
