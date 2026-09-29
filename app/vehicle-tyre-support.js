import {Matrix4,Vector3} from 'three';

const point=new Vector3(),inverse=new Matrix4(),matrix=new Matrix4();
// Capture the existing tyre's outer cross-section once, without changing its
// geometry. Wheel spin is deliberately excluded: a round tyre must not wobble
// vertically as its low-poly vertices rotate past a curb.
export function createTyreSupport(wheel,radius){
 const rings=new Map();wheel.roll.updateWorldMatrix(true,true);
 inverse.copy(wheel.roll.matrixWorld).invert();
 wheel.roll.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
  matrix.multiplyMatrices(inverse,mesh.matrixWorld);
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(matrix);
   // The shallow hubcap can project beyond the rubber's sidewall. Keep it
   // too; otherwise its lower edge can still enter a curb during side contact.
   const r=Math.hypot(point.y,point.z);
   const x=Math.round(point.x*1e5)/1e5;rings.set(x,Math.max(rings.get(x)||0,r));
  }
 });
 const profile=[];
 for(const row of [...rings].sort((a,b)=>a[0]-b[0])){
  while(profile.length>1){const a=profile.at(-2),b=profile.at(-1);
   if((b[0]-a[0])*(row[1]-b[1])-(b[1]-a[1])*(row[0]-b[0])< -1e-8)break;
   profile.pop();
  }
  profile.push(row);
 }
 if(!profile.length)profile.push([0,radius]);
 // Remove nearly collinear hubcap rings (under 2 mm profile error). Keep the
 // broad tread and sidewall shoulders, with no per-frame mesh traversal.
 const reduced=[];
 const simplify=(first,last)=>{
  const a=profile[first],b=profile[last];let split=-1,error=.002;
  for(let i=first+1;i<last;i++){
   const p=profile[i],gap=p[1]-(a[1]+(b[1]-a[1])*(p[0]-a[0])/(b[0]-a[0]));
   if(gap>error){error=gap;split=i;}
  }
  if(split>=0){simplify(first,split);simplify(split,last);}else reduced.push(a);
 };
 if(profile.length>1){simplify(0,profile.length-1);reduced.push(profile.at(-1));profile.splice(0,profile.length,...reduced);}
 // Include the middle of a flat tread, not just its two shoulders.
 for(let i=profile.length-1;i>0;i--)if(profile[i-1][0]<0&&profile[i][0]>0){
  const a=profile[i-1],b=profile[i];profile.splice(i,0,[0,a[1]+(b[1]-a[1])*-a[0]/(b[0]-a[0])]);break;
 }
 const factor=radius/Math.max(...profile.map(p=>p[1])),points=[],edges=[];
 for(const [row,[x,r]]of profile.entries())for(let i=0;i<=8;i++){
  const a=(i-4)*Math.PI/8,index=points.length/3;
  // A 6 mm contact skin at either side prevents a rotating tyre facet from
  // slipping between probes at a tangent to a rounded curb. No visual mesh
  // inflation, and no extra lift on level ground.
  points.push(x+Math.sign(x)*.006,-r*factor*Math.cos(a),r*factor*Math.sin(a));
  if(i)edges.push(index-1,index);if(row)edges.push(index-9,index);
 }
 return {points:new Float64Array(points),edges:new Uint16Array(edges),offsets:new Float64Array(points.length),floors:new Float64Array(points.length/3)};
}

export function tyreSupportHeight(height,wheel,shape,fallback){
 const e=wheel.pivot.matrixWorld.elements,cx=e[12],cz=e[14];
 const {points,offsets,floors,edges}=shape;let hub=-Infinity;
 for(let i=0;i<points.length;i+=3){
  const x=points[i],y=points[i+1],z=points[i+2];
  const dx=offsets[i]=e[0]*x+e[4]*y+e[8]*z,dy=offsets[i+1]=e[1]*x+e[5]*y+e[9]*z,dz=offsets[i+2]=e[2]*x+e[6]*y+e[10]*z;
  const floor=height(cx+dx,cz+dz);floors[i/3]=Number.isFinite(floor)?floor:NaN;
  if(Number.isFinite(floor))hub=Math.max(hub,floor-dy);
 }
 // Refine only edges that cross a step. This finds the curb under the tyre's
 // width/steering/roll without a dense per-frame mesh collision or raycast.
 for(let i=0;i<edges.length;i+=2){
  const ia=edges[i],ib=edges[i+1],fa=floors[ia],fb=floors[ib];
  if(!Number.isFinite(fa+fb)||Math.abs(fa-fb)<.035)continue;
  const a=ia*3,b=ib*3;let low=0,high=1,fl=fa,fh=fb;
  for(let n=0;n<7;n++){
   const t=(low+high)*.5,dx=offsets[a]+(offsets[b]-offsets[a])*t,dy=offsets[a+1]+(offsets[b+1]-offsets[a+1])*t,dz=offsets[a+2]+(offsets[b+2]-offsets[a+2])*t;
   const floor=height(cx+dx,cz+dz);if(!Number.isFinite(floor))break;
   hub=Math.max(hub,floor-dy);
   if(Math.abs(floor-fl)<Math.abs(floor-fh)){low=t;fl=floor;}else{high=t;fh=floor;}
  }
 }
 return Number.isFinite(hub)?hub:fallback;
}
