import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  MessageCircle,
  Flame,
  Eye,
  Menu,
  X,
  Info,
  Shield,
  FileText,
  Mail,
  LogOut
} from 'lucide-react';

import { Link } from 'react-router-dom';

import ConfessionCard from '../components/ConfessionCard';
import CategoryFilter from '../components/CategoryFilter';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

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

  const [menuOpen, setMenuOpen] = useState(false);

  // ================= API PARAMS =================

  const getApiParams = useCallback(
    (currentSkip) => {
      const params = {
        skip: currentSkip,
        limit: 10
      };

      if (tab === 'trending') {
        params.sort = 'trending';
      } else if (tab === 'recent') {
        params.sort = 'latest';
      } else if (['love', 'college', 'secrets', 'life'].includes(tab)) {
        params.category = tab;
        params.sort = 'latest';
      } else {
        params.sort = 'latest';
      }

      return params;
    },
    [tab]
  );

  // ================= FETCH =================

  const fetchConfessions = useCallback(
    async (reset = false) => {
      try {
        const currentSkip = reset ? 0 : skip;

        const response = await api.get('/confessions', {
          params: getApiParams(currentSkip)
        });

        if (reset) {
          setConfessions(response.data);
          setSkip(10);

          try {
            const featured = await api.get('/confessions/featured/top');

            if (featured.data) {
              setFeaturedConfession(featured.data);
            }
          } catch (e) {
            console.log(e);
          }
        } else {
          setConfessions((prev) => [...prev, ...response.data]);
          setSkip(currentSkip + 10);
        }

        setHasMore(response.data.length >= 10);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [skip, getApiParams]
  );

  // ================= TAB CHANGE =================

  useEffect(() => {
    setLoading(true);
    setSkip(0);
    setHasMore(true);

    fetchConfessions(true);
  }, [tab]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#050505] text-white pb-20">

      {/* ================= HEADER ================= */}

      <div className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/[0.05]">

        <div className="flex items-center justify-between px-5 h-16">

          {/* ================= LOGO ================= */}

          <div className="flex items-center gap-3">

            <div className="relative">
              <div className="absolute inset-0 bg-[#E63946] blur-lg opacity-30 rounded-full" />

              <div className="relative w-9 h-9 rounded-xl bg-[#E63946]/15 border border-[#E63946]/20 flex items-center justify-center">
                <Eye size={18} className="text-[#E63946]" />
              </div>
            </div>

            <div className="leading-tight">
              <h1
                className="text-[22px] font-black tracking-tight text-white"
                style={{
                  fontFamily: "'Playfair Display', serif"
                }}
              >
                Whispero <span className="text-base">🇳🇵</span>
              </h1>
            </div>
          </div>

          {/* ================= MENU BUTTON ================= */}

          <button
            onClick={() => setMenuOpen(true)}
            className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.05] hover:bg-white/[0.08] transition-all duration-300 flex items-center justify-center"
          >
            <Menu size={20} className="text-white" />
          </button>
        </div>

        <CategoryFilter selected={tab} onChange={setTab} />
      </div>

      {/* ================= OVERLAY ================= */}

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* ================= SIDEBAR ================= */}

      <div
        className={`fixed top-0 right-0 h-full w-[290px] bg-[#0b0b0b] border-l border-white/10 z-50 transition-all duration-300 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >

        {/* ================= MENU TOP ================= */}

        <div className="flex items-center justify-between p-5 border-b border-white/10">

          <div>
            <h2 className="text-lg font-bold text-white">
              Menu
            </h2>

            <p className="text-xs text-white/40 mt-1">
              Whispero Nepal
            </p>
          </div>

          <button
            onClick={() => setMenuOpen(false)}
            className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* ================= MENU LINKS ================= */}

        <div className="p-4 flex flex-col gap-3">

          <Link
            to="/about"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Info size={20} className="text-blue-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                About
              </p>

              <p className="text-xs text-white/35">
                Learn about platform
              </p>
            </div>
          </Link>

          <Link
            to="/guidelines"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Shield size={20} className="text-yellow-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Guidelines
              </p>

              <p className="text-xs text-white/35">
                Community rules & safety
              </p>
            </div>
          </Link>

          <Link
            to="/privacy"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield size={20} className="text-green-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Privacy Policy
              </p>

              <p className="text-xs text-white/35">
                Your anonymity matters
              </p>
            </div>
          </Link>

          <Link
            to="/terms"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <FileText size={20} className="text-purple-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Terms & Conditions
              </p>

              <p className="text-xs text-white/35">
                Platform usage terms
              </p>
            </div>
          </Link>

          <Link
            to="/contact"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Mail size={20} className="text-pink-400" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Contact Us
              </p>

              <p className="text-xs text-white/35">
                Reach support team
              </p>
            </div>
          </Link>

          {/* ================= LOGOUT ================= */}

          <button
            onClick={logout}
            className="mt-4 flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-red-500/15 flex items-center justify-center">
              <LogOut size={20} className="text-red-400" />
            </div>

            <div className="text-left">
              <p className="text-sm font-semibold text-red-400">
                Logout
              </p>

              <p className="text-xs text-red-400/60">
                Exit account
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ================= FEATURED ================= */}

      {featuredConfession && tab === 'for-you' && (
        <div className="relative mx-3 mt-4">

          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 blur-2xl rounded-3xl" />

          <div className="relative overflow-hidden rounded-3xl border border-[#FFB703]/10 bg-gradient-to-br from-[#17110a] to-[#0d0d0d]">

            <div className="flex items-center gap-2 px-5 pt-4 pb-2">
              <Flame size={15} className="text-[#FFB703]" />

              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFB703]">
                Top Whisper Today
              </span>
            </div>

            <ConfessionCard
              confession={featuredConfession}
              onCommentClick={onCommentClick}
              onReport={onReport}
            />
          </div>
        </div>
      )}

      {/* ================= FEED ================= */}

      {loading ? (
        <LoadingSkeleton />
      ) : confessions.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No whispers yet"
          description={
            ['love', 'college', 'secrets', 'life'].includes(tab)
              ? `No whispers in ${tab} yet.`
              : 'Be the first to post anonymously.'
          }
          action="Share Whisper"
          onAction={onCreateClick}
        />
      ) : (
        <InfiniteScroll
          dataLength={confessions.length}
          next={() => fetchConfessions(false)}
          hasMore={hasMore}
          loader={<LoadingSkeleton />}
          endMessage={
            <div className="text-center py-10">
              <p className="text-sm text-white/20">
                No more whispers
              </p>
            </div>
          }
        >
          <div className="pt-2">
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