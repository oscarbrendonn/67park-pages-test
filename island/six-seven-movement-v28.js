// Extracted from Kimi 67park, commit 24d08ced0ed33b018353980f0ca2ed2e80a9e809.
// Player.tsx: SPEED/ACCEL/JUMP + camera-relative impulse block; HeroPlayer.tsx:
// animation thresholds; swim.ts: original paddle pose and transition lifecycle.
// Adapter boundary: islands retain their terrain ray collisions and camera.
// The original Rapier BallCollider(.55), default unit density and damping(.15)
// are represented by mass + impulses here, without loading a second physics engine.
export const PARK = Object.freeze({speed:7.5,accel:.55,jumpImpulse:5.2,
  radius:.55,mass:4*Math.PI*.55**3/3,damping:.15,gravity:9.81,
  sprint:1.4,swim:.42,airControl:.4,step:1/60,fade:.16});

// Same control equations as Player.tsx. yaw is converted by the island adapter,
// because its existing orbit camera points down -Z, whereas Park uses +Z.
export function applyParkInput(b,input,{yaw,grounded,swimming,riding=false}){
  const vel=b.linvel();
  const fx=Math.sin(yaw),fz=Math.cos(yaw),rx=-Math.cos(yaw),rz=Math.sin(yaw);
  const len=Math.hypot(input.x,input.z)||1;
  const top=PARK.speed*(riding&&!swimming?1.45:1)*(input.run?PARK.sprint:1)*(swimming?PARK.swim:1);
  const dx=((fx*input.z+rx*input.x)/len)*top;
  const dz=((fz*input.z+rz*input.x)/len)*top;
  const control=grounded?PARK.accel*(riding?.4:1):PARK.accel*PARK.airControl;
  b.applyImpulse({x:(dx-vel.x)*control,y:0,z:(dz-vel.z)*control},true);
  const jumped=!!(input.jumpQueued&&grounded&&!swimming);
  if(jumped)b.applyImpulse({x:0,y:PARK.jumpImpulse,z:0},true);
  return jumped;
}

export function parkClip(v,speed){
  if(v>1.4)return 'jump';
  if(v< -3)return 'fall';
  if(speed>4.6)return 'run';
  if(speed>.7)return 'walk';
  return 'idle';
}

export const SWIM_VISUAL=Object.freeze({rotX:1.18,rotZ:0,scaleY:1,
  yOff:-.1,bobAmp:.04,bobHz:2.4,lerpRotX:.16,lerpRotZ:.2,lerpScale:.25});
export const SWIM_RATE=Object.freeze({moving:8.5,idle:2.1});
export function applySwimPose(bones,phase,moving,opts){
  const amp=moving?1:.3;
  const setX=(name,fn)=>{const arr=bones.get(name);if(arr)for(const bo of arr)bo.o.rotation.x=fn(bo.rx);};
  setX('BiscepL',rx=>rx+Math.sin(phase)*1.15*amp);
  setX('BiscepR',rx=>rx+Math.sin(phase+Math.PI)*1.15*amp);
  setX('ArmL',rx=>rx+Math.max(0,Math.sin(phase))*.8*amp);
  setX('ArmR',rx=>rx+Math.max(0,Math.sin(phase+Math.PI))*.8*amp);
  const kick=moving?Math.sin(phase*2.2)*.5:Math.sin(phase)*.14;
  setX('ThighL',rx=>rx+kick);setX('ThighR',rx=>rx-kick);
  setX('ShinL',rx=>rx+Math.max(0,-kick)*.6);
  setX('ShinR',rx=>rx+Math.max(0,kick)*.6);
  setX('Head',rx=>rx-.5);
  if(opts?.spine)setX('Spine2',rx=>rx+Math.sin(phase)*.06*amp);
}
export function restoreBasePose(bones){for(const arr of bones.values())for(const bo of arr)bo.o.rotation.set(bo.rx,bo.ry,bo.rz);}
export function swimEnter(c,onEnter){if(c.wasSwim)return false;c.wasSwim=true;onEnter?.();return true;}
export function swimStep(c,bones,delta,moving,opts){c.phase+=delta*(moving?SWIM_RATE.moving:SWIM_RATE.idle);applySwimPose(bones,c.phase,moving,opts);}
export function swimExit(c,bones){if(!c.wasSwim)return false;c.wasSwim=false;restoreBasePose(bones);return true;}
