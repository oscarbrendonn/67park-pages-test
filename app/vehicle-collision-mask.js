// Compact run-length encoded clearance sampled from the finished island,
// including its actual building/prop, water and trunk collision queries.
// Four corner samples conservatively cover each 25 cm cell. This is collision
// data only; it never changes a mesh, material, texture or ground elevation.
export function createVehicleCollisionMask(data){
 const {x,z,step,cols,rows,runs}=data;
 if(!(step>0)||!Number.isInteger(cols)||!Number.isInteger(rows)||runs.length!==rows||cols*rows>5e6)throw Error('Invalid vehicle clearance data');
 const bits=new Uint8Array(Math.ceil(cols*rows/8));
 for(let r=0;r<rows;r++)for(let k=0;k<runs[r].length;k+=2){const a=runs[r][k],b=runs[r][k+1];if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b>cols||b<a)throw Error('Invalid clearance run');for(let c=a;c<b;c++){const n=r*cols+c;bits[n>>3]|=1<<(n&7);}}
 const at=(c,r)=>{const n=r*cols+c;return (bits[n>>3]&(1<<(n&7)))!==0;};
 const blocked=(px,pz)=>{if(!Number.isFinite(px+pz))return true;const c=Math.floor((px-x)/step),r=Math.floor((pz-z)/step);return c<0||r<0||c>=cols-1||r>=rows-1||at(c,r)||at(c+1,r)||at(c,r+1)||at(c+1,r+1);};
 // The baked mask contains water as well as solids. At a beach, a wet
 // neighbouring grid corner must not inflate the sea onto dry sand. Keep
 // every dry solid bit (including a wall in the same cell) conservative.
 const solidBlocked=(px,pz,isWater)=>{
  if(!Number.isFinite(px+pz))return true;
  const c=Math.floor((px-x)/step),r=Math.floor((pz-z)/step);
  if(c<0||r<0||c>=cols-1||r>=rows-1)return true;
  for(let dc=0;dc<=1;dc++)for(let dr=0;dr<=1;dr++)if(at(c+dc,r+dr)&&!isWater(x+(c+dc)*step,z+(r+dr)*step))return true;
  return false;
 };
 return {blocked,solidBlocked,normal(px,pz){
  if(!Number.isFinite(px+pz))return null;
  // Collision-only gradient of the conservative mask. No mesh/raycast work
  // on free driving frames. The small symmetric stencil also handles angled
  // building edges; the final full-footprint sweep remains the safety gate.
  let nx=0,nz=0;
  for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)if(blocked(px+i*step,pz+j*step)){nx+=i;nz+=j;}
  const length=Math.hypot(nx,nz);return length>1e-8?{x:nx/length,z:nz/length}:null;
 },stats:{step,cols,rows,bytes:bits.length}};
}
