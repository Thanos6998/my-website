import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import ConfessionCard from '../components/ConfessionCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { TrendingUp } from 'lucide-react';
import api from '../utils/api';

const TrendingPage = ({ onCommentClick, onReport, onCreateClick }) => {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  const fetchConfessions = useCallback(async (reset = false) => {
    try {
      const currentSkip = reset ? 0 : skip;
      const response = await api.get('/confessions', {
        params: { skip: currentSkip, limit: 10, sort: 'trending' }
      });
      if (reset) {
        setConfessions(response.data);
        setSkip(10);
      } else {
        setConfessions(prev => [...prev, ...response.data]);
        setSkip(currentSkip + 10);
      }
      setHasMore(response.data.length >= 10);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [skip]);

  useEffect(() => {
    setLoading(true);
    setSkip(0);
    setHasMore(true);
    fetchConfessions(true);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#050505] pb-20" data-testid="trending-page">
      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5 px-5 h-14">
          <div className="w-8 h-8 rounded-lg bg-[#FFB703]/15 flex items-center justify-center">
            <TrendingUp size={18} className="text-[#FFB703]" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Trending</h1>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : confessions.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nothing trending yet"
          description="Whispers with the most engagement will appear here."
          action="Create a Whisper"
          onAction={onCreateClick}
        />
      ) : (
        <InfiniteScroll
          dataLength={confessions.length}
          next={() => fetchConfessions(false)}
          hasMore={hasMore}
          loader={<LoadingSkeleton />}
          endMessage={<div className="text-center py-10"><p className="text-white/20 text-sm">That's all the trending whispers</p></div>}
        >
          <div className="pt-1">
            {confessions.map((confession, i) => (
              <div key={confession.id} className="relative">
                {i < 3 && (
                  <div className="absolute top-5 left-5 z-10">
                    <span className="bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-[#050505] text-xs font-black px-2.5 py-1 rounded-full shadow-[0_2px_10px_rgba(255,183,3,0.3)] flex items-center gap-1">
                      #{i + 1}
                    </span>
                  </div>
                )}
                <ConfessionCard confession={confession} onCommentClick={onCommentClick} onReport={onReport} />
              </div>
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  );
};

export default TrendingPage;
