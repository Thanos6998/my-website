import React, { useState, useRef } from 'react';
import { X, Image, Video, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const categories = [
  { value: 'love',    label: 'Love'    },
  { value: 'college', label: 'College' },
  { value: 'secrets', label: 'Secrets' },
  { value: 'life',    label: 'Life'    },
];
const cities = ['Kathmandu','Pokhara','Lalitpur','Bhaktapur','Biratnagar','Birgunj'];

const CreateConfessionModal = ({ onClose, onSuccess }) => {
  const [text, setText]               = useState('');
  const [category, setCategory]       = useState('love');
  const [nickname, setNickname]       = useState('');
  const [isAdult, setIsAdult]         = useState(false);
  const [city, setCity]               = useState('');
  const [media, setMedia]             = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showMore, setShowMore]       = useState(false);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sizeMB = file.size / (1024 * 1024);
    if (file.type.startsWith('image/') && sizeMB > 2)  { setError('Image must be under 2MB'); return; }
    if (file.type.startsWith('video/') && sizeMB > 10) { setError('Video must be under 10MB'); return; }
    setMedia(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setMediaPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) { setError('Write something first'); return; }
    if (text.length > 1500) { setError('Max 1500 characters'); return; }

    setLoading(true);
    setError('');

    try {
      // ✅ Always use FormData so Content-Type is multipart/form-data
      // Backend reads text/category/etc from query string, media from form body
      const formData = new FormData();
      if (media) {
        formData.append('media', media);
      } else {
        // ✅ When no media, we must NOT send an empty FormData with no file key
        // Backend File(None) handles missing file gracefully — just don't append anything
      }

      const params = new URLSearchParams();
      params.append('text', text.trim());
      params.append('category', category);
      params.append('is_adult', String(isAdult));
      if (nickname.trim()) params.append('nickname', nickname.trim());
      if (city)            params.append('city', city);

      console.log('[Confession] Posting to /confessions?' + params.toString());
      console.log('[Confession] Has media:', !!media, media?.name, media?.type);

      const res = await api.post(
        `/confessions?${params.toString()}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000, // 30s for video uploads
        }
      );

      console.log('[Confession] Posted successfully:', res.data?.id);
      toast.success('Whisper shared! 🤫');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('[Confession] Post failed:', err.response?.status, err.response?.data);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors come as array
        setError(detail.map(d => d.msg).join(', '));
      } else {
        setError(detail || err.message || 'Failed to post. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0F0A0A] rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up border-t border-white/[0.08]"
        onClick={e => e.stopPropagation()}
        data-testid="create-confession-modal"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/10 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 text-sm font-medium transition-colors"
            data-testid="close-modal-btn"
          >Cancel</button>
          <h2 className="text-base font-bold text-white" style={{ fontFamily:"'Playfair Display', serif" }}>
            New Whisper
          </h2>
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="bg-[#E63946] text-white rounded-full px-5 py-1.5 text-sm font-bold hover:bg-[#D62828] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            data-testid="submit-confession-btn"
          >
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-6">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Share your secret..."
            rows={5}
            className="w-full bg-transparent text-lg text-white placeholder:text-white/20 resize-none outline-none min-h-[120px] mb-1 leading-relaxed"
            maxLength={1500}
            autoFocus
            data-testid="confession-text-input"
          />
          <p className="text-xs text-white/20 mb-4">{text.length}/1500</p>

          {/* Categories */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                  category === cat.value
                    ? 'bg-[#E63946] text-white shadow-[0_0_12px_rgba(230,57,70,0.25)]'
                    : 'bg-[#1A1010] text-white/40 border border-white/[0.05] hover:text-white/70 hover:bg-white/[0.06]'
                }`}
                data-testid={`category-${cat.value}`}
              >{cat.label}</button>
            ))}
          </div>

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative mb-4 rounded-xl overflow-hidden">
              {media.type.startsWith('image/') ? (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
              ) : (
                <video src={mediaPreview} controls className="w-full max-h-48 object-cover rounded-xl" />
              )}
              <button
                type="button"
                onClick={() => { setMedia(null); setMediaPreview(null); }}
                className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full hover:bg-black/80 transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1.5 text-white/35 hover:text-white/60 cursor-pointer p-2.5 rounded-full hover:bg-white/[0.05] transition-all">
                <Image size={20} />
                <span className="text-xs font-medium">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMediaChange}
                  className="hidden"
                  data-testid="image-upload-input"
                />
              </label>
              <label className="flex items-center gap-1.5 text-white/35 hover:text-white/60 cursor-pointer p-2.5 rounded-full hover:bg-white/[0.05] transition-all">
                <Video size={20} />
                <span className="text-xs font-medium">Video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleMediaChange}
                  className="hidden"
                  data-testid="video-upload-input"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="text-white/35 hover:text-white/60 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              More <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* More options */}
          {showMore && (
            <div className="mt-4 space-y-3 animate-fade-in">
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Custom nickname (optional)"
                className="w-full bg-[#1A1010] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/40 outline-none placeholder:text-white/25 transition-all"
                data-testid="nickname-input"
              />
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-[#1A1010] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/40 outline-none transition-all"
                data-testid="city-select"
              >
                <option value="">Select city (optional)</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="flex items-center gap-3 bg-[#E63946]/[0.04] border border-[#E63946]/10 rounded-xl px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdult}
                  onChange={e => setIsAdult(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#E63946]"
                  data-testid="adult-content-checkbox"
                />
                <span className="text-sm text-white/60">Adult content (18+)</span>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 bg-[#E63946]/10 border border-[#E63946]/20 rounded-xl p-3" data-testid="error-message">
              <p className="text-[#E63946] text-sm">{error}</p>
            </div>
          )}

          {/* Upload progress hint */}
          {loading && media && (
            <div className="mt-3 flex items-center gap-2 text-white/30 text-xs">
              <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
              Uploading {media.type.startsWith('video/') ? 'video' : 'photo'}…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateConfessionModal;
