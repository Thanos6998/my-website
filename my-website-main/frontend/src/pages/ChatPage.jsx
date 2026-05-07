import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChatPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-4" data-testid="chat-page">
      <div className="text-center max-w-md">
        <div className="bg-[#151A22] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>Private Chat</h2>
          <p className="text-[#8B949E] mb-6">
            Private chat feature coming soon! You'll be able to have anonymous one-on-one conversations.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#FF4433] text-white rounded-full px-6 py-3 font-bold hover:bg-[#FF6B5E] transition-colors focus:ring-2 focus:ring-[#FF4433]/50"
            data-testid="back-to-home-btn"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;