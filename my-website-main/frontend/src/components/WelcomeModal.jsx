import React from 'react';
import { Heart, MessageCircle, Flag, ShieldCheck } from 'lucide-react';

const WelcomeModal = ({ onClose }) => {
  const handleGetStarted = () => {
    localStorage.setItem('gupt_kura_welcomed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E14]/90 backdrop-blur-sm animate-fade-in" data-testid="welcome-modal">
      <div className="bg-[#151A22] border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome to<br/>Gupt Kura Nepal 🇳🇵
          </h1>
          <p className="text-[#8B949E] text-lg">Share your thoughts anonymously, safely</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-4 bg-[#0B0E14] rounded-xl p-4">
            <div className="bg-[#FF4433]/20 p-3 rounded-full flex-shrink-0">
              <Heart size={24} className="text-[#FF4433]" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">100% Anonymous</h3>
              <p className="text-[#8B949E] text-sm">No signup needed. Share confessions freely without revealing your identity.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-[#0B0E14] rounded-xl p-4">
            <div className="bg-[#34C759]/20 p-3 rounded-full flex-shrink-0">
              <ShieldCheck size={24} className="text-[#34C759]" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Safe Mode Protection</h3>
              <p className="text-[#8B949E] text-sm">Adult content is blurred by default. You control what you see.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-[#0B0E14] rounded-xl p-4">
            <div className="bg-[#F5D786]/20 p-3 rounded-full flex-shrink-0">
              <MessageCircle size={24} className="text-[#F5D786]" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Connect & React</h3>
              <p className="text-[#8B949E] text-sm">React, comment, and chat privately with others anonymously.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-[#0B0E14] rounded-xl p-4">
            <div className="bg-[#FF9F0A]/20 p-3 rounded-full flex-shrink-0">
              <Flag size={24} className="text-[#FF9F0A]" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Report & Stay Safe</h3>
              <p className="text-[#8B949E] text-sm">Report inappropriate content. We take community safety seriously.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleGetStarted}
          className="w-full bg-[#FF4433] text-white rounded-full px-8 py-4 font-bold text-lg hover:bg-[#FF6B5E] transition-colors focus:ring-2 focus:ring-[#FF4433]/50"
          data-testid="welcome-get-started-btn"
        >
          Get Started 🚀
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;