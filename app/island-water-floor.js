// Index the FINAL visible pond mesh after all geometry repairs. Its concave
// outline is not a rectangle, and its water level is not the ocean level.
// The source water mesh/material remain untouched; no raycasts run per frame.
export function createPondWater(mesh,{cellSize=4}={}){
 if(!mesh?.isMesh||!mesh.geometry?.attributes.position||!(cellSize>0))throw Error('Pond water: missing final rendered mesh');
 mesh.updateWorldMatrix(true,false);
 const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,m=mesh.matrixWorld.elements;
 const points=new Float64Array(p.count*3),values=[],bounds=[Infinity,Infinity,-Infinity,-Infinity];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=1/(m[3]*x+m[7]*y+m[11]*z+m[15]),k=i*3;
  points[k]=(m[0]*x+m[4]*y+m[8]*z+m[12])*w;
  points[k+1]=(m[1]*x+m[5]*y+m[9]*z+m[13])*w;
  points[k+2]=(m[2]*x+m[6]*y+m[10]*z+m[14])*w;
 }
 if(!points.every(Number.isFinite))throw Error('Pond water: invalid vertices');
 for(let i=0,n=ix?.count??p.count;i<n;i+=3){
  const a=(ix?ix.getX(i):i)*3,b=(ix?ix.getX(i+1):i+1)*3,c=(ix?ix.getX(i+2):i+2)*3;
  const bx=points[b]-points[a],bz=points[b+2]-points[a+2],cx=points[c]-points[a],cz=points[c+2]-points[a+2],det=bx*cz-bz*cx;
  if(Math.abs(det)<1e-12)continue;
  values.push(points[a],points[a+2],points[a+1],bx,bz,cx,cz,points[b+1]-points[a+1],points[c+1]-points[a+1],1/det);
  for(const k of [a,b,c]){bounds[0]=Math.min(bounds[0],points[k]);bounds[1]=Math.min(bounds[1],points[k+2]);bounds[2]=Math.max(bounds[2],points[k]);bounds[3]=Math.max(bounds[3],points[k+2]);}
 }
 if(!values.length)throw Error('Pond water: empty footprint');
 const data=new Float64Array(values),cols=Math.max(1,Math.ceil((bounds[2]-bounds[0])/cellSize)),rows=Math.max(1,Math.ceil((bounds[3]-bounds[1])/cellSize));
 if(cols*rows>1000000)throw Error('Pond water: unreasonable bounds');
 const gx=x=>Math.max(0,Math.min(cols-1,Math.floor((x-bounds[0])/cellSize))),gz=z=>Math.max(0,Math.min(rows-1,Math.floor((z-bounds[1])/cellSize)));
 const cells=Array.from({length:cols*rows},()=>[]);
 for(let k=0;k<data.length;k+=10){
  const xs=[data[k],data[k]+data[k+3],data[k]+data[k+5]],zs=[data[k+1],data[k+1]+data[k+4],data[k+1]+data[k+6]];
  for(let z=gz(Math.min(...zs));z<=gz(Math.max(...zs));z++)for(let x=gx(Math.min(...xs));x<=gx(Math.max(...xs));x++)cells[z*cols+x].push(k);
 }
 const bins=cells.map(v=>Uint32Array.from(v));let lastX=NaN,lastZ=NaN,last=null;
 function height(x,z){
  if(x===lastX&&z===lastZ)return last;lastX=x;lastZ=z;last=null;
  if(!Number.isFinite(x+z)||x<bounds[0]||x>bounds[2]||z<bounds[1]||z>bounds[3])return last;
  for(const k of bins[gz(z)*cols+gx(x)]){
   const dx=x-data[k],dz=z-data[k+1],u=(dx*data[k+6]-dz*data[k+5])*data[k+9],v=(data[k+3]*dz-data[k+4]*dx)*data[k+9];
   if(u< -1e-9||v< -1e-9||u+v>1.000000001)continue;
   const y=data[k+2]+u*data[k+7]+v*data[k+8];if(last===null||y>last)last=y;
  }
  return last;
 }
 return {height,stats:{mesh:mesh.name,triangles:data.length/10,cells:bins.length,bounds,bytes:data.byteLength+bins.reduce((n,b)=>n+b.byteLength,0)}};
}

// Real solid bridge decks/shore remain dry, even over the exact pond footprint.
// Only the old hidden water lids are excluded from the upstream solid sampler.
export function waterWithSolidFloor({water,ground,sea,pool,pond}){
 return (x,z)=>{
  if(pool?.contains(x,z))return pool.isWater(x,z);
  const pondY=pond?.height(x,z),h=ground(x,z);
  if(pondY!=null)return !Number.isFinite(h)||h<=pondY+.006;
  if(Number.isFinite(h)&&h>sea(x,z)+.006)return false;
  return water(x,z);
 };
}
