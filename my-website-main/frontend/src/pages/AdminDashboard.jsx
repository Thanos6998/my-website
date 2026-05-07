import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, Flag, Users, FileText, Eye, ShieldAlert, ArrowLeft,
  BarChart3, MessageSquare, Image as ImageIcon, Ban, Check, X,
  RefreshCw, TrendingUp, Clock, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { API } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#8B5CF6', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#EC4899'];
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'confessions', label: 'Posts', icon: FileText },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'media', label: 'Media', icon: ImageIcon },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [confessions, setConfessions] = useState([]);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [images, setImages] = useState([]);

  // Auto-login for Sanjeevpaudel
  useEffect(() => {
    const autoLogin = async () => {
      let t = localStorage.getItem('admin_token');
      if (!t && user?.name) {
        try {
          const res = await axios.post(`${API}/admin/auto-login?name=${encodeURIComponent(user.name)}`);
          t = res.data.access_token;
          localStorage.setItem('admin_token', t);
        } catch {
          toast.error('Admin authentication failed');
          navigate('/');
          return;
        }
      }
      if (!t) { navigate('/'); return; }
      setToken(t);
    };
    autoLogin();
  }, [user, navigate]);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Fetch data based on active tab
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const h = { headers: headers() };
        if (activeTab === 'overview') {
          const res = await axios.get(`${API}/admin/analytics`, h);
          setAnalytics(res.data);
        } else if (activeTab === 'confessions') {
          const res = await axios.get(`${API}/confessions?limit=100`);
          setConfessions(res.data);
        } else if (activeTab === 'comments') {
          const res = await axios.get(`${API}/admin/comments?limit=100`, h);
          setComments(res.data);
        } else if (activeTab === 'reports') {
          const res = await axios.get(`${API}/admin/reports?limit=100`, h);
          setReports(res.data);
        } else if (activeTab === 'users') {
          const res = await axios.get(`${API}/admin/sessions?limit=100`, h);
          setSessions(res.data);
        } else if (activeTab === 'media') {
          const res = await axios.get(`${API}/admin/images?limit=100`, h);
          setImages(res.data);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('admin_token');
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, activeTab, headers, navigate]);

  const deleteConfession = async (id) => {
    if (!window.confirm('Delete this confession?')) return;
    try {
      await axios.delete(`${API}/admin/confessions/${id}`, { headers: headers() });
      setConfessions(prev => prev.filter(c => c.id !== id));
      toast.success('Confession deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const deleteComment = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API}/admin/comments/${id}`, { headers: headers() });
      setComments(prev => prev.filter(c => c.id !== id));
      toast.success('Comment deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const resolveReport = async (id, action) => {
    try {
      await axios.post(`${API}/admin/reports/${id}/resolve?action=${action}`, {}, { headers: headers() });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: action === 'resolve' ? 'resolved' : 'ignored' } : r));
      toast.success(`Report ${action === 'resolve' ? 'resolved' : 'ignored'}`);
    } catch { toast.error('Failed to update report'); }
  };

  const banUser = async (sessionId) => {
    const reason = prompt('Ban reason:');
    if (!reason) return;
    try {
      await axios.post(`${API}/admin/ban-session?session_id=${sessionId}&reason=${encodeURIComponent(reason)}`, {}, { headers: headers() });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_banned: true } : s));
      toast.success('User banned');
    } catch { toast.error('Failed to ban'); }
  };

  const deleteImage = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await axios.delete(`${API}/admin/images/${id}`, { headers: headers() });
      setImages(prev => prev.filter(f => f.id !== id));
      toast.success('File deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const refreshTab = () => {
    setToken(t => t); // Force re-fetch by toggling token (same value triggers useEffect re-eval)
    // Simpler: just re-set activeTab
    const current = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(current), 0);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14]" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-[#111318] border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="bg-white/5 border border-white/10 p-2 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-white"
              data-testid="admin-back-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <ShieldAlert size={24} className="text-red-500" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white" data-testid="admin-title">Admin Panel</h1>
              <p className="text-xs text-[#5A3A3A]">Whispero Nepal</p>
            </div>
          </div>
          <button
            onClick={refreshTab}
            className="bg-white/5 border border-white/10 p-2 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-white"
            data-testid="refresh-btn"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-[#111318] border-b border-white/5 sticky top-[57px] z-20 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 py-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && analytics && <OverviewTab analytics={analytics} />}
            {activeTab === 'confessions' && <ConfessionsTab confessions={confessions} onDelete={deleteConfession} onBan={banUser} />}
            {activeTab === 'comments' && <CommentsTab comments={comments} onDelete={deleteComment} />}
            {activeTab === 'reports' && <ReportsTab reports={reports} onResolve={resolveReport} onDelete={deleteConfession} />}
            {activeTab === 'users' && <UsersTab sessions={sessions} onBan={banUser} />}
            {activeTab === 'media' && <MediaTab images={images} onDelete={deleteImage} />}
          </>
        )}
      </div>
    </div>
  );
};

