import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';
import CommentItem from './CommentItem';

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

export default CommentsSection;