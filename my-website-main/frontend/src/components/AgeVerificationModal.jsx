import React from 'react';
import { X } from 'lucide-react';
import { setAgeVerified } from '../utils/session';

const AgeVerificationModal = ({ onConfirm, onCancel }) => {
  const handleConfirm = () => {
    setAgeVerified(true);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E14]/80 backdrop-blur-sm">
      <div className="bg-[#151A22] border border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="age-verification-title">Age Verification</h2>
          <button onClick={onCancel} className="text-[#8B949E] hover:text-white transition-colors" data-testid="age-verification-close-btn">
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-[#8B949E] mb-4">This content is for 18+ users only.</p>
          <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4 mb-4">
            <p className="text-[#FF3B30] text-sm font-semibold mb-2">⚠️ Adult Content Warning</p>
            <p className="text-[#8B949E] text-sm">You are about to view content that may contain adult material. By continuing, you confirm that you are at least 18 years old.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 text-white rounded-full px-6 py-3 font-semibold hover:bg-white/20 transition-colors"
            data-testid="age-verification-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-[#FF4433] text-white rounded-full px-6 py-3 font-bold hover:bg-[#FF6B5E] transition-colors focus:ring-2 focus:ring-[#FF4433]/50"
            data-testid="age-verification-confirm-btn"
          >
            I am 18+
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerificationModal;