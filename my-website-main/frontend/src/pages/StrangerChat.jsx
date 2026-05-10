import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, SkipForward, Image as ImageIcon, Video, Search, Loader, ArrowLeft, Smile, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import api, { API } from '../utils/api';
import { toast } from 'sonner';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.15;
    if (type === 'match') {
      osc.frequency.value = 587; osc.type = 'sine';
      osc.start(); osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination); g2.gain.value = 0.15;
        o2.frequency.value = 784; o2.type = 'sine'; o2.start(); o2.stop(ctx.currentTime + 0.2);
      }, 150);
    } else if (type === 'message') {
      osc.frequency.value = 880; osc.type = 'sine';
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'disconnect') {
      osc.frequency.value = 330; osc.type = 'sine';
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) { }
};

const vibrate = (pattern) => {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { }
};

const StrangerChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [partnerId, setPartnerId] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const wsRef = useRef(null);
  const statusRef = useRef('idle');
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const mountedRef = useRef(true);

  // Track uploaded media public_ids for cleanup
  const chatMediaRef = useRef([]);

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    if (messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    mountedRef.current = true;
    intentionalCloseRef.current = false;
    chatMediaRef.current = [];
    return () => {
      mountedRef.current = false;
      intentionalCloseRef.current = true;
      // Cleanup media when component unmounts
      cleanupChatMedia();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (showGifPicker && gifs.length === 0) fetchTrendingGifs();
  }, [showGifPicker]);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await api.get('/online-count');
        setOnlineCount(res.data.online);
      } catch (e) { }
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000);
    return () => clearInterval(interval);
  }, []);

  // Delete all uploaded media from this chat session
  const cleanupChatMedia = async () => {
    const publicIds = chatMediaRef.current;
    if (!publicIds || publicIds.length === 0) return;
    try {
      await api.delete('/chat-media/cleanup', {
        data: publicIds,
        headers: { 'Content-Type': 'application/json' }
      });
      chatMediaRef.current = [];
      logger.info(`Cleaned up ${publicIds.length} chat media files`);
    } catch (e) {
      console.error('Failed to cleanup chat media:', e);
    }
  };

  const fetchTrendingGifs = async () => {
    setLoadingGifs(true);
    try {
      const res = await fetch(`${TENOR_BASE}/featured?key=${TENOR_API_KEY}&client_key=gupt_kura&limit=20`);
      const data = await res.json();
      setGifs(data.results || []);
    } catch (err) { console.error('Failed to load GIFs:', err); }
    finally { setLoadingGifs(false); }
  };

  const searchGifs = async (query) => {
    if (!query.trim()) { fetchTrendingGifs(); return; }
    setLoadingGifs(true);
    try {
      const res = await fetch(`${TENOR_BASE}/search?key=${TENOR_API_KEY}&client_key=gupt_kura&q=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setGifs(data.results || []);
    } catch (err) { console.error('GIF search failed:', err); }
    finally { setLoadingGifs(false); }
  };

  const connectWebSocket = useCallback(() => {
    const userId = `${user.name}_${Date.now()}`;
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    const wsBase = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl = `${wsBase}/api/ws/stranger-chat?user_id=${encodeURIComponent(userId)}`;

    const socket = new WebSocket(wsUrl);
    let reconnectAttempts = 0;
    intentionalCloseRef.current = false;

    socket.onopen = () => {
      if (!mountedRef.current) { socket.close(); return; }
      reconnectAttempts = 0;
      try { socket.send(JSON.stringify({ type: 'pong' })); } catch (e) { }
      setStatus('searching');
      toast.success('Searching for a stranger...');
    };

    socket.onmessage = (event) => {
      if (!mountedRef.current) return;
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }

      if (data.type === 'ping') {
        try { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'pong' })); } catch (e) { }
        return;
      }
      if (data.type === 'pong') return;

      if (data.type === 'matched') {
        setStatus('connected');
        setPartnerId(data.partner_id);
        setMessages([{ type: 'system', text: 'Stranger connected! Say hi 👋' }]);
        playSound('match');
        vibrate([100, 50, 100]);
        toast.success('Connected with a stranger!');
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, { type: 'received', text: data.text, timestamp: Date.now() }]);
        playSound('message');
        vibrate(50);
        setIsTyping(false);
      } else if (data.type === 'image') {
        setMessages(prev => [...prev, { type: 'received', image: data.url, mediaType: 'image', timestamp: Date.now() }]);
        playSound('message');
        vibrate(50);
      } else if (data.type === 'video') {
        setMessages(prev => [...prev, { type: 'received', video: data.url, mediaType: 'video', timestamp: Date.now() }]);
        playSound('message');
        vibrate(50);
      } else if (data.type === 'gif') {
        setMessages(prev => [...prev, { type: 'received', gif: data.url, timestamp: Date.now() }]);
        playSound('message');
        vibrate(50);
      } else if (data.type === 'typing') {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      } else if (data.type === 'disconnected') {
        setPartnerId(null);
        setIsTyping(false);
        setMessages(prev => [...prev, { type: 'system', text: 'Stranger disconnected. Click Next to find someone new!' }]);
        playSound('disconnect');
        vibrate(200);
        toast.error('Stranger disconnected');
        // Cleanup media when partner disconnects
        cleanupChatMedia();
      }
    };

    socket.onclose = (event) => {
      wsRef.current = null;
      if (!mountedRef.current || intentionalCloseRef.current) return;
      if ((statusRef.current === 'connected' || statusRef.current === 'searching') && reconnectAttempts < 5) {
        reconnectAttempts++;
        setMessages(prev => [...prev, { type: 'system', text: `Connection lost. Reconnecting (${reconnectAttempts}/5)...` }]);
        if (reconnectAttempts <= 2) toast.error('Connection lost. Reconnecting...');
        const delay = Math.min(1000 * reconnectAttempts, 4000);
        setTimeout(() => {
          if (mountedRef.current && statusRef.current !== 'idle') connectWebSocket();
        }, delay);
        return;
      }
      setStatus('idle');
    };

    socket.onerror = () => { };
    wsRef.current = socket;
    setWs(socket);
  }, [user]);

  const safeSend = (data) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
        return true;
      }
    } catch (e) { console.warn('WebSocket send failed:', e); }
    return false;
  };

  const sendTypingIndicator = () => {
    if (statusRef.current === 'connected') safeSend({ type: 'typing' });
  };

  const handleStart = () => {
    if (!user) { toast.error('Please complete onboarding first'); return; }
    chatMediaRef.current = [];
    connectWebSocket();
  };

  const handleCancel = async () => {
    intentionalCloseRef.current = true;
    // Cleanup media before closing
    await cleanupChatMedia();
    if (wsRef.current) wsRef.current.close();
    wsRef.current = null;
    setWs(null);
    setStatus('idle');
    setMessages([]);
    setPartnerId(null);
    setShowGifPicker(false);
    setShowEmojiPicker(false);
    toast.info('Chat ended');
  };

  const handleNext = async () => {
    // Cleanup media from current chat before moving to next
    await cleanupChatMedia();
    chatMediaRef.current = [];

    if (!safeSend({ action: 'next' })) {
      if (wsRef.current) wsRef.current.close();
      wsRef.current = null;
      setMessages([]);
      setPartnerId(null);
      setStatus('idle');
      setShowGifPicker(false);
      setShowEmojiPicker(false);
      setIsTyping(false);
      toast.info('Reconnecting...');
      setTimeout(() => connectWebSocket(), 300);
      return;
    }
    setMessages([]);
    setPartnerId(null);
    setStatus('searching');
    setShowGifPicker(false);
    setShowEmojiPicker(false);
    setIsTyping(false);
    toast.info('Finding new stranger...');
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || status !== 'connected') return;
    if (!safeSend({ type: 'message', text: inputText })) {
      toast.error('Connection issue. Try again.');
      return;
    }
    setMessages(prev => [...prev, { type: 'sent', text: inputText, timestamp: Date.now() }]);
    setInputText('');
    setShowEmojiPicker(false);
  };

  // Upload image
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || status !== 'connected') return;
    if (file.size / (1024 * 1024) > 5) { toast.error('Image must be less than 5MB'); return; }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const response = await api.post('/upload-compressed-media', formData);
      const imageUrl = response.data.media_url;
      const publicId = response.data.public_id;

      // Track public_id for cleanup
      if (publicId) chatMediaRef.current.push(publicId);

      if (safeSend({ type: 'image', url: imageUrl })) {
        setMessages(prev => [...prev, { type: 'sent', image: imageUrl, mediaType: 'image', timestamp: Date.now() }]);
        toast.success('Image sent!');
      } else {
        toast.error('Connection lost. Could not send image.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload video
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || status !== 'connected') return;
    if (file.size / (1024 * 1024) > 10) { toast.error('Video must be less than 10MB'); return; }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const response = await api.post('/upload-chat-media', formData);
      const videoUrl = response.data.media_url;
      const publicId = response.data.public_id;

      // Track public_id for cleanup
      if (publicId) chatMediaRef.current.push(publicId);

      if (safeSend({ type: 'video', url: videoUrl })) {
        setMessages(prev => [...prev, { type: 'sent', video: videoUrl, mediaType: 'video', timestamp: Date.now() }]);
        toast.success('Video sent!');
      } else {
        toast.error('Connection lost. Could not send video.');
      }
    } catch (error) {
      console.error('Video upload failed:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSendGif = (gifUrl) => {
    if (status !== 'connected') return;
    if (!safeSend({ type: 'gif', url: gifUrl })) {
      toast.error('Connection issue. Try again.');
      return;
    }
    setMessages(prev => [...prev, { type: 'sent', gif: gifUrl, timestamp: Date.now() }]);
    setShowGifPicker(false);
  };

  const handleEmojiClick = (emojiData) => {
    setInputText(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTypingIndicator();
  };

  const renderMessage = (msg, index) => {
    if (msg.type === 'system') {
      return (
        <div key={index} className="flex justify-center">
          <div className="bg-[#1A1010] rounded-xl px-4 py-2 text-sm text-[#5A3A3A] text-center border border-[#271A1A]">
            {msg.text}
          </div>
        </div>
      );
    }
    const isSent = msg.type === 'sent';
    return (
      <div key={index} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] sm:max-w-md rounded-2xl p-3 ${
          isSent ? 'bg-[#E63946] text-white' : 'bg-[#1A1010] border border-[#271A1A] text-white'
        }`}>
          {msg.text && <p className="break-words text-sm sm:text-base">{msg.text}</p>}
          {msg.image && (
            <img
              src={msg.image}
              alt="Shared"
              className="max-w-full rounded-xl mt-1 cursor-pointer"
              loading="lazy"
              onClick={() => window.open(msg.image, '_blank')}
            />
          )}
          {msg.video && (
            <video
              src={msg.video}
              controls
              className="max-w-full rounded-xl mt-1"
              style={{ maxHeight: '300px' }}
            />
          )}
          {msg.gif && (
            <img src={msg.gif} alt="GIF" className="max-w-full rounded-xl mt-1" loading="lazy" />
          )}
        </div>
      </div>
    );
  };

  const inputBarHeight = status === 'connected' ? (showEmojiPicker || showGifPicker ? 'pb-[360px]' : 'pb-[88px]') : 'pb-4';

  return (
    <div className="h-[100dvh] flex flex-col bg-[#050505] relative">
      {/* Header */}
      <div className="shrink-0 bg-[#0A0808]/95 backdrop-blur-xl border-b border-[#271A1A]/60 px-3 py-2.5 sm:px-4 sm:py-3 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={async () => {
                await cleanupChatMedia();
                if (wsRef.current) wsRef.current.close();
                navigate('/');
              }}
              className="bg-[#1A1010] border border-[#271A1A] p-2 rounded-xl hover:bg-[#271A1A] transition-all active:scale-95 text-[#5A3A3A] hover:text-white">
              <ArrowLeft size={18} />
            </button>
            <div className="bg-gradient-to-br from-[#E63946] to-[#C82A36] p-2 sm:p-2.5 rounded-xl">
              <Search size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight">Stranger Chat</h1>
              <p className="text-xs font-medium">
                {status === 'idle' && <span className="text-[#5A3A3A]">Click Start to begin</span>}
                {status === 'searching' && <span className="text-[#FFB703] animate-pulse">Searching...</span>}
                {status === 'connected' && <span className="text-green-400">Connected with stranger</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-bold">{onlineCount} online</span>
            </div>

            {status === 'idle' && (
              <button onClick={handleStart}
                className="bg-[#E63946] text-white rounded-xl px-4 sm:px-5 py-2 font-bold text-sm hover:bg-[#C82A36] transition-all active:scale-95">
                Find Stranger
              </button>
            )}
            {status === 'searching' && (
              <button onClick={handleCancel}
                className="bg-[#1A1010] border border-[#271A1A] hover:bg-[#271A1A] text-white rounded-xl px-4 py-2 font-bold text-sm transition-all active:scale-95 flex items-center gap-1.5">
                <X size={16} /> Cancel
              </button>
            )}
            {status === 'connected' && (
              <div className="flex items-center gap-1.5">
                <button onClick={handleNext}
                  className="bg-[#FFB703] hover:bg-[#E5A003] text-black rounded-xl px-3 py-2 font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center gap-1">
                  <SkipForward size={16} /> Next
                </button>
                <button onClick={handleCancel}
                  className="bg-[#E63946] hover:bg-[#C82A36] text-white rounded-xl px-3 py-2 font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center gap-1">
                  <X size={16} /> Stop
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 overflow-y-auto p-4 ${inputBarHeight}`}>
        <div className="max-w-4xl mx-auto space-y-3">
          {status === 'idle' && (
            <div className="text-center py-16 sm:py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-[#1A1010] rounded-full mb-6 border border-[#271A1A]">
                <Search size={40} className="text-[#5A3A3A]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Anonymous Chat</h2>
              <p className="text-[#5A3A3A] mb-4 text-sm sm:text-base max-w-sm mx-auto">
                Connect with random strangers. Share text, photos, videos and GIFs anonymously!
              </p>
              {onlineCount > 0 && (
                <div className="flex items-center justify-center gap-2 mb-6 text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-medium">{onlineCount} people online</span>
                </div>
              )}
              <button onClick={handleStart}
                className="bg-[#E63946] text-white rounded-2xl px-8 py-4 font-bold text-base sm:text-lg hover:bg-[#C82A36] transition-all active:scale-95 shadow-[0_0_30px_rgba(230,57,70,0.25)]">
                Find a Stranger
              </button>
            </div>
          )}

          {status === 'searching' && (
            <div className="text-center py-16 sm:py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-[#1A1010] rounded-full mb-6 border border-[#271A1A]">
                <Loader size={40} className="text-[#E63946] animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Searching...</h2>
              <p className="text-[#5A3A3A] mb-4 text-sm">Finding someone for you</p>
              {onlineCount > 0 && <p className="text-green-400 text-sm mb-4">{onlineCount} online</p>}
              <div className="max-w-sm mx-auto mt-4 bg-[#0F0A0A] border border-[#271A1A] rounded-2xl p-5">
                <p className="text-sm text-[#A1A1AA] mb-2"><strong>Tip:</strong> You need another user online to match.</p>
                <p className="text-xs text-[#3D2A2A]">Invite a friend to chat together!</p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => renderMessage(msg, index))}

          {isTyping && status === 'connected' && (
            <div className="flex justify-start">
              <div className="bg-[#1A1010] border border-[#271A1A] rounded-2xl px-4 py-3 flex items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#5A3A3A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#5A3A3A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#5A3A3A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[#5A3A3A] text-xs ml-2">Stranger is typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed bottom input bar */}
      {status === 'connected' && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="border-t border-[#271A1A] bg-[#0A0808]">
              <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width="100%" height={280} searchPlaceHolder="Search emoji..." skinTonesDisabled />
            </div>
          )}

          {/* GIF Picker */}
          {showGifPicker && (
            <div className="bg-[#0A0808] border-t border-[#271A1A] h-[280px] flex flex-col">
              <div className="p-2.5 border-b border-[#271A1A]">
                <div className="flex items-center gap-2">
                  <input type="text" value={gifSearch}
                    onChange={(e) => {
                      setGifSearch(e.target.value);
                      if (e.target.value.length > 1) searchGifs(e.target.value);
                      else if (e.target.value.length === 0) fetchTrendingGifs();
                    }}
                    placeholder="Search GIFs..."
                    className="flex-1 bg-[#1A1010] border border-[#271A1A] rounded-full px-4 py-2 text-white text-sm focus:border-[#E63946] outline-none placeholder:text-[#3D2A2A]" />
                  <button onClick={() => setShowGifPicker(false)} className="text-[#5A3A3A] hover:text-white p-2"><X size={20} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {loadingGifs ? (
                  <div className="flex items-center justify-center py-8"><Loader size={24} className="animate-spin text-[#E63946]" /></div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {gifs.map((gif) => {
                      const gifUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
                      const previewUrl = gif.media_formats?.nanogif?.url || gifUrl;
                      if (!gifUrl) return null;
                      return (
                        <button key={gif.id} onClick={() => handleSendGif(gifUrl)}
                          className="rounded-lg overflow-hidden hover:ring-2 hover:ring-[#E63946] transition-all active:scale-95">
                          <img src={previewUrl} alt={gif.title || 'GIF'} className="w-full h-20 sm:h-24 object-cover" loading="lazy" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="bg-[#0A0808]/95 backdrop-blur-xl border-t border-[#271A1A]/40 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="max-w-4xl mx-auto flex items-center gap-2">

              {/* Hidden file inputs */}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <input type="file" ref={videoInputRef} onChange={handleVideoUpload} accept="video/*" className="hidden" />

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Image upload */}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}
                  className="p-2 rounded-full hover:bg-[#1A1010] transition-all active:scale-90 text-[#5A3A3A] hover:text-[#E63946]"
                  title="Send image">
                  {uploadingMedia ? <Loader size={20} className="animate-spin text-[#E63946]" /> : <ImageIcon size={20} />}
                </button>

                {/* Video upload */}
                <button onClick={() => videoInputRef.current?.click()} disabled={uploadingMedia}
                  className="p-2 rounded-full hover:bg-[#1A1010] transition-all active:scale-90 text-[#5A3A3A] hover:text-[#E63946]"
                  title="Send video">
                  <Video size={20} />
                </button>

                {/* GIF */}
                <button onClick={() => { setShowGifPicker(prev => !prev); setShowEmojiPicker(false); }}
                  className={`p-2 rounded-full hover:bg-[#1A1010] transition-all active:scale-90 ${showGifPicker ? 'text-[#E63946]' : 'text-[#5A3A3A] hover:text-[#E63946]'}`}>
                  <span className="text-xs font-extrabold">GIF</span>
                </button>

                {/* Emoji */}
                <button onClick={() => { setShowEmojiPicker(prev => !prev); setShowGifPicker(false); }}
                  className={`p-2 rounded-full hover:bg-[#1A1010] transition-all active:scale-90 ${showEmojiPicker ? 'text-[#E63946]' : 'text-[#5A3A3A] hover:text-[#E63946]'}`}>
                  <Smile size={20} />
                </button>
              </div>

              {/* Text input */}
              <div className="flex-1 flex items-center bg-[#141010] border border-[#271A1A]/70 rounded-full px-4 py-0.5 focus-within:border-[#E63946]/50 transition-all">
                <input ref={inputRef} type="text" value={inputText} onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent py-2 text-white text-sm outline-none placeholder:text-[#3D2A2A]" />
              </div>

              {/* Send button */}
              <button onClick={handleSendMessage} disabled={!inputText.trim()}
                className="bg-[#E63946] text-white p-2.5 rounded-full hover:bg-[#C82A36] transition-all active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(230,57,70,0.25)]">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrangerChat;