import * as THREE from 'three';

// Repair only the five existing gray dividers on the small island. All original
// triangles, colors and materials remain; the other five island dividers do not move.
// Call after terrain shaping/root positioning and before rebuilding ground queries.
export function applySmallIslandDividers47({root, meshes, patch}) {
  if (!patch || patch.version !== 47) throw new Error('Missing v47 divider patch');
  root.updateMatrixWorld(true);
  const mesh = meshes.find(m => m.name === patch.mesh);
  if (!mesh) throw new Error('Reference divider mesh missing: '+patch.mesh);
  if (mesh.userData.smallIslandDividers47) return mesh.userData.smallIslandDividers47;
  const source=mesh.geometry.attributes.position;
  if (source.count !== patch.vertexCount) throw new Error('Divider geometry version mismatch');
  const geometry=mesh.geometry.clone(), position=geometry.attributes.position, normal=geometry.attributes.normal;
  const toLocal=mesh.matrixWorld.clone().invert(), p=new THREE.Vector3();
  const normalsToLocal=new THREE.Matrix3().getNormalMatrix(toLocal);
  for (const component of patch.components) {
    for (let i=0; i<component.vertices.length; i++) {
      const id=component.vertices[i];
      p.fromArray(component.worldPositions,i*3).applyMatrix4(toLocal);
      position.setXYZ(id,p.x,p.y,p.z);
      if (normal && component.worldNormals) {
        p.fromArray(component.worldNormals,i*3).applyMatrix3(normalsToLocal).normalize();
        normal.setXYZ(id,p.x,p.y,p.z);
      }
    }
  }
  position.needsUpdate=true;
  if(normal) normal.needsUpdate=true;
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  mesh.geometry=geometry;
  const report={version:47, count:patch.components.length,
    changedComponentIds:patch.components.map(c=>c.id),
    vertices:patch.components.reduce((n,c)=>n+c.vertices.length,0),
    originalMaterialsPreserved:true, originalFacesPreserved:true};
  mesh.userData.smallIslandDividers47=report;
  return report;
}
