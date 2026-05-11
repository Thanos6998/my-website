import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 bg-black border-b border-white/10">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
            👁
          </div>

          <h1 className="text-white text-xl font-bold">
            Whispero <span className="text-sm">NP</span>
          </h1>
        </Link>

        {/* Menu Button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="text-white"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Side Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-[260px] bg-[#0f0f0f] z-50 transition-transform duration-300 border-l border-white/10 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white text-lg font-bold">
            Menu
          </h2>

          <button onClick={() => setMenuOpen(false)}>
            <X className="text-white" size={22} />
          </button>
        </div>

        <div className="flex flex-col p-3">

          <Link
            to="/about"
            className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>

          <Link
            to="/guidelines"
            className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition"
            onClick={() => setMenuOpen(false)}
          >
            Guidelines
          </Link>

          <Link
            to="/privacy"
            className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition"
            onClick={() => setMenuOpen(false)}
          >
            Privacy Policy
          </Link>

          <Link
            to="/terms"
            className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition"
            onClick={() => setMenuOpen(false)}
          >
            Terms & Conditions
          </Link>

          <Link
            to="/contact"
            className="text-[#d1d1d1] hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition"
            onClick={() => setMenuOpen(false)}
          >
            Contact Us
          </Link>

          <button
            className="mt-5 flex items-center gap-2 text-red-400 hover:text-red-500 px-4 py-3 rounded-xl hover:bg-red-500/10 transition"
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>
      </div>
    </>
  );
}

export default Header;