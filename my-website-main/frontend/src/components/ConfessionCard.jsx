import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Flag, MoreHorizontal, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarColor, getInitials } from '../utils/identity';
import { getAgeVerified, getSafeMode } from '../utils/session';
import AgeVerificationModal from './AgeVerificationModal';
import api, { API } from '../utils/api';
import { toast } from 'sonner';

const REACTIONS = [
  { type: 'like',    emoji: '❤️',  label: 'Like'  },
  { type: 'laugh',   emoji: '😂',  label: 'Haha'  },
  { type: 'sad',     emoji: '😢',  label: 'Sad'   },
  { type: 'angry',   emoji: '😡',  label: 'Angry' },
  { type: 'fire',    emoji: '🔥',  label: 'Fire'  },
];

const REACTION_EMOJIS = {
  like: '❤️', laugh: '😂', sad: '😢', angry: '😡', fire: '🔥', dislike: '👎',
};

let floatId = 0;

const ConfessionCard = ({ confession, onCommentClick, onReport }) => {
  const [showAgeModal, setShowAgeModal]   = useState(false);
  const [adultRevealed, setAdultRevealed] = useState(false);
  const [myReaction, setMyReaction]       = useState(null);
  const [likeCount, setLikeCount]         = useState(confession.likes || 0);
  const [showMenu, setShowMenu]           = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [floaters, setFloaters]           = useState([]);
  const [isMuted, setIsMuted]             = useState(true);
  const videoRef      = useRef(null);
  const holdTimer     = useRef(null);
  const reactionRef   = useRef(null);

  const colors   = getAvatarColor(confession.nickname);
  const initials = getInitials(confession.nickname);
  const safeMode = getSafeMode();
  const isAdult  = confession.is_adult;
  const shouldBlur = isAdult && safeMode && !adultRevealed;

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target)) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Autoplay video on scroll
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Add floating emoji
  const addFloater = (emoji) => {
    const id = floatId++;
    const x = 30 + Math.random() * 40;
    setFloaters(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== id));
    }, 1200);
  };

  // Optimistic reaction — instant UI update then sync with server
  const applyReaction = async (type) => {
    setShowReactions(false);
    const emoji = REACTION_EMOJIS[type] || '❤️';

    // Optimistic update
    if (myReaction === type) {
      setMyReaction(null);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      const wasReacted = !!myReaction;
      setMyReaction(type);
      if (!wasReacted) setLikeCount(prev => prev + 1);
      addFloater(emoji);
      addFloater(emoji);
      addFloater(emoji);
    }

    // Sync with server in background
    try {
      await api.post(`/confessions/${confession.id}/react`, { type });
    } catch (e) {
      toast.error('Failed to react');
    }
  };

  // Hold to show reaction picker
  const handleLikePressStart = () => {
    holdTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, 400);
  };

  const handleLikePressEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  // Quick tap = like
  const handleLikeTap = () => {
    if (showReactions) return;
    applyReaction('like');
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
        } catch { toast.info('Long press to copy the text'); }
      }
    }
  };

  const handleAdultReveal = () => {
    if (getAgeVerified()) setAdultRevealed(true);
    else setShowAgeModal(true);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(new Date(confession.created_at), { addSuffix: true }); }
  catch { timeAgo = 'just now'; }

  const reactionEmoji  = myReaction ? REACTION_EMOJIS[myReaction] : null;
  const isReacted      = !!myReaction;

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 0.8; transform: translateY(-60px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-90px) scale(0.8); }
        }
        @keyframes reactionPop {
          0%   { opacity: 0; transform: scale(0.5) translateY(8px); }
          60%  { transform: scale(1.15) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes likePop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .float-emoji {
          position: absolute;
          bottom: 32px;
          font-size: 22px;
          pointer-events: none;
          animation: floatUp 1.1s ease-out forwards;
          z-index: 50;
        }
        .reaction-picker {
          animation: reactionPop 0.22s ease-out forwards;
        }
        .like-pop {
          animation: likePop 0.3s ease-out;
        }
      `}</style>

      <article
        className="feed-item card-hover bg-[#0F0A0A]/60 border-b border-white/[0.04] mx-3 my-2 rounded-2xl px-5 py-5 border border-white/[0.05]"
        data-testid="confession-card"
      >
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

        {/* Text */}
        <p className="text-[15px] leading-relaxed text-white/85 mb-3" data-testid="confession-text">{confession.text}</p>

        {/* Media */}
        {confession.media_url && (
          <div className="relative mb-3 rounded-xl overflow-hidden">
            {confession.media_type === 'image' ? (
              <img
                src={confession.media_url.startsWith('http') ? confession.media_url : `${API}/files/${confession.media_url}`}
                alt=""
                className={`w-full max-h-[50vh] object-cover rounded-xl ${shouldBlur ? 'blur-3xl' : ''}`}
                loading="lazy"
                data-testid="confession-image"
              />
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={confession.media_url.startsWith('http') ? confession.media_url : `${API}/files/${confession.media_url}`}
                  muted={isMuted}
                  loop
                  playsInline
                  className={`w-full max-h-[50vh] object-cover rounded-xl ${shouldBlur ? 'blur-3xl' : ''}`}
                  data-testid="confession-video"
                />
                {!shouldBlur && (
                  <button
                    onClick={toggleMute}
                    className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-black/80 transition-all"
                  >
                    {isMuted ? '🔇 Tap for sound' : '🔊 Sound on'}
                  </button>
                )}
              </div>
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
                {reactionEmoji || '❤️'} {likeCount}
              </span>
            )}
            {confession.comments_count > 0 && (
              <span>{confession.comments_count} comment{confession.comments_count !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">

          {/* Like button with reaction picker */}
          <div className="relative" ref={reactionRef}>

            {/* Floating emojis */}
            {floaters.map(f => (
              <span
                key={f.id}
                className="float-emoji"
                style={{ left: `${f.x}%` }}
              >
                {f.emoji}
              </span>
            ))}

            {/* Reaction picker */}
            {showReactions && (
              <div className="reaction-picker absolute bottom-10 left-0 bg-[#1A1010] border border-white/[0.1] rounded-full px-3 py-2 flex items-center gap-3 shadow-2xl z-30 whitespace-nowrap">
                {REACTIONS.map(r => (
                  <button
                    key={r.type}
                    onClick={() => applyReaction(r.type)}
                    className="text-2xl hover:scale-125 transition-transform active:scale-110"
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Main like button */}
            <button
              onClick={handleLikeTap}
              onMouseDown={handleLikePressStart}
              onMouseUp={handleLikePressEnd}
              onTouchStart={handleLikePressStart}
              onTouchEnd={handleLikePressEnd}
              className={`flex items-center gap-2 text-sm font-medium transition-all active:scale-95 px-3 py-1.5 rounded-full select-none ${
                isReacted
                  ? 'text-[#E63946] bg-[#E63946]/10'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
              data-testid="like-button"
            >
              <span className={isReacted ? 'like-pop' : ''} style={{ fontSize: 18 }}>
                {reactionEmoji || '🤍'}
              </span>
              {myReaction ? REACTIONS.find(r => r.type === myReaction)?.label || 'Like' : 'Like'}
            </button>
          </div>

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

      {showAgeModal && (
        <AgeVerificationModal
          onConfirm={() => { setShowAgeModal(false); setAdultRevealed(true); }}
          onCancel={() => setShowAgeModal(false)}
        />
      )}
    </>
  );
};

export default ConfessionCard;