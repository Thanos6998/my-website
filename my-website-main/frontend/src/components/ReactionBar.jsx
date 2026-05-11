import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import api from '../utils/api';

const REACTIONS = [
  { type: 'like',    emoji: '👍', label: 'Like',    color: '#1877F2' },
  { type: 'laugh',   emoji: '😂', label: 'Haha',    color: '#F7B125' },
  { type: 'sad',     emoji: '😢', label: 'Sad',     color: '#F7B125' },
  { type: 'angry',   emoji: '😡', label: 'Angry',   color: '#E9710F' },
  { type: 'fire',    emoji: '🔥', label: 'Fire',    color: '#FF4500' },
  { type: 'dislike', emoji: '👎', label: 'Dislike', color: '#888'    },
];

export const REACTION_MAP = Object.fromEntries(REACTIONS.map(r => [r.type, r]));

export const DB_FIELD_TO_TYPE = {
  likes: 'like', laughs: 'laugh', sads: 'sad',
  angrys: 'angry', fires: 'fire', dislikes: 'dislike',
};

export const extractCounts = (confession) => {
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

export const ReactionSummary = ({ counts, total, onOpen }) => {
  if (total === 0) return null;
  const top = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTION_MAP[type]?.emoji);
  return (
    <button onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
    }}>
      <span style={{ display: 'flex', marginRight: 2 }}>
        {top.map((em, i) => (
          <span key={i} style={{
            fontSize: 20, marginLeft: i > 0 ? -4 : 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
          }}>{em}</span>
        ))}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>{total}</span>
    </button>
  );
};

export const ReactionBreakdown = ({ counts, total, onClose }) => (
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

const ReactionBar = ({ confessionId, initialCounts }) => {
  const [myReaction, setMyReaction]                 = useState(null);
  const [reactionCounts, setReactionCounts]         = useState(initialCounts);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [floaters, setFloaters]                     = useState([]);
  const pickerRef = useRef(null);
  const holdTimer = useRef(null);

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
      await api.post(`/confessions/${confessionId}/react`, { type });
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

  const currentReaction = myReaction ? REACTION_MAP[myReaction] : null;
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return { reactionCounts, totalReactions, currentReaction, showReactionPicker, setShowReactionPicker, floaters, pickerRef, handlePressStart, handlePressEnd, handleTap, applyReaction };
};

export { REACTIONS, Floater };
export default ReactionBar;
