/** Rider pose applied AFTER the mixer posed the skeleton. Absolute offsets from
 * the authored rest pose (the vehicle-pose.js rule: no cumulative deformation,
 * no limb scaling, no reparenting), weighted by the stance blend so stepping
 * off the board hands every bone straight back to its clip. */
export function skateStance(bones, s) {
  const w = s?.stance ?? 0;
  if (!(w > 0) || !bones) return false;
  const set = (name, x = 0, y = 0, z = 0) => {
    for (const b of bones.get(name) ?? []) b.o.rotation.set(b.rx + x * w, b.ry + y * w, b.rz + z * w);
  };
  const crouch = s.crouch, tuck = s.tuck, lean = s.lean, pop = s.pop || 0, t = s.time || 0, roll = s.roll || 0;
  // Life in the stance: a slow breath while standing on the board, and while rolling the
  // arms float for balance and the torso rocks with the wheels, growing with speed.
  const still = 1 - roll, breath = Math.sin(t * 1.7), sway = Math.sin(t * 2.9), rock = Math.sin(t * 2.9 + 1.2);
  const armFloat = roll * .16 * sway, armLift = roll * .07 * (1 + rock), settle = still * .012 * Math.sin(t * .9);
  // Push-off: the back foot swings behind, plants, and drags forward again.
  const kick = s.pushing || s.push > 0 ? Math.sin(s.push * Math.PI * 2) : 0;
  // A positive stance yaw turns the right foot toward the nose. On the ollie pop the
  // front knee rises and the back leg extends, which is what tips the deck nose-up.
  const [front, back] = (s.stanceYaw ?? 0) >= 0 ? ['R', 'L'] : ['L', 'R'];
  // Measured on the goril rig (skate-tricks-test.mjs probes the real GLB): thigh x
  // swings the leg forward/back, the knee hinge is the shin's local z (L +, R -).
  const bend = .26 + crouch * .55 + tuck * .22 + still * .018 * Math.sin(t * 1.7 - .6) + roll * .03 * (1 + rock) * .5; // knees soften, fold in the air, sink on landing, breathe
  const leg = (side, legBend, swing) => {
    set('Thigh' + side, -legBend * (1 - Math.abs(swing) * .35) - tuck * .55 + swing * .72, 0, side === 'L' ? -.10 : .10);
    set('Shin' + side, 0, 0, (side === 'L' ? 1 : -1) * (legBend * 1.9 * (1 - Math.max(0, swing) * .5) + tuck * .5));
  };
  leg(front, bend + .30 * pop, 0);
  leg(back, Math.max(0, bend - .12 * pop), kick);
  // Torso leans forward when crouching and rolls with the carve.
  set('Spine1', .10 + crouch * .26 + still * .025 * breath, 0, lean * .35 + settle + roll * .03 * rock);
  set('Spine2', .04 + crouch * .10 + still * .02 * breath, 0, lean * .15 + roll * .02 * rock);
  set('Spine3', still * .012 * breath, 0, 0);
  // Arms out for balance, raised a little higher in the air.
  set('BiscepL', -.22 - tuck * .38 - armLift + still * .02 * breath, 0, .52 + tuck * .32 + armFloat);
  set('BiscepR', -.22 - tuck * .38 - armLift + still * .02 * breath, 0, -.52 - tuck * .32 + armFloat);
  set('ArmL', .32 + roll * .1 * sway, 0, .14);
  set('ArmR', .32 - roll * .1 * sway, 0, -.14);
  // The body stands across the deck; the head keeps looking down the line.
  set('Head', still * .012 * Math.sin(t * 1.7 + .8), -(s.stanceYaw ?? 0) * .75 + roll * .04 * sway, roll * .02 * rock);
  return true;
}
