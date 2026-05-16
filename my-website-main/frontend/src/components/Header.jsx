import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut, Bell } from 'lucide-react';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = [];

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 bg-black border-b border-white/10">

        {/* Logo — unchanged */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
            👁
          </div>
          <div>
            <h1 className="text-white text-xl font-bold leading-tight">
              Whispero <span className="text-sm">NP</span>
            </h1>
            <p className="text-[10px] text-white/35 leading-tight tracking-wide">
              Speak Freely. Stay Anonymous.
            </p>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <Bell size={18} />
            </button>

            {notifications.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#E63946] border-2 border-black flex items-center justify-center">
                <span className="text-[9px] text-white font-bold">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              </div>
            )}

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-11 w-72 bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                  </div>
                  <div className="px-4 py-8 text-center">
                    <Bell size={28} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/30 text-sm">No notifications yet</p>
                    <p className="text-white/20 text-xs mt-1">Likes and comments will appear here</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Menu Button — unchanged */}
          <button onClick={() => setMenuOpen(true)} className="text-white">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMenuOpen(false)} />
      )}

      <div className={`fixed top-0 right-0 h-full w-[260px] bg-[#0f0f0f] z-50 transition-transform duration-300 border-l border-white/10 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white text-lg font-bold">Menu</h2>
          <button onClick={() => setMenuOpen(false)}>
            <X className="text-white" size={22} />
          </button>
        </div>
        <div className="flex flex-col p-3">
          <Link to="/about" className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition" onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/guidelines" className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition" onClick={() => setMenuOpen(false)}>Guidelines</Link>
          <Link to="/privacy" className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition" onClick={() => setMenuOpen(false)}>Privacy Policy</Link>
          <Link to="/terms" className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition" onClick={() => setMenuOpen(false)}>Terms & Conditions</Link>
          <Link to="/contact" className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition" onClick={() => setMenuOpen(false)}>Contact Us</Link>
          <button className="mt-5 flex items-center gap-2 text-red-400 hover:text-red-500 px-4 py-3 rounded-xl hover:bg-red-500/10 transition">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default Header;