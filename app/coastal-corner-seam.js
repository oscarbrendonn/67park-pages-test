import * as T from 'three';
import {resampleEastEdgeBand} from './east-edge-band.js?v=approved-coast-20261004-1';
import {applyWestNorthEndFinish} from './west-north-end-finish.js?v=approved-coast-20261004-1';
import {applyPierCornerJoin} from './pier-corner-join.js?v=approved-coast-20261004-1';

// Two obsolete rounded ends are internal to the continuous east paving.
// Preserve their X/Z outline, bottom support and every unrelated vertex.
export const EAST_PAVING_JOIN=Object.freeze({x0:248.9,x1:250.399,z0:114,z1:116.35,y0:9.24,y1:9.39,top:9.380089759826769});
// Retained as the authored strip dimensions; resampling prevents endpoint
// triangles from spreading this profile into the surrounding flat top.
export const EAST_EDGE_BEVEL=Object.freeze({edge:116.344745,radius:.06});
export function finishEastPavingJoin(mesh,geometry){
 if(geometry===mesh.geometry)throw Error('East paving repair requires a prepared clone');
 const p=geometry.attributes.position,n=geometry.attributes.normal,S=EAST_PAVING_JOIN;
 const inverse=mesh.matrixWorld.clone().invert(),v=new T.Vector3(),up=new T.Vector3(0,1,0).applyMatrix3(new T.Matrix3().getNormalMatrix(inverse)).normalize(),scoped=new Uint8Array(p.count);let count=0;
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
  if(v.x<S.x0||v.x>S.x1||v.z<S.z0||v.z>S.z1||v.y<S.y0||v.y>S.y1)continue;
  v.y=S.top;v.applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);scoped[i]=1;count++;
 }
 // Keep the exposed flat outer wall sharply separated from the flattened top.
 // Otherwise interpolating up normals onto its bottom looks like a soft dent.
 const ix=geometry.index,toLocal=new T.Matrix3().getNormalMatrix(inverse),vs=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
 const inside=v=>v.x>=S.x0&&v.x<=S.x1&&v.z>=S.z0&&v.z<=S.z1;
 for(let i=0;i<ix.count;i+=3){
  if(!scoped[ix.getX(i)]&&!scoped[ix.getX(i+1)]&&!scoped[ix.getX(i+2)])continue;
  const ids=[0,1,2].map(j=>ix.getX(i+j));for(let j=0;j<3;j++)vs[j].fromBufferAttribute(p,ids[j]).applyMatrix4(mesh.matrixWorld);
  if(vs.every(v=>Math.abs(v.y-S.top)<.00001)){
   for(let j=0;j<3;j++)if(inside(vs[j])){
    n.setXYZ(ids[j],up.x,up.y,up.z);
   }
   continue;
  }
  if(!vs.every(v=>Math.abs(v.x-250.398045)<.0001)&&!vs.every(v=>Math.abs(v.z-116.344745)<.0001))continue;
  const face=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
  if(face.lengthSq()<1e-16)continue;face.normalize();if(Math.abs(face.y)>.01)continue;
  face.applyMatrix3(toLocal).normalize();for(let j=0;j<3;j++)if(inside(vs[j]))n.setXYZ(ids[j],face.x,face.y,face.z);
 }
 return count;
}

