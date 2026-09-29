import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const VERSION=1;
const bounds=m=>new T.Box3().setFromObject(m);
const round=n=>Math.round(n*1e5)/1e5;
const assert=(ok,message)=>{if(!ok)throw Error('Island staircase repair: '+message);};
function useWorldGeometry(mesh,geometry){
 mesh.updateWorldMatrix(true,false);
 geometry.applyMatrix4(mesh.matrixWorld.clone().invert());
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 mesh.geometry=geometry;
}
function softBox(x0,x1,y0,y1,z0,z1,r=.018){
 const g=new RoundedBoxGeometry(x1-x0,y1-y0,z1-z0,2,Math.min(r,(y1-y0)*.2));
 return g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
}
function joinGeometries(geometries){
 const positions=[],normals=[];
 for(let g of geometries){if(g.index)g=g.toNonIndexed();positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return g;
}
function cylinderBetween(a,b,r){
 const p=new T.Vector3(...a),q=new T.Vector3(...b),delta=q.clone().sub(p);
 const g=new T.CylinderGeometry(r,r,delta.length(),12);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));return g.translate(...p.add(q).multiplyScalar(.5).toArray());
}

// One continuous sweep, including the two elbows: no cut cylinder joins.
export function roundedRailGeometry(corners,radius){
 const points=[corners[0].clone()];
 for(let i=1;i<corners.length-1;i++){
  const p=corners[i],a=corners[i-1].clone().sub(p),b=corners[i+1].clone().sub(p);
  const inset=Math.min(.22,a.length()*.4,b.length()*.4);
  const start=p.clone().add(a.normalize().multiplyScalar(inset)),end=p.clone().add(b.normalize().multiplyScalar(inset));
  points.push(start);
  const curve=new T.QuadraticBezierCurve3(start,p,end);
  for(let j=1;j<=8;j++)points.push(curve.getPoint(j/8));
 }
 points.push(corners.at(-1).clone());
 const pos=[],ix=[],radial=18;
 for(let i=0;i<points.length;i++){
  const tangent=points[Math.min(i+1,points.length-1)].clone().sub(points[Math.max(0,i-1)]).normalize();
  const normal=new T.Vector3(1,0,0).cross(tangent).normalize();
  for(let j=0;j<radial;j++){
   const angle=j/radial*Math.PI*2,p=points[i].clone().addScaledVector(normal,Math.sin(angle)*radius);p.x+=Math.cos(angle)*radius;pos.push(...p.toArray());
   if(i){const a=(i-1)*radial+j,b=(i-1)*radial+(j+1)%radial,c=i*radial+j,d=i*radial+(j+1)%radial;ix.push(a,c,b,b,c,d);}
  }
 }
 for(const end of [0,points.length-1]){const center=pos.length/3;pos.push(...points[end].toArray());for(let j=0;j<radial;j++){const a=end*radial+j,b=end*radial+(j+1)%radial;ix.push(...(end?[center,a,b]:[center,b,a]));}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();
 return {geometry:g,points};
}
export function stairAt(regions,x,z){return regions.some(b=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ);}
export function stairsRailBlocked(segments,x,y,z,r=.42){
 // A vertical character capsule against the actual handrail/post centerlines.
 const feet=y-.555,head=y+1.2;
 return segments.some(s=>{
  const [a,b]=[s.a,s.b],vx=b[0]-a[0],vz=b[2]-a[2],len=vx*vx+vz*vz;
  const t=len?T.MathUtils.clamp(((x-a[0])*vx+(z-a[2])*vz)/len,0,1):0;
  const h=a[1]+(b[1]-a[1])*t;
  const low=len?h:Math.min(a[1],b[1]),high=len?h:Math.max(a[1],b[1]);
  return high+s.radius>feet+.06&&low-s.radius<head&&Math.hypot(x-a[0]-vx*t,z-a[2]-vz*t)<r+s.radius;
 });
}

/** Replaces only the audited faulty steps, before the exact sampler is baked.
 * Same original materials/mesh identities; no invisible ramp or GLB edits. */
export function repairIslandStairs(root){
 if(root.userData.stairGeometry)return root.userData.stairGeometry;
 root.updateMatrixWorld(true);
 const get=name=>{const m=root.getObjectByName(name);assert(m?.isMesh,'missing '+name);return m;};
 const prepared=[],regions=[],routes=[],railSegments=[],nonWalkableNames=[];
 for(let flight=0;flight<2;flight++){
  const steps=Array.from({length:6},(_,i)=>get(`67D_SKATEPARK_STEP_${flight}_${i}`));
  const boxes=steps.map(bounds),depth=boxes[0].max.z-boxes[1].max.z;
  assert(depth>1.46&&depth<1.49&&Math.abs(boxes[0].min.x-102.1413)<.01,'east flight source changed');
  boxes.forEach((b,i)=>{
   assert(Math.abs((b.max.y-boxes[0].max.y)-i*.08255)<.002,'east stair height changed');
   // Preserve every original leading edge and top; grow backward to the next
   // leading edge, filling the measured .80m gaps with real solid tread.
   prepared.push([steps[i],softBox(b.min.x,b.max.x,b.min.y,b.max.y,b.max.z-depth-.004,b.max.z)]);
  });
  const region={minX:boxes[0].min.x,maxX:boxes[0].max.x,minZ:boxes[5].max.z-depth,maxZ:boxes[0].max.z};regions.push(region);
  const x=108,z0=boxes[0].max.z-depth*.5,z1=boxes[5].max.z-depth*.5;
  routes.push({name:'Skate east '+(flight+1),from:[x,z0],to:[x,z1],camera:{p:[x+11,17,z0+8],t:[x,9.6,(z0+z1)/2]}});
 }
 const bank=get('67D_SKATEPARK_CENTER_STAIR_BANK'),b=bounds(bank);
 assert(Math.abs(b.min.x-58.1918)<.01&&Math.abs(b.max.z+95.9774)<.01,'central bank source changed');
 const strips=Array.from({length:7},(_,i)=>get('67D_SKATEPARK_CENTER_STAIR_'+i));
 const low=9.24189377,high=b.max.y,count=7,run=(b.max.z-b.min.z)/count,rise=(high-low)/count;
 const geos=[];
 for(let i=0;i<count;i++)geos.push(softBox(b.min.x,b.max.x,b.min.y,low+(i+1)*rise,b.max.z-(i+1)*run-.004,b.max.z-i*run));
 prepared.push([bank,joinGeometries(geos)]);
 for(const m of strips)nonWalkableNames.push(m.name);
 regions.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
 routes.push({name:'Skate central stairs',from:[63,b.max.z-run*.5],to:[63,b.min.z+run*.5],camera:{p:[49,19,-89],t:[66,10,-104]}});
 const x=(b.min.x+b.max.x)/2;
 const ends=[[x,low+rise+1.0,b.max.z-.5],[x,high+1.0,b.min.z+.5]];
 const rail=get('67D_SKATEPARK_CENTER_STAIR_RAIL');prepared.push([rail,cylinderBetween(...ends,.095)]);railSegments.push({a:ends[0],b:ends[1],radius:.095});nonWalkableNames.push(rail.name);
 for(let i=0;i<2;i++){
  const post=get('67D_SKATEPARK_CENTER_STAIR_RAIL_POST_'+i),a=[ends[i][0],i?high:low+rise,ends[i][2]],q=ends[i];
  prepared.push([post,cylinderBetween(a,q,.09)]);railSegments.push({a,b:q,radius:.09});nonWalkableNames.push(post.name);
 }
 for(let flight=0;flight<2;flight++){
  const rail=get('67D_SKATEPARK_STEP_RAIL_'+flight),bb=bounds(rail),xx=(bb.min.x+bb.max.x)/2;
  const a=[xx,bb.min.y+.55,bb.max.z-.10],q=[xx,bb.max.y-.05,bb.min.z+.10];
  const p=rail.geometry.attributes.position;
  assert(p.count===108,'side rail authored control rings changed');
  const mean=(start,count)=>{const v=new T.Vector3();for(let i=start;i<start+count;i++)v.add(new T.Vector3().fromBufferAttribute(p,i));return v.divideScalar(count).applyMatrix4(rail.matrixWorld);};
  const corners=[mean(0,36),mean(36,18),mean(54,18),mean(72,36)];
  const sweep=roundedRailGeometry(corners,(bb.max.x-bb.min.x)/2);
  prepared.push([rail,sweep.geometry]);
  for(let i=1;i<sweep.points.length;i++)railSegments.push({a:sweep.points[i-1].toArray(),b:sweep.points[i].toArray(),radius:.105});
  nonWalkableNames.push(rail.name);
 }
 for(const [m,g]of prepared)useWorldGeometry(m,g);
 for(const m of strips)m.visible=false;
 const result={stats:{version:VERSION,flights:3,contiguousTreads:19,replacedMeshes:prepared.length,hiddenFaultyRibs:7,extraDraws:0,centerRise:round(rise),centerRun:round(run),eastRise:.08255,railSegments:railSegments.length},regions,routes,railSegments,nonWalkableNames};
 root.userData.stairGeometry=result;return result;
}

function clipPolygon(poly,z,sign){const out=[];for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[2]-z)*sign,db=(b.p[2]-z)*sign;
 if(da>=-1e-9)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push({p:a.p.map((v,j)=>v+(b.p[j]-v)*t),n:a.n.map((v,j)=>v+(b.n[j]-v)*t)});}
 }return out;}
