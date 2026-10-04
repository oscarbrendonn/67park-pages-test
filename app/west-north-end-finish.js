import * as T from 'three';

export const WEST_PARCEL_END=Object.freeze({oldX:-156.52286888440315,x:-155.17385451676984,fadeX:-143.17385451676984,z0:-76.670,z1:-66});
export const NORTH_CURB_TIP=Object.freeze({left:160.046139,right:161.188380,end:-237.283416,centerZ:-237.083413,radius:.2,bevel:.06,top:9.380085642765648});

// Shorten the photographed parcel's rounded outer nose. Only its first
// 13.35 m of contour eases inward; the road-side anchor, heights, material,
// remaining curve and all other parcel components retain their coordinates.
export function shortenWestParcel(mesh,g){
 if(g===mesh.geometry)throw Error('Western end requires a prepared clone');
 const S=WEST_PARCEL_END,p=g.attributes.position,n=g.attributes.normal;
 const inv=mesh.matrixWorld.clone().invert(),nw=new T.Matrix3().getNormalMatrix(mesh.matrixWorld),nl=new T.Matrix3().getNormalMatrix(inv),q=new T.Vector3(),nn=new T.Vector3();
 let count=0,anchors=0,tip=0;
 for(let i=0;i<p.count;i++){
  q.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
  if(q.x<S.oldX-.00002||q.x>=S.fadeX||q.z<S.z0||q.z>S.z1)continue;
  if(Math.abs(q.x-S.x)<.00002&&Math.abs(q.z+76.669761)<.00002){anchors++;continue;}
  if(Math.abs(q.x-S.oldX)<.00002)tip++;
  const t=(S.fadeX-q.x)/(S.fadeX-S.oldX),delta=S.x-S.oldX,derivative=1-2*delta*t/(S.fadeX-S.oldX);
  q.x+=delta*t*t;q.applyMatrix4(inv);p.setXYZ(i,q.x,q.y,q.z);
  nn.fromBufferAttribute(n,i).applyMatrix3(nw);nn.x/=derivative;nn.applyMatrix3(nl).normalize();n.setXYZ(i,nn.x,nn.y,nn.z);count++;
 }
 if(!tip||!anchors||count<20)throw Error('Western parcel end no longer matches');
 g.computeBoundingBox();g.computeBoundingSphere();return {vertices:count,anchors,shortenedBy:S.x-S.oldX};
}

// The authored terminal bevel had inconsistent corner heights (up to 13 cm
// below the neighbouring top), not merely a lighting stain. Recover the same
// round 20 cm footprint and 6 cm bevel; preserve X/Z and the entire underside.
export function finishNorthTip(mesh,g){
 if(g===mesh.geometry)throw Error('Northern tip requires a prepared clone');
 const S=NORTH_CURB_TIP,p=g.attributes.position,n=g.attributes.normal,inv=mesh.matrixWorld.clone().invert(),nl=new T.Matrix3().getNormalMatrix(inv),q=new T.Vector3(),nn=new T.Vector3();let count=0;
 for(let i=0;i<p.count;i++){
  q.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
  // Only the photographed outer/right quarter. The opposite road-side
  // corner has its own asymmetric profile and is NOT part of this repair.
  if(q.x<S.right-S.radius-.006||q.x>S.right+.00002||q.z<S.end-.00002||q.z>S.centerZ+.006||q.y<9.24||q.y>S.top+.00002)continue;
  const cx=T.MathUtils.clamp(q.x,S.left+S.radius,S.right-S.radius),cz=Math.max(q.z,S.centerZ),dx=q.x-cx,dz=q.z-cz,len=Math.hypot(dx,dz),d=S.radius-len;
  const horizontal=T.MathUtils.clamp(1-d/S.bevel,0,1),up=Math.sqrt(1-horizontal*horizontal);
  q.y=S.top-S.bevel+S.bevel*up;
  nn.set(len?dx/len*horizontal:0,up,len?dz/len*horizontal:0).applyMatrix3(nl).normalize();
  q.applyMatrix4(inv);p.setY(i,q.y);n.setXYZ(i,nn.x,nn.y,nn.z);count++;
 }
 if(count<20)throw Error('Northern curb tip no longer matches');
 g.computeBoundingBox();g.computeBoundingSphere();return {vertices:count,outlinePreserved:true,bottomPreserved:true};
}

export function applyWestNorthEndFinish(root){
 if(root.userData.westNorthEndFinish1)return root.userData.westNorthEndFinish1;
 root.updateMatrixWorld(true);const parcel=root.getObjectByName('5_PARSEL_ZEMIN'),curb=root.getObjectByName('6_BORDUR');
 if(!parcel?.isMesh||!curb?.isMesh)throw Error('West/north end sources missing');
 const pg=parcel.geometry.clone(),cg=curb.geometry.clone();let west,north;
 try{west=shortenWestParcel(parcel,pg);north=finishNorthTip(curb,cg);}catch(e){pg.dispose();cg.dispose();throw e;}
 parcel.geometry=pg;curb.geometry=cg;
 return root.userData.westNorthEndFinish1={west,north,secondPhotoUnchanged:true,addedDrawCalls:0};
}
