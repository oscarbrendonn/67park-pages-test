/** Emote presentation camera (the Fortnite pattern): while the player performs an
 * emote the view eases round to a 3/4 front shot, closer and lower, so the face,
 * hands and effects are readable; when the emote ends the view eases back behind.
 * Only the view turns: camera-relative movement keeps using the player's own camera
 * yaw, so controls never change direction mid-emote or while the view returns. */
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export const EMOTE_CAMERA = Object.freeze({turn: Math.PI + .55, zoom: .4, lower: .35, enterRate: 2.6, exitRate: 4.5});

export function createEmoteCamera() {
  let blend = 0;
  const out = {fx: 0, fz: 1, zoom: 1, lift: 1, aim: 1, blend: 0};
  return function step(cameraYaw, facingYaw, active, dt) {
    dt = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), .1);
    const rate = active ? EMOTE_CAMERA.enterRate : EMOTE_CAMERA.exitRate;
    blend += ((active ? 1 : 0) - blend) * (1 - Math.exp(-rate * dt));
    if (blend < 1e-4) blend = 0;
    const k = blend * blend * (3 - 2 * blend);
    const yaw = Number.isFinite(facingYaw) ? cameraYaw + wrap(facingYaw + EMOTE_CAMERA.turn - cameraYaw) * k : cameraYaw;
    out.fx = Math.sin(yaw); out.fz = Math.cos(yaw);
    out.zoom = 1 - EMOTE_CAMERA.zoom * k; out.lift = 1 - EMOTE_CAMERA.lower * k; out.aim = 1 - k; out.blend = k;
    return out;
  };
}
