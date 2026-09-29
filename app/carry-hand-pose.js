import {Vector3, Quaternion} from 'three';
import {canonicalPoseBoneName} from './character-pose-bones.js';

// A post-mixer pose, not a second animation loop. Each authored skeleton copy
// gets its own two-bone solve so costumes keep their native proportions.
const rigs = new WeakMap();
const scenes = new WeakMap();
const failed = new WeakSet();
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const a = new Vector3(), b = new Vector3(), c = new Vector3();
const axis = new Vector3(), pole = new Vector3(), elbow = new Vector3();
const q = new Quaternion(), parentQ = new Quaternion(), worldQ = new Quaternion();

function rig(root) {
  let r = rigs.get(root);
  if (r) return r;
  const chains = [];
  root.traverse(n => {
    const name = canonicalPoseBoneName(n);
    if (!n.isBone || !/^Biscep[LR]$/.test(name)) return;
    const side = name.endsWith('L') ? 'L' : 'R';
    const lower = n.children.find(v => canonicalPoseBoneName(v) === 'Arm' + side);
    const hand = lower?.children.find(v => canonicalPoseBoneName(v) === 'Hand' + side);
    if (hand) chains.push({upper:n, lower, hand, side,
      baseU:new Quaternion(), baseL:new Quaternion(), lastU:new Quaternion(), lastL:new Quaternion(),
      goalU:new Quaternion(), goalL:new Quaternion(), target:new Vector3(), applied:false});
  });
  if (!chains.length) return null; // Model may still be loading.
  r = {chains, weight:0, active:false, errors:[]};
  rigs.set(root,r);
  return r;
}

function aim(bone, child, target) {
  bone.getWorldPosition(a); child.getWorldPosition(b);
  b.sub(a).normalize(); c.copy(target).sub(a).normalize();
  if (b.lengthSq() < .5 || c.lengthSq() < .5) return;
  bone.getWorldQuaternion(worldQ); bone.parent.getWorldQuaternion(parentQ).invert();
  q.setFromUnitVectors(b,c).multiply(worldQ).premultiply(parentQ);
  bone.quaternion.copy(q).normalize(); bone.updateWorldMatrix(false,true);
}

// React frame callbacks can update the character mixer after the gameplay
// callback. Apply the overlay at the final pre-render stage on both builds.
export function poseCarryHands(root,holding,heading,dt) {
  if (!root) return;
  let scene=root;
  while(scene.parent) scene=scene.parent;
  if(!scene.isScene) return;
  let pending=scenes.get(scene);
  if(!pending) {
    pending=new Map(); scenes.set(scene,pending);
    const before=scene.onBeforeRender;
    scene.onBeforeRender=function(...args) {
      before?.apply(this,args);
      for(const [avatar,sample] of pending) {
        if(failed.has(avatar)) continue;
        try { applyPose(avatar,...sample); }
        catch(error) {
          failed.add(avatar);
          avatar.userData.carryHands={active:false,error:String(error?.message||error)};
        }
      }
      pending.clear();
    };
  }
  pending.set(root,[holding,heading,dt]);
}

function applyPose(root, holding, heading, dt) {
  if (!root) return;
  const r = rigs.get(root) || (holding && rig(root)); if (!r) return;
  if (!holding && !r.weight && !r.chains.some(c=>c.applied)) return;
  const step = Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0)) / .2;
  r.weight = reduced() ? (holding ? 1 : 0) : Math.max(0,Math.min(1,r.weight+(holding?step:-step)));
  const weight = r.weight*r.weight*(3-2*r.weight);
  r.active = !!holding; r.errors.length = 0;
  root.updateWorldMatrix(true,true);
  for (const chain of r.chains) {
    const {upper,lower,hand} = chain;
    // A paused idle mixer may leave our last overlay in place: undo only our
    // exact previous values, never a new pose written by the animation mixer.
    if (chain.applied) {
      if (upper.quaternion.angleTo(chain.lastU)<1e-6) upper.quaternion.copy(chain.baseU);
      if (lower.quaternion.angleTo(chain.lastL)<1e-6) lower.quaternion.copy(chain.baseL);
    }
    chain.applied = false;
    if (!weight) continue;
    chain.baseU.copy(upper.quaternion); chain.baseL.copy(lower.quaternion);
    root.updateWorldMatrix(true,true);
    if (holding) {
      upper.getWorldPosition(a); lower.getWorldPosition(b); hand.getWorldPosition(c);
      const l1=a.distanceTo(b),l2=b.distanceTo(c);
      if (l1<.001 || l2<.001) continue;
      // Palms support the carried avatar beneath its feet. Targets move with the
      // carrier, rather than pointing rigidly up while the passenger floats.
      const sign=chain.side==='L'?1:-1;
      chain.target.set(holding.x+Math.cos(heading)*sign*.12-Math.sin(heading)*.18,holding.y+.02,holding.z-Math.sin(heading)*sign*.12-Math.cos(heading)*.18);
      axis.copy(chain.target).sub(a);
      const distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,axis.length()));
      axis.normalize();
      pole.set(Math.cos(heading)*sign,-.7,-Math.sin(heading)*sign);
      pole.addScaledVector(axis,-pole.dot(axis)).normalize();
      const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
      elbow.copy(a).addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
      aim(upper,lower,elbow); aim(lower,hand,chain.target);
      chain.goalU.copy(upper.quaternion); chain.goalL.copy(lower.quaternion);
    }
    upper.quaternion.copy(chain.baseU).slerp(chain.goalU,weight);
    lower.quaternion.copy(chain.baseL).slerp(chain.goalL,weight);
    chain.lastU.copy(upper.quaternion); chain.lastL.copy(lower.quaternion); chain.applied=true;
    root.updateWorldMatrix(true,true);
    if (holding) r.errors.push(hand.getWorldPosition(a).distanceTo(chain.target));
  }
  root.userData.carryHands={active:r.active,weight:r.weight,chains:r.chains.length,maxGap:r.errors.length?Math.max(...r.errors):0};
}
