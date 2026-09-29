import * as THREE from 'three';

export function dryInteriorAt(x,z,data){
  const {size,bounds,pixels}=data.dryMask;
  const ix=Math.floor((x-bounds[0])/(bounds[2]-bounds[0])*size);
  const iz=Math.floor((z-bounds[1])/(bounds[3]-bounds[1])*size);
  return ix>=0&&iz>=0&&ix<size&&iz<size&&pixels[iz*size+ix]===1;
}

export function configureInteriorWater(uniforms,root,data){
  const {size,bounds,pixels}=data.dryMask;
  const rgba=new Uint8Array(size*size*4);
  for(let i=0;i<pixels.length;i++){rgba[i*4]=pixels[i]*255;rgba[i*4+3]=255;}
  const texture=new THREE.DataTexture(rgba,size,size);
  texture.minFilter=texture.magFilter=THREE.NearestFilter;
  texture.needsUpdate=true;
  const lo=root.localToWorld(new THREE.Vector3(bounds[0],0,bounds[1]));
  const hi=root.localToWorld(new THREE.Vector3(bounds[2],0,bounds[3]));
  uniforms.karaDoku.value=texture;
  uniforms.karaMin.value.set(lo.x,lo.z);
  uniforms.karaBoy.value.set(hi.x-lo.x,hi.z-lo.z);
}

// Approved coastline remains unchanged in X/Z. Only the vertical section changes:
// the shore lip meets the sea, then the sand rises monotonically toward dry land.
export function prepareCoast(root){
  root.traverse(mesh=>{
    if(!mesh.isMesh || !/^(67D_KIYI_KUM_OMUZ|67F_ANA_ADA_ALT_KOPRU_KUM_OMUZ)/.test(mesh.name))return;
    const p=mesh.geometry.attributes.position;
    mesh.geometry.computeBoundingBox();
    const deep=mesh.geometry.boundingBox.min.y<-.001;
    const profile=deep
      ? [[-.0109,-.0109],[-.0108,-.0108],[-.0055,-.0055],[0,0],[.0012,.00025],[.00215,.00060],[.00175,.00085],[.0008,.00105],[.0003,.00108],[.00002,.00108]]
      : [[-.00025,-.00025],[0,0],[.00052,.00035],[.00095,.0008],[.00042,.00108],[-.00012,.00108]];
    for(let i=0;i<p.count;i++){
      const y=p.getY(i), pair=profile.find(([from])=>Math.abs(from-y)<2e-7);
      if(pair)p.setY(i,pair[1]);
    }
    p.needsUpdate=true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
  });
}

export function addDryInterior(root,grounds,data){
  const sand=grounds.find(m=>/^4_ANA_KUMTABAN(?:$|[._-])/.test(m.name));
  const plaza=grounds.find(m=>/^5_PARSEL_ZEMIN(?:$|[._-])/.test(m.name));
  if(!sand||!plaza)throw Error('Coast grade requires the approved sand and plaza materials');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
  geometry.setIndex(data.indices);geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  // Share the exact live pastel material, including its existing shader hooks.
  const terrain=new THREE.Mesh(geometry,sand.material);
  terrain.name='4_KURU_IC_ZEMIN_KIYI_EGIMI';
  terrain.receiveShadow=true;terrain.castShadow=false;
  terrain.userData.safeShadowCaster=false;
  root.add(terrain);grounds.push(terrain);

  const outline=data.stadiumOutline.map(([x,z])=>new THREE.Vector2(x,-z));
  const triangles=THREE.ShapeUtils.triangulateShape(outline,[]);
  const fill=new THREE.BufferGeometry();
  fill.setAttribute('position',new THREE.Float32BufferAttribute(data.stadiumOutline.flatMap(([x,z])=>[x,.0134,z]),3));
  fill.setIndex(triangles.flat());fill.computeVertexNormals();
  // ShapeUtils uses XY winding; X,-Z conversion gives upward faces.
  if(fill.attributes.normal.getY(0)<0){fill.setIndex(triangles.flatMap(t=>[t[2],t[1],t[0]]));fill.computeVertexNormals();}
  fill.computeBoundingBox();fill.computeBoundingSphere();
  const platform=new THREE.Mesh(fill,plaza.material);
  platform.name='5_PARSEL_ZEMIN_ALT_YAPI_UZATMA';
  platform.receiveShadow=true;platform.castShadow=false;
  platform.userData.safeShadowCaster=false;
  root.add(platform);grounds.push(platform);
  return {interiorNativeY:data.nativeInteriorY,addedTriangles:data.triangleCount+triangles.length};
}