/* ========== OVERVIEW TAB ========== */
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${color}20` }}>
        <Icon size={22} style={{ color }} />
      </div>
    </div>
  </div>
);

const OverviewTab = ({ analytics }) => {
  const stats = [
    { label: 'Total Posts', value: analytics.total_confessions, icon: FileText, color: '#8B5CF6' },
    { label: 'Comments', value: analytics.total_comments, icon: MessageSquare, color: '#3B82F6' },
    { label: 'Reports', value: analytics.total_reports, icon: Flag, color: '#F59E0B' },
    { label: 'Pending', value: analytics.pending_reports, icon: AlertTriangle, color: '#EF4444' },
    { label: 'Users', value: analytics.total_sessions, icon: Users, color: '#10B981' },
    { label: 'Media Files', value: analytics.total_files, icon: ImageIcon, color: '#EC4899' },
  ];

  return (
    <div className="space-y-6" data-testid="overview-content">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" /> Posts (Last 7 Days)
          </h3>
          {analytics.daily_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.daily_data}>
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Bar dataKey="posts" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm py-10 text-center">No activity data yet</p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" /> Categories
          </h3>
          {analytics.category_data.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={analytics.category_data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                    {analytics.category_data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {analytics.category_data.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-300 text-sm capitalize">{cat.name}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-10 text-center">No category data yet</p>
          )}
        </div>
      </div>

      {/* Top Posts */}
      {analytics.top_confessions?.length > 0 && (
        <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-yellow-400" /> Top Posts by Likes
          </h3>
          <div className="space-y-3">
            {analytics.top_confessions.map((c, i) => (
              <div key={c.id} className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                <span className="text-lg font-bold text-purple-400 w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{c.text}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="capitalize">{c.category}</span>
                    <span>{c.likes} likes</span>
                    <span>{c.comments_count} comments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ========== CONFESSIONS TAB ========== */
const ConfessionsTab = ({ confessions, onDelete, onBan }) => (
  <div className="space-y-3" data-testid="confessions-content">
    {confessions.length === 0 ? (
      <EmptyState icon={FileText} text="No confessions yet" />
    ) : (
      confessions.map(c => (
        <div key={c.id} className="bg-[#151A22] border border-white/5 rounded-2xl p-4" data-testid="confession-admin-item">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{c.nickname}</span>
              <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs capitalize">{c.category}</span>
              {c.is_adult && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">18+</span>}
              {c.city && <span className="text-gray-500 text-xs">{c.city}</span>}
            </div>
            <span className="text-gray-500 text-xs whitespace-nowrap">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
          </div>
          <p className="text-gray-200 text-sm mb-3">{c.text}</p>
          {c.media_url && (
            <div className="mb-3 bg-white/5 rounded-xl p-2 inline-flex items-center gap-2 text-xs text-gray-400">
              <Eye size={14} /> Has {c.media_type} attachment
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{c.likes} likes</span>
              <span>{c.dislikes} dislikes</span>
              <span>{c.comments_count} comments</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onDelete(c.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-all" data-testid="delete-confession-btn">
                <Trash2 size={16} />
              </button>
              <button onClick={() => onBan(c.session_id)} className="text-yellow-400 hover:bg-yellow-500/20 p-2 rounded-lg transition-all" data-testid="ban-user-btn">
                <Ban size={16} />
              </button>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

/* ========== COMMENTS TAB ========== */
const CommentsTab = ({ comments, onDelete }) => (
  <div className="space-y-3" data-testid="comments-content">
    {comments.length === 0 ? (
      <EmptyState icon={MessageSquare} text="No comments yet" />
    ) : (
      comments.map(c => (
        <div key={c.id} className="bg-[#151A22] border border-white/5 rounded-2xl p-4" data-testid="comment-admin-item">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{c.nickname || 'Anonymous'}</span>
                <span className="text-gray-500 text-xs">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
              <p className="text-gray-300 text-sm">{c.text}</p>
              <p className="text-gray-600 text-xs mt-1">On confession: {c.confession_id.slice(0, 8)}...</p>
            </div>
            <button onClick={() => onDelete(c.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-all flex-shrink-0" data-testid="delete-comment-btn">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))
    )}
  </div>
);

/* ========== REPORTS TAB ========== */
const ReportsTab = ({ reports, onResolve, onDelete }) => (
  <div className="space-y-3" data-testid="reports-content">
    {reports.length === 0 ? (
      <EmptyState icon={Flag} text="No reports yet" />
    ) : (
      reports.map(r => (
        <div key={r.id} className="bg-[#151A22] border border-white/5 rounded-2xl p-4" data-testid="report-item">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                r.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>{r.status.toUpperCase()}</span>
              <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded-full text-xs">{r.target_type}</span>
            </div>
            <span className="text-gray-500 text-xs">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
          </div>
          <p className="text-gray-200 text-sm mb-1"><strong className="text-gray-400">Reason:</strong> {r.reason}</p>
          <p className="text-gray-500 text-xs mb-3">Target: {r.target_id.slice(0, 12)}...</p>
          {r.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => onResolve(r.id, 'resolve')} className="flex items-center gap-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" data-testid="resolve-report-btn">
                <Check size={14} /> Resolve
              </button>
              <button onClick={() => onResolve(r.id, 'ignore')} className="flex items-center gap-1 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" data-testid="ignore-report-btn">
                <X size={14} /> Ignore
              </button>
              <button onClick={() => onDelete(r.target_id)} className="flex items-center gap-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" data-testid="delete-reported-btn">
                <Trash2 size={14} /> Delete Content
              </button>
            </div>
          )}
        </div>
      ))
    )}
  </div>
);

/* ========== USERS TAB ========== */
const UsersTab = ({ sessions, onBan }) => (
  <div className="space-y-3" data-testid="users-content">
    {sessions.length === 0 ? (
      <EmptyState icon={Users} text="No users yet" />
    ) : (
      sessions.map(s => (
        <div key={s.id} className="bg-[#151A22] border border-white/5 rounded-2xl p-4 flex items-center justify-between" data-testid="user-item">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium truncate">Session: {s.id.slice(0, 12)}...</p>
                {s.is_banned && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">BANNED</span>}
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Clock size={12} />
                {s.created_at ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true }) : 'Unknown'}
              </div>
            </div>
          </div>
          {!s.is_banned && (
            <button onClick={() => onBan(s.id)} className="text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-all flex-shrink-0" data-testid="ban-session-btn">
              <Ban size={16} />
            </button>
          )}
        </div>
      ))
    )}
  </div>
);

/* ========== MEDIA TAB ========== */
const MediaTab = ({ images, onDelete }) => (
  <div data-testid="media-content">
    {images.length === 0 ? (
      <EmptyState icon={ImageIcon} text="No media files yet" />
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map(img => (
          <div key={img.id} className="bg-[#151A22] border border-white/5 rounded-2xl overflow-hidden group" data-testid="media-item">
            {img.content_type?.startsWith('image/') ? (
              <img
                src={`${API}/files/${img.storage_path}`}
                alt={img.original_filename}
                className="w-full h-40 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-40 bg-white/5 flex items-center justify-center">
                <FileText size={32} className="text-gray-500" />
              </div>
            )}
            <div className="p-3">
              <p className="text-gray-300 text-xs truncate mb-1">{img.original_filename}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">{img.size ? `${(img.size / 1024).toFixed(1)} KB` : 'N/A'}</span>
                <button onClick={() => onDelete(img.id)} className="text-red-400 hover:bg-red-500/20 p-1.5 rounded-lg transition-all" data-testid="delete-media-btn">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ========== EMPTY STATE ========== */
const EmptyState = ({ icon: Icon, text }) => (
  <div className="text-center py-16">
    <Icon size={40} className="text-gray-600 mx-auto mb-3" />
    <p className="text-gray-500">{text}</p>
  </div>
);

export default AdminDashboard;
