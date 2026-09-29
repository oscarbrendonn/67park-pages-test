import * as T from 'three';

// Only straight, single-piece ledges have one terminal plane per end.
// A curved bowl's overall bounding box must never lengthen its coping.
const supports = {
  '67D_SKATEPARK_DIAGONAL_LAUNCH_COPING': '67D_SKATEPARK_DIAGONAL_LAUNCH',
  '67D_SKATEPARK_CENTER_SPINE_COPING': '67D_SKATEPARK_CENTER_SPINE_A',
};

export function createCopingEndAlignment(scene) {
  const points = new Map();
  for (const [railName, supportName] of Object.entries(supports)) {
    const mesh = scene.getObjectByName(supportName);
    if (!mesh?.geometry?.attributes.position) continue;
    mesh.updateWorldMatrix(true, false);
    const p = mesh.geometry.attributes.position;
    points.set(railName, Array.from({length:p.count}, (_,i) =>
      new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld)));
  }
  return (cap, mesh) => {
    const vertices = points.get(mesh.name);
    if (!vertices || Math.abs(cap.normal.y) > .01) return 0;
    let end = -Infinity;
    for (const p of vertices) end = Math.max(end, p.dot(cap.normal));
    // Account for the rounded tip, not just the cylindrical shaft.
    const extension = end - cap.center.dot(cap.normal) - cap.radius;
    return extension > .001 && extension < .6 ? extension : 0;
  };
}
