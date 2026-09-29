import * as T from 'three';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Exact ease-out token: cubic-bezier(.23,1,.32,1), sampled once, not solved per frame.
const easeTable=Float32Array.from({length:65},(_,i)=>{
 const x=i/64;let lo=0,hi=1,t=x;
 for(let n=0;n<20;n++){t=(lo+hi)/2;const q=1-t,bx=3*q*q*t*.23+3*q*t*t*.32+t*t*t;if(bx<x)lo=t;else hi=t;}
 return 1-(1-t)**3;
});
const ease=x=>{const p=clamp(x,0,1)*64,i=Math.floor(p);return i===64?1:easeTable[i]+(easeTable[i+1]-easeTable[i])*(p-i)};
const circle=(g,x,y,r)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2)};
function faceTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const g=canvas.getContext('2d');g.fillStyle=kind==='hatch'?'#718681':'#365854';g.fillRect(0,0,256,256);
 g.strokeStyle=kind==='hatch'?'#596e69':'#597973';g.lineWidth=2;
 for(let x=-256;x<512;x+=18){g.beginPath();g.moveTo(x,0);g.lineTo(x+256,256);g.stroke();g.beginPath();g.moveTo(x,256);g.lineTo(x+256,0);g.stroke();}
 circle(g,128,128,104);g.strokeStyle='#e6e6ce';g.lineWidth=kind==='hatch'?4:6;g.stroke();
 circle(g,128,128,65);g.fillStyle=kind==='hatch'?'#718681':'#365854';g.fill();
 g.fillStyle='#f8f2dc';g.font='900 46px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('67',128,113);
 g.font='bold 17px sans-serif';g.fillText('PARK',128,150);
 if(kind==='hatch'){g.fillStyle='#374e49';g.fillRect(52,121,22,8);g.fillRect(182,121,22,8);}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex;
}

export function createLauncherFactory(){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const material=(color,roughness=.72)=>mat(new T.MeshStandardMaterial({color,roughness,metalness:.05}));
 const cream=material('#f1ebd7'),metal=material('#708780'),dark=material('#243d3a'),pink=material('#e4a8bb'),mint=material('#a8c6ae');
 const hatchTex=faceTexture('hatch'),matTex=faceTexture('trampoline');textures.add(hatchTex);textures.add(matTex);
 const hatchFace=mat(new T.MeshStandardMaterial({map:hatchTex,roughness:.78,metalness:.12}));
 const fabric=mat(new T.MeshStandardMaterial({map:matTex,roughness:.94}));
 const ring=geo(new T.TorusGeometry(1.04,.075,6,32)),lid=geo(new T.CylinderGeometry(.97,.97,.065,32));
 const lidFace=geo(new T.CircleGeometry(.965,32)),well=geo(new T.CircleGeometry(.99,32));
 const hingeGeo=geo(new T.CylinderGeometry(.085,.085,.48,8));
 const frame=geo(new T.TorusGeometry(1.27,.16,8,32)),bed=geo(new T.CircleGeometry(1.12,32));
 const leg=geo(new T.CylinderGeometry(.065,.09,.28,6)),spring=geo(new T.CylinderGeometry(.035,.035,.19,5));
 const trim=geo(new T.TorusGeometry(1.1,.035,5,32)),matrix=new T.Matrix4(),q=new T.Quaternion(),pos=new T.Vector3(),scale=new T.Vector3(1,1,1);
 function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;}
 function create(kind,x,y,z,index=0){
  const group=new T.Group();group.name='PARTY_'+kind;group.position.set(x,y+.025,z);group.userData.launcherKind=kind;
  let hinge=null,top=null;
  if(kind==='hatch'){
   mesh(well,dark,group,0,.008).rotation.x=-Math.PI/2;
   mesh(ring,metal,group,0,.052).rotation.x=-Math.PI/2;
   mesh(hingeGeo,cream,group,0,.10,-.89).rotation.z=Math.PI/2;
   hinge=new T.Group();hinge.position.set(0,.083,-.89);group.add(hinge);
   mesh(lid,metal,hinge,0,0,.89);
   mesh(lidFace,hatchFace,hinge,0,.034,.89).rotation.x=-Math.PI/2;
  }else{
   const legs=new T.InstancedMesh(leg,metal,6);legs.name='Trampoline_legs';group.add(legs);
   for(let i=0;i<6;i++){const a=i*Math.PI/3;pos.set(Math.cos(a)*1.24,.14,Math.sin(a)*1.24);matrix.compose(pos,q,scale);legs.setMatrixAt(i,matrix);}
   mesh(frame,index%2?pink:mint,group,0,.32).rotation.x=Math.PI/2;
   const springs=new T.InstancedMesh(spring,cream,12);group.add(springs);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;pos.set(Math.cos(a)*1.17,.29,Math.sin(a)*1.17);q.setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2);q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-a));matrix.compose(pos,q,scale);springs.setMatrixAt(i,matrix);}q.identity();
   top=new T.Group();top.position.y=.30;group.add(top);
   mesh(bed,fabric,top).rotation.x=-Math.PI/2;
   mesh(trim,cream,top,0,.005).rotation.x=Math.PI/2;
  }
  return {kind,x,y,z,group,hinge,top,age:1,fromAngle:0,compression:0,velocity:0,launches:0};
 }
 return {create,dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();},stats:()=>({geometries:geometries.size,materials:materials.size,textures:textures.size,texturePixels:2*256*256})};
}

