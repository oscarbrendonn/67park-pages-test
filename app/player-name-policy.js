// Validation only: retain the existing spelling and Unicode names unchanged.
export const PLAYER_NAME_REQUIRED = 'Please choose a name.';

export function hasPlayerName(value) {
  if (typeof value !== 'string') return false;
  // Match the name field's existing control/HTML sanitization, then reject
  // invisible-only names without restricting a player's language or alphabet.
  return value.replace(/[\u0000-\u001f<>\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').trim().length > 0;
}

export function playerNameError(value) {
  return hasPlayerName(value) ? '' : PLAYER_NAME_REQUIRED;
}
