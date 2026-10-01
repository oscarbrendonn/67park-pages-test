// Shared, bounded vocabulary. No arbitrary user text is accepted by this channel.
export const QUICK_MESSAGES = Object.freeze({
  ready: "I'm ready!",
  wait: 'One moment, please.',
  hello: 'Hi, team!',
  again: "Let's play again!",
  nice: 'Good game!',
  thanks: 'Thank you!',
});
export const INVITE_POLICIES = Object.freeze(['everyone', 'friends', 'none']);
export const DEFAULT_INVITE_PREFERENCES = Object.freeze({invites: 'everyone', whileInRoom: true});