export function triggerLauncher(pad){
 pad.fromAngle=pad.hinge?.rotation.x||0;pad.age=0;pad.compression=-.14;pad.velocity=0;pad.launches++;
}
export function animateLauncher(pad,dt,reduced=false){
 dt=clamp(Number.isFinite(dt)?dt:0,0,.05);pad.age=Math.min(1,pad.age+dt);
 if(pad.hinge){
  const angle=reduced?-.24:-1.22;
  pad.hinge.rotation.x=pad.age<.16?pad.fromAngle+(angle-pad.fromAngle)*ease(pad.age/.16):pad.age<.5?angle:angle*(1-ease((pad.age-.5)/.2));
 }else if(pad.top){
  // Existing game clock, no extra timer. Spring: mass 1, stiffness 100, damping 10.
  pad.velocity+=(-100*pad.compression-10*pad.velocity)*dt;pad.compression+=pad.velocity*dt;
  if(Math.abs(pad.compression)<.0001&&Math.abs(pad.velocity)<.0001)pad.compression=pad.velocity=0;
  pad.top.position.y=.30+clamp(pad.compression,-.14,.07)*(reduced?.15:1);
 }
}

export function validLauncherSpot(w,x,z,kind){
 const y=w.ground(x,z);if(!Number.isFinite(y))return false;
 const radius=kind==='hatch'?1.22:1.65;
 for(const [dx,dz]of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[radius*.71,radius*.71],[-radius*.71,-radius*.71],[radius*.71,-radius*.71],[-radius*.71,radius*.71]]){
  const px=x+dx,pz=z+dz,g=w.ground(px,pz),hit=w.sample?.(px,pz),name=hit?.object?.name||'';
  if(!Number.isFinite(g)||Math.abs(g-y)>.15||w.water?.(px,pz)||w.treeBlocked?.(px,g+.55,pz))return false;
  if(hit&&Math.abs(g-hit.point.y)>.3)return false;
  if(kind==='trampoline'?!/CIM|GRASS/i.test(name):!/YOL|PATIKA|PAVE|ROAD|WALK|PLAZA|KALDIRIM/i.test(name))return false;
 }
 return true;
}
// Surveyed road-end pockets, not spawn-relative traffic lanes or park crossings.
// If the map changes, omit an unsafe hatch; never search back toward the middle.
export const HATCH_SITES=Object.freeze([
 Object.freeze({kind:'hatch',x:245,z:130,endX:254,endZ:130}),
 Object.freeze({kind:'hatch',x:158,z:-234,endX:158,endZ:-239})
]);
export function launcherPlacements(w,s){
 const candidates=[...HATCH_SITES,
  // Surveyed open park lawns, away from the sculpture plinth and fountain.
  {kind:'trampoline',x:133,z:103},{kind:'trampoline',x:169,z:61}
 ];
 const out=[],offsets=[[0,0],[3,0],[-3,0],[0,3],[0,-3],[6,0],[-6,0],[0,6],[0,-6],[6,6],[-6,-6],[9,0],[-9,0],[0,9],[0,-9],[12,0],[-12,0],[0,12],[0,-12]];
 for(const c of candidates){
  if(c.kind==='hatch'&&/YOL|ROAD|PATIKA|PAVE|WALK|PLAZA|KALDIRIM/i.test(w.sample?.(c.endX,c.endZ)?.object?.name||''))continue;
  for(const [dx,dz]of c.kind==='hatch'?[[0,0]]:offsets){const x=c.x+dx,z=c.z+dz;if(out.some(p=>(p.x-x)**2+(p.z-z)**2<36)||!validLauncherSpot(w,x,z,c.kind))continue;out.push({...c,x,y:w.ground(x,z),z});break;}
 }
 return out;
}

