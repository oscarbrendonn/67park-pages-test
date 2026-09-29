// Total height across a long bus is not a step: a gentle grass bank can rise
// a metre while every tyre remains on continuous ground. Compare neighbouring
// probes, retaining the same complete bumper/interior collision footprint.
export const DRIVE_STEP=.65,DRIVE_GRADE=.7;
const profiles=new WeakMap();
export function terrainProfile(points){
 let profile=profiles.get(points);if(profile)return profile;
 const pairs=[],rows=new Map(),columns=new Map();
 const samples=[...points,[0,0]],center=points.length;
 points.forEach(([u,v],i)=>{
  const row=rows.get(u)??[];row.push(i);rows.set(u,row);
  const col=columns.get(v)??[];col.push(i);columns.set(v,col);
 });
 for(const [groups,axis]of [[rows,1],[columns,0]])for(const group of groups.values()){
  group.sort((a,b)=>points[a][axis]-points[b][axis]);
  for(let j=1;j<group.length;j++){
   const a=group[j-1],b=group[j],distance=Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1]);
   if(distance>1e-8)pairs.push({a,b,distance});
  }
 }
 // The centre is also a real probe, even when the sparse interior grid has
 // no sample exactly at (0,0). Do not allow a tall centre-only ledge through.
 points.map(([u,v],i)=>({i,distance:Math.hypot(u,v)})).filter(p=>p.distance>1e-8).sort((a,b)=>a.distance-b.distance).slice(0,4).forEach(({i,distance})=>pairs.push({a:center,b:i,distance}));
 profile={heights:new Float64Array(samples.length),pairs,points:samples,center};profiles.set(points,profile);return profile;
}
export function traversableGrade(profile,surface,x,z,s,c){
 const {heights,pairs,points}=profile;
 if(!pairs.length)return false;
 for(const {a,b,distance}of pairs){
  const delta=Math.abs(heights[a]-heights[b]);
  if(delta<=DRIVE_STEP+1e-7)continue;
  if(delta>DRIVE_STEP+distance*DRIVE_GRADE)return false;
  // Sparse interior rows can span more than a metre. Only those suspect
  // spans need extra samples, so level roads incur no additional ray queries.
  const steps=Math.ceil(distance/.2);let previous=heights[a];
  for(let i=1;i<=steps;i++){
   const t=i/steps,u=points[a][0]+(points[b][0]-points[a][0])*t,v=points[a][1]+(points[b][1]-points[a][1])*t;
   const y=i===steps?heights[b]:surface(x+c*u+s*v,z-s*u+c*v);
   if(!Number.isFinite(y)||Math.abs(y-previous)>DRIVE_STEP+1e-7)return false;
   previous=y;
  }
 }
 return true;
}
