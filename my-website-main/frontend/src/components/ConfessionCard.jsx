import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Share2, Flag, MoreHorizontal, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarColor, getInitials } from '../utils/identity';
import { getAgeVerified, getSafeMode } from '../utils/session';
import AgeVerificationModal from './AgeVerificationModal';
import api, { API } from '../utils/api';
import { toast } from 'sonner';

// ─── Reaction config ────────────────────────────────────────────────────────
const REACTIONS = [
  { type: 'like',    emoji: '👍', label: 'Like',  color: '#1877F2' },
  { type: 'love',    emoji: '❤️', label: 'Love',  color: '#F33E58' },
  { type: 'haha',    emoji: '😂', label: 'Haha',  color: '#F7B125' },
  { type: 'wow',     emoji: '😮', label: 'Wow',   color: '#F7B125' },
  { type: 'sad',     emoji: '😢', label: 'Sad',   color: '#F7B125' },
  { type: 'angry',   emoji: '😡', label: 'Angry', color: '#E9710F' },
];

const REACTION_MAP = Object.fromEntries(REACTIONS.map(r => [r.type, r]));

let floatId = 0;

// ─── Floating emoji component ────────────────────────────────────────────────
const Floater = ({ emoji, x }) => (
  <span
    style={{
      position: 'absolute', bottom: 32, left: `${x}%`,
      fontSize: 22, pointerEvents: 'none', zIndex: 50,
      animation: 'floatUp 1.1s ease-out forwards',
    }}
  >
    {emoji}
  </span>
);

// ─── Reaction summary bar (like FB: 👍❤️😂 · 42) ────────────────────────────
const ReactionSummary = ({ counts, total, onOpen }) => {
  if (total === 0) return null;
  // Top 3 reactions by count
  const top = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTION_MAP[type]?.emoji);

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13,
      }}
      title="See who reacted"
    >
      <span style={{ display: 'flex', marginRight: 2 }}>
        {top.map((em, i) => (
          <span key={i} style={{
            fontSize: 16,
            marginLeft: i > 0 ? -4 : 0,
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
          }}>{em}</span>
        ))}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.38)' }}>{total}</span>
    </button>
  );
};