export function createParkLaunchers({world,scene,state,settings,reducedMotion,remotes=()=>null,onLaunch=()=>{},blocked=()=>false}){
 let current=null,group=null,factory=null,pads=[],cooldown=0,totalLaunches=0;
 const remoteContacts=new Map();
 const dispose=()=>{group?.removeFromParent();factory?.dispose();group=factory=null;pads=[];remoteContacts.clear();cooldown=0;};
 function step(body,dt){
  const w=world(),s=scene();
  if(w!==current){dispose();current=w;}
  if(!w||!s)return;
  if(!group){factory=createLauncherFactory();group=new T.Group();group.name='PARTY_items';s.add(group);pads=launcherPlacements(w,s).map((p,i)=>{const pad=factory.create(p.kind,p.x,p.y,p.z,i);group.add(pad.group);return pad;});}
  dt=clamp(Number.isFinite(dt)?dt:0,0,.05);group.visible=!!settings.pads;if(!settings.pads)return;
  cooldown=Math.max(0,cooldown-dt);const reduce=reducedMotion();for(const pad of pads)animateLauncher(pad,dt,reduce);
  const p=body?.translation?.(),v=body?.linvel?.(),st=state();
  if(p&&v&&[p.x,p.y,p.z,v.x,v.y,v.z].every(Number.isFinite)&&st?.enabled&&!blocked()&&cooldown===0&&v.y<=.8){
   for(const pad of pads){const dy=p.y-pad.y;if((p.x-pad.x)**2+(p.z-pad.z)**2>=1.12**2||dy<.15||dy>1.22)continue;
    try{body.setLinvel({x:v.x,y:12.5,z:v.z},true);}catch{continue;}
    Object.assign(st,{grounded:false,hover:false,airT:0,jumpsLeft:1,stretch:1,fallPeak:0,verticalVelocity:12.5});
    triggerLauncher(pad);cooldown=.65;totalLaunches++;onLaunch(pad);break;
   }
  }
  // Only observe existing remote positions; no extra packets or remote physics writes.
  const peers=remotes();if(peers){for(const id of remoteContacts.keys())if(!peers.has(id))remoteContacts.delete(id);
   for(const [id,r]of peers){const q=r.targetP||r.p;if(!q)continue;const i=pads.findIndex(p=>(q[0]-p.x)**2+(q[2]-p.z)**2<1.12**2&&q[1]-p.y>.15&&q[1]-p.y<1.8);
    if(i>=0&&remoteContacts.get(id)!==i&&pads[i].age>=.5)triggerLauncher(pads[i]);remoteContacts.set(id,i);
   }
  }
 }
 return {step,dispose,count:()=>({pads:pads.length}),debug:()=>({launches:totalLaunches,resources:factory?.stats(),pads:pads.map(p=>({kind:p.kind,x:p.x,y:p.y,z:p.z,launches:p.launches,angle:p.hinge?.rotation.x,compression:p.compression}))})};
}
