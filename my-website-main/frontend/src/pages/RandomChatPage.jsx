import React, { useState, useEffect, useRef } from 'react';
import { Send, SkipForward, Image as ImageIcon, Loader, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'sonner';

const RandomChatPage = () => {
  const { user } = useAuth();
  const [ws, setWs]                   = useState(null);
  const [status, setStatus]           = useState('disconnected');
  const [messages, setMessages]       = useState([]);
  const [inputText, setInputText]     = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const wsRef          = useRef(null); // keep ref in sync for closures

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const connectToRandomChat = () => {
    if (!user?.name) {
      toast.error('Not authenticated. Please refresh.');
      return;
    }

    const userId     = `${user.name}_${Date.now()}`;
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

    // ✅ Fixed: correct WS path matches backend @app.websocket("/api/ws/random-chat")
    const wsBase = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl  = `${wsBase}/api/ws/random-chat?session_id=${encodeURIComponent(userId)}`;

    console.log('[RandomChat] Connecting:', wsUrl);
    setStatus('connecting');

    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;

    websocket.onopen = () => {
      console.log('[RandomChat] WS open');
      // Status will be set once server sends 'waiting' or 'matched'
    };

    websocket.onmessage = (event) => {
      console.log('[RandomChat] Message:', event.data);
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      if (data.type === 'waiting') {
        setStatus('waiting');
        setMessages([]);

      } else if (data.type === 'matched') {
        setStatus('connected');
        setMessages([{ type: 'system', text: 'You are now connected with a stranger! 💬' }]);
        toast.success('Connected! Start chatting');

      } else if (data.type === 'partner_disconnected') {
        setStatus('disconnected');
        setMessages(prev => [...prev, { type: 'system', text: 'Stranger disconnected.' }]);
        toast.error('Stranger disconnected');

      } else if (data.type === 'text') {
        setMessages(prev => [...prev, {
          type:      'received',
          text:      data.text,
          timestamp: data.timestamp || new Date().toISOString(),
        }]);

      } else if (data.type === 'media') {
        // ✅ Cloudinary URL comes back as full https:// — use directly
        setMessages(prev => [...prev, {
          type:       'received',
          media_url:  data.media_url,
          media_type: data.media_type,
          timestamp:  data.timestamp || new Date().toISOString(),
        }]);
      }
    };

    websocket.onclose = (event) => {
      console.log('[RandomChat] WS closed:', event.code, event.reason);
      setStatus('disconnected');
      wsRef.current = null;
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('[RandomChat] WS error:', error);
      toast.error('Connection error. Please try again.');
      setStatus('disconnected');
    };

    setWs(websocket);
  };

  const handleStart = () => {
    connectToRandomChat();
  };

  const handleSkip = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'skip' }));
      setMessages([]);
      setStatus('waiting');
      toast.info('Finding new stranger…');
    }
  };

  const handleStop = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setWs(null);
    setStatus('disconnected');
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text', text: inputText.trim() }));
    setMessages(prev => [...prev, {
      type:      'sent',
      text:      inputText.trim(),
      timestamp: new Date().toISOString(),
    }]);
    setInputText('');
  };

  // ✅ Fixed: upload to /upload-chat-media, then send media_url over WS as type:'media'
  const handleMediaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      toast.error('Not connected');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const sizeMB  = file.size / (1024 * 1024);

    if (!isVideo && sizeMB > 2) { toast.error('Image must be under 2MB'); return; }
    if (isVideo  && sizeMB > 10) { toast.error('Video must be under 10MB'); return; }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);

      console.log('[RandomChat] Uploading:', file.name, file.type, sizeMB.toFixed(2) + 'MB');

      // ✅ Use /upload-chat-media — requires X-Session-Id header (set by api interceptor)
      const response = await api.post('/upload-chat-media', formData);
      const mediaUrl = response.data.media_url; // Full Cloudinary https:// URL

      console.log('[RandomChat] Upload OK:', mediaUrl);

      // ✅ Send as type:'media' over WebSocket — backend forwards to partner
      wsRef.current.send(JSON.stringify({
        type:       'media',
        media_url:  mediaUrl,
        media_type: isVideo ? 'video' : 'image',
      }));

      // Show in own chat
      setMessages(prev => [...prev, {
        type:       'sent',
        media_url:  mediaUrl,
        media_type: isVideo ? 'video' : 'image',
        timestamp:  new Date().toISOString(),
      }]);

      toast.success('Media sent!');
    } catch (err) {
      console.error('[RandomChat] Upload error:', err.response?.status, err.response?.data || err.message);
      toast.error(err.response?.data?.detail || 'Upload failed. Try again.');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderMessage = (msg, index) => {
    if (msg.type === 'system') {
      return (
        <div key={index} style={{ display:'flex', justifyContent:'center', margin:'4px 0' }}>
          <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'6px 14px', fontSize:12, color:'rgba(255,255,255,0.4)', fontStyle:'italic' }}>
            {msg.text}
          </div>
        </div>
      );
    }

    const isSent = msg.type === 'sent';

    return (
      <div key={index} style={{ display:'flex', justifyContent: isSent ? 'flex-end' : 'flex-start', margin:'4px 0' }}>
        <div style={{
          maxWidth: '75%',
          background: isSent ? '#E63946' : 'rgba(255,255,255,0.08)',
          borderRadius: isSent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: msg.media_url ? '6px' : '10px 14px',
          color: '#fff',
        }}>
          {/* Text */}
          {msg.text && (
            <p style={{ margin:0, fontSize:14, lineHeight:1.5, wordBreak:'break-word', padding: msg.media_url ? '0 8px 6px' : 0 }}>
              {msg.text}
            </p>
          )}

          {/* ✅ Media — use URL directly (it's already a full Cloudinary URL) */}
          {msg.media_url && (
            <div style={{ borderRadius:12, overflow:'hidden' }}>
              {msg.media_type === 'video' ? (
                <video
                  src={msg.media_url}
                  controls
                  style={{ maxWidth:'100%', maxHeight:300, display:'block', borderRadius:12 }}
                  onError={e => console.error('[RandomChat] Video error:', msg.media_url, e)}
                />
              ) : (
                <img
                  src={msg.media_url}
                  alt="Shared media"
                  style={{ maxWidth:'100%', maxHeight:300, display:'block', borderRadius:12, cursor:'pointer' }}
                  onClick={() => window.open(msg.media_url, '_blank')}
                  onError={e => console.error('[RandomChat] Image error:', msg.media_url, e)}
                />
              )}
            </div>
          )}

          {/* Timestamp */}
          <p style={{ margin:0, fontSize:10, color: isSent ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', textAlign:'right', marginTop:4, padding: msg.media_url ? '0 4px 2px' : 0 }}>
            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }) : ''}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#0A0A0A' }}>

      {/* Header */}
      <div style={{ background:'#0F0F0F', borderBottom:'0.5px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ color:'#fff', fontWeight:700, fontSize:18, margin:0 }}>Random Chat</h1>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, margin:0, marginTop:2 }}>
            {status === 'connecting' && 'Connecting…'}
            {status === 'waiting'    && 'Finding a stranger…'}
            {status === 'connected'  && 'Connected with stranger'}
            {status === 'disconnected' && 'Chat anonymously with strangers'}
          </p>
        </div>

        <div style={{ display:'flex', gap:8 }}>
          {status === 'disconnected' && (
            <button onClick={handleStart} style={{ background:'#E63946', border:'none', borderRadius:20, padding:'10px 20px', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Start Chat
            </button>
          )}
          {status === 'connecting' && (
            <button disabled style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:20, padding:'10px 20px', color:'rgba(255,255,255,0.4)', fontSize:14, display:'flex', alignItems:'center', gap:8 }}>
              <Loader size={16} style={{ animation:'spin 0.8s linear infinite' }}/> Connecting…
            </button>
          )}
          {status === 'waiting' && (
            <button onClick={handleStop} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:20, padding:'10px 20px', color:'rgba(255,255,255,0.7)', fontWeight:600, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <X size={16}/> Cancel
            </button>
          )}
          {status === 'connected' && (
            <>
              <button onClick={handleSkip} style={{ background:'rgba(255,183,3,0.12)', border:'none', borderRadius:20, padding:'10px 18px', color:'#FFB703', fontWeight:600, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <SkipForward size={16}/> Skip
              </button>
              <button onClick={handleStop} style={{ background:'rgba(230,57,70,0.15)', border:'none', borderRadius:20, padding:'10px 18px', color:'#E63946', fontWeight:600, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <X size={16}/> Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:4, scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.06) transparent' }}>

        {status === 'disconnected' && messages.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, opacity:0.6 }}>
            <div style={{ fontSize:48 }}>👤</div>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, textAlign:'center', maxWidth:280 }}>
              Connect anonymously with random people. Share text, images, and videos!
            </p>
            <button onClick={handleStart} style={{ background:'#E63946', border:'none', borderRadius:20, padding:'12px 28px', color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer' }}>
              Start Chatting 🚀
            </button>
          </div>
        )}

        {status === 'waiting' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <Loader size={40} color='#E63946' style={{ animation:'spin 0.8s linear infinite' }}/>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15 }}>Finding a stranger…</p>
            <p style={{ color:'rgba(255,255,255,0.25)', fontSize:12, textAlign:'center', maxWidth:260 }}>
              You need another user online at the same time to match.
            </p>
          </div>
        )}

        {messages.map((msg, i) => renderMessage(msg, i))}
        <div ref={messagesEndRef}/>
      </div>

      {/* Input bar — only when connected */}
      {status === 'connected' && (
        <div style={{ background:'#0F0F0F', borderTop:'0.5px solid rgba(255,255,255,0.07)', padding:'10px 14px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMediaUpload}
            accept="image/*,video/*"
            style={{ display:'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMedia}
            style={{ background:'none', border:'none', cursor: uploadingMedia ? 'wait' : 'pointer', color: uploadingMedia ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)', padding:6, display:'flex', alignItems:'center', borderRadius:8 }}
            title="Send image or video"
          >
            {uploadingMedia
              ? <Loader size={20} style={{ animation:'spin 0.8s linear infinite' }}/>
              : <ImageIcon size={20}/>
            }
          </button>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
            placeholder="Type a message…"
            style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'10px 16px', color:'#fff', fontSize:14, outline:'none' }}
          />

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            style={{ width:38, height:38, borderRadius:'50%', border:'none', background: inputText.trim() ? '#E63946' : 'rgba(255,255,255,0.06)', cursor: inputText.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}
          >
            <Send size={16} color={inputText.trim() ? '#fff' : 'rgba(255,255,255,0.2)'}/>
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RandomChatPage;