// ─── Reaction breakdown modal ────────────────────────────────────────────────
const ReactionBreakdown = ({ counts, total, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#1A1010', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: '20px 24px', minWidth: 220,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 14, fontSize: 15 }}>
        Reactions · {total}
      </p>
      {REACTIONS.map(r => {
        const c = counts[r.type] || 0;
        if (!c) return null;
        return (
          <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{r.emoji}</span>
            <span style={{ color: r.color, fontWeight: 600, fontSize: 14, flex: 1 }}>{r.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{c}</span>
          </div>
        );
      })}
      <button
        onClick={onClose}
        style={{
          marginTop: 8, width: '100%', padding: '8px 0',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13,
        }}
      >
        Close
      </button>
    </div>
  </div>
);

// ─── Single comment / reply ───────────────────────────────────────────────────
const CommentItem = ({ comment, depth = 0, onAddReply, confessionId }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText]           = useState('');
  const [showReplies, setShowReplies]       = useState(true);
  const colors   = getAvatarColor(comment.nickname || 'Anon');
  const initials = getInitials(comment.nickname || 'Anon');

  let timeAgo = 'just now';
  try { timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }); } catch {}

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    await onAddReply(comment.id, text);
    setReplyText('');
    setShowReplyInput(false);
    setShowReplies(true);
  };

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 12, paddingLeft: depth > 0 ? 28 : 0 }}>
      {/* Avatar */}
      <div style={{
        width: depth === 0 ? 34 : 28, height: depth === 0 ? 34 : 28,
        borderRadius: '50%', flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: depth === 0 ? 12 : 10, fontWeight: 700, color: '#fff',
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1 }}>
        {/* Bubble */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 12,
          padding: '8px 12px', display: 'inline-block', maxWidth: '100%',
        }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginRight: 6 }}>
            {comment.nickname || 'Anonymous'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.5 }}>
            {comment.text}
          </span>
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingLeft: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{timeAgo}</span>
          {depth < 2 && (
            <button
              onClick={() => setShowReplyInput(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, padding: 0,
              }}
            >
              Reply
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReplyInput && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }}}
              placeholder="Write a reply…"
              rows={1}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
                padding: '7px 14px', color: '#fff', fontSize: 13,
                resize: 'none', outline: 'none', lineHeight: 1.5,
              }}
            />
            <button
              onClick={submitReply}
              disabled={!replyText.trim()}
              style={{
                background: '#1877F2', border: 'none', borderRadius: 20,
                padding: '7px 14px', color: '#fff', fontSize: 13,
                fontWeight: 600, cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                opacity: replyText.trim() ? 1 : 0.4,
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowReplies(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0',
              }}
            >
              {showReplies
                ? <><ChevronUp size={14}/> Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</>
                : <><ChevronDown size={14}/> View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</>
              }
            </button>
            {showReplies && comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onAddReply={onAddReply}
                confessionId={confessionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Comments section ────────────────────────────────────────────────────────
const CommentsSection = ({ confessionId, initialComments = [] }) => {
  const [comments, setComments]   = useState(initialComments);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [showAll, setShowAll]     = useState(false);
  const PREVIEW_COUNT = 2;

  // Build nested tree from flat list
  const buildTree = (flat) => {
    const map = {};
    flat.forEach(c => { map[c.id] = { ...c, replies: [] }; });
    const roots = [];
    flat.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  };

  const tree = buildTree(comments);
  const visible = showAll ? tree : tree.slice(-PREVIEW_COUNT);

  const submitComment = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await api.post(`/confessions/${confessionId}/comments`, { text: trimmed });
      setComments(prev => [...prev, res.data]);
      setText('');
      setShowAll(true);
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const addReply = async (parentId, replyText) => {
    try {
      const res = await api.post(`/confessions/${confessionId}/comments`, {
        text: replyText, parent_id: parentId,
      });
      setComments(prev => [...prev, res.data]);
    } catch {
      toast.error('Failed to post reply');
    }
  };

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
      {/* Show more toggle */}
      {tree.length > PREVIEW_COUNT && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600,
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ChevronDown size={15}/> View {tree.length - PREVIEW_COUNT} more comment{tree.length - PREVIEW_COUNT !== 1 ? 's' : ''}
        </button>
      )}
      {showAll && tree.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll(false)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600,
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ChevronUp size={15}/> Collapse comments
        </button>
      )}

      {/* Comment list */}
      {visible.map(c => (
        <CommentItem
          key={c.id}
          comment={c}
          depth={0}
          onAddReply={addReply}
          confessionId={confessionId}
        />
      ))}

      {/* New comment input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }}}
          placeholder="Write a comment…"
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
            padding: '9px 16px', color: '#fff', fontSize: 13,
            resize: 'none', outline: 'none', lineHeight: 1.5,
          }}
        />
        <button
          onClick={submitComment}
          disabled={!text.trim() || loading}
          style={{
            background: '#1877F2', border: 'none', borderRadius: 20,
            padding: '9px 16px', color: '#fff', fontSize: 13,
            fontWeight: 600,
            cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
            opacity: text.trim() && !loading ? 1 : 0.4,
          }}
        >
          {loading ? '…' : 'Post'}
        </button>
      </div>
    </div>
  );
};

// ─── Main ConfessionCard ─────────────────────────────────────────────────────
let floatIdCounter = 0;

const ConfessionCard = ({ confession, onReport }) => {
  const [showAgeModal, setShowAgeModal]       = useState(false);
  const [adultRevealed, setAdultRevealed]     = useState(false);
  const [myReaction, setMyReaction]           = useState(null);       // current user's reaction type
  const [reactionCounts, setReactionCounts]   = useState(           // per-type counts
    confession.reaction_counts || {}
  );
  const [showMenu, setShowMenu]               = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showBreakdown, setShowBreakdown]     = useState(false);
  const [showComments, setShowComments]       = useState(false);
  const [floaters, setFloaters]               = useState([]);
  const [isMuted, setIsMuted]                 = useState(true);

  const videoRef    = useRef(null);
  const holdTimer   = useRef(null);
  const pickerRef   = useRef(null);

  const colors   = getAvatarColor(confession.nickname);
  const initials = getInitials(confession.nickname);
  const safeMode = getSafeMode();
  const isAdult  = confession.is_adult;
  const shouldBlur = isAdult && safeMode && !adultRevealed;

  // Total reactions across all types
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  let timeAgo = 'just now';
  try { timeAgo = formatDistanceToNow(new Date(confession.created_at), { addSuffix: true }); } catch {}

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowReactionPicker(false);
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
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.intersectionRatio >= 0.5
        ? video.play().catch(() => {}) : video.pause()),
      { threshold: 0.5 }
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);

  const addFloater = (emoji) => {
    const id = floatIdCounter++;
    const x = 20 + Math.random() * 50;
    setFloaters(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 1200);
  };

  // Optimistic reaction update
  const applyReaction = async (type) => {
    setShowReactionPicker(false);
    const r = REACTION_MAP[type];
    const emoji = r?.emoji || '👍';

    setReactionCounts(prev => {
      const next = { ...prev };
      if (myReaction === type) {
        // Toggle off
        next[type] = Math.max(0, (next[type] || 1) - 1);
      } else {
        if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 1) - 1);
        next[type] = (next[type] || 0) + 1;
        addFloater(emoji);
        addFloater(emoji);
      }
      return next;
    });

    setMyReaction(prev => prev === type ? null : type);

    try {
      await api.post(`/confessions/${confession.id}/react`, { type });
    } catch {
      toast.error('Failed to react');
    }
  };

  // Hold → show picker, tap → quick like
  const handlePressStart = () => {
    holdTimer.current = setTimeout(() => setShowReactionPicker(true), 400);
  };
  const handlePressEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };
  const handleTap = () => {
    if (showReactionPicker) return;
    applyReaction(myReaction === 'like' ? 'like' : 'like');
  };

  const handleShare = async () => {
    const text = confession.text.slice(0, 120) + (confession.text.length > 120 ? '…' : '');
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

  const currentReaction = myReaction ? REACTION_MAP[myReaction] : null;

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 0.8; transform: translateY(-60px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-90px) scale(0.8); }
        }
        @keyframes pickerPop {
          0%   { opacity: 0; transform: scale(0.7) translateY(6px); }
          60%  { transform: scale(1.08) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes emojiHover {
          0%   { transform: scale(1) translateY(0); }
          50%  { transform: scale(1.35) translateY(-6px); }
          100% { transform: scale(1.25) translateY(-4px); }
        }
        .reaction-picker-wrap { animation: pickerPop 0.2s ease-out forwards; }
        .reaction-emoji-btn { transition: transform 0.15s ease; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .reaction-emoji-btn:hover { animation: emojiHover 0.25s ease forwards; }
        .reaction-emoji-btn span.label { font-size: 10px; font-weight: 600; opacity: 0; transition: opacity 0.15s; color: #fff; white-space: nowrap; }
        .reaction-emoji-btn:hover span.label { opacity: 1; }
      `}</style>

      <article
        style={{
          background: 'rgba(15,10,10,0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 16, margin: '8px 12px',
          padding: '16px 20px', position: 'relative',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
              background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
              boxShadow: '0 0 0 2px rgba(255,255,255,0.08)',
            }}>
              {initials}
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>{confession.nickname}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{timeAgo}</span>
                {confession.city && <>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{confession.city}</span>
                </>}
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span style={{
                  color: '#FFB703', fontWeight: 600, fontSize: 11,
                  background: 'rgba(255,183,3,0.1)', padding: '2px 8px', borderRadius: 20,
                  textTransform: 'capitalize',
                }}>{confession.category}</span>
              </div>
            </div>
          </div>

          {/* More menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 6, borderRadius: '50%' }}
            >
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 32, background: '#1A1010',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                zIndex: 20, width: 160, overflow: 'hidden',
              }}>
                <button
                  onClick={() => { onReport(confession); setShowMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '12px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14,
                  }}
                >
                  <Flag size={16} /> Report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 18+ badge */}
        {isAdult && (
          <div style={{ marginBottom: 8 }}>
            <span style={{
              background: 'rgba(230,57,70,0.1)', color: '#E63946',
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 20, border: '1px solid rgba(230,57,70,0.2)',
            }}>18+</span>
          </div>
        )}

        {/* ── Text ── */}
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.65, margin: '0 0 12px' }}>
          {confession.text}
        </p>

        {/* ── Media ── */}
        {confession.media_url && (
          <div style={{ position: 'relative', marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
            {confession.media_type === 'image' ? (
              <img
                src={confession.media_url.startsWith('http') ? confession.media_url : `${API}/files/${confession.media_url}`}
                alt=""
                style={{ width: '100%', maxHeight: '50vh', objectFit: 'cover', borderRadius: 12, filter: shouldBlur ? 'blur(24px)' : 'none' }}
                loading="lazy"
              />
            ) : (
              <div style={{ position: 'relative' }}>
                <video
                  ref={videoRef}
                  src={confession.media_url.startsWith('http') ? confession.media_url : `${API}/files/${confession.media_url}`}
                  muted={isMuted} loop playsInline
                  style={{ width: '100%', maxHeight: '50vh', objectFit: 'cover', borderRadius: 12, filter: shouldBlur ? 'blur(24px)' : 'none' }}
                />
                {!shouldBlur && (
                  <button
                    onClick={e => { e.stopPropagation(); if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(v => !v); }}}
                    style={{
                      position: 'absolute', bottom: 10, right: 10,
                      background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 20,
                      color: '#fff', fontSize: 12, padding: '6px 12px', cursor: 'pointer',
                    }}
                  >
                    {isMuted ? '🔇 Tap for sound' : '🔊 Sound on'}
                  </button>
                )}
              </div>
            )}
            {shouldBlur && (
              <div
                onClick={() => { if (getAgeVerified()) setAdultRevealed(true); else setShowAgeModal(true); }}
                style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', borderRadius: 12,
                }}
              >
                <Eye size={32} color="rgba(255,255,255,0.3)" />
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                  Tap to reveal 18+ content
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Reaction summary bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <ReactionSummary
            counts={reactionCounts}
            total={totalReactions}
            onOpen={() => setShowBreakdown(true)}
          />
          {confession.comments_count > 0 && (
            <button
              onClick={() => setShowComments(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.35)', fontSize: 13,
              }}
            >
              {confession.comments_count} comment{confession.comments_count !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* ── Action bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10,
        }}>

          {/* Like button + reaction picker */}
          <div style={{ position: 'relative' }} ref={pickerRef}>
            {/* Floating emojis */}
            {floaters.map(f => <Floater key={f.id} emoji={f.emoji} x={f.x} />)}

            {/* Reaction picker bubble */}
            {showReactionPicker && (
              <div
                className="reaction-picker-wrap"
                style={{
                  position: 'absolute', bottom: 44, left: 0,
                  background: '#1A1010', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 30, padding: '10px 14px',
                  display: 'flex', alignItems: 'flex-end', gap: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 30,
                  whiteSpace: 'nowrap',
                }}
              >
                {REACTIONS.map(r => (
                  <button
                    key={r.type}
                    className="reaction-emoji-btn"
                    onClick={() => applyReaction(r.type)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                    title={r.label}
                  >
                    <span style={{ fontSize: 26 }}>{r.emoji}</span>
                    <span className="label">{r.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Main like/react button */}
            <button
              onClick={handleTap}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: currentReaction ? `${currentReaction.color}18` : 'none',
                border: 'none', cursor: 'pointer', borderRadius: 20,
                padding: '6px 12px', fontSize: 14, fontWeight: 600,
                color: currentReaction ? currentReaction.color : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>
                {currentReaction ? currentReaction.emoji : '👍'}
              </span>
              {currentReaction ? currentReaction.label : 'Like'}
            </button>
          </div>

          {/* Comment button */}
          <button
            onClick={() => setShowComments(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showComments ? 'rgba(255,255,255,0.06)' : 'none',
              border: 'none', cursor: 'pointer', borderRadius: 20,
              padding: '6px 12px', fontSize: 14, fontWeight: 600,
              color: showComments ? '#fff' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s',
            }}
          >
            <MessageCircle size={18} />
            Comment
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: 20, padding: '6px 12px', fontSize: 14, fontWeight: 600,
              color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
            }}
          >
            <Share2 size={18} />
            Share
          </button>
        </div>

        {/* ── Comments section ── */}
        {showComments && (
          <CommentsSection
            confessionId={confession.id}
            initialComments={confession.comments || []}
          />
        )}
      </article>

      {/* Reaction breakdown modal */}
      {showBreakdown && (
        <ReactionBreakdown
          counts={reactionCounts}
          total={totalReactions}
          onClose={() => setShowBreakdown(false)}
        />
      )}

      {/* Age verification modal */}
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