import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import axios from 'axios';
import { API } from '../utils/api';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, {
        email,
        password
      });
      localStorage.setItem('admin_token', response.data.access_token);
      navigate('/admin/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1773081834522-7c375c2d4a21?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NjZ8MHwxfHNlYXJjaHw0fHxoaW1hbGF5YXMlMjBuaWdodCUyMGRhcmslMjBtb29keXxlbnwwfHx8fDE3NzU0NjM0Nzh8MA&ixlib=rb-4.1.0&q=85)', backgroundSize: 'cover', backgroundPosition: 'center' }} data-testid="admin-login-page">
      <div className="absolute inset-0 bg-[#0B0E14]/80 backdrop-blur-sm"></div>
      <div className="relative bg-[#151A22] border border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF4433]/20 rounded-full mb-4">
            <Lock size={32} className="text-[#FF4433]" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Admin Login</h1>
          <p className="text-[#8B949E]">Gupt Kura Nepal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5C6777]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@guptkura.com"
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-[#FF4433] focus:ring-1 focus:ring-[#FF4433] transition-all outline-none placeholder:text-[#5C6777]"
                required
                data-testid="admin-email-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5C6777]" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-[#FF4433] focus:ring-1 focus:ring-[#FF4433] transition-all outline-none placeholder:text-[#5C6777]"
                required
                data-testid="admin-password-input"
              />
            </div>
          </div>

          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-3" data-testid="admin-login-error">
              <p className="text-[#FF3B30] text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4433] text-white rounded-full px-6 py-3 font-bold hover:bg-[#FF6B5E] transition-colors focus:ring-2 focus:ring-[#FF4433]/50 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="admin-login-submit-btn"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#5C6777] text-xs">
            Default: admin@guptkura.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;