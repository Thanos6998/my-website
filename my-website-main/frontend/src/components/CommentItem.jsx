import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarColor, getInitials } from '../utils/identity';
import api from '../utils/api';
import { toast } from 'sonner';
import ReplyList from './ReplyList';

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

        <ReplyList
          replyCount={replyCount}
          depth={depth}
          loadReplies={loadReplies}
          loadingReplies={loadingReplies}
          showReplies={showReplies}
          repliesLoaded={repliesLoaded}
          replies={replies}
          confessionId={confessionId}
        />
      </div>
    </div>
  );
};

export default CommentItem;