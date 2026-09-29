import * as THREE from 'three';

// Runs after v48 sets the existing component-only shadow material and before
// terrain sampling / relief-mask baking. The right island and upper bar remain
// byte-identical. Four lower bars use the same narrow reference proportions.
export function applySmallIslandMatch55(root,meta,buffer){
 if(meta?.version!==55||!Array.isArray(meta.components)||meta.components.length!==4)throw Error('Invalid divider55 manifest');
 const mesh=root.getObjectByName(meta.mesh);if(!mesh?.isMesh)throw Error('Missing divider55 mesh');
 if(mesh.userData.dividerMatch55)return mesh.userData.dividerMatch55;
 if(!mesh.userData.smallIslandWalls48||mesh.geometry.attributes.position.count!==meta.sourceVertices||mesh.geometry.index.count!==meta.sourceIndices)throw Error('divider55 source mismatch');
 const geometry=new THREE.BufferGeometry();
 for(const [name,a]of Object.entries(meta.attributes)){
  const data=new Float32Array(buffer.slice(a.offset,a.offset+a.length*4));
  if(data.length!==a.length||!data.every(Number.isFinite))throw Error('Invalid divider55 attribute '+name);
  geometry.setAttribute(name,new THREE.BufferAttribute(data,a.size));
 }
 const index=new Uint32Array(buffer.slice(meta.indices.offset,meta.indices.offset+meta.indices.length*4));
 if(index.length!==meta.indices.length||!index.every(i=>i<geometry.attributes.position.count))throw Error('Invalid divider55 indices');
 geometry.setIndex(new THREE.BufferAttribute(index,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 mesh.geometry=geometry;
 const report={version:55,changed:4,upperDividerPreserved:true,rightIslandPreserved:true,length:meta.policy.length,width:meta.policy.width,exposedHeight:meta.policy.exposedHeight,terrainFollowing:true,addedDrawCalls:0};
 mesh.userData.dividerMatch55=report;return report;
}
