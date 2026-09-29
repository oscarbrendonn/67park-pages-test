import * as THREE from 'three';

// Scoped photo corrections. Original assets and all other junctions are retained.
export function applyPhotoFixes67(root,meta){
 if(root.userData.photoFixes67)return root.userData.photoFixes67;
 if(meta.radii.length!==720)throw Error('Photo67 ring data');
 const v=new THREE.Vector3(),inv=new THREE.Matrix4(),cx=140.705,cz=47.002;
 const lerp=(a,b,t)=>a+(b-a)*t,clamp=t=>Math.max(0,Math.min(1,t));
 let moved=0;const changed=[];
 root.updateMatrixWorld(true);
 root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry.attributes.position||mesh.name.startsWith('67D_DIK_YAN_GOLGE_'))return;
  const ring=['3_CIMEN','8_PARK_PATIKA_UST'].includes(mesh.name);
  const apron=mesh.name==='3_CIMEN_PARK_APRON_V57';
  const junction=/^(5_YOL|5_PARSEL_ZEMIN|3_CIMEN|8_YAYA_GECIDI)$/.test(mesh.name);
  const curb=['6_BORDUR','7_KALDIRIM_TABANI'].includes(mesh.name);
  if(!ring&&!apron&&!junction&&!curb)return;
  const next=mesh.geometry.clone(),p=next.attributes.position;inv.copy(mesh.matrixWorld).invert();let count=0;
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);const x=v.x,y=v.y,z=v.z;
   if(junction&&z>126.4&&z<144&&x>-30&&x<8){
    const side=clamp((x+30)/8)*clamp((8-x)/8);
    const right=z<129.6?Math.max(0,Math.min(1.7468320585,-4.5290102488-x)):1.7468320585;
    const shift=mesh.name==='8_YAYA_GECIDI'?1.7342655865:lerp(1.7342655865,right,clamp((x+10)/2));
    v.x+=shift*side;
    if(mesh.name==='5_YOL'&&z>126.95&&z<131&&x> -6.28&&x<0)v.x=Math.min(v.x,-4.5290102488);
   }
   // Replace the malformed stub curb as one rounded U, not stretched fragments.
   // Stub curb faces are clipped/rebuilt below; do not stretch shared vertices.
   if(ring){
    const dx=x-cx,dz=z-cz,r=Math.hypot(dx,dz);
    if(!meta.replacement&&r>1e-6&&r<27){
     const f=((Math.atan2(dz,dx)/(Math.PI*2)+1)%1)*720,k=Math.floor(f),t=f-k;
     const a=meta.radii[k],b=meta.radii[(k+1)%720],inner=lerp(a[0],b[0],t),outer=lerp(a[1],b[1],t);
     const edge=Math.min(outer,24),target=lerp(19.5,edge,clamp((outer-21.5)/2.5));
     let nr;
     if(r<=inner)nr=r*13.43/inner;
     else if(r<edge)nr=lerp(13.43,target,(r-inner)/(edge-inner));
     else nr=lerp(target,27,(r-edge)/(27-edge));
     v.x=cx+dx*nr/r;v.z=cz+dz*nr/r;
    }
    // Existing north apron rises through the straight white curb.
    if(mesh.name==='3_CIMEN'&&x>128&&x<155&&z>23&&z<28)v.y=Math.min(v.y,9.24);
   }
   // Keep the original grass support under the sculpture, not through the walk.
   if(apron&&Math.hypot(x-cx,z-cz)>13.35)v.y=Math.min(v.y,9.25);
   if(v.x!==x||v.y!==y||v.z!==z){v.applyMatrix4(inv);p.setXYZ(i,v.x,v.y,v.z);count++;}
  }
  if(count){next.computeBoundingBox();next.computeBoundingSphere();mesh.geometry=next;changed.push({name:mesh.name,vertices:count});moved+=count;}else next.dispose();
 });
 for(const item of meta.replacement??[]){
  const mesh=root.getObjectByName(item.name),old=mesh.geometry;
  if(old.index.count!==item.sourceIndexCount)throw Error('Photo67 source '+item.name);
  const removed=new Set(item.removed),retained=[];
  for(let k=0;k<old.index.count;k+=3)if(!removed.has(k))retained.push(old.index.getX(k),old.index.getX(k+1),old.index.getX(k+2));
  const extra=new THREE.BufferGeometry();extra.setAttribute('position',new THREE.Float32BufferAttribute(item.positions,3));
  extra.applyMatrix4(new THREE.Matrix4().copy(mesh.matrixWorld).invert());extra.computeVertexNormals();
  const positions=new Float32Array(old.attributes.position.array.length+extra.attributes.position.array.length);
  const normals=new Float32Array(positions.length);
  positions.set(old.attributes.position.array);positions.set(extra.attributes.position.array,old.attributes.position.array.length);
  normals.set(old.attributes.normal.array);normals.set(extra.attributes.normal.array,old.attributes.normal.array.length);
  const start=old.attributes.position.count;for(let i=0;i<extra.attributes.position.count;i++)retained.push(start+i);
  const next=old.clone();next.setAttribute('position',new THREE.BufferAttribute(positions,3));next.setAttribute('normal',new THREE.BufferAttribute(normals,3));next.setIndex(retained);
  next.computeBoundingBox();next.computeBoundingSphere();mesh.geometry=next;extra.dispose();
 }
 const addedWalkMeshes=[];
 const source=root.getObjectByName('7_KALDIRIM_TABANI');
 const s=new THREE.Shape(),L=-15.107975775,R=-4.529010249,B=140.58663521,W=1.2,r=.80755,Z=126.95;
 // Shape uses (world X, -world Z), rotated onto the horizontal plane.
 s.moveTo(L-W,-Z);s.lineTo(L-W,-(B-r));s.quadraticCurveTo(L-W,-(B+W),L+r,-(B+W));
 s.lineTo(R-r,-(B+W));s.quadraticCurveTo(R+W,-(B+W),R+W,-(B-r));s.lineTo(R+W,-Z);
 s.lineTo(R,-Z);s.lineTo(R,-(B-r));s.quadraticCurveTo(R,-B,R-r,-B);s.lineTo(L+r,-B);
 s.quadraticCurveTo(L,-B,L,-(B-r));s.lineTo(L,-Z);s.closePath();
 const stubG=new THREE.ShapeGeometry(s,64);stubG.rotateX(-Math.PI/2);stubG.translate(0,9.3800856428,0);stubG.applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
 const stub=new THREE.Mesh(stubG,source.material);stub.name='7_KALDIRIM_TABANI_STUB67';stub.receiveShadow=true;root.add(stub);addedWalkMeshes.push(stub);
 for(const [i,b] of [[-20,126.95,L-W,128.15],[R+W,126.95,0,130.9]].entries()){
  const [x0,z0,x1,z1]=b,g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([x0,9.3800856428,z0,x0,9.3800856428,z1,x1,9.3800856428,z0,x1,9.3800856428,z1],3));g.setIndex([0,1,2,2,1,3]);g.computeVertexNormals();g.applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
  const m=new THREE.Mesh(g,source.material);m.name='7_KALDIRIM_TABANI_STUB_JOIN67_'+i;m.receiveShadow=true;root.add(m);addedWalkMeshes.push(m);
 }
 for(const [i,vertices] of meta.caps.entries()){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex(Array.from({length:vertices.length/3},(_,j)=>j));
  g.applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());g.computeVertexNormals();g.computeBoundingSphere();
  const m=new THREE.Mesh(g,source.material);m.name='7_KALDIRIM_TABANI_ENTRY67_'+i;m.receiveShadow=true;m.castShadow=false;
  root.add(m);addedWalkMeshes.push(m);
 }
 root.updateMatrixWorld(true);
 return root.userData.photoFixes67={version:67,moved,changed,junctionShift:1.7342655865,ringInnerRadius:13.43,addedWalkMeshes};
}
