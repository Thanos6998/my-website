import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Share2, Flag, MoreHorizontal, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarColor, getInitials } from '../utils/identity';
import { getAgeVerified, getSafeMode } from '../utils/session';
import AgeVerificationModal from './AgeVerificationModal';
import api, { API } from '../utils/api';
import { toast } from 'sonner';

const REACTIONS = [
  { type: 'like',    emoji: '👍', label: 'Like',    color: '#1877F2' },
  { type: 'laugh',   emoji: '😂', label: 'Haha',    color: '#F7B125' },
  { type: 'sad',     emoji: '😢', label: 'Sad',     color: '#F7B125' },
  { type: 'angry',   emoji: '😡', label: 'Angry',   color: '#E9710F' },
  { type: 'fire',    emoji: '🔥', label: 'Fire',    color: '#FF4500' },
  { type: 'dislike', emoji: '👎', label: 'Dislike', color: '#888'    },
];

const REACTION_MAP = Object.fromEntries(REACTIONS.map(r => [r.type, r]));

const DB_FIELD_TO_TYPE = {
  likes: 'like', laughs: 'laugh', sads: 'sad',
  angrys: 'angry', fires: 'fire', dislikes: 'dislike',
};

const extractCounts = (confession) => {
  const counts = {};
  Object.entries(DB_FIELD_TO_TYPE).forEach(([field, type]) => {
    counts[type] = confession[field] || 0;
  });
  return counts;
};

let floatIdCounter = 0;

const Floater = ({ emoji, x }) => (
  <span style={{
    position: 'absolute', bottom: 32, left: `${x}%`,
    fontSize: 22, pointerEvents: 'none', zIndex: 50,
    animation: 'floatUp 1.1s ease-out forwards',
  }}>{emoji}</span>
);

const ReactionSummary = ({ counts, total, onOpen }) => {
  if (total === 0) return null;
  const top = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTION_MAP[type]?.emoji);
  return (
    <button onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '2px 0',
    }}>
      <span style={{ display: 'flex', marginRight: 2 }}>
        {top.map((em, i) => (
          <span key={i} style={{
            fontSize: 20,
            marginLeft: i > 0 ? -4 : 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          }}>{em}</span>
        ))}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>{total}</span>
    </button>
  );
};

const ReactionBreakdown = ({ counts, total, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.7)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#1A1010', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '20px 24px', minWidth: 220,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginBottom: 14, fontSize: 15 }}>
        Reactions · {total}
      </p>
      {REACTIONS.map(r => {
        const c = counts[r.type] || 0;
        if (!c) return null;
        return (
          <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{r.emoji}</span>
            <span style={{ color: r.color, fontWeight: 600, fontSize: 14, flex: 1 }}>{r.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c}</span>
          </div>
        );
      })}
      <button onClick={onClose} style={{
        marginTop: 8, width: '100%', padding: '8px 0',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13,
      }}>Close</button>
    </div>
  </div>
);

