import {playerSettings} from './player-settings.js';
// Kimi preview only. Direct tracking, shared across both avatar camera paths.
export function cameraLookDelta(delta, mouse = false) {
  // A phone swipe should not require the physical travel of a desktop mouse.
  // Use the viewport's short side, bounded for tablets/very small phones.
  const width=globalThis.window?.innerWidth||390,height=globalThis.window?.innerHeight||844;
  const touchYaw=Math.max(.008,Math.min(.012,Math.PI/(Math.min(width,height)*.75)));
  const sensitivity=mouse?playerSettings.mouseSensitivity:playerSettings.touchSensitivity;
  return {x: delta.x * (mouse ? .0052 : touchYaw)*sensitivity, y: delta.y * (mouse ? .0035 : .0048)*sensitivity};
}
// Start from where the driver grabbed the wheel; no snap to the pad centre.
export function steeringFromDrag(x, startX) {
  if (!Number.isFinite(x) || !Number.isFinite(startX)) return 0;
  const value = Math.max(-1, Math.min(1, (x - startX) / 44));
  return value * (.72 + .28 * Math.abs(value));
}
