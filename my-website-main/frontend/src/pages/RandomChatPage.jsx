import React, { useState, useEffect, useRef } from 'react';
import { Send, SkipForward, Image as ImageIcon, Video as VideoIcon, User, UserCheck, Loader, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { API } from '../utils/api';
import { toast } from 'sonner';

const RandomChatPage = () => {
  const { user } = useAuth();
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, waiting, connected
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToRandomChat = async () => {
    if (!user || !user.name) {
      console.error('No user available');
      toast.error('User not authenticated. Please refresh.');
      throw new Error('No user');
    }
    
    // Use user's name as unique identifier for WebSocket
    const userId = `${user.name}_${Date.now()}`;
    
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    // WebSocket MUST use /api prefix for K8s ingress routing
    const baseWsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrl = `${baseWsUrl}/ws/random-chat?session_id=${encodeURIComponent(userId)}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    console.log('User:', user.name);
    
    try {
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected successfully');
        toast.success('Connected! Finding a stranger...');
      };
      
      websocket.onmessage = (event) => {
        console.log('WebSocket message:', event.data);
        const data = JSON.parse(event.data);
        
        if (data.type === 'waiting') {
          setStatus('waiting');
          setMessages([]);
          toast.info('Searching for someone to chat with...');
        } else if (data.type === 'matched') {
          setStatus('connected');
          setMessages([{ type: 'system', text: 'You are now connected with a stranger!' }]);
          toast.success('Connected! Start chatting 💬');
        } else if (data.type === 'partner_disconnected') {
          setStatus('disconnected');
          setMessages(prev => [...prev, { type: 'system', text: 'Stranger disconnected.' }]);
          toast.error('Stranger disconnected');
        } else if (data.type === 'text' || data.type === 'media') {
          setMessages(prev => [...prev, { type: 'received', ...data }]);
        }
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        if (event.code !== 1000) {
          toast.error('Connection closed unexpectedly');
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error. Check your internet.');
        setStatus('disconnected');
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      toast.error('Failed to connect. Please try again.');
      throw error;
    }
  };

  const handleStart = async () => {
    console.log('Start button clicked');
    setStatus('connecting');
    try {
      await connectToRandomChat();
    } catch (error) {
      console.error('Failed to start chat:', error);
      toast.error('Failed to connect. Please try again.');
      setStatus('disconnected');
    }
  };

  const handleSkip = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'skip' }));
      setMessages([]);
      setStatus('waiting');
      toast.info('Finding new stranger...');
    }
  };

  const handleStop = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setStatus('disconnected');
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    const message = {
      type: 'text',
      text: inputText
    };
    
    ws.send(JSON.stringify(message));
    setMessages(prev => [...prev, { type: 'sent', text: inputText, timestamp: new Date().toISOString() }]);
    setInputText('');
  };

  const handleMediaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !ws || ws.readyState !== WebSocket.OPEN) return;

    const sizeMB = file.size / (1024 * 1024);
    if (file.type.startsWith('image/') && sizeMB > 2) {
      toast.error('Image must be less than 2MB');
      return;
    }
    if (file.type.startsWith('video/') && sizeMB > 10) {
      toast.error('Video must be less than 10MB');
      return;
    }

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      
      const response = await api.post('/upload-chat-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const message = {
        type: 'media',
        media_url: response.data.media_url,
        media_type: file.type.startsWith('image/') ? 'image' : 'video'
      };
      
      ws.send(JSON.stringify(message));
      setMessages(prev => [...prev, { 
        type: 'sent', 
        media_url: response.data.media_url,
        media_type: message.media_type,
        timestamp: new Date().toISOString() 
      }]);
      
      toast.success('Media sent!');
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-gray-900 to-black" data-testid="random-chat-page">
      {/* Header */}
      <div className="glass border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-purple-blue p-3 rounded-xl">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Random Chat
              </h1>
              <p className="text-sm text-gradient font-semibold">
                {status === 'connecting' && 'Connecting...'}
                {status === 'waiting' && 'Finding a stranger...'}
                {status === 'connected' && 'Connected with stranger'}
                {status === 'disconnected' && 'Start chatting anonymously'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {status === 'disconnected' && (
              <button
                onClick={handleStart}
                className="gradient-purple-blue text-white rounded-2xl px-6 py-3 font-bold hover:scale-105 transition-all btn-press shadow-xl"
                data-testid="start-chat-btn"
              >
                Start Chat
              </button>
            )}
            
            {status === 'connecting' && (
              <button
                disabled
                className="gradient-purple-blue text-white rounded-2xl px-6 py-3 font-bold opacity-75 cursor-wait shadow-xl flex items-center gap-2"
              >
                <Loader size={20} className="animate-spin" />
                Connecting...
              </button>
            )}

            {status === 'waiting' && (
              <button
                onClick={handleStop}
                className="bg-gray-600 hover:bg-gray-700 text-white rounded-2xl px-6 py-3 font-bold transition-all btn-press flex items-center gap-2"
                data-testid="cancel-wait-btn"
              >
                <X size={20} />
                Cancel
              </button>
            )}
            
            {status === 'connected' && (
              <>
                <button
                  onClick={handleSkip}
                  className="glass-card text-yellow-400 rounded-2xl px-5 py-3 font-bold hover:scale-105 transition-all btn-press flex items-center gap-2"
                  data-testid="skip-btn"
                >
                  <SkipForward size={20} />
                  <span>Skip</span>
                </button>
                <button
                  onClick={handleStop}
                  className="bg-red-500 text-white rounded-2xl px-5 py-3 font-bold hover:bg-red-600 transition-all btn-press flex items-center gap-2"
                  data-testid="stop-btn"
                >
                  <X size={20} />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {status === 'disconnected' && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/5 rounded-full mb-6">
                <User size={48} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Chat with Random Strangers
              </h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Connect anonymously with random people from Nepal. Share text, images, and videos!
              </p>
              <button
                onClick={handleStart}
                className="gradient-purple-blue text-white rounded-2xl px-8 py-4 font-bold text-lg hover:scale-105 transition-all btn-press shadow-xl glow-box"
              >
                Start Chatting 🚀
              </button>
            </div>
          )}

          {status === 'waiting' && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/5 rounded-full mb-6 animate-pulse-glow">
                <Loader size={48} className="text-purple-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Finding a stranger...
              </h2>
              <p className="text-gray-400 mb-4">Please wait while we connect you</p>
              
              {/* Added explanation */}
              <div className="max-w-md mx-auto mt-8 glass-card rounded-2xl p-6">
                <p className="text-sm text-gray-300 mb-3">
                  💡 <strong>How it works:</strong> You need another user to be online at the same time to match with you.
                </p>
                <p className="text-xs text-gray-400">
                  If no one is available, you'll keep waiting. Try again later or invite a friend to test together!
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.type === 'sent' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'}`}
            >
              {msg.type === 'system' ? (
                <div className="glass-card rounded-xl px-4 py-2 text-sm text-gray-400 text-center">
                  {msg.text}
                </div>
              ) : (
                <div
                  className={`max-w-md rounded-2xl p-4 ${
                    msg.type === 'sent'
                      ? 'gradient-purple-blue text-white'
                      : 'glass-card text-white'
                  }`}
                >
                  {msg.text && <p className="break-words">{msg.text}</p>}
                  {msg.media_url && (
                    <div className="mt-2 rounded-xl overflow-hidden">
                      {msg.media_type === 'image' ? (
                        <img 
                          src={`${API}/files/${msg.media_url}`} 
                          alt="Shared media" 
                          className="max-w-full rounded-xl"
                        />
                      ) : (
                        <video 
                          src={`${API}/files/${msg.media_url}`} 
                          controls 
                          className="max-w-full rounded-xl"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {status === 'connected' && (
        <div className="glass border-t border-white/10 p-4 pb-safe">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaUpload}
              accept="image/*,video/*"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia}
              className="glass-card p-3 rounded-xl hover:text-purple-400 transition-all btn-press"
              data-testid="upload-media-btn"
            >
              {uploadingMedia ? (
                <Loader size={22} className="animate-spin" />
              ) : (
                <ImageIcon size={22} />
              )}
            </button>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all outline-none placeholder:text-gray-500"
              data-testid="chat-input"
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="gradient-purple-blue text-white p-3 rounded-xl hover:scale-105 transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              data-testid="send-btn"
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RandomChatPage;