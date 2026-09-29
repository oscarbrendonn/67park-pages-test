// Publish the trick actually accepted by the shared rider, not a raw button
// press. Mobile and keyboard therefore use the same sound/landing FX timing.
export function publishSkateFeedback(events, position, host = globalThis) {
  for (const trick of events) {
    if (trick === 'ollie' || trick === 'kickflip') {
      host.dispatchEvent(new host.CustomEvent('candy:skate-trick', {detail: {trick}}));
    } else if (trick === 'land' || trick === 'land-hard') {
      if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) continue;
      host.dispatchEvent(new host.CustomEvent('candy:skate-land', {detail: {
        x: position.x, y: position.y - .52, z: position.z, hard: trick === 'land-hard'
      }}));
    }
  }
}
