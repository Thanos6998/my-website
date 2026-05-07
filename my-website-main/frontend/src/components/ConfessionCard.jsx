import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Flag, MoreHorizontal, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarColor, getInitials } from '../utils/identity';
import { getAgeVerified, getSafeMode } from '../utils/session';
import AgeVerificationModal from './AgeVerificationModal';
import api, { API } from '../utils/api';
import { toast } from 'sonner';

const ConfessionCard = ({ confession, onCommentClick, onReport }) => {
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [adultRevealed, setAdultRevealed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(confession.likes || 0);
  const [animateLike, setAnimateLike] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const colors = getAvatarColor(confession.nickname);
  const initials = getInitials(confession.nickname);
  const safeMode = getSafeMode();
  const isAdult = confession.is_adult;
  const shouldBlur = isAdult && safeMode && !adultRevealed;

  const handleLike = async () => {
    try {
      const res = await api.post(`/confessions/${confession.id}/react`, { type: 'like' });
      if (res.data.action === 'removed' || liked) {
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        setLiked(true);
        setLikeCount(prev => prev + 1);
        setAnimateLike(true);
        setTimeout(() => setAnimateLike(false), 300);
      }
    } catch (e) {
      toast.error('Failed to react');
    }
  };

  const handleShare = async () => {
    const text = confession.text.slice(0, 120) + (confession.text.length > 120 ? '...' : '');
    const shareData = { title: 'Whispero Nepal', text, url: window.location.origin };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`"${text}"\n\n- Anonymous on Whispero Nepal\n${shareData.url}`);
        toast.success('Copied to clipboard!');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(`${text}\n${shareData.url}`);
          toast.success('Copied to clipboard!');
        } catch (clipErr) {
          toast.info('Long press to copy the text');
        }
      }
    }
  };

  const handleAdultReveal = () => {
    if (getAgeVerified()) setAdultRevealed(true);
    else setShowAgeModal(true);
  };

  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(new Date(confession.created_at), { addSuffix: true }); } catch (e) { timeAgo = 'just now'; }

  return (
    <>
      <article className="feed-item card-hover bg-[#0F0A0A]/60 border-b border-white/[0.04] mx-3 my-2 rounded-2xl px-5 py-5 border border-white/[0.05]" data-testid="confession-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg ring-2 ring-white/[0.08]"
              style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
              data-testid="avatar"
            >
              {initials}
            </div>
            <div>
              <p className="text-[15px] font-bold text-white" data-testid="confession-nickname">{confession.nickname}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30" data-testid="confession-time">{timeAgo}</span>
                {confession.city && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="text-xs text-white/30">{confession.city}</span>
                  </>
                )}
                <span className="text-white/15">·</span>
                <span className="text-xs text-[#FFB703] font-semibold capitalize bg-[#FFB703]/10 px-2 py-0.5 rounded-full">{confession.category}</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="text-white/30 hover:text-white/60 p-1.5 rounded-full hover:bg-white/[0.05] transition-all" data-testid="more-menu-btn">
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-[#1A1010] border border-white/[0.08] rounded-xl shadow-2xl z-20 w-40 overflow-hidden animate-fade-in">
                <button onClick={() => { onReport(confession); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/60 hover:bg-white/[0.05] hover:text-[#E63946] transition-colors" data-testid="report-button">
                  <Flag size={16} /> Report
                </button>
              </div>
            )}
          </div>
        </div>

        {isAdult && (
          <div className="mb-2">
            <span className="bg-[#E63946]/10 text-[#E63946] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#E63946]/20" data-testid="adult-badge">18+</span>
          </div>
        )}

        {/* Content */}
        <p className="text-[15px] leading-relaxed text-white/85 mb-3" data-testid="confession-text">{confession.text}</p>

        {/* Media */}
        {confession.media_url && (
          <div className="relative mb-3 rounded-xl overflow-hidden">
            {confession.media_type === 'image' ? (
              <img src={`${API}/files/${confession.media_url}`} alt="" className={`w-full max-h-[50vh] object-cover rounded-xl ${shouldBlur ? 'blur-3xl' : ''}`} loading="lazy" data-testid="confession-image" />
            ) : (
              <video src={`${API}/files/${confession.media_url}`} controls={!shouldBlur} muted className={`w-full max-h-[50vh] object-cover rounded-xl ${shouldBlur ? 'blur-3xl' : ''}`} data-testid="confession-video" />
            )}
            {shouldBlur && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl cursor-pointer" onClick={handleAdultReveal} data-testid="adult-blur-overlay">
                <Eye size={32} className="text-white/30 mb-2" />
                <p className="text-white/60 text-sm font-semibold">Tap to reveal 18+ content</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {(likeCount > 0 || confession.comments_count > 0) && (
          <div className="flex items-center gap-3 mb-3 text-xs text-white/35">
            {likeCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart size={12} fill={liked ? '#E63946' : 'none'} className={liked ? 'text-[#E63946]' : ''} />
                {likeCount}
              </span>
            )}
            {confession.comments_count > 0 && (
              <span>{confession.comments_count} comment{confession.comments_count !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-medium transition-all active:scale-95 px-3 py-1.5 rounded-full ${liked ? 'text-[#E63946] bg-[#E63946]/10' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`} data-testid="like-button">
            <Heart size={18} fill={liked ? '#E63946' : 'none'} className={animateLike ? 'animate-like-pop' : ''} />
            Like
          </button>
          <button onClick={() => onCommentClick(confession)} className="flex items-center gap-2 text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all text-sm font-medium active:scale-95 px-3 py-1.5 rounded-full" data-testid="comment-button">
            <MessageCircle size={18} />
            Comment
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all text-sm font-medium active:scale-95 px-3 py-1.5 rounded-full" data-testid="share-button">
            <Share2 size={18} />
            Share
          </button>
        </div>
      </article>

      {showAgeModal && <AgeVerificationModal onConfirm={() => { setShowAgeModal(false); setAdultRevealed(true); }} onCancel={() => setShowAgeModal(false)} />}
    </>
  );
};

export default ConfessionCard;