function cutAisle(mesh,z0,z1,centerX){
 mesh.updateWorldMatrix(true,false);let original=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);if(original.index)original=original.toNonIndexed();
 const p=original.attributes.position,n=original.attributes.normal,pos=[],normals=[],cuts=[[],[]];
 const emit=poly=>{for(let j=1;j+1<poly.length;j++)for(const v of [poly[0],poly[j],poly[j+1]]){pos.push(...v.p);normals.push(...v.n);}};
 for(let i=0;i<p.count;i+=3){const tri=[0,1,2].map(d=>({p:[p.getX(i+d),p.getY(i+d),p.getZ(i+d)],n:[n.getX(i+d),n.getY(i+d),n.getZ(i+d)]}));
  emit(clipPolygon(tri,z0,-1));emit(clipPolygon(tri,z1,1));
  for(const [k,z]of [z0,z1].entries())for(let e=0;e<3;e++){const a=tri[e].p,b=tri[(e+1)%3].p;if((a[2]<z)!==(b[2]<z)){const t=(z-a[2])/(b[2]-a[2]);cuts[k].push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,z]);}}
 }
 for(let k=0;k<2;k++)for(const side of [-1,1]){
  const pts=cuts[k].filter(p=>(p[0]-centerX)*side>0);if(!pts.length)continue;
  const x0=Math.min(...pts.map(p=>p[0])),x1=Math.max(...pts.map(p=>p[0])),y0=Math.min(...pts.map(p=>p[1])),y1=Math.max(...pts.map(p=>p[1])),z=k?z1:z0;
  const q=[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],order=k?[0,2,1,0,3,2]:[0,1,2,0,2,3];
  for(const j of order){pos.push(...q[j]);normals.push(0,0,k?-1:1);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));useWorldGeometry(mesh,g);
}

