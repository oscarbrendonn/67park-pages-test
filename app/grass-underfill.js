import * as T from 'three';

// Extend only the connected coastal grass underside identified in the user's
// photo. The authored top, silhouette, normals and paint are never changed.
export function createGrassUnderfill(grass,material,{at=[248.9,110],bottom=8.79}={}){
 grass.updateWorldMatrix(true,false);
 const g=grass.geometry,p=g.attributes.position,index=g.index,vertices=[],ids=new Map(),triangles=[],adj=[];
 const q=new T.Vector3(),eps=1e-4;
 const id=v=>{const key=v.map(n=>Math.round(n/eps)).join(',');if(!ids.has(key)){ids.set(key,vertices.length);vertices.push(v);adj.push([]);}return ids.get(key);};
 let minimum=Infinity;for(let i=0;i<p.count;i++){q.fromBufferAttribute(p,i).applyMatrix4(grass.matrixWorld);minimum=Math.min(minimum,q.y);}
 for(let i=0;i<(index?.count??p.count);i+=3){
  const v=[0,1,2].map(k=>q.fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(grass.matrixWorld).toArray());
  if(v.some(a=>Math.abs(a[1]-minimum)>eps))continue;
  const area=(v[1][0]-v[0][0])*(v[2][2]-v[0][2])-(v[1][2]-v[0][2])*(v[2][0]-v[0][0]);if(Math.abs(area)<1e-8)continue;
  // Top cap faces +Y (negative XZ winding).
  const t=(area<0?v:[v[0],v[2],v[1]]).map(id),n=triangles.length;triangles.push(t);for(const j of t)adj[j].push(n);
 }
 const contains=t=>{const [a,b,c]=t.map(i=>vertices[i]);const cross=(u,v)=>(v[0]-u[0])*(at[1]-u[2])-(v[2]-u[2])*(at[0]-u[0]);return [cross(a,b),cross(b,c),cross(c,a)].every(n=>n<=eps);};
 const start=triangles.findIndex(contains);if(start<0)throw Error('Coastal grass underside contract changed');
 const selected=new Set([start]),queue=[start];for(let n=0;n<queue.length;n++)for(const v of triangles[queue[n]])for(const next of adj[v])if(!selected.has(next)){selected.add(next);queue.push(next);}
 const edges=new Map(),positions=[];
 const top=i=>[vertices[i][0],vertices[i][1]-.0005,vertices[i][2]],low=i=>[vertices[i][0],bottom,vertices[i][2]];
 const add=(a,b,c)=>positions.push(...a,...b,...c);
 for(const i of selected){const [a,b,c]=triangles[i];add(top(a),top(b),top(c));add(low(c),low(b),low(a));for(const [u,v]of [[a,b],[b,c],[c,a]]){const key=[u,v].sort((a,b)=>a-b).join(',');const e=edges.get(key);if(e)e.count++;else edges.set(key,{u,v,count:1});}}
 let boundary=0;for(const {u,v,count}of edges.values()){if(count>2)throw Error('Non-manifold grass underside');if(count!==1)continue;boundary++;add(top(v),top(u),low(u));add(top(v),low(u),low(v));}
 if(!boundary||bottom>=minimum-.05)throw Error('Invalid coastal support depth');
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new T.Mesh(geometry,material);mesh.name='67PARK_COASTAL_GRASS_UNDERFILL';mesh.receiveShadow=true;mesh.castShadow=false;
 mesh.userData.grassUnderfill={revision:'grass-underfill-1',sourceTriangles:selected.size,boundary,triangles:positions.length/9,top:minimum-.0005,bottom,addedDrawCalls:1,topUnchanged:true};return mesh;
}

export function installGrassUnderfill(world){
 if(world.grassUnderfill)return world;
 const grass=world.terrain.getObjectByName('3_CIMEN_KOYU');
 const mesh=createGrassUnderfill(grass,grass.material);world.scene.add(mesh);world.grassUnderfill=mesh.userData.grassUnderfill;
 const dispose=world.dispose;world.dispose=function(...args){mesh.removeFromParent();mesh.geometry.dispose();return dispose?.apply(this,args);};return world;
}
