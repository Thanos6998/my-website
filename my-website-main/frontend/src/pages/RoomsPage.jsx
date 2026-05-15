import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ROOMS_DATA = [
  { id:'general', name:'General Whispers', desc:'Open confessions & talk',  emoji:'💬', color:'#E63946', bg:'rgba(230,57,70,0.18)' },
  { id:'love',    name:'Love & Crush',     desc:'Anonymous feelings',        emoji:'💕', color:'#D4537E', bg:'rgba(212,83,126,0.18)' },
  { id:'college', name:'College Life',     desc:'Campus stories & rants',    emoji:'🎓', color:'#378ADD', bg:'rgba(55,138,221,0.18)' },
  { id:'rants',   name:'Rants',            desc:'Let it out',                emoji:'😤', color:'#EF9F27', bg:'rgba(186,117,23,0.18)' },
  { id:'fun',     name:'Fun & Games',      desc:'Memes, jokes, timepass',    emoji:'🎮', color:'#1D9E75', bg:'rgba(29,158,117,0.18)' },
  { id:'adult',   name:'18+ Zone',         desc:'Age verified only',         emoji:'🔞', color:'#888',    bg:'rgba(255,255,255,0.07)' },
];

const TRENDING = ['#board_exams', '#secret_crush', '#loadshedding', '#ktm_traffic', '#college_life'];

const JoinModal = ({ room, onJoin, onClose }) => {
  const [nickname, setNickname] = useState('');
  const [age, setAge]           = useState('');
  const [isAnon, setIsAnon]     = useState(false);

  const canJoin = nickname.trim() && age;

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:100,
        background:'rgba(0,0,0,0.88)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        backdropFilter:'blur(8px)'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#111', borderRadius:'24px 24px 0 0',
          border:'1px solid rgba(255,255,255,0.08)',
          width:'100%', maxWidth:480, padding:'28px 24px 40px',
        }}
      >
        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)', margin:'0 auto 24px' }} />

        {/* Room info */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
          <div style={{
            width:52, height:52, borderRadius:16, flexShrink:0,
            background: room.bg, display:'flex',
            alignItems:'center', justifyContent:'center', fontSize:26,
          }}>
            {room.emoji}
          </div>
          <div>
            <h2 style={{ color:'#fff', fontSize:17, fontWeight:700, margin:0 }}>{room.name}</h2>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, margin:'3px 0 0' }}>{room.desc}</p>
          </div>
        </div>

        {/* Nickname */}
        <div style={{ marginBottom:14 }}>
          <label style={{ color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:600, letterSpacing:'0.08em', display:'block', marginBottom:7 }}>
            YOUR NICKNAME
          </label>
          <input
            autoFocus
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Enter a nickname..."
            onKeyDown={e => e.key === 'Enter' && canJoin && onJoin({ nickname: nickname.trim(), age, isAnon })}
            style={{
              width:'100%', background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:'12px 14px',
              color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box',
              fontFamily:'inherit'
            }}
          />
        </div>

        {/* Age */}
        <div style={{ marginBottom:14 }}>
          <label style={{ color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:600, letterSpacing:'0.08em', display:'block', marginBottom:7 }}>
            YOUR AGE
          </label>
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="10–99"
            min="10" max="99"
            style={{
              width:'100%', background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:'12px 14px',
              color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box',
              fontFamily:'inherit'
            }}
          />
        </div>

        {/* Anonymous toggle */}
        <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', marginBottom:24 }}>
          <div
            onClick={() => setIsAnon(v => !v)}
            style={{
              width:42, height:24, borderRadius:12, position:'relative',
              background: isAnon ? '#E63946' : 'rgba(255,255,255,0.1)',
              transition:'background 0.2s', cursor:'pointer', flexShrink:0
            }}
          >
            <div style={{
              position:'absolute', top:4, left: isAnon ? 22 : 4,
              width:16, height:16, borderRadius:'50%',
              background:'white', transition:'left 0.2s',
              boxShadow:'0 1px 3px rgba(0,0,0,0.3)'
            }} />
          </div>
          <span style={{ color:'rgba(255,255,255,0.55)', fontSize:14 }}>Join anonymously</span>
        </label>

        {/* Join button */}
        <button
          onClick={() => canJoin && onJoin({ nickname: nickname.trim(), age, isAnon })}
          style={{
            width:'100%', padding:'14px', borderRadius:14, border:'none',
            background: canJoin ? room.color || '#E63946' : 'rgba(255,255,255,0.07)',
            color: canJoin ? '#fff' : 'rgba(255,255,255,0.25)',
            fontSize:15, fontWeight:700,
            cursor: canJoin ? 'pointer' : 'not-allowed',
            transition:'all 0.2s', fontFamily:'inherit'
          }}
        >
          Enter {room.name} →
        </button>
      </div>
    </div>
  );
};