/** On the unbatched generated stadium, BEFORE widenIslandStadium. */
export function repairStadiumStairs(source,A,ground){
 if(source.userData.stairGeometry)return source.userData.stairGeometry;
 const old=source.children.filter(m=>m.name==='terrace stair tread');assert(old.length===32,'stadium must contain original 32 tread meshes');
 const tierMeshes=source.children.filter(m=>/^(?:exposed seating terrace |soft continuous seat lip |low pitch boundary$)/.test(m.name));assert(tierMeshes.length===17,'stadium seating roster changed');
 const width=2.3,z=A.z-16,z0=z-width/2,z1=z+width/2,inner=11.80,outer=17.10,count=17,run=(outer-inner)/count,low=.32,high=5.38,rise=(high-low)/count;
 assert(z1<A.z-14.5&&z0>A.z-A.straight/2,'stair aisle intersects pavilion or curved end');
 for(const m of tierMeshes)cutAisle(m,z0,z1,A.x);
 const material=old[0].material;for(const m of old){m.removeFromParent();m.geometry.dispose();}
 for(const side of [-1,1])for(let i=0;i<count;i++){
  const r0=inner+i*run,r1=r0+run,x0=A.x+side*r0,x1=A.x+side*r1;
  const g=softBox(Math.min(x0,x1)-.002,Math.max(x0,x1)+.002,ground+.20,ground+low+(i+1)*rise,z0,z1,.018);
  const m=new T.Mesh(g,material);m.name='terrace stair tread repaired '+side+' '+i;m.userData.kind99='solid';source.add(m);
 }
 const routes=[-1,1].map(side=>({name:'Stadium '+(side<0?'west':'east')+' stairs',from:[A.x+side*(inner+run*.5),z],to:[A.x+side*(outer-run*.5),z],camera:{p:[A.x+side*9,ground+11,z+8],t:[A.x+side*15,ground+3,z]}}));
 const regions=[-1,1].map(side=>({minX:Math.min(A.x+side*inner,A.x+side*outer),maxX:Math.max(A.x+side*inner,A.x+side*outer),minZ:z0,maxZ:z1}));
 const result={stats:{version:VERSION,flights:2,treads:34,width,run:round(run),rise:round(rise),aisleZ:z,pavilionClearance:round((A.z-14.5)-z1),cutTierMeshes:tierMeshes.length,extraBatchedDraws:0},routes,regions};
 source.userData.stairGeometry=result;return result;
}