// Southeast road end, not the park path or the outer coastline. The sand
// shoulder's inward-facing lip terminates above the older sloping beach.
// Tuck that inner lip underneath the existing beach; keep every outer ring.
export function applyCoastalCornerSeam(root){
 if(root.userData.coastalCornerSeam1)return root.userData.coastalCornerSeam1;
 root.updateMatrixWorld(true);
 const sand=root.getObjectByName('67F_ANA_ADA_ALT_KOPRU_KUM_OMUZ');
 const beach=root.getObjectByName('4_KURU_IC_ZEMIN_KIYI_EGIMI');
 const curb=root.getObjectByName('6_BORDUR'),walk=root.getObjectByName('7_KALDIRIM_TABANI');
 if(![sand,beach,curb,walk].every(m=>m?.isMesh&&m.geometry.index))throw Error('Coastal corner sources missing');
 const ray=new T.Raycaster(),v=new T.Vector3(),normal=new T.Vector3();
 const cast=(m,x,z)=>{ray.set(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));return ray.intersectObject(m,false)[0];};
 const old=sand.geometry,next=old.clone(),p=old.attributes.position,n=old.attributes.normal;
 const inverse=sand.matrixWorld.clone().invert(),normalWorld=new T.Matrix3().getNormalMatrix(sand.matrixWorld);
 const normalLocal=new T.Matrix3().getNormalMatrix(inverse);let tucked=0;
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i).applyMatrix4(sand.matrixWorld);
  normal.fromBufferAttribute(n,i).applyMatrix3(normalWorld).normalize();
  if(v.x<240||v.x>260||v.z<=100||v.z>=145||Math.abs(v.y-8.9906648364)>.0001||normal.x>-.1||normal.y<.8)continue;
  const fade=Math.min(1,(v.z-100)/8,(145-v.z)/8,(v.x-240)/4),length=Math.hypot(normal.x,normal.z);
  const x=v.x+normal.x/length*3*fade,z=v.z+normal.z/length*3*fade,hit=cast(beach,x,z);
  if(!hit||hit.point.y<8.79||hit.point.y>9.01)throw Error('Coastal inner lip support changed');
  v.set(x,hit.point.y-.001,z).applyMatrix4(inverse);next.attributes.position.setXYZ(i,v.x,v.y,v.z);
  normal.copy(hit.face.normal).applyMatrix3(new T.Matrix3().getNormalMatrix(beach.matrixWorld)).applyMatrix3(normalLocal).normalize();
  next.attributes.normal.setXYZ(i,normal.x,normal.y,normal.z);tucked++;
 }
 // The former rounded curb end is now INTERNAL to the adjoining paving.
 // Match both caps in this 1.5 x 1.25 m window, including their duplicated
 // bevel normals. Do not remove triangles or move any horizontal curb edge.
 const prepared=[{mesh:sand,next}],caps=[],eastCaps=[];
 for(const mesh of [curb,walk]){
  const g=mesh.geometry.clone(),position=g.attributes.position,normals=g.attributes.normal;
  const inv=mesh.matrixWorld.clone().invert(),up=new T.Vector3(0,1,0).applyMatrix3(new T.Matrix3().getNormalMatrix(inv)).normalize();let count=0;
  for(let i=0;i<position.count;i++){
   v.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
   if(v.x<248.9||v.x>250.399||v.z<126.90||v.z>128.15||v.y<9.24||v.y>9.39)continue;
   v.y=9.380089759826769;v.applyMatrix4(inv);position.setXYZ(i,v.x,v.y,v.z);normals.setXYZ(i,up.x,up.y,up.z);count++;
  }
  const eastCount=finishEastPavingJoin(mesh,g);
  resampleEastEdgeBand(mesh,g);
  prepared.push({mesh,next:g});caps.push({name:mesh.name,vertices:count});eastCaps.push({name:mesh.name,vertices:eastCount});
 }
 if(!tucked||caps.some(c=>!c.vertices)||eastCaps.some(c=>!c.vertices)){for(const p of prepared)p.next.dispose();throw Error('Coastal corner scope no longer matches');}
 for(const p of prepared){p.next.computeBoundingBox();p.next.computeBoundingSphere();p.mesh.geometry=p.next;}
 applyWestNorthEndFinish(root);
 applyPierCornerJoin(root);
 return root.userData.coastalCornerSeam1={version:1,tuckedVertices:tucked,caps,eastCaps,outerCoastUnchanged:true,parkPathUnchanged:true,edgeBandResampled:true,addedDrawCalls:0};
}
