// Shared by client and server. Existing v62 cottage doors, not new map buildings.
const placements = [
 ['H01','Rose Cottage',-153,54,-.52,1,4.035,9.398031234741211,'#e7b6bc'],
 ['H02','Garden Cottage',-147,73,-.57,.92,3.885,9.398031234741211,'#acd2bb'],
 ['H03','Lilac Cottage',-147,90,-Math.PI/2,.92,4.435,9.398031234741211,'#c9bedf'],
 ['H04','Peach Cottage',-147,110.5,-Math.PI/2,.92,4.035,9.398031234741211,'#f1c9ad'],
 ['H05','Mint Cottage',-108,110,Math.PI/2,.98,4.435,9.398031234741211,'#abd1c1'],
 ['H06','Cloud Cottage',-151,139,Math.PI,.95,4.435,9.398031234741211,'#bfd5e5'],
 ['H07','Sunny Cottage',-116,146,Math.PI,.94,4.035,9.398031234741211,'#efdb9e'],
 ['H08','Berry Cottage',-98,146,Math.PI,.94,4.435,9.398031234741211,'#dfb7ce'],
];
export const HOUSES = placements.map(([id,name,x,z,yaw,scale,front,y,color],i)=>Object.freeze({
 id,name,color,x,z,yaw,
 door:Object.freeze([x+Math.sin(yaw)*(front*scale+1.5),y+.555,z+Math.cos(yaw)*(front*scale+1.5)]),
 // Separate rooms by more than the existing 115 m avatar-render range, so
 // people in a different home never appear floating beyond a cutaway wall.
 room:Object.freeze({x:480+(i%4)*140,y:20,z:500+Math.floor(i/4)*140,halfX:7,halfZ:6}),
}));
export const houseById=id=>HOUSES.find(h=>h.id===id);
export const roomSpawn=(h,index=0)=>[h.room.x+[0,1.6,-1.6,3.2,-3.2][index%5],h.room.y+.555,h.room.z+3.1-Math.floor(index/5)*1.4];
export const inRoom=(h,x,z,margin=0)=>!!h&&Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x-h.room.x)<=h.room.halfX+margin&&Math.abs(z-h.room.z)<=h.room.halfZ+margin;
export const isHousingZone=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&x>455&&x<925&&z>475&&z<665;
export const nearDoor=(h,p)=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.hypot(p[0]-h.door[0],p[2]-h.door[2])<3&&Math.abs(p[1]-h.door[1])<2.5;
// Furniture is kept out of the central walking path. These volumes are also
// used by the controller so the visible furniture is never a fake obstacle.
export const FURNITURE = Object.freeze([
 {x:-4.5,z:-2.3,hx:1.7,hz:.65,height:1.2},
 {x:-4.5,z:-.25,hx:1.05,hz:.65,height:.6},
 {x:4.55,z:-3.55,hx:1.6,hz:1.7,height:.8},
 {x:3.9,z:4.75,hx:2.2,hz:.6,height:1.15},
]);
export function roomObstacle(h,x,y,z){
 const r=h.room,lx=x-r.x,lz=z-r.z;
 if(Math.abs(lx)>r.halfX-.5||Math.abs(lz)>r.halfZ-.5)return true;
 return FURNITURE.some(f=>Math.abs(lx-f.x)<f.hx+.3&&Math.abs(lz-f.z)<f.hz+.3&&y<r.y+f.height+.45);
}
