import React from 'react';
import { Shield, ShieldOff, LogOut, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Header = ({ safeMode, onSafeModeToggle }) => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? All your data will be deleted.')) {
      logout();
      toast.success('Logged out successfully');
    }
  };

  return (
    <header className="sticky top-0 z-30 glass backdrop-blur-xl border-b border-white/10 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 animate-pulse-glow"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left: Logo & Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white glow-text mb-1" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="app-title">
            Gupt Kura Nepal
          </h1>
          <p className="text-xs sm:text-sm text-gradient font-semibold">Share your secrets anonymously 🤫</p>
        </div>

        {/* Right: User Info & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Info */}
          <div className="hidden sm:flex items-center gap-2 glass-card px-4 py-2 rounded-full">
            <div className="w-8 h-8 rounded-full gradient-purple-blue flex items-center justify-center font-bold text-white text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white flex items-center gap-1">
                {user?.name}
                {isAdmin && <Crown size={14} className="text-yellow-400" />}
              </p>
              <p className="text-xs text-gray-400">{user?.age} years old</p>
            </div>
          </div>

          {/* Safe Mode Toggle */}
          <button
            onClick={onSafeModeToggle}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold transition-all btn-press ${
              safeMode
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300 shadow-lg'
            }`}
            data-testid="safe-mode-toggle"
            title="Toggle Safe Mode"
          >
            {safeMode ? <Shield size={16} /> : <ShieldOff size={16} />}
            <span className="hidden sm:inline text-sm">{safeMode ? 'Safe' : 'All'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold transition-all btn-press border border-red-500/30"
            data-testid="logout-btn"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline text-sm">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
    </header>
  );
};

export default Header;