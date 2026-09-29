const POOL_NAME = '9_GOLET_MINI';

function makePoolMaterial(source) {
  const material = source.clone();
  material.name = `${source.name || '67_GOLET_MINI_M'}__smallParkPoolV1`;
  material.color.set('#78c8ee');
  material.roughness = 0.6;
  material.metalness = 0;
  material.clearcoat = 0;
  material.envMapIntensity = 0.25;
  material.emissive.set('#000000');
  material.emissiveIntensity = 0;
  material.toneMapped = false;
  material.dithering = true;
  material.needsUpdate = true;
  return material;
}

export function applySmallParkPool(root) {
  if (!root?.traverse) return { applied: false, reason: 'world-not-ready' };
  let pool = null;
  root.traverse((node) => {
    if (!pool && node?.isMesh && node.name === POOL_NAME) pool = node;
  });
  if (!pool) return { applied: false, reason: 'pool-not-found' };
  if (pool.userData.smallParkPoolV1) return { applied: true, reused: true, levelLift: 0.105 };

  const source = Array.isArray(pool.material) ? pool.material[0] : pool.material;
  if (!source?.clone) return { applied: false, reason: 'pool-material-not-found' };
  pool.material = makePoolMaterial(source);
  // Keep a shallow lip visible: this is a compact park pool, not an overflowing lake.
  pool.position.y += 0.105;
  pool.visible = true;
  pool.renderOrder = 1;
  pool.userData.smallParkPoolV1 = true;
  pool.updateMatrixWorld(true);
  return { applied: true, levelLift: 0.105, material: pool.material.name };
}