const CommentItem = ({ comment, depth = 0, confessionId }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText]           = useState('');
  const [replies, setReplies]               = useState([]);
  const [showReplies, setShowReplies]       = useState(false);
  const [repliesLoaded, setRepliesLoaded]   = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [replyCount, setReplyCount]         = useState(comment.replies_count || 0);

  const colors   = getAvatarColor(comment.nickname || 'Anon');
  const initials = getInitials(comment.nickname || 'Anon');

  let timeAgo = 'just now';
  try { timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }); } catch {}

  const loadReplies = async () => {
    if (repliesLoaded) { setShowReplies(v => !v); return; }
    setLoadingReplies(true);
    try {
      const res = await api.get(`/confessions/${confessionId}/comments/${comment.id}/replies`);
      setReplies(res.data);
      setRepliesLoaded(true);
      setShowReplies(true);
    } catch { toast.error('Failed to load replies'); }
    finally { setLoadingReplies(false); }
  };

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(
        `/confessions/${confessionId}/comments/${comment.id}/replies`,
        { text }
      );
      setReplies(prev => [...prev, res.data]);
      setRepliesLoaded(true);
      setShowReplies(true);
      setReplyCount(c => c + 1);
      setReplyText('');
      setShowReplyInput(false);
    } catch { toast.error('Failed to post reply'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, paddingLeft: depth > 0 ? 32 : 0 }}>
      <div style={{
        width: depth === 0 ? 34 : 28, height: depth === 0 ? 34 : 28,
        borderRadius: '50%', flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: depth === 0 ? 12 : 10, fontWeight: 700, color: '#fff',
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        marginTop: 2,
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: 12,
          padding: '8px 12px', display: 'inline-block', maxWidth: '100%',
        }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13, marginRight: 6 }}>
            {comment.nickname || 'Anonymous'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
            {comment.text}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 5, paddingLeft: 4, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{timeAgo}</span>
          {depth < 2 && (
            <button
              onClick={() => setShowReplyInput(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: showReplyInput ? '#1877F2' : 'rgba(255,255,255,0.6)',
                fontSize: 11, fontWeight: 700, padding: 0,
              }}
            >
              {showReplyInput ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>

        {showReplyInput && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }}}
              placeholder={`Reply to ${comment.nickname || 'Anonymous'}…`}
              rows={1}
              autoFocus
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
                padding: '7px 14px', color: '#fff', fontSize: 13,
                resize: 'none', outline: 'none', lineHeight: 1.5,
              }}
            />
            <button
              onClick={submitReply}
              disabled={!replyText.trim() || submitting}
              style={{
                background: '#1877F2', border: 'none', borderRadius: 20,
                padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: replyText.trim() && !submitting ? 'pointer' : 'not-allowed',
                opacity: replyText.trim() && !submitting ? 1 : 0.4, whiteSpace: 'nowrap',
              }}
            >{submitting ? '…' : 'Send'}</button>
          </div>
        )}

        {replyCount > 0 && depth < 2 && (
          <button onClick={loadReplies} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#1877F2', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 0', marginTop: 4,
          }}>
            {loadingReplies
              ? '…loading'
              : showReplies && repliesLoaded
                ? <><ChevronUp size={13}/> Hide replies</>
                : <><ChevronDown size={13}/> View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}</>
            }
          </button>
        )}

        {showReplies && replies.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                confessionId={confessionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CommentsSection = ({ confessionId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showAll, setShowAll]   = useState(false);
  const PREVIEW = 3;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/confessions/${confessionId}/comments`);
        setComments(res.data);
      } catch { toast.error('Failed to load comments'); }
      finally { setFetching(false); }
    })();
  }, [confessionId]);

  const submitComment = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await api.post(`/confessions/${confessionId}/comments`, { text: trimmed });
      setComments(prev => [res.data, ...prev]);
      setText('');
    } catch { toast.error('Failed to post comment'); }
    finally { setLoading(false); }
  };

  const visible = showAll ? comments : comments.slice(0, PREVIEW);

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 14 }}>
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
            padding: '9px 16px', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
            opacity: text.trim() && !loading ? 1 : 0.4,
          }}
        >{loading ? '…' : 'Post'}</button>
      </div>

      {fetching && (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>Loading…</p>
      )}
      {!fetching && comments.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '6px 0' }}>
          No comments yet. Be the first!
        </p>
      )}

      {visible.map(c => (
        <CommentItem key={c.id} comment={c} depth={0} confessionId={confessionId} />
      ))}

      {comments.length > PREVIEW && (
        <button onClick={() => setShowAll(v => !v)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#1877F2', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0',
        }}>
          {showAll
            ? <><ChevronUp size={14}/> Show less</>
            : <><ChevronDown size={14}/> View {comments.length - PREVIEW} more comment{comments.length - PREVIEW !== 1 ? 's' : ''}</>
          }
        </button>
      )}
    </div>
  );
};

const ConfessionCard = ({ confession, onReport }) => {
  const [showAgeModal, setShowAgeModal]             = useState(false);
  const [adultRevealed, setAdultRevealed]           = useState(false);
  const [myReaction, setMyReaction]                 = useState(null);
  const [reactionCounts, setReactionCounts]         = useState(() => extractCounts(confession));
  const [showMenu, setShowMenu]                     = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showBreakdown, setShowBreakdown]           = useState(false);
  const [showComments, setShowComments]             = useState(false);
  const [floaters, setFloaters]                     = useState([]);
  const [isMuted, setIsMuted]                       = useState(true);

  const videoRef  = useRef(null);
  const holdTimer = useRef(null);
  const pickerRef = useRef(null);

  const colors     = getAvatarColor(confession.nickname);
  const initials   = getInitials(confession.nickname);
  const safeMode   = getSafeMode();
  const isAdult    = confession.is_adult;
  const shouldBlur = isAdult && safeMode && !adultRevealed;

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  let timeAgo = 'just now';
  try { timeAgo = formatDistanceToNow(new Date(confession.created_at), { addSuffix: true }); } catch {}

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target))
        setShowReactionPicker(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e =>
        e.isIntersecting && e.intersectionRatio >= 0.5
          ? video.play().catch(() => {}) : video.pause()
      ),
      { threshold: 0.5 }
    );
    obs.observe(video);
    return () => obs.disconnect();
  }, []);

  const addFloater = (emoji) => {
    const id = floatIdCounter++;
    const x  = 20 + Math.random() * 50;
    setFloaters(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== id)), 1200);
  };

  const applyReaction = async (type) => {
    setShowReactionPicker(false);
    const r = REACTION_MAP[type];

    setReactionCounts(prev => {
      const next = { ...prev };
      if (myReaction === type) {
        next[type] = Math.max(0, (next[type] || 1) - 1);
      } else {
        if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 1) - 1);
        next[type] = (next[type] || 0) + 1;
        if (r?.emoji) { addFloater(r.emoji); addFloater(r.emoji); }
      }
      return next;
    });

    setMyReaction(prev => prev === type ? null : type);

    try {
      await api.post(`/confessions/${confession.id}/react`, { type });
    } catch { toast.error('Failed to react'); }
  };

  const handlePressStart = () => {
    holdTimer.current = setTimeout(() => setShowReactionPicker(true), 400);
  };
  const handlePressEnd = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };
  const handleTap = () => {
    if (showReactionPicker) return;
    applyReaction('like');
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
          0%   { opacity:1; transform:translateY(0) scale(1); }
          80%  { opacity:0.8; transform:translateY(-60px) scale(1.3); }
          100% { opacity:0; transform:translateY(-90px) scale(0.8); }
        }
        @keyframes pickerPop {
          0%   { opacity:0; transform:scale(0.7) translateY(6px); }
          60%  { transform:scale(1.08) translateY(-2px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        .picker-wrap { animation: pickerPop 0.2s ease-out forwards; }
        .rxn-btn { background:none; border:none; cursor:pointer; padding:4px 6px; display:flex; flex-direction:column; align-items:center; gap:3px; transition:transform 0.15s; }
        .rxn-btn:hover { transform:scale(1.35) translateY(-5px); }
        .rxn-btn .lbl { font-size:10px; font-weight:600; color:#fff; opacity:0; transition:opacity 0.15s; white-space:nowrap; }
        .rxn-btn:hover .lbl { opacity:1; }
      `}</style>

      <article style={{
        background: 'rgba(15,10,10,0.6)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16, margin: '8px 12px', padding: '16px 20px', position: 'relative',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:40, height:40, borderRadius:'50%', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:700, color:'#fff',
              background:`linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
              boxShadow:'0 0 0 2px rgba(255,255,255,0.08)',
            }}>{initials}</div>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0 }}>{confession.nickname}</p>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, flexWrap:'wrap' }}>
                {/* TIME — clearly visible */}
                <span style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }}>{timeAgo}</span>
                {confession.city && <>
                  <span style={{ color:'rgba(255,255,255,0.3)' }}>·</span>
                  <span style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }}>{confession.city}</span>
                </>}
                <span style={{ color:'rgba(255,255,255,0.3)' }}>·</span>
                <span style={{
                  color:'#FFB703', fontWeight:600, fontSize:11,
                  background:'rgba(255,183,3,0.1)', padding:'2px 8px',
                  borderRadius:20, textTransform:'capitalize',
                }}>{confession.category}</span>
              </div>
            </div>
          </div>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowMenu(v => !v)} style={{
              background:'none', border:'none', cursor:'pointer',
              color:'rgba(255,255,255,0.5)', padding:6, borderRadius:'50%',
            }}><MoreHorizontal size={18}/></button>
            {showMenu && (
              <div style={{
                position:'absolute', right:0, top:32, background:'#1A1010',
                border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, zIndex:20, width:160, overflow:'hidden',
              }}>
                <button onClick={() => { onReport(confession); setShowMenu(false); }} style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'12px 16px', background:'none', border:'none',
                  cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:14,
                }}>
                  <Flag size={16}/> Report
                </button>
              </div>
            )}
          </div>
        </div>

        {isAdult && (
          <div style={{ marginBottom:8 }}>
            <span style={{
              background:'rgba(230,57,70,0.1)', color:'#E63946', fontSize:11,
              fontWeight:700, padding:'2px 10px', borderRadius:20,
              border:'1px solid rgba(230,57,70,0.2)',
            }}>18+</span>
          </div>
        )}

        <p style={{ color:'rgba(255,255,255,0.9)', fontSize:15, lineHeight:1.65, margin:'0 0 12px', wordBreak:'break-word' }}>
          {confession.text}
        </p>

        {confession.media_url && (
          <div style={{ position:'relative', marginBottom:12, borderRadius:12, overflow:'hidden' }}>
            {confession.media_type === 'image' ? (
              <img
                src={confession.media_url.startsWith('http') ? confession.media_url : `${API}/files/${confession.media_url}`}
                alt=""
                style={{ width:'100%', maxHeight:'50vh', objectFit:'cover', borderRadius:12, filter:shouldBlur ? 'blur(24px)' : 'none' }}
                loading="lazy"
              />
            ) : (
              <div style={{ position:'relative' }}>
                <video
                  ref={videoRef}
                  src={confession.media_url.startsWith('http') ? confession.media_url : `${API}/files/${confession.media_url}`}
                  muted={isMuted} loop playsInline
                  style={{ width:'100%', maxHeight:'50vh', objectFit:'cover', borderRadius:12, filter:shouldBlur ? 'blur(24px)' : 'none' }}
                />
                {!shouldBlur && (
                  <button
                    onClick={e => { e.stopPropagation(); if(videoRef.current){ videoRef.current.muted = !isMuted; setIsMuted(v=>!v); }}}
                    style={{
                      position:'absolute', bottom:10, right:10,
                      background:'rgba(0,0,0,0.6)', border:'none', borderRadius:20,
                      color:'#fff', fontSize:12, padding:'6px 12px', cursor:'pointer',
                    }}
                  >{isMuted ? '🔇 Tap for sound' : '🔊 Sound on'}</button>
                )}
              </div>
            )}
            {shouldBlur && (
              <div
                onClick={() => { if(getAgeVerified()) setAdultRevealed(true); else setShowAgeModal(true); }}
                style={{
                  position:'absolute', inset:0, background:'rgba(0,0,0,0.8)',
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', cursor:'pointer', borderRadius:12,
                }}
              >
                <Eye size={32} color="rgba(255,255,255,0.3)"/>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, fontWeight:600, marginTop:8 }}>
                  Tap to reveal 18+ content
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reaction summary + comment count — clearly visible */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, minHeight:24 }}>
          <ReactionSummary counts={reactionCounts} total={totalReactions} onOpen={() => setShowBreakdown(true)}/>
          {confession.comments_count > 0 && (
            <button onClick={() => setShowComments(v=>!v)} style={{
              background:'none', border:'none', cursor:'pointer',
              color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:500,
            }}>
              {confession.comments_count} comment{confession.comments_count !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Action bar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:8,
        }}>
          <div style={{ position:'relative' }} ref={pickerRef}>
            {floaters.map(f => <Floater key={f.id} emoji={f.emoji} x={f.x}/>)}

            {showReactionPicker && (
              <div className="picker-wrap" style={{
                position:'absolute', bottom:46, left:0,
                background:'#1A1010', border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:30, padding:'10px 12px',
                display:'flex', alignItems:'flex-end', gap:2,
                boxShadow:'0 8px 24px rgba(0,0,0,0.6)', zIndex:30, whiteSpace:'nowrap',
              }}>
                {REACTIONS.map(r => (
                  <button key={r.type} className="rxn-btn" onClick={() => applyReaction(r.type)} title={r.label}>
                    <span style={{ fontSize:26 }}>{r.emoji}</span>
                    <span className="lbl">{r.label}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleTap}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              style={{
                display:'flex', alignItems:'center', gap:6,
                background: currentReaction ? `${currentReaction.color}20` : 'none',
                border:'none', cursor:'pointer', borderRadius:20,
                padding:'6px 12px', fontSize:14, fontWeight:600,
                color: currentReaction ? currentReaction.color : 'rgba(255,255,255,0.7)',
                transition:'all 0.15s', userSelect:'none',
              }}
            >
              <span style={{ fontSize:18 }}>{currentReaction ? currentReaction.emoji : '👍'}</span>
              {currentReaction ? currentReaction.label : 'Like'}
            </button>
          </div>

          <button onClick={() => setShowComments(v=>!v)} style={{
            display:'flex', alignItems:'center', gap:6,
            background: showComments ? 'rgba(255,255,255,0.06)' : 'none',
            border:'none', cursor:'pointer', borderRadius:20,
            padding:'6px 12px', fontSize:14, fontWeight:600,
            color: showComments ? '#fff' : 'rgba(255,255,255,0.7)',
            transition:'all 0.15s',
          }}>
            <MessageCircle size={18}/> Comment
          </button>

          <button onClick={handleShare} style={{
            display:'flex', alignItems:'center', gap:6,
            background:'none', border:'none', cursor:'pointer',
            borderRadius:20, padding:'6px 12px', fontSize:14, fontWeight:600,
            color:'rgba(255,255,255,0.7)', transition:'all 0.15s',
          }}>
            <Share2 size={18}/> Share
          </button>
        </div>

        {showComments && <CommentsSection confessionId={confession.id}/>}
      </article>

      {showBreakdown && (
        <ReactionBreakdown counts={reactionCounts} total={totalReactions} onClose={() => setShowBreakdown(false)}/>
      )}
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