import * as T from 'three';
// Kimi southeast beach tip only. No house dividers, road or lawn edits.
export function shortenKimiRightTip(root){
 if(root.userData.kimiRightTip)return root.userData.kimiRightTip;
 root.updateMatrixWorld(true);
 const mesh=root.getObjectByName('7_KALDIRIM_TABANI');
 if(!mesh?.geometry?.attributes.position||!mesh.geometry.index)return {skipped:'missing sidewalk'};
 const old=mesh.geometry,p=old.attributes.position,inv=mesh.matrixWorld.clone().invert(),v=new T.Vector3(),selected=[];
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
  if(v.x>249.8&&v.x<259&&v.z>112.5&&v.z<115.1)selected.push({i,world:v.clone()});
 }
 if(selected.length!==448)return {skipped:'changed regional geometry',vertices:selected.length};
 const max=Math.max(...selected.map(s=>s.world.x));
 if(Math.abs(max-258.43321468412114)>.001)return {skipped:'changed endpoint'};
 const next=old.clone(),np=next.attributes.position,scale=(250.25-249.8)/(max-249.8);
 for(const s of selected){v.copy(s.world);v.x=249.8+(v.x-249.8)*scale;v.applyMatrix4(inv);np.setXYZ(s.i,v.x,v.y,v.z);}
 // Reject flipped or collapsed live faces before touching the original.
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),u=new T.Vector3(),w=new T.Vector3();
 const normal=(attr,ids)=>{a.fromBufferAttribute(attr,ids[0]);b.fromBufferAttribute(attr,ids[1]);c.fromBufferAttribute(attr,ids[2]);return u.subVectors(b,a).cross(w.subVectors(c,a)).clone();};
 const chosen=new Set(selected.map(s=>s.i));
 for(let k=0;k<old.index.count;k+=3){const ids=[old.index.getX(k),old.index.getX(k+1),old.index.getX(k+2)];if(!ids.some(i=>chosen.has(i)))continue;const before=normal(p,ids),after=normal(np,ids);if(before.lengthSq()>1e-20&&(after.lengthSq()<1e-24||before.dot(after)<=0)){next.dispose();return {skipped:'unsafe face',face:k};}}
 // Recompute normals only at changed vertices; keep all unrelated normals exact.
 const normals=next.attributes.normal.array.slice();next.computeVertexNormals();
 const changed=new Set(selected.map(s=>s.i));
 for(let i=0;i<next.attributes.normal.count;i++)if(!changed.has(i))next.attributes.normal.array.set(normals.subarray(i*3,i*3+3),i*3);
 // Preserve geometry identity and typed arrays for existing consumers.
 old.attributes.position.array.set(np.array);old.attributes.position.needsUpdate=true;
 old.attributes.normal.array.set(next.attributes.normal.array);old.attributes.normal.needsUpdate=true;
 old.computeBoundingBox();old.computeBoundingSphere();next.dispose();
 const report=root.userData.kimiRightTip={changedVertices:selected.length,oldEnd:max,newEnd:250.25,meshes:1,otherDividersUnchanged:true};
 if(typeof document!=='undefined'&&location.search.includes('gapQA')){const o=document.createElement('output');o.textContent='Kimi right tip: '+JSON.stringify(report);o.style.cssText='position:fixed;top:40px;left:310px;z-index:30000;background:white;font:12px monospace';document.body.append(o);}
 return report;
}
