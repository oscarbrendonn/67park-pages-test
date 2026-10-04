import * as T from 'three';

const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
export const northBeachDisplacement=(x,z)=>-1.7*smooth(x-238)*smooth((-70-z)/5.5);

// Extend the existing sand slab, including its underside and bevel, into the
// small exposed notch beside the NORTH boardwalk endpoint. No overlay/panel,
// material replacement, top-height change or change to the south shoreline.
export function prepareNorthBeachJoin(source){
 const mesh=source.getObjectByName('one continuous rounded beach');
 if(!mesh)return null; // Pure boardwalk fixtures have no beach.
 if(!mesh.isMesh||mesh.parent!==source||mesh.rotation.toArray().slice(0,3).some(v=>Math.abs(v)>1e-8)||!mesh.scale.equals(new T.Vector3(1,1,1))||mesh.position.x||mesh.position.z)throw Error('North beach transform changed');
 const old=mesh.geometry,p=old.attributes.position,n=old.attributes.normal;
 old.computeBoundingBox();const box=old.boundingBox;
 if(Math.abs(box.min.z+75.62)>.001||Math.abs(box.max.x-248.12013)>.001)throw Error('North beach contour changed');
 const geometry=old.clone(),q=geometry.attributes.position,nn=geometry.attributes.normal;let changed=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),d=northBeachDisplacement(x,z);if(!d)continue;
  q.setZ(i,z+d);
  // Inverse-transpose of the local XZ warp, preserving horizontal top/bottom
  // normals and the original smoothing of the untouched rounded shoreline.
  const h=.001,dx=(northBeachDisplacement(x+h,z)-northBeachDisplacement(x-h,z))/(2*h),dz=(northBeachDisplacement(x,z+h)-northBeachDisplacement(x,z-h))/(2*h);
  const v=new T.Vector3(n.getX(i)-dx*n.getZ(i)/(1+dz),n.getY(i),n.getZ(i)/(1+dz)).normalize();nn.setXYZ(i,v.x,v.y,v.z);changed++;
 }
 if(!changed)throw Error('North beach join has no vertices');
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return {mesh,geometry,changed};
}
