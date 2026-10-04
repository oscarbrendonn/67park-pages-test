import * as T from 'three';
import {canonicalPoseBoneName} from './character-pose-bones.js';
import {DELIVERY} from './park-progression-rules.js';

// All resources here are decorative. No ground, collision, rig, outfit or
// animation is modified. One tiny parcel shares the existing game renderer.
export function createDeliveryProps(world,{loadNPCs=true}={}){
 const root=new T.Group();root.name='ParkDeliveryFriends';world.scene.add(root);
 const geo=new T.BoxGeometry(1,1,1),paper=new T.MeshStandardMaterial({color:0xc3d8cf,roughness:.8}),ribbon=new T.MeshStandardMaterial({color:0xf3e6cd,roughness:.8});
 const parcel=new T.Group();parcel.name='ParkCarriedParcel';
 const add=(size,position,material)=>{const m=new T.Mesh(geo,material);m.scale.set(...size);m.position.set(...position);parcel.add(m)};
 add([.34,.29,.25],[0,-.20,0],paper);add([.055,.296,.256],[0,-.20,0],ribbon);add([.346,.05,.256],[0,-.20,0],ribbon);
 add([.12,.025,.025],[0,-.005,0],ribbon);add([.025,.07,.025],[-.05,-.045,0],ribbon);add([.025,.07,.025],[.05,-.045,0],ribbon);
 root.add(parcel);parcel.visible=false;
 let disposed=false,hand=null,lastSearch=0;const point=new T.Vector3(),scale=new T.Vector3();
 const actors=[],mixers=[],labelResources=[];
 async function loadFriends(){
  const [{loadCharacterAsset},{clone}]=await Promise.all([import('./character-assets.js?v=entry-light-1'),import('three/addons/utils/SkeletonUtils.js')]);
  const asset=await loadCharacterAsset(new URL('../models/park-originals/cat.glb?v=cat-silver-1',import.meta.url).pathname);
  if(disposed)return;
  for(const [i,location]of [DELIVERY.from,DELIVERY.to].entries()){
   const model=clone(asset.scene),actor=new T.Group();actor.name=i?'Poppy · Parcel recipient':'Pip · Parcel post';
   // A cloned existing character; shared materials/geometries are never disposed.
   actor.add(model);const box=new T.Box3().setFromObject(model),height=box.max.y-box.min.y;
   if(!(height>0))continue;
   model.scale.multiplyScalar(1.45/height);model.updateMatrixWorld(true);box.setFromObject(model);model.position.y-=box.min.y;
   const ground=world.ground(location.x,location.z);if(!Number.isFinite(ground))continue;
   actor.position.set(location.x-1.2,ground,location.z+.5);actor.rotation.y=i?-Math.PI/2:Math.PI/2;
   actor.userData.deliveryNPC=true;root.add(actor);actors.push(actor);
   const canvas=globalThis.document?.createElement('canvas'),ctx=canvas?.getContext('2d');
   if(ctx){canvas.width=256;canvas.height=72;ctx.fillStyle=i?'#ead6e4':'#d8ece8';ctx.beginPath();ctx.roundRect(1,1,254,70,28);ctx.fill();ctx.fillStyle='#344750';ctx.textAlign='center';ctx.font='bold 23px system-ui';ctx.fillText(i?'Poppy · Deliver':'Pip · Parcel post',128,44);const texture=new T.CanvasTexture(canvas),material=new T.SpriteMaterial({map:texture,depthWrite:false}),label=new T.Sprite(material);label.position.y=1.8;label.scale.set(1.9,.53,1);actor.add(label);labelResources.push(texture,material)}
   const clip=asset.animations?.find(c=>/idle/i.test(c.name));
   if(clip){const mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();mixers.push(mixer)}
  }
 }
 // Failure of this optional model must never block entry or the delivery job.
 const ready=loadNPCs?loadFriends().catch(()=>false):Promise.resolve(false);
 return {root,parcel,ready,
  update(self,carrying,visible,now=Date.now()){
   root.visible=visible;
   for(const mixer of mixers)mixer.update(.05);
   if(!visible||!carrying){parcel.visible=false;return}
   if(now-lastSearch>500||!hand){
    lastSearch=now;hand=null;let closest=2.5;
    world.scene.traverse(model=>{
     if(!model.userData.claudeGorillaAnimation||model.userData.claudeRemoteCharacter)return;
     let parent=model,shown=true;while(parent){if(!parent.visible||parent.userData.deliveryNPC)shown=false;parent=parent.parent}if(!shown)return;
     model.getWorldPosition(point);const d=Math.hypot(point.x-self.x,point.z-self.z);if(d>=closest)return;
     let candidate=null;model.traverse(n=>{if(canonicalPoseBoneName(n)==='HandL')candidate=n});
     if(candidate){closest=d;hand=candidate}
    });
   }
   parcel.visible=!!hand;if(!hand)return;
   // Follow the actual animated bone every render frame, not the minimap's
   // 20 Hz tick. Counter tiny GLB rig scales without writing any bone transform.
   if(parcel.parent!==hand){hand.add(parcel);parcel.position.set(0,0,0);parcel.quaternion.identity()}
   hand.getWorldScale(scale);parcel.scale.set(1/Math.max(.0001,Math.abs(scale.x)),1/Math.max(.0001,Math.abs(scale.y)),1/Math.max(.0001,Math.abs(scale.z)));
  },
  dispose(){disposed=true;for(const mixer of mixers){mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot())}for(const actor of actors)actor.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.dispose()});for(const resource of labelResources)resource.dispose();parcel.removeFromParent();root.removeFromParent();geo.dispose();paper.dispose();ribbon.dispose()},
 };
}
