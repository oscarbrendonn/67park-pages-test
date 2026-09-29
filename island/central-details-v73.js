import * as THREE from 'three';

export function applyCentralDetails73(root){
 root.updateMatrixWorld(true);
 const grass=root.getObjectByName('3_MERKEZ_CIMEN'),edge=root.getObjectByName('7_MERKEZ_KALDIRIM_TABANI');
 if(!grass||!edge)throw Error('Central lawns missing');
 const inverse=root.matrixWorld.clone().invert(),meshes=[];
 const green=grass.material.clone(),rim=new THREE.MeshStandardMaterial({color:0xd6ccc6,roughness:.48});
 const pathMat=new THREE.MeshStandardMaterial({color:0xc4afa4,roughness:.7,emissive:0xc4afa4,emissiveIntensity:.12});
 function put(geo,mat,name,cast=false){
  if(!geo.index)geo.setIndex(Array.from({length:geo.attributes.position.count},(_,i)=>i));
  geo.applyMatrix4(inverse);geo.computeBoundingBox();geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,mat);m.name=name;m.castShadow=cast;m.receiveShadow=true;m.userData.safeShadowCaster=cast;root.add(m);meshes.push(m);return m;
 }
 function rounded(w,d,r){const s=new THREE.Shape(),x=-w/2,z=-d/2;
  s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
 }
 function pad(x,z,w,d,depth,y,mat,name,r=2){const g=new THREE.ExtrudeGeometry(rounded(w,d,r),{depth,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:3,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(x,y,z);return put(g,mat,name);}
 // Preserve the original side lawns and small buildings; only the four
 // added buildings move to the ends of the upper/lower rows.
 const lawns=[
  [4.426,-58.410,13.31,32.428],[94.318,-58.410,13.31,32.428],
  [4.426,-6.245,13.31,32.428],[94.318,-6.245,13.31,32.428],
  ...[-68.433,3.778].flatMap(z=>
   [22.802,38,60.744,75.942].map(x=>[x,z,12.98,12.9]))
 ];
 lawns.forEach(([x,z,w,d],i)=>{
  pad(x,z,w+.35,d+.35,.08,9.32,rim,'CENTER73_LAWN_RIM_'+i);
  pad(x,z,w,d,.15,9.39,green,'CENTER73_LAWN_'+i);
 });
 // Four narrow reference connectors, one in each quadrant, avoiding lawns.
 for(const x of [14.2,84.54])for(const [a,b] of [[-74.65,-35.42],[-29.23,9.8]]){
  const g=new THREE.BoxGeometry(2.5,.035,b-a);g.translate(x,9.3175,(a+b)/2);put(g,pathMat,'CENTER73_PATH_'+x+'_'+a);
 }
 // Four softly rounded, toy-like green topiary forms from the reference.
 const foliage=new THREE.MeshPhysicalMaterial({color:0x96a47f,roughness:.34,clearcoat:.22,clearcoatRoughness:.35});
 for(const x of [19.617,79.127])for(const z of [-51.366,-13.288]){
  const base=new THREE.CylinderGeometry(3.45,3.45,.22,64);base.translate(x,9.43,z);put(base,rim,'CENTER73_PLANTER_'+x+'_'+z);
  const g=new THREE.SphereGeometry(3.12,48,24);g.scale(1,.76,1);g.translate(x,10.12,z);put(g,foliage,'CENTER73_TOPIARY_'+x+'_'+z,true);
 }
 // Clean typographic outlines (Arial Bold numerals), not hand-drawn digits.
 // Flat matte decal: no extrusion, glow, outline or cast shadow.
 const p=new THREE.ShapePath();
 p.moveTo(1039,1107);p.lineTo(767,1077);
 p.quadraticCurveTo(757,1161,715,1201);p.quadraticCurveTo(673,1241,606,1241);
 p.quadraticCurveTo(517,1241,455.5,1161);p.quadraticCurveTo(394,1081,378,828);
 p.quadraticCurveTo(483,952,639,952);p.quadraticCurveTo(815,952,940.5,818);
 p.quadraticCurveTo(1066,684,1066,472);p.quadraticCurveTo(1066,247,934,111);
 p.quadraticCurveTo(802,-25,595,-25);p.quadraticCurveTo(373,-25,230,147.5);
 p.quadraticCurveTo(87,320,87,713);p.quadraticCurveTo(87,1116,236,1294);
 p.quadraticCurveTo(385,1472,623,1472);p.quadraticCurveTo(790,1472,899.5,1378.5);
 p.quadraticCurveTo(1009,1285,1039,1107);p.currentPath.closePath();
 p.moveTo(402,494);p.quadraticCurveTo(402,357,465,282.5);
 p.quadraticCurveTo(528,208,609,208);p.quadraticCurveTo(687,208,739,269);
 p.quadraticCurveTo(791,330,791,469);p.quadraticCurveTo(791,612,735,678.5);
 p.quadraticCurveTo(679,745,595,745);p.quadraticCurveTo(514,745,458,681.5);
 p.quadraticCurveTo(402,618,402,494);p.currentPath.closePath();
 p.moveTo(1226,1185);p.lineTo(1226,1446);p.lineTo(2187,1446);p.lineTo(2187,1242);
 p.quadraticCurveTo(2068,1125,1945,906);p.quadraticCurveTo(1822,687,1757.5,440.5);
 p.quadraticCurveTo(1693,194,1694,0);p.lineTo(1423,0);
 p.quadraticCurveTo(1430,304,1548.5,620);p.quadraticCurveTo(1667,936,1865,1185);
 p.currentPath.closePath();
 const letters=new THREE.ShapeGeometry(p.toShapes(false),32);
 letters.translate(-1137,-723.5,0);letters.scale(.0042,.0042,.0042);
 letters.rotateX(-Math.PI/2);letters.translate(49.372,9.34,-11.9);
 const ink=new THREE.MeshStandardMaterial({color:0xeee9e1,roughness:.94,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 put(letters,ink,'CENTER73_67');
 grass.visible=false;edge.visible=false;root.updateMatrixWorld(true);
 return {meshes,hidden:[grass.name,edge.name],version:73};
}
