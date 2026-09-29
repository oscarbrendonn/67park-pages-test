import * as T from 'three';
import {mergeGeometries} from './utils/BufferGeometryUtils.js';

// Authored, texture-free toy props. Ball interaction is deliberately deferred.
export function createSportBall103({sport,radius=.32}){
 if(!['basketball','football'].includes(sport))throw Error('Unknown sports ball');
 const group=new T.Group();group.name='SPORT103_'+sport.toUpperCase();
 const bodyMat=new T.MeshPhysicalMaterial({name:'SPORT103_'+sport+'_body',color:sport==='basketball'?'#d79860':'#e6ded2',roughness:.66,metalness:0,clearcoat:.10,clearcoatRoughness:.6});
 const seamMat=new T.MeshStandardMaterial({name:'SPORT103_'+sport+'_seams',color:'#4f4b4c',roughness:.84});
 const body=new T.Mesh(new T.SphereGeometry(radius,32,24),bodyMat);body.name=sport+' rounded shell';group.add(body);
 const seams=[];
 if(sport==='basketball'){
  // Four intersecting great circles: recognizable eight-panel basketball.
  for(const normal of [[1,0,0],[0,1,0],[0,0,1],[1,0,1]]){
   const g=new T.TorusGeometry(radius*.998,radius*.022,5,80);
   g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...normal).normalize()));seams.push(g);
  }
 }else{
  // Twelve true pentagonal panels from the vertices of a truncated icosahedron.
  // Each panel is tessellated onto the smooth sphere, not a floating flat decal.
  const phi=(1+Math.sqrt(5))/2,verts=[];
  for(const a of [-1,1])for(const b of [-phi,phi])verts.push(new T.Vector3(0,a,b).normalize(),new T.Vector3(a,b,0).normalize(),new T.Vector3(b,0,a).normalize());
  for(const v of verts){
   const neighbors=verts.filter(w=>v.dot(w)>.44&&v.dot(w)<.46),u=neighbors[0].clone().addScaledVector(v,-neighbors[0].dot(v)).normalize(),w=new T.Vector3().crossVectors(v,u).normalize();
   const edge=neighbors.map(n=>v.clone().multiplyScalar(2).add(n).normalize()).sort((a,b)=>Math.atan2(a.dot(w),a.dot(u))-Math.atan2(b.dot(w),b.dot(u)));
   const pos=[];
   for(let i=0;i<5;i++)for(let j=0;j<8;j++){
    const p=edge[i].clone().lerp(edge[(i+1)%5],j/8).normalize(),q=edge[i].clone().lerp(edge[(i+1)%5],(j+1)/8).normalize();
    for(let k=0;k<8;k++){
     const a=v.clone().lerp(p,k/8).normalize(),b=v.clone().lerp(p,(k+1)/8).normalize(),c=v.clone().lerp(q,(k+1)/8).normalize(),d=v.clone().lerp(q,k/8).normalize();
     for(const point of k===0?[a,b,c]:[a,b,c,a,c,d])pos.push(...point.clone().multiplyScalar(radius*1.006).toArray());
    }
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.computeVertexNormals();seams.push(g);
  }
 }
 const normalized=seams.map(g=>{const n=g.index?g.toNonIndexed():g;for(const key of Object.keys(n.attributes))if(!['position','normal'].includes(key))n.deleteAttribute(key);return n;});
 const detail=new T.Mesh(mergeGeometries(normalized),seamMat);detail.name=sport==='basketball'?'inlaid dark basketball panel seams':'twelve dark football pentagons';group.add(detail);
 const disposed=new Set();for(const g of [...seams,...normalized])if(!disposed.has(g)){g.dispose();disposed.add(g);}
 group.rotation.set(.22,.38,.18);group.traverse(m=>{if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;m.userData.safeShadowCaster=true;m.userData.sportsBall103=sport;});
 group.userData={sport,radius,interactive:false,physics:false};return group;
}
