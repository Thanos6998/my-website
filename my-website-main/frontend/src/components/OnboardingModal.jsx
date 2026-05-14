import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const OnboardingModal = () => {
  const { onboard } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      onboard(name, age);
      toast.success('Welcome to Whispero!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#050505]" data-testid="onboarding-modal">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, #E63946 0%, transparent 50%), radial-gradient(circle at 80% 70%, #FFB703 0%, transparent 50%)'
      }} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/logo.png"
              alt="Whispero Nepal"
              className="w-28 h-28 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Whispero Nepal 🇳🇵
          </h1>
          <p className="text-white/40 text-sm font-medium">Your secrets. Anonymous. Always.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-white/50 mb-2 tracking-wide">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-[#0F0A0A] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/40 transition-all outline-none placeholder:text-white/20 text-sm"
              required
              data-testid="name-input"
            />
          </div>

          {/* Age */}
          <div>
            <label htmlFor="age" className="block text-sm font-semibold text-white/50 mb-2 tracking-wide">
              Your Age
            </label>
            <input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="10-99"
              min="10"
              max="99"
              className="w-full bg-[#0F0A0A] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/40 transition-all outline-none placeholder:text-white/20 text-sm"
              required
              data-testid="age-input"
            />
          </div>

          {/* Info box */}
          <div className="bg-[#E63946]/[0.04] border border-[#E63946]/10 rounded-xl p-4">
            <p className="text-white/40 text-xs leading-relaxed">
              Everything auto-deletes after 24 hours. Logout anytime to vanish instantly.
            </p>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
                data-testid="terms-checkbox"
              />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                agreed
                  ? 'bg-[#E63946] border-[#E63946]'
                  : 'bg-transparent border-white/20 group-hover:border-white/40'
              }`}>
                {agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-[#E63946] hover:text-[#ff6b6b] underline transition-colors">
                Terms & Conditions
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-[#E63946] hover:text-[#ff6b6b] underline transition-colors">
                Privacy Policy
              </a>
              {' '}of Whispero Nepal.
            </p>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !name.trim() || !age || !agreed}
            className="w-full bg-gradient-to-r from-[#E63946] to-[#D62828] text-white rounded-xl px-6 py-3.5 font-bold text-sm hover:from-[#D62828] hover:to-[#C82A36] transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(230,57,70,0.3)]"
            data-testid="onboard-submit-btn"
          >
            {loading ? 'Loading...' : (
              <>Enter Whispero <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <p className="text-center text-white/15 text-xs mt-8">
          By continuing, you agree to our{' '}
          <a href="/guidelines" target="_blank" className="text-white/30 hover:text-white/50 underline transition-colors">
            community guidelines
          </a>
        </p>
      </div>
    </div>
  );
};

export default OnboardingModal;