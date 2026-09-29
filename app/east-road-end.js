import * as T from 'three';
import {eastRoadEndData} from './east-road-end-data.js';
// Southeast dead-end only. Keep road, all houses and other dividers unchanged.
export function repairEastRoadEnd(root){
 if(root.userData.eastRoadEnd)return root.userData.eastRoadEnd;
 root.updateMatrixWorld(true);
 const road=root.getObjectByName('5_YOL'),walk=root.getObjectByName('7_KALDIRIM_TABANI'),grass=root.getObjectByName('3_CIMEN');
 if(!road||!walk||!grass)return {skipped:'source missing'};
 const v=new T.Vector3();let end=-Infinity;
 for(let i=0;i<road.geometry.attributes.position.count;i++){v.fromBufferAttribute(road.geometry.attributes.position,i).applyMatrix4(road.matrixWorld);if(v.x>249&&v.x<252&&v.z>115&&v.z<128)end=Math.max(end,v.x);}
 if(Math.abs(end-250.3980445)>.05)return {skipped:'road endpoint changed'};
 const shorten=m=>{const p=m.geometry.attributes.position,inv=m.matrixWorld.clone().invert(),selected=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);if(v.x>249.8&&v.x<259&&v.z>112.5&&v.z<115.1)selected.push([i,v.clone()]);}if(!selected.length)return 0;const max=Math.max(...selected.map(s=>s[1].x));if(Math.abs(max-end)<.001)return 0;for(const[i,w]of selected){w.x=249.8+(w.x-249.8)*(end-249.8)/(max-249.8);w.applyMatrix4(inv);p.setXYZ(i,w.x,w.y,w.z);}p.needsUpdate=true;const originalNormals=m.geometry.attributes.normal?.array.slice();m.geometry.computeVertexNormals();if(originalNormals){const chosen=new Set(selected.map(s=>s[0])),a=m.geometry.attributes.normal.array;for(let i=0;i<p.count;i++)if(!chosen.has(i))a.set(originalNormals.subarray(i*3,i*3+3),i*3);}m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();return selected.length;};
 const changed=shorten(walk);const shadow=walk.getObjectByName('67D_DIK_YAN_GOLGE_7_KALDIRIM_TABANI');if(shadow?.isMesh){shorten(shadow);const g=shadow.geometry,p=g.attributes.position,idx=g.index,keep=[];for(let i=0;i<(idx?.count||p.count);i+=3){const ids=[0,1,2].map(d=>idx?idx.getX(i+d):i+d),pts=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(shadow.matrixWorld));if(pts.every(p=>p.x>233.4&&p.x<245.8&&p.z>130.85&&p.z<131.4))continue;keep.push(...ids);}g.setIndex(keep);}
 for(const row of eastRoadEndData){
  const m=root.getObjectByName(row.name),g=m.geometry,added=new T.BufferGeometry(),worldPositions=new Float64Array(row.p);
  // The southeast lawn extension used to begin as a hard rectangle at x=221.7,
  // leaving a visible 2.07 m step. Taper its north edge into the authored lawn.
  if(row.name==='3_CIMEN')for(let i=0;i<worldPositions.length;i+=3){
   const x=worldPositions[i],z=worldPositions[i+2];
   if(x<221.7||x>224.4||z<128.54||z>130.63)continue;
   const t=Math.max(0,Math.min(1,(x-221.7)/(224.4-221.7))),smooth=t*t*(3-2*t);
   const oldMin=128.55,top=130.620595,targetMin=130.590595+(oldMin-130.590595)*smooth;
   worldPositions[i+2]=targetMin+(z-oldMin)*(top-targetMin)/(top-oldMin);
  }
  added.setAttribute('position',new T.BufferAttribute(worldPositions,3));added.setIndex(row.ix);added.computeVertexNormals();added.applyMatrix4(m.matrixWorld.clone().invert());
  const oldCount=g.attributes.position.count;
  for(const [name,a] of Object.entries(g.attributes)){const values=new a.array.constructor(a.array.length+row.p.length/3*a.itemSize);values.set(a.array);if(added.attributes[name])values.set(added.attributes[name].array,a.array.length);else for(let i=a.array.length;i<values.length;i++)values[i]=a.array[i%a.itemSize];g.setAttribute(name,new T.BufferAttribute(values,a.itemSize,a.normalized));}
  const ix=new Uint32Array(g.index.count+row.ix.length);ix.set(g.index.array);for(let i=0;i<row.ix.length;i++)ix[g.index.count+i]=oldCount+row.ix[i];g.setIndex(new T.BufferAttribute(ix,1));g.computeBoundingBox();g.computeBoundingSphere();added.dispose();
 }
 return root.userData.eastRoadEnd={version:2,endpoint:end,shortenedVertices:changed,lawnArea:eastRoadEndData[0].area,connectorArea:eastRoadEndData[1].area,lawnStepSmoothed:true,roadUnchanged:true};
}
