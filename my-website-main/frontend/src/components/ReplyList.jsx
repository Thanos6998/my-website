import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CommentItem from './CommentItem';

const ReplyList = ({ replyCount, depth, loadReplies, loadingReplies, showReplies, repliesLoaded, replies, confessionId }) => {
  if (replyCount === 0 || depth >= 2) return null;
  return (
    <div>
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
  );
};

export default ReplyList;