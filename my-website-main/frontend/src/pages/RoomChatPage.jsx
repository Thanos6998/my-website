import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Send, Image as ImageIcon, Smile, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import api from '../utils/api';
import { toast } from 'sonner';

const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

const AVATAR_COLORS = [
  { bg:'rgba(230,57,70,0.18)',  color:'#E63946' },
  { bg:'rgba(29,158,117,0.18)', color:'#1D9E75' },
  { bg:'rgba(186,117,23,0.18)', color:'#EF9F27' },
  { bg:'rgba(55,138,221,0.18)', color:'#378ADD' },
  { bg:'rgba(212,83,126,0.18)', color:'#D4537E' },
];

const getAvatarColor = (name = 'A') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const getInitials = (name = 'AN') => name.slice(0, 2).toUpperCase();

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};

// ── Members drawer ────────────────────────────────────────────────────────────
const MembersDrawer = ({ members, onClose }) => (
  <div onClick={onClose} style={{
    position:'fixed', inset:0, zIndex:200,
    background:'rgba(0,0,0,0.7)', display:'flex',
    alignItems:'flex-end', justifyContent:'center'
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background:'#111', borderRadius:'20px 20px 0 0',
      border:'1px solid rgba(255,255,255,0.08)',
      width:'100%', maxWidth:480, maxHeight:'60vh',
      display:'flex', flexDirection:'column'
    }}>
      <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)', margin:'12px auto 0' }} />
      <div style={{ padding:'14px 18px 10px', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:15, margin:0 }}>
          Members — {members.length} online
        </p>
      </div>
      <div style={{ overflowY:'auto', padding:'8px 0 24px' }}>
        {members.length === 0 ? (
          <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, textAlign:'center', padding:'24px 0' }}>
            No members yet
          </p>
        ) : members.map((m, i) => {
          const c = getAvatarColor(m.nickname);
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px' }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background: m.is_anon ? 'rgba(255,255,255,0.07)' : c.bg,
                color: m.is_anon ? 'rgba(255,255,255,0.35)' : c.color,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:500, position:'relative'
              }}>
                {m.is_anon ? '?' : getInitials(m.nickname)}
                <div style={{
                  position:'absolute', bottom:0, right:0,
                  width:10, height:10, borderRadius:'50%',
                  background:'#4ade80', border:'2px solid #111'
                }} />
              </div>
              <div>
                <p style={{ color:'rgba(255,255,255,0.85)', fontSize:13, fontWeight:500, margin:0 }}>
                  {m.is_anon ? 'Anonymous' : m.nickname}
                </p>
                {m.is_anon && (
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>anon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── GIF picker ────────────────────────────────────────────────────────────────
const GifPicker = ({ onSelect, onClose }) => {
  const [query, setQuery]     = useState('');
  const [gifs, setGifs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGifs(''); }, []);

  const fetchGifs = async (q) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `${TENOR_BASE}/search?key=${TENOR_KEY}&q=${encodeURIComponent(q)}&limit=20&client_key=whispero`
        : `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=20&client_key=whispero`;
      const res = await fetch(url);
      const data = await res.json();
      setGifs(data.results || []);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div style={{
      background:'#111', borderTop:'0.5px solid rgba(255,255,255,0.07)',
      height:280, display:'flex', flexDirection:'column'
    }}>
      {/* Search */}
      <div style={{ padding:'8px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); fetchGifs(e.target.value); }}
          placeholder="Search GIFs..."
          style={{
            flex:1, background:'rgba(255,255,255,0.05)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            borderRadius:20, padding:'7px 14px',
            color:'#fff', fontSize:13, outline:'none', fontFamily:'inherit'
          }}
        />
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)' }}>
          <X size={18} />
        </button>
      </div>
      {/* Grid */}
      <div style={{ flex:1, overflowY:'auto', padding:8 }}>
        {loading ? (
          <p style={{ color:'rgba(255,255,255,0.3)', textAlign:'center', paddingTop:40, fontSize:13 }}>Loading...</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
            {gifs.map(gif => {
              const url = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
              if (!url) return null;
              return (
                <img
                  key={gif.id}
                  src={gif.media_formats?.nanogif?.url || url}
                  alt={gif.title}
                  onClick={() => onSelect(url)}
                  style={{
                    width:'100%', height:80, objectFit:'cover',
                    borderRadius:8, cursor:'pointer', border:'0.5px solid rgba(255,255,255,0.06)'
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main RoomChatPage ─────────────────────────────────────────────────────────
const RoomChatPage = () => {
  const { roomId }  = useParams();
  const location    = useLocation();
  const navigate    = useNavigate();
  const state       = location.state || {};
  const nickname    = state.nickname || 'Anonymous';
  const isAnon      = state.isAnon  || false;
  const room        = state.room    || { name:'Room', emoji:'💬', color:'#E63946' };

  const [messages, setMessages]         = useState([]);
  const [inputText, setInputText]       = useState('');
  const [onlineCount, setOnlineCount]   = useState(0);
  const [members, setMembers]           = useState([]);
  const [showMembers, setShowMembers]   = useState(false);
  const [showEmoji, setShowEmoji]       = useState(false);
  const [showGif, setShowGif]           = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [typingUsers, setTypingUsers]   = useState([]);
  const [connected, setConnected]       = useState(false);

  const wsRef      = useRef(null);
  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);
  const mountedRef = useRef(true);
  const typingTimers = useRef({});

  // Redirect if no state
  useEffect(() => {
    if (!state.nickname) navigate('/rooms');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    mountedRef.current = true;
    connectWS();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [roomId]);

  const connectWS = () => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    const wsBase = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl  = `${wsBase}/api/ws/room/${roomId}?nickname=${encodeURIComponent(nickname)}&is_anon=${isAnon}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (!mountedRef.current) { socket.close(); return; }
      setConnected(true);
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'system') {
          setOnlineCount(data.online || 0);
          if (data.members) setMembers(data.members);
          addMsg({ type:'system', text: data.text });

        } else if (data.type === 'message') {
          // Determine if this message is from ME
          const isMine = !data.is_anon && !isAnon && data.nickname === nickname;
          addMsg({
            type:'message',
            nickname: data.nickname,
            is_anon:  data.is_anon,
            text:     data.text,
            image:    data.image,
            gif:      data.gif,
            time:     formatTime(data.time),
            isMine,
          });
          // Clear typing indicator for this sender
          clearTyping(data.nickname);

        } else if (data.type === 'typing') {
          const sender = data.nickname;
          if (sender === (isAnon ? 'Anonymous' : nickname)) return;
          setTypingUsers(prev => prev.includes(sender) ? prev : [...prev, sender]);
          // Auto-clear after 3s
          if (typingTimers.current[sender]) clearTimeout(typingTimers.current[sender]);
          typingTimers.current[sender] = setTimeout(() => clearTyping(sender), 3000);

        } else if (data.type === 'members') {
          setMembers(data.members || []);
          setOnlineCount(data.online || 0);
        }
      } catch (e) { console.error('WS parse error', e); }
    };

    socket.onclose = () => {
      if (mountedRef.current) setConnected(false);
      wsRef.current = null;
    };
    socket.onerror = () => {};
    wsRef.current = socket;
  };

  const addMsg = (msg) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  };

  const clearTyping = (sender) => {
    setTypingUsers(prev => prev.filter(u => u !== sender));
  };

  const safeSend = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  };

  // ── Send text ──────────────────────────────────────────────────────────────
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !connected) return;

    // Show immediately in MY chat (optimistic)
    addMsg({
      type:'message',
      nickname: isAnon ? 'Anonymous' : nickname,
      is_anon:  isAnon,
      text,
      time: formatTime(new Date().toISOString()),
      isMine: true,
    });

    safeSend({ type:'message', text });
    setInputText('');
    setShowEmoji(false);
  };

  // ── Send GIF ───────────────────────────────────────────────────────────────
  const sendGif = (gifUrl) => {
    setShowGif(false);
    addMsg({
      type:'message',
      nickname: isAnon ? 'Anonymous' : nickname,
      is_anon:  isAnon,
      gif: gifUrl,
      time: formatTime(new Date().toISOString()),
      isMine: true,
    });
    safeSend({ type:'message', gif: gifUrl, text:'' });
  };

  // ── Upload image ───────────────────────────────────────────────────────────
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

      addMsg({
        type:'message',
        nickname: isAnon ? 'Anonymous' : nickname,
        is_anon:  isAnon,
        image: imageUrl,
        time: formatTime(new Date().toISOString()),
        isMine: true,
      });
      safeSend({ type:'message', image: imageUrl, text:'' });
      toast.success('Image sent!');
    } catch { toast.error('Failed to upload image'); }
    finally {
      setUploadingMedia(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Typing indicator ───────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    safeSend({ type:'typing', nickname: isAnon ? 'Anonymous' : nickname });
  };

  const displayName = isAnon ? 'Anonymous' : nickname;

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'#0A0A0A', fontFamily:'inherit' }}>

      {/* ── Top bar ── */}
      <div style={{
        background:'#0F0F0F', borderBottom:'0.5px solid rgba(255,255,255,0.07)',
        padding:'10px 14px', display:'flex', alignItems:'center', gap:10, flexShrink:0
      }}>
        <button onClick={() => navigate('/rooms')} style={{
          background:'none', border:'none', cursor:'pointer',
          color:'rgba(255,255,255,0.45)', padding:'2px 4px', display:'flex'
        }}>
          <ArrowLeft size={22} />
        </button>

        <div style={{
          width:36, height:36, borderRadius:12, flexShrink:0,
          background:'rgba(230,57,70,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          position:'relative'
        }}>
          {room.emoji}
          <div style={{
            position:'absolute', bottom:-1, right:-1,
            width:10, height:10, borderRadius:'50%',
            background: connected ? '#4ade80' : '#666',
            border:'2px solid #0F0F0F'
          }} />
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:'rgba(255,255,255,0.9)', fontSize:14, fontWeight:600, margin:0 }}>{room.name}</p>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background: connected ? '#4ade80' : '#666' }} />
            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>
              {connected ? `${onlineCount} online` : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Members button */}
        <button
          onClick={() => setShowMembers(true)}
          style={{
            background:'rgba(255,255,255,0.06)', border:'0.5px solid rgba(255,255,255,0.08)',
            borderRadius:10, padding:'7px 12px', cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
            color:'rgba(255,255,255,0.6)'
          }}
        >
          <Users size={16} />
          <span style={{ fontSize:12, fontWeight:500 }}>{onlineCount}</span>
        </button>
      </div>

      {/* ── Messages area ── */}
      <div style={{
        flex:1, overflowY:'auto', padding:'12px 14px 8px',
        display:'flex', flexDirection:'column', gap:10,
        scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.06) transparent'
      }}>

        {/* Welcome */}
        <div style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.2)', fontStyle:'italic', margin:'4px 0 8px' }}>
          You joined as <strong style={{ color:'rgba(255,255,255,0.4)' }}>{displayName}</strong>
        </div>

        {messages.map(msg => {
          // System message
          if (msg.type === 'system') {
            return (
              <div key={msg.id} style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.2)', fontStyle:'italic' }}>
                {msg.text}
              </div>
            );
          }

          const c = getAvatarColor(msg.nickname || 'A');
          const initials = getInitials(msg.is_anon ? 'AN' : (msg.nickname || 'AN'));

          return (
            <div key={msg.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              {/* Avatar */}
              <div style={{
                width:30, height:30, borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:500, marginTop:2,
                background: msg.is_anon ? 'rgba(255,255,255,0.07)' : c.bg,
                color:      msg.is_anon ? 'rgba(255,255,255,0.35)' : c.color,
              }}>
                {msg.is_anon ? '?' : initials}
              </div>

              {/* Bubble */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                  <span style={{
                    fontSize:12, fontWeight:600,
                    color: msg.isMine ? '#E63946' : 'rgba(255,255,255,0.85)'
                  }}>
                    {msg.is_anon ? 'Anonymous' : msg.nickname}
                    {msg.isMine && <span style={{ color:'rgba(255,255,255,0.3)', fontWeight:400 }}> (you)</span>}
                  </span>
                  {msg.is_anon && (
                    <span style={{
                      fontSize:10, padding:'1px 6px', borderRadius:8,
                      background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.3)'
                    }}>anon</span>
                  )}
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>{msg.time}</span>
                </div>

                {/* Text */}
                {msg.text ? (
                  <p style={{
                    fontSize:13, lineHeight:1.55, margin:0, wordBreak:'break-word',
                    color: msg.isMine ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)'
                  }}>
                    {msg.text}
                  </p>
                ) : null}

                {/* Image */}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt=""
                    onClick={() => window.open(msg.image, '_blank')}
                    style={{
                      maxWidth:220, borderRadius:10, marginTop: msg.text ? 6 : 0,
                      display:'block', cursor:'pointer',
                      border:'0.5px solid rgba(255,255,255,0.08)'
                    }}
                  />
                )}

                {/* GIF */}
                {msg.gif && (
                  <div style={{ position:'relative', display:'inline-block', marginTop: msg.text ? 6 : 0 }}>
                    <img
                      src={msg.gif}
                      alt="GIF"
                      style={{
                        maxWidth:220, borderRadius:10, display:'block',
                        border:'0.5px solid rgba(255,255,255,0.08)'
                      }}
                    />
                    <span style={{
                      position:'absolute', top:6, left:6,
                      background:'rgba(0,0,0,0.6)', borderRadius:4,
                      padding:'1px 5px', fontSize:10, color:'white', fontWeight:600
                    }}>GIF</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'2px 0' }}>
            <div style={{ display:'flex', gap:3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:4, height:4, borderRadius:'50%',
                  background:'rgba(255,255,255,0.25)',
                  animation:`tdot 1.2s ${i*0.2}s infinite`
                }} />
              ))}
            </div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people typing...`}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Emoji picker ── */}
      {showEmoji && (
        <div style={{ flexShrink:0, borderTop:'0.5px solid rgba(255,255,255,0.07)' }}>
          <EmojiPicker
            onEmojiClick={e => setInputText(prev => prev + e.emoji)}
            theme="dark" width="100%" height={280}
            searchPlaceHolder="Search emoji..." skinTonesDisabled
          />
        </div>
      )}

      {/* ── GIF picker ── */}
      {showGif && (
        <GifPicker onSelect={sendGif} onClose={() => setShowGif(false)} />
      )}

      {/* ── Input bar ── */}
      <div style={{
        background:'#0F0F0F', borderTop:'0.5px solid rgba(255,255,255,0.07)',
        padding:'8px 12px', display:'flex', alignItems:'center',
        gap:6, flexShrink:0
      }}>
        <input type="file" ref={fileRef} onChange={handleImageUpload} accept="image/*" style={{ display:'none' }} />

        {/* Image */}
        <button
          onClick={() => { fileRef.current?.click(); setShowEmoji(false); setShowGif(false); }}
          disabled={uploadingMedia}
          style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, display:'flex' }}
          title="Send image"
        >
          <ImageIcon size={20} />
        </button>

        {/* GIF */}
        <button
          onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
          style={{
            background: showGif ? 'rgba(230,57,70,0.1)' : 'none',
            border:'none', cursor:'pointer', padding:'4px 6px',
            color: showGif ? '#E63946' : 'rgba(255,255,255,0.3)',
            borderRadius:6, fontSize:11, fontWeight:800
          }}
          title="Send GIF"
        >
          GIF
        </button>

        {/* Emoji */}
        <button
          onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}
          style={{
            background: showEmoji ? 'rgba(230,57,70,0.1)' : 'none',
            border:'none', cursor:'pointer', padding:4, display:'flex',
            color: showEmoji ? '#E63946' : 'rgba(255,255,255,0.3)',
            borderRadius:6
          }}
          title="Emoji"
        >
          <Smile size={20} />
        </button>

        {/* Text input */}
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
          placeholder={connected ? 'Whisper something...' : 'Connecting...'}
          disabled={!connected}
          style={{
            flex:1, background:'rgba(255,255,255,0.05)',
            border:'0.5px solid rgba(255,255,255,0.08)',
            borderRadius:20, padding:'9px 14px',
            fontSize:13, color:'rgba(255,255,255,0.85)',
            outline:'none', fontFamily:'inherit',
            opacity: connected ? 1 : 0.5
          }}
        />

        {/* Send */}
        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || !connected}
          style={{
            width:36, height:36, borderRadius:'50%', border:'none',
            background: (inputText.trim() && connected) ? '#E63946' : 'rgba(255,255,255,0.06)',
            cursor: (inputText.trim() && connected) ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0, transition:'all 0.15s'
          }}
          title="Send"
        >
          <Send size={16} color={(inputText.trim() && connected) ? '#fff' : 'rgba(255,255,255,0.2)'} />
        </button>
      </div>

      {/* Members drawer */}
      {showMembers && (
        <MembersDrawer members={members} onClose={() => setShowMembers(false)} />
      )}

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