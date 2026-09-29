import * as T from 'three';

// Linear RGB averages from the approved tree-near COLOR_0 attribute in
// small-island-props-v45.glb. No additional runtime asset request.
export const approvedPalmPalette = {
  leaf: [.3209219508968378, .39179203087563275, .189828376469589],
  trunk: [.37623177532638824, .2541315964290074, .17142727396317892],
};

export function stylePoolPalms(source) {
  if (source.userData.poolPalmStyle) return source.userData.poolPalmStyle;
  const rings = source.children.filter(m => m.name === 'subtle palm trunk ring');
  if (!source.userData.poolPalmGeometry || rings.length !== 28) throw Error('Palm style requires repaired authored palms');
  const clones = new Map();
  for (const mesh of source.children) {
    const leaf = ['plump rounded palm frond', 'palm crown'].includes(mesh.name);
    const trunk = mesh.name === 'soft gently curved palm trunk';
    const soil = mesh.name === 'visible planter soil';
    if (!leaf && !trunk && !soil) continue;
    if (!clones.has(mesh.material)) {
      const material = mesh.material.clone();
      material.color.setRGB(...approvedPalmPalette[leaf ? 'leaf' : 'trunk']);
      material.roughness = leaf ? .26 : soil ? .94 : .72;
      material.envMapIntensity = leaf ? .40 : material.envMapIntensity;
      material.specularIntensity = 1;
      material.metalness = 0;
      clones.set(mesh.material, material);
    }
    mesh.material = clones.get(mesh.material);
  }
  for (const ring of rings) { ring.removeFromParent(); ring.geometry.dispose(); }
  return source.userData.poolPalmStyle = {removedRings: 28, grayPlantersPreserved: true, addedTextures: 0};
}

const assert = (value, message) => {if (!value) throw Error('Pool palm repair: ' + message);};
const sameXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) < .06;

function curveAtHeight(path, y) {
  let low = 0, high = 1;
  for (let i = 0; i < 44; i++) {
    const t = (low + high) / 2;
    if (path.getPoint(t).y < y) low = t; else high = t;
  }
  const t = (low + high) / 2;
  return {t, point: path.getPoint(t), tangent: path.getTangent(t).normalize()};
}

/** Before the pool's existing material/function merge. Keep the authored
 * planter sides, bottom, lip, soil, curved trunk and all foliage unchanged.
 * Only the hidden coplanar planter cap and misplaced trunk-ring transforms
 * are repaired. No new material, texture, light or draw call is introduced.
 */
export function repairPoolPalmGeometry(source) {
  if (source.userData.poolPalmGeometry) return source.userData.poolPalmGeometry;
  const named = name => source.children.filter(m => m.isMesh && m.name === name);
  const pots = named('rounded palm planter'), soils = named('visible planter soil');
  const trunks = named('soft gently curved palm trunk'), rings = named('subtle palm trunk ring');
  assert(pots.length === 4 && soils.length === 4 && trunks.length === 4 && rings.length === 28, 'expected four authored palms and 28 rings');
  const prepared = [], usedRings = new Set();
  let removedTriangles = 0, maxOldRingOffset = 0;
  for (const pot of pots) {
    const soil = soils.find(m => sameXZ(m.position, pot.position));
    const trunk = trunks.find(m => m.geometry.parameters?.path && sameXZ(m.geometry.parameters.path.getPoint(0), pot.position));
    const path = trunk?.geometry.parameters.path;
    assert(soil && path && trunk.position.lengthSq() === 0, 'missing matching soil/trunk');
    const ownRings = rings.filter(m => sameXZ(m.position, pot.position));
    assert(ownRings.length === 7, 'ring ownership changed');
    for (let i = 1; i <= 32; i++) assert(path.getPoint(i / 32).y > path.getPoint((i - 1) / 32).y, 'trunk must rise monotonically');
    const geometry = pot.geometry, p = geometry.attributes.position, n = geometry.attributes.normal, ix = geometry.index;
    assert(ix && n && geometry.parameters?.radialSegments === 32, 'planter geometry changed');
    geometry.computeBoundingBox(); soil.geometry.computeBoundingBox();
    const top = geometry.boundingBox.max.y, soilTop = soil.geometry.boundingBox.max.y + soil.position.y;
    assert(Math.abs(top + pot.position.y - soilTop) < 1e-5, 'soil/cap source heights changed');
    const keep = []; let removed = 0;
    for (let i = 0; i < ix.count; i += 3) {
      const ids = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
      const topCap = ids.every(id => Math.abs(p.getY(id) - top) < 1e-6 && n.getY(id) > .999);
      if (topCap) removed++; else keep.push(...ids);
    }
    assert(removed === 32, 'must remove only the hidden 32-triangle top cap');
    const transforms = ownRings.map(ring => {
      assert(!usedRings.has(ring), 'ring matched twice'); usedRings.add(ring);
      const params = ring.geometry.parameters;
      assert(params?.arc === Math.PI * 2 && params.radius === .278 && params.tube === .035, 'authored full torus changed');
      const pose = curveAtHeight(path, ring.position.y);
      assert(Math.abs(pose.point.y - ring.position.y) < 1e-7, 'ring outside trunk height');
      maxOldRingOffset = Math.max(maxOldRingOffset, pose.point.distanceTo(ring.position));
      return {ring, point: pose.point, rotation: new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), pose.tangent)};
    });
    prepared.push({pot, geometry, keep, transforms}); removedTriangles += removed;
  }
  // Validate every palm before changing any source geometry or transforms.
  for (const {pot, geometry, keep, transforms} of prepared) {
    const next = geometry.clone(); next.setIndex(keep); next.clearGroups();
    next.computeBoundingBox(); next.computeBoundingSphere(); pot.geometry = next;
    geometry.dispose(); // Fresh constructor geometry, not a cached GLTF asset.
    for (const {ring, point, rotation} of transforms) {ring.position.copy(point); ring.quaternion.copy(rotation);}
  }
  source.updateMatrixWorld(true);
  const stats = {version: 1, palms: 4, continuousRings: 28, removedHiddenCapTriangles: removedTriangles,
    maxOldRingOffset, soilPreserved: true, foliagePreserved: true, addedDraws: 0, addedTextures: 0};
  source.userData.poolPalmGeometry = stats;
  return stats;
}
