import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAvatarColor, getInitials } from '../utils/identity';
import api from '../utils/api';

const ReplyItem = ({ reply }) => {
  const colors = getAvatarColor(reply.nickname);
  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(new Date(reply.created_at), { addSuffix: true }); } catch { timeAgo = 'just now'; }

  return (
    <div className="flex gap-2.5 animate-fade-in" data-testid="reply-item">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5 ring-1 ring-white/10"
        style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
        {getInitials(reply.nickname)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#141010] rounded-xl rounded-tl-sm px-3 py-2 border border-white/[0.03]">
          <p className="text-xs font-semibold text-white/80 mb-0.5">{reply.nickname || 'Anonymous'}</p>
          <p className="text-xs text-white/60 leading-relaxed">{reply.text}</p>
        </div>
        <span className="text-[10px] text-white/15 mt-0.5 px-1 block">{timeAgo}</span>
      </div>
    </div>
  );
};

const CommentItem = ({ comment, confessionId, onReplyAdded }) => {
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [localReplyCount, setLocalReplyCount] = useState(comment.replies_count || 0);
  const replyInputRef = useRef(null);

  const colors = getAvatarColor(comment.nickname);
  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }); } catch { timeAgo = 'just now'; }

  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await api.get(`/confessions/${confessionId}/comments/${comment.id}/replies`);
      setReplies(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingReplies(false); }
  };

  const toggleReplies = () => {
    if (!showReplies && replies.length === 0 && localReplyCount > 0) fetchReplies();
    setShowReplies(!showReplies);
  };

  const handleReplyClick = () => {
    setShowReplyInput(true);
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await api.post(`/confessions/${confessionId}/comments/${comment.id}/replies`, { text: replyText });
      setReplies(prev => [...prev, res.data]);
      setLocalReplyCount(prev => prev + 1);
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
      if (onReplyAdded) onReplyAdded();
    } catch (e) { console.error(e); }
    finally { setSubmittingReply(false); }
  };

  return (
    <div data-testid="comment-item">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5 ring-1 ring-white/10"
          style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
          {getInitials(comment.nickname)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#1A1010] rounded-2xl rounded-tl-md px-3.5 py-2.5 border border-white/[0.04]">
            <p className="text-sm font-semibold text-white mb-0.5" data-testid="comment-nickname">{comment.nickname || 'Anonymous'}</p>
            <p className="text-sm text-white/70 leading-relaxed" data-testid="comment-text">{comment.text}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[11px] text-white/20" data-testid="comment-time">{timeAgo}</span>
            <button
              onClick={handleReplyClick}
              className="text-[11px] text-white/30 hover:text-[#E63946] font-semibold transition-colors flex items-center gap-1"
              data-testid="reply-button"
            >
              <CornerDownRight size={11} /> Reply
            </button>
            {localReplyCount > 0 && (
              <button
                onClick={toggleReplies}
                className="text-[11px] text-[#FFB703]/70 hover:text-[#FFB703] font-semibold transition-colors flex items-center gap-1"
                data-testid="toggle-replies-btn"
              >
                {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {localReplyCount} {localReplyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Inline reply input */}
          {showReplyInput && (
            <form onSubmit={handleSubmitReply} className="mt-2 flex items-center gap-2 animate-fade-in" data-testid="reply-form">
              <input
                ref={replyInputRef}
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.nickname}...`}
                className="flex-1 bg-[#141010] border border-white/[0.06] rounded-full px-3.5 py-2 text-xs text-white focus:border-[#E63946]/50 outline-none placeholder:text-white/20 transition-all"
                data-testid="reply-input"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || submittingReply}
                className="bg-[#E63946] text-white rounded-full p-2 hover:bg-[#D62828] transition-all disabled:opacity-20 active:scale-95"
                data-testid="submit-reply-btn"
              >
                <Send size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setShowReplyInput(false); setReplyText(''); }}
                className="text-white/20 hover:text-white/50 p-1 transition-colors"
                data-testid="cancel-reply-btn"
              >
                <X size={14} />
              </button>
            </form>
          )}

          {/* Replies */}
          {showReplies && (
            <div className="mt-2.5 ml-2 pl-3 border-l border-white/[0.06] space-y-2.5" data-testid="replies-container">
              {loadingReplies ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full skeleton-shimmer flex-shrink-0" />
                      <div className="flex-1"><div className="h-3 w-16 skeleton-shimmer rounded-full mb-1" /><div className="h-3 w-32 skeleton-shimmer rounded-full" /></div>
                    </div>
                  ))}
                </div>
              ) : replies.length === 0 ? (
                <p className="text-[11px] text-white/15 py-1">No replies yet</p>
              ) : (
                replies.map(reply => <ReplyItem key={reply.id} reply={reply} />)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentsModal = ({ confession, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchComments(); }, [confession.id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/confessions/${confession.id}/comments`);
      setComments(response.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.post(`/confessions/${confession.id}/comments`, { text: newComment });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0F0A0A] rounded-t-3xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-up border-t border-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
        data-testid="comments-modal"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/10 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Comments</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 rounded-full hover:bg-white/[0.05]" data-testid="close-comments-btn">
            <X size={22} />
          </button>
        </div>

        {/* Original post preview */}
        <div className="px-5 py-3 border-b border-white/[0.04] bg-[#050505]/50">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/10"
              style={{ background: `linear-gradient(135deg, ${getAvatarColor(confession.nickname)[0]}, ${getAvatarColor(confession.nickname)[1]})` }}>
              {getInitials(confession.nickname)}
            </div>
            <span className="text-sm font-semibold text-white">{confession.nickname}</span>
          </div>
          <p className="text-sm text-white/35 line-clamp-2">{confession.text}</p>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full skeleton-shimmer flex-shrink-0" />
                  <div className="flex-1"><div className="h-3 w-20 skeleton-shimmer rounded-full mb-2" /><div className="h-4 w-full skeleton-shimmer rounded-full" /></div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12"><p className="text-white/20 text-sm">No comments yet. Be the first!</p></div>
          ) : (
            <div className="space-y-5">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  confessionId={confession.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comment input */}
        <form onSubmit={handleSubmit} className="border-t border-white/[0.04] px-4 py-3 bg-[#0A0808]/90 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..."
              className="flex-1 bg-[#1A1010] border border-white/[0.08] rounded-full px-4 py-2.5 text-sm text-white focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946]/30 transition-all outline-none placeholder:text-white/25"
              data-testid="comment-input" />
            <button type="submit" disabled={!newComment.trim() || submitting}
              className="bg-[#E63946] text-white rounded-full p-2.5 hover:bg-[#D62828] transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-95"
              data-testid="submit-comment-btn">
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommentsModal;
