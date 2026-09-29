// Preserve interpolation and model identity across roster refreshes.
export function reconcileLobbyRoster(remotes, players, makeRemote, selfId) {
 if (!Array.isArray(players)) return;
 const present = new Set();
 for (const player of players) {
  if (!player || typeof player.id !== 'string' || player.id === selfId) continue;
  const id = player.id; present.add(id);
  const existing = remotes.get(id);
  if (!existing) { remotes.set(id, makeRemote(player)); continue; }
  for (const key of ['name', 'color', 'combo']) if (typeof player[key] === 'string') existing[key] = player[key];
 }
 for (const id of remotes.keys()) if (!present.has(id)) remotes.delete(id);
}

// Keep near-equal neighbours stable instead of rebuilding models every 0.5s.
// A clearly closer arrival still replaces the farthest retained character.
export function selectLobbyRemotes(remotes, position, limit, previous = []) {
 const prior = new Map(previous.map((r, i) => [r.id, i]));
 const candidates = [];
 for (const remote of remotes) {
  const p = remote.targetP;
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) continue;
  if (p[0] === 179 && p[1] === 12 && p[2] === 121) continue;
  const distance = Math.hypot(p[0] - position.x, p[2] - position.z);
  if (distance >= 115) continue;
  candidates.push({remote, distance, score:distance - (prior.has(remote.id) ? 1.5 : 0)});
 }
 candidates.sort((a,b) => a.distance-b.distance || a.remote.id.localeCompare(b.remote.id));
 // Stay within the server priority set so retained avatars receive full-rate motion.
 const priority = candidates.slice(0, Math.max(16, limit));
 priority.sort((a,b) => a.score-b.score || a.remote.id.localeCompare(b.remote.id));
 const chosen = priority.slice(0, Math.max(0, limit)).map(c=>c.remote);
 chosen.sort((a,b)=>(prior.get(a.id)??Infinity)-(prior.get(b.id)??Infinity));
 return chosen;
}

const pendingNotifications = new WeakSet();
// Network bursts share one UI notification; packets/state are still applied immediately.
export function queueLobbyNotification(client, schedule = callback => setTimeout(callback, 16)) {
 client.version++;
 if (pendingNotifications.has(client)) return;
 pendingNotifications.add(client);
 schedule(() => { pendingNotifications.delete(client); client.listeners.forEach(listener => listener()); });
}
