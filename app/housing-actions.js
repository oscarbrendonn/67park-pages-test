// Shared, finite interaction anchors. Leave points are beside furniture, never
// inside its collision volume or between the sofa and the coffee table.
export const HOME_SPOTS = Object.freeze([
 Object.freeze({id:'sofa-left',label:'Sit on sofa',pose:'sit',x:-5.25,z:-1.72,surface:.77,stand:[-6.15,-1.05]}),
 Object.freeze({id:'sofa-right',label:'Sit on sofa',pose:'sit',x:-3.75,z:-1.72,surface:.77,stand:[-2.3,-1.65]}),
 // Keep the original bed id for clients reconnecting after the two-place update.
 // Each side exits at the foot, clear of the wider mattress and the side cabinet.
 Object.freeze({id:'bed',label:'Lie on bed · Left',pose:'lie',x:3.8,z:-3.1,surface:.83,stand:[3.8,-1.15]}),
 Object.freeze({id:'bed-right',label:'Lie on bed · Right',pose:'lie',x:5.3,z:-3.1,surface:.83,stand:[5.3,-1.15]}),
]);
export const homeSpot=id=>HOME_SPOTS.find(s=>s.id===id);
export const spotPosition=(h,s,standing=false)=>[h.room.x+(standing?s.stand[0]:s.x),h.room.y+.555,h.room.z+(standing?s.stand[1]:s.z)];
export const nearHomeSpot=(h,s,p)=>!!h&&!!s&&Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.hypot(p[0]-h.room.x-s.x,p[2]-h.room.z-s.z)<2.5&&Math.abs(p[1]-h.room.y-.555)<1.4;
