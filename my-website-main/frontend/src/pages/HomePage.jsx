import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ConfessionCard from '../components/ConfessionCard';
import CategoryFilter from '../components/CategoryFilter';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { MessageCircle, Flame, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const HomePage = ({ onCommentClick, onReport, onCreateClick }) => {
  const { logout } = useAuth();
  const [confessions, setConfessions] = useState([]);
  const [featuredConfession, setFeaturedConfession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState('for-you');
  const [skip, setSkip] = useState(0);

  const getApiParams = useCallback((currentSkip) => {
    const params = { skip: currentSkip, limit: 10 };
    if (tab === 'trending') params.sort = 'trending';
    else if (tab === 'recent') params.sort = 'latest';
    else if (['love', 'college', 'secrets', 'life'].includes(tab)) {
      params.category = tab;
      params.sort = 'latest';
    } else {
      params.sort = 'latest';
    }
    return params;
  }, [tab]);

  const fetchConfessions = useCallback(async (reset = false) => {
    try {
      const currentSkip = reset ? 0 : skip;
      const params = getApiParams(currentSkip);
      const response = await api.get('/confessions', { params });

      if (reset) {
        setConfessions(response.data);
        setSkip(10);
        try {
          const f = await api.get('/confessions/featured/top');
          if (f.data) setFeaturedConfession(f.data);
        } catch (e) { /* ok */ }
      } else {
        setConfessions(prev => [...prev, ...response.data]);
        setSkip(currentSkip + 10);
      }
      setHasMore(response.data.length >= 10);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [skip, getApiParams]);

  useEffect(() => {
    setLoading(true);
    setSkip(0);
    setHasMore(true);
    fetchConfessions(true);
  }, [tab]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#050505] pb-20 pt-0" data-testid="home-page">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/15 flex items-center justify-center">
              <Eye size={18} className="text-[#E63946]" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Whispero <span className="text-base">🇳🇵</span>
            </h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors p-2 rounded-full hover:bg-white/[0.05]"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
        <CategoryFilter selected={tab} onChange={setTab} />
      </div>

      {/* Confession of the Day */}
      {featuredConfession && tab === 'for-you' && (
        <div className="relative mx-3 mt-3" data-testid="confession-of-day">
          <div className="bg-gradient-to-r from-[#FFB703]/10 to-[#E63946]/5 border border-[#FFB703]/15 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-2.5">
              <Flame size={14} className="text-[#FFB703]" />
              <span className="text-xs font-bold text-[#FFB703] uppercase tracking-[0.15em]">Top Whisper Today</span>
            </div>
            <ConfessionCard
              confession={featuredConfession}
              onCommentClick={onCommentClick}
              onReport={onReport}
            />
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <LoadingSkeleton />
      ) : confessions.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No whispers yet"
          description={['love', 'college', 'secrets', 'life'].includes(tab)
            ? `No whispers in ${tab} yet. Be the first!`
            : 'Be the first to share your secret anonymously!'
          }
          action="Share Your Whisper"
          onAction={onCreateClick}
        />
      ) : (
        <InfiniteScroll
          dataLength={confessions.length}
          next={() => fetchConfessions(false)}
          hasMore={hasMore}
          loader={<LoadingSkeleton />}
          endMessage={
            <div className="text-center py-10 px-4">
              <p className="text-white/20 text-sm">You've heard all the whispers</p>
            </div>
          }
        >
          <div className="pt-1">
            {confessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                onCommentClick={onCommentClick}
                onReport={onReport}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default HomePage;
