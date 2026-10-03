// Validation only: retain the existing spelling and Unicode names unchanged.
export const PLAYER_NAME_REQUIRED = 'Please choose a name.';
export const PLAYER_NAME_TAKEN = 'That name is already taken. Try one below.';

export function sanitizePlayerName(value) {
  return String(value ?? '').replace(/[\u0000-\u001f<>]/g, '').slice(0,16);
}

// A friendly editable draft, never a claim of server-side availability.
export function generateDefaultPlayerName(random = Math.random) {
  const first=['Mint','Sunny','Cloud','Coral','Happy','Lilac'];
  const second=['Panda','Fox','Otter','Koala','Frog','Bear'];
  const pick=values=>values[Math.min(values.length-1,Math.max(0,Math.floor(random()*values.length)))];
  return pick(first)+pick(second)+String(Math.min(99999,Math.max(0,Math.floor(random()*100000)))).padStart(5,'0');
}

export function hasPlayerName(value) {
  if (typeof value !== 'string') return false;
  // Match the name field's existing control/HTML sanitization, then reject
  // invisible-only names without restricting a player's language or alphabet.
  return value.replace(/[\u0000-\u001f<>\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').trim().length > 0;
}

export function playerNameError(value) {
  return hasPlayerName(value) ? '' : PLAYER_NAME_REQUIRED;
}
