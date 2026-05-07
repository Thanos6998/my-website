import React from 'react';
import { Heart, MessageCircle, Bell } from 'lucide-react';

const NotificationsPage = () => {
  const notifications = [
    { id: 1, type: 'like', text: 'Someone liked your whisper', time: 'Just now', read: false },
    { id: 2, type: 'comment', text: 'New comment on your whisper', time: '5m ago', read: false },
    { id: 3, type: 'like', text: 'Your whisper is trending!', time: '1h ago', read: true },
  ];

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={18} className="text-[#E63946]" />;
      case 'comment': return <MessageCircle size={18} className="text-[#FFB703]" />;
      default: return <Bell size={18} className="text-white/30" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#050505] pb-20" data-testid="notifications-page">
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center px-5 h-14">
          <h1 className="text-xl font-black tracking-tight text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Notifications</h1>
        </div>
      </div>

      <div className="px-3 pt-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3.5 px-4 py-4 mb-2 rounded-xl transition-all ${
              !n.read ? 'bg-[#E63946]/[0.04] border border-[#E63946]/10' : 'bg-[#0F0A0A]/40 border border-white/[0.03]'
            }`}
            data-testid={`notification-${n.id}`}
          >
            <div className={`mt-0.5 p-2.5 rounded-full ${!n.read ? 'bg-[#1A1010]' : 'bg-[#0F0A0A]'}`}>
              {getIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-relaxed ${!n.read ? 'text-white font-medium' : 'text-white/40'}`}>
                {n.text}
              </p>
              <p className="text-xs text-white/20 mt-1">{n.time}</p>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-[#E63946] mt-2 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
