import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Send, Image as ImageIcon, Smile } from 'lucide-react';
import api from '../utils/api';
import { toast } from 'sonner';

const AVATAR_COLORS = [
  { bg:'rgba(230,57,70,0.18)',  color:'#E63946' },
  { bg:'rgba(29,158,117,0.18)', color:'#1D9E75' },
  { bg:'rgba(186,117,23,0.18)', color:'#EF9F27' },
  { bg:'rgba(55,138,221,0.18)', color:'#378ADD' },
  { bg:'rgba(212,83,126,0.18)', color:'#D4537E' },
];

const getColor = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const getInitials = (name) => name.slice(0, 2).toUpperCase();

const RoomChatPage = () => {
  const { roomId }    = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const state         = location.state || {};
  const nickname      = state.nickname || 'Anonymous';
  const isAnon        = state.isAnon || false;
  const room          = state.room || { name: 'Room', emoji: '💬' };

  const [messages, setMessages]     = useState([]);
  const [inputText, setInputText]   = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isTyping, setIsTyping]     = useState(false);

  const wsRef       = useRef(null);
  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const mountedRef  = useRef(true);

  // Redirect if no state
  useEffect(() => {
    if (!state.nickname) {
      navigate('/rooms');
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  useEffect(() => {
    mountedRef.current = true;
    connectWS();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, []);

  const connectWS = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const wsBase = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl = `${wsBase}/api/ws/room/${roomId}?nickname=${encodeURIComponent(nickname)}&is_anon=${isAnon}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (!mountedRef.current) { socket.close(); return; }
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'system') {
          setOnlineCount(data.online || 0);
          setMessages(prev => [...prev, { id: Date.now(), type:'system', text: data.text }]);
        } else if (data.type === 'message') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'message',
            nickname: data.nickname,
            is_anon: data.is_anon,
            text: data.text,
            image: data.image,
            time: new Date(data.time).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }),
            isMine: data.nickname === (isAnon ? 'Anonymous' : nickname) && !data.is_anon === !isAnon,
          }]);
        } else if (data.type === 'typing') {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
      } catch {}
    };

    socket.onclose = () => { wsRef.current = null; };
    socket.onerror = () => {};
    wsRef.current = socket;
  };

  const safeSend = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    safeSend({ type:'message', text: inputText.trim() });
    setInputText('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size / 1024 / 1024 > 5) { toast.error('Image must be under 5MB'); return; }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const res = await api.post('/upload-compressed-media', formData);
      const imageUrl = res.data.media_url;
      safeSend({ type:'message', text:'', image: imageUrl });
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingMedia(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const displayName = isAnon ? 'Anonymous' : nickname;

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#0A0A0A', position:'relative' }}>

      {/* Top bar */}
      <div style={{
        background:'#0F0F0F', borderBottom:'0.5px solid rgba(255,255,255,0.07)',
        padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0
      }}>
        <button onClick={() => navigate('/rooms')} style={{
          background:'none', border:'none', cursor:'pointer',
          color:'rgba(255,255,255,0.45)', fontSize:22, padding:'2px 4px'
        }}>
          <ArrowLeft size={22} />
        </button>

        <div style={{
          width:36, height:36, borderRadius:12, flexShrink:0,
          background:'rgba(230,57,70,0.15)', display:'flex',
          alignItems:'center', justifyContent:'center', fontSize:18
        }}>
          {room.emoji}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:'rgba(255,255,255,0.9)', fontSize:14, fontWeight:500, margin:0 }}>{room.name}</p>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80' }} />
            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{onlineCount} online</span>
          </div>
        </div>

        <button
          onClick={() => setShowMembers(v => !v)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', padding:4 }}
        >
          <Users size={20} />
        </button>
      </div>

      {/* Chat messages */}
      <div style={{
        flex:1, overflowY:'auto', padding:'12px 14px',
        display:'flex', flexDirection:'column', gap:10,
        scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.06) transparent'
      }}>
        {/* Welcome message */}
        <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>
          You joined as <strong style={{ color:'rgba(255,255,255,0.4)' }}>{displayName}</strong>
        </div>

        {messages.map(msg => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>
                {msg.text}
              </div>
            );
          }

          const c = getColor(msg.nickname || 'A');
          const initials = getInitials(msg.is_anon ? 'AN' : (msg.nickname || 'AN'));

          return (
            <div key={msg.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:500, marginTop:1,
                background: msg.is_anon ? 'rgba(255,255,255,0.07)' : c.bg,
                color: msg.is_anon ? 'rgba(255,255,255,0.35)' : c.color,
              }}>
                {msg.is_anon ? '?' : initials}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.85)' }}>
                    {msg.is_anon ? 'Anonymous' : msg.nickname}
                  </span>
                  {msg.is_anon && (
                    <span style={{
                      fontSize:10, padding:'1px 6px', borderRadius:8,
                      background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.3)'
                    }}>anon</span>
                  )}
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>{msg.time}</span>
                </div>

                {msg.text && (
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>
                    {msg.text}
                  </p>
                )}

                {msg.image && (
                  <img
                    src={msg.image}
                    alt=""
                    style={{ maxWidth:200, borderRadius:10, marginTop:4, display:'block', cursor:'pointer' }}
                    onClick={() => window.open(msg.image, '_blank')}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0' }}>
            <div style={{ display:'flex', gap:3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:4, height:4, borderRadius:'50%',
                  background:'rgba(255,255,255,0.25)',
                  animation:`tdot 1.2s ${i*0.2}s infinite`
                }} />
              ))}
            </div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>someone is typing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        background:'#0F0F0F', borderTop:'0.5px solid rgba(255,255,255,0.07)',
        padding:'8px 12px', display:'flex', alignItems:'center', gap:8, flexShrink:0
      }}>
        <input type="file" ref={fileRef} onChange={handleImageUpload} accept="image/*" style={{ display:'none' }} />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadingMedia}
          style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, fontSize:20 }}
        >
          <ImageIcon size={20} />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={e => {
            setInputText(e.target.value);
            safeSend({ type:'typing' });
          }}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Whisper something..."
          style={{
            flex:1, background:'rgba(255,255,255,0.05)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            borderRadius:20, padding:'9px 14px',
            fontSize:13, color:'rgba(255,255,255,0.8)',
            outline:'none', fontFamily:'inherit'
          }}
        />

        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          style={{
            width:36, height:36, borderRadius:'50%',
            background: inputText.trim() ? '#E63946' : 'rgba(255,255,255,0.06)',
            border:'none', cursor: inputText.trim() ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'all 0.15s'
          }}
        >
          <Send size={16} color={inputText.trim() ? '#fff' : 'rgba(255,255,255,0.2)'} />
        </button>
      </div>

      <style>{`
        @keyframes tdot {
          0%,60%,100% { opacity: 0.25; }
          30% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default RoomChatPage;