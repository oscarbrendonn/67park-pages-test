import * as THREE from 'three';

// Two exported terrain layers retained their exact top footprints but lost
// their side/bottom faces. Rebuild only those missing faces. No X/Z expansion,
// painted cover planes, changes to roads or changes to their shared material.
const OPEN_SLABS={ '6_BORDUR':.00325, '5_KB_SPOR_ZEMIN':.0024 };
export function sealOpenTerrain(root){
  const report=[];
  root.traverse(mesh=>{
    const depth=OPEN_SLABS[mesh.name];
    if(!mesh.isMesh||!depth||mesh.userData.surfaceSeal)return;
    const old=mesh.geometry,p=old.attributes.position,normal=old.attributes.normal,index=old.index;
    old.computeBoundingBox();
    if(old.boundingBox.max.y-old.boundingBox.min.y>1e-6)return;
    const weld=new Map(),canonical=[],edges=new Map(),top=[];
    const point=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      point.fromBufferAttribute(p,i);
      const key=point.toArray().map(v=>Math.round(v*1e7)).join(',');
      if(!weld.has(key))weld.set(key,i);canonical[i]=weld.get(key);
    }
    const count=index?.count??p.count;
    for(let k=0;k<count;k+=3){
      const f=[0,1,2].map(j=>index?index.getX(k+j):k+j),v=f.map(i=>canonical[i]);
      a.fromBufferAttribute(p,f[0]);b.fromBufferAttribute(p,f[1]);c.fromBufferAttribute(p,f[2]);
      if(new Set(v).size<3||ab.subVectors(b,a).cross(ac.subVectors(c,a)).lengthSq()<1e-30)continue;
      top.push(...f);
      for(let j=0;j<3;j++){
        const u=v[j],w=v[(j+1)%3],key=u<w?u+','+w:w+','+u;
        if(!edges.has(key))edges.set(key,{u,w,count:0});edges.get(key).count++;
      }
    }
    const boundary=[...edges.values()].filter(e=>e.count===1);
    if(!boundary.length)return;
    const positions=[],normals=[],uvs=[],indices=[...top];
    for(let i=0;i<p.count;i++){
      positions.push(p.getX(i),p.getY(i),p.getZ(i));
      normals.push(normal?.getX(i)??0,normal?.getY(i)??1,normal?.getZ(i)??0);
      const uv=old.attributes.uv;uvs.push(uv?.getX(i)??0,uv?.getY(i)??0);
    }
    const bottom=positions.length/3;
    for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i)-depth,p.getZ(i));normals.push(0,-1,0);uvs.push(0,0);}
    for(let k=0;k<top.length;k+=3)indices.push(bottom+top[k+2],bottom+top[k+1],bottom+top[k]);
    for(const {u,w} of boundary){
      a.fromBufferAttribute(p,u);b.fromBufferAttribute(p,w);
      const offset=positions.length/3;
      positions.push(a.x,a.y,a.z,a.x,a.y-depth,a.z,b.x,b.y-depth,b.z,b.x,b.y,b.z);
      point.set(-(b.z-a.z),0,b.x-a.x).normalize();
      for(let j=0;j<4;j++){normals.push(point.x,point.y,point.z);uvs.push(j>1?1:0,j===0||j===3?1:0);}
      indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    mesh.geometry=geometry;old.dispose();
    mesh.userData.surfaceSeal={version:32,boundaryEdges:boundary.length,originalTopTriangles:top.length/3,addedTriangles:(indices.length-count)/3};
    report.push({name:mesh.name,...mesh.userData.surfaceSeal});
  });
  return report;
}

// These are adjoining pieces of one pavement, not a painted border. Sharing
// the actual material also shares roughness, side shading and future lighting
// changes; equal hex colours alone left a visible polygon at their join.
export function unifyCurbFinish(root){
  const base=root.getObjectByName('7_KALDIRIM_TABANI');
  const curb=root.getObjectByName('6_BORDUR');
  if(!base?.isMesh||!curb?.isMesh)return false;
  curb.material=base.material;
  return true;
}

// The small-island bridge apron has a short concave cut between its existing
// straight road edge and the grass stub. Seal only that join, using coordinates
// taken from the neighbouring exported curb vertices. The road side stays at
// z=127.4211; the higher grass and its separator remain visible and unchanged.
// Merge this closed solid into the existing pavement: no extra draw call.
export function sealBridgeApron(root){
  const mesh=root.getObjectByName('7_KALDIRIM_TABANI');
  if(!mesh?.isMesh||mesh.userData.bridgeApronSeal)return false;
  const S=179.45658377779,cx=-.04531264305114746,cz=.012233048677444458;
  const outline=[[-111.135570466,127.421096580],[-107.542719850,127.421096580],
    [-106.389749943,128.586570632],[-106.8,128.92],[-111.135570466,128.92]];
  const shape=outline.map(([x,z])=>new THREE.Vector2(x/S+cx,z/S+cz));
  const faces=THREE.ShapeUtils.triangulateShape(shape,[]),pos=[],norm=[],indices=[];
  const top=-.0000003,bottom=-.00325;
  function triangle(a,b,c,n){const offset=pos.length/3;pos.push(...a,...b,...c);for(let i=0;i<3;i++)norm.push(...n);indices.push(offset,offset+1,offset+2);}
  for(const f of faces){
    const [a,b,c]=f.map(i=>shape[i]);
    triangle([a.x,top,a.y],[c.x,top,c.y],[b.x,top,b.y],[0,1,0]);
    triangle([a.x,bottom,a.y],[b.x,bottom,b.y],[c.x,bottom,c.y],[0,-1,0]);
  }
  for(let i=0;i<shape.length;i++){
    const a=shape[i],b=shape[(i+1)%shape.length],n=new THREE.Vector3(b.y-a.y,0,a.x-b.x).normalize().toArray();
    triangle([a.x,top,a.y],[b.x,top,b.y],[a.x,bottom,a.y],n);
    triangle([b.x,top,b.y],[b.x,bottom,b.y],[a.x,bottom,a.y],n);
  }
  const old=mesh.geometry,offset=old.attributes.position.count,next=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(old.attributes)){
    const added=name==='position'?pos:name==='normal'?norm:new Array(pos.length/3*attribute.itemSize).fill(0);
    const values=new Float32Array(attribute.array.length+added.length);
    values.set(attribute.array);values.set(added,attribute.array.length);
    next.setAttribute(name,new THREE.Float32BufferAttribute(values,attribute.itemSize));
  }
  const original=old.index?Array.from(old.index.array):Array.from({length:offset},(_,i)=>i);
  next.setIndex(original.concat(indices.map(i=>i+offset)));
  next.computeBoundingBox();next.computeBoundingSphere();mesh.geometry=next;old.dispose();
  mesh.userData.bridgeApronSeal={version:32,addedTriangles:indices.length/3};
  return true;
}
