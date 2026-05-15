import React from 'react';
import { Home, TrendingUp, Plus, Users, MessageCircle, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home', testId: 'nav-home' },
  { path: '/trending', icon: TrendingUp, label: 'Trending', testId: 'nav-trending' },
  { path: '/create', icon: Plus, label: '', testId: 'nav-create', isCreate: true },
  { path: '/chat', icon: MessageCircle, label: 'Chat', testId: 'nav-chat' },
  { path: '/rooms', icon: Users, label: 'Rooms', testId: 'nav-rooms' },
];

const BottomNav = ({ onCreateClick, isAdmin }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (item) => {
    if (item.isCreate) {
      onCreateClick();
    } else {
      navigate(item.path);
    }
  };

  const items = isAdmin
    ? [...NAV_ITEMS, { path: '/admin/dashboard', icon: Shield, label: 'Admin', testId: 'nav-admin' }]
    : NAV_ITEMS;

  return (
    <nav
      className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 z-50 bg-[#050505]/90 backdrop-blur-xl border-t border-white/[0.05] pb-safe"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-[68px] px-3">
        {items.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          if (item.isCreate) {
            return (
              <button
                key="create"
                onClick={() => handleClick(item)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#E63946] to-[#D62828] text-white shadow-[0_4px_20px_rgba(230,57,70,0.4)] -translate-y-3 active:scale-90 transition-transform"
                data-testid={item.testId}
              >
                <Plus size={24} strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => handleClick(item)}
              className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition-all relative ${
                isActive
                  ? 'text-[#FFB703]'
                  : 'text-white/40 hover:text-white/60'
              }`}
              data-testid={item.testId}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />

              {item.label && (
                <span
                  className={`text-[10px] font-semibold tracking-wide ${
                    isActive ? 'text-[#FFB703]' : ''
                  }`}
                >
                  {item.label}
                </span>
              )}

              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#FFB703]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;