// Anonymous identity system - random usernames and avatar colors
const ADJECTIVES = [
  'Silent', 'Hidden', 'Shadow', 'Midnight', 'Mystic', 'Secret', 'Ghost',
  'Phantom', 'Quiet', 'Lone', 'Dark', 'Swift', 'Brave', 'Gentle', 'Wise',
  'Wild', 'Cosmic', 'Neon', 'Crystal', 'Velvet', 'Frozen', 'Storm',
  'Dream', 'Star', 'Moon', 'Ocean', 'Cloud', 'Thunder', 'Fire', 'Ice'
];

const NOUNS = [
  'Soul', 'Voice', 'Fox', 'Wolf', 'Owl', 'Raven', 'Phoenix', 'Tiger',
  'Bear', 'Hawk', 'Panther', 'Serpent', 'Dragon', 'Spirit', 'Wanderer',
  'Knight', 'Sage', 'Nomad', 'Echo', 'Spark', 'Flame', 'Frost',
  'Shadow', 'Storm', 'Wave', 'Heart', 'Mind', 'Rebel', 'Seeker', 'Drifter'
];

const AVATAR_COLORS = [
  ['#E63946', '#C82A36'], // Ruby
  ['#FFB703', '#E5A003'], // Gold
  ['#8338EC', '#6B2FC5'], // Violet
  ['#06D6A0', '#05B88A'], // Emerald
  ['#118AB2', '#0E7499'], // Teal
  ['#F77F00', '#D96E00'], // Amber
  ['#EF476F', '#D63A5E'], // Rose
  ['#073B4C', '#052C39'], // Deep ocean
  ['#9B5DE5', '#8247CC'], // Purple
  ['#00BBF9', '#009DD1'], // Sky
];

export const generateUsername = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

export const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};