const RoomsPage = () => {
  const navigate = useNavigate();
  const [onlineCounts, setOnlineCounts] = useState({});
  const [selected, setSelected]         = useState(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/rooms');
        const counts = {};
        res.data.forEach(r => { counts[r.id] = r.online; });
        setOnlineCounts(counts);
      } catch {}
    };
    fetchCounts();
    const iv = setInterval(fetchCounts, 15000);
    return () => clearInterval(iv);
  }, []);

  const handleJoin = ({ nickname, age, isAnon }) => {
    navigate(`/rooms/${selected.id}`, {
      state: { nickname, age, isAnon, room: selected }
    });
  };

  return (
    <div style={{ minHeight:'100vh', background:'#080808', paddingBottom:90, fontFamily:'inherit' }}>

      {/* Header — matches your site header style */}
      <div style={{
        background:'rgba(8,8,8,0.97)', borderBottom:'0.5px solid rgba(255,255,255,0.06)',
        padding:'14px 18px', position:'sticky', top:0, zIndex:20,
        backdropFilter:'blur(20px)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="Whispero" style={{ width:32, height:32, objectFit:'contain' }} />
          <div>
            <h1 style={{ color:'#fff', fontSize:16, fontWeight:800, margin:0, lineHeight:1.2 }}>
              Whispero <span style={{ color:'#E63946' }}>Nepal</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', fontWeight:400, marginLeft:4 }}>NP</span>
            </h1>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>

        {/* Trending now */}
        <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:600, letterSpacing:'0.1em', margin:'0 0 10px' }}>
          TRENDING NOW
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
          {TRENDING.map(tag => (
            <span key={tag} style={{
              background:'rgba(230,57,70,0.1)', border:'1px solid rgba(230,57,70,0.2)',
              color:'#E63946', borderRadius:20, padding:'5px 12px',
              fontSize:12, fontWeight:500, cursor:'pointer'
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Chat rooms */}
        <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:600, letterSpacing:'0.1em', margin:'0 0 12px' }}>
          CHAT ROOMS
        </p>

        {ROOMS_DATA.map(room => {
          const online = onlineCounts[room.id] || 0;
          const isLocked = room.id === 'adult';

          return (
            <div
              key={room.id}
              onClick={() => !isLocked && setSelected(room)}
              style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'14px 16px', marginBottom:10,
                background:'rgba(255,255,255,0.02)',
                border:'0.5px solid rgba(255,255,255,0.05)',
                borderRadius:16, cursor: isLocked ? 'not-allowed' : 'pointer',
                transition:'all 0.18s', opacity: isLocked ? 0.5 : 1,
              }}
              onMouseEnter={e => !isLocked && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              {/* Avatar */}
              <div style={{
                width:46, height:46, borderRadius:14, flexShrink:0,
                background: room.bg, display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:22,
              }}>
                {room.emoji}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:'rgba(255,255,255,0.9)', fontSize:14, fontWeight:600, margin:0 }}>
                  {room.name}
                </p>
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, margin:'3px 0 0' }}>
                  {room.desc}
                </p>
              </div>

              {/* Online count */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                {online > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80' }} />
                    <span style={{ color:'#4ade80', fontSize:12, fontWeight:600 }}>{online} live</span>
                  </div>
                )}
                {online === 0 && (
                  <div style={{
                    width:28, height:28, borderRadius:8,
                    background:'rgba(255,255,255,0.05)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'rgba(255,255,255,0.3)', fontSize:12, fontWeight:600
                  }}>
                    {online}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Join modal */}
      {selected && (
        <JoinModal
          room={selected}
          onJoin={handleJoin}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default RoomsPage;