// Pure local-space Y-up query for the v57 sculpture plinth; no Three dependency.
// Preferred integration:
//   const plinthLocal57 = createPlinthSampler57(assets.get('sculpture-plinth-warm-blush').parts);
//   const localY = plinthLocal57(x - plinth.x, z - plinth.z);
//   const worldY = localY === null ? null : plinth.y + localY;
// Parts may be BufferGeometries or {geometry: BufferGeometry}. They must already
// have their glTF node transforms baked into local meters, as assetFrom does.

export const PLINTH_RADIUS57 = 13.48;
export const PLINTH_SEGMENTS57 = 192;
const R2 = PLINTH_RADIUS57 * PLINTH_RADIUS57;

function component(attribute, index, axis) {
  const getter = axis === 0 ? 'getX' : axis === 1 ? 'getY' : 'getZ';
  if (typeof attribute[getter] === 'function') return attribute[getter](index);
  return attribute.array[index * attribute.itemSize + axis];
}

// Builds a compact exact vertical-triangle sampler once. It never rewrites
// positions, normals, materials or the approved foliage geometry.
export function createPlinthSampler57(parts, {cellSize = .75} = {}) {
  if (!Array.isArray(parts) || !parts.length) throw Error('Plinth57 requires geometry parts');
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw Error('Plinth57 invalid cell size');
  const radius = PLINTH_RADIUS57, columns = Math.ceil(2 * radius / cellSize);
  const bins = Array.from({length: columns * columns}, () => []), triangles = [];
  const cell = value => Math.max(0, Math.min(columns - 1, Math.floor((value + radius) / cellSize)));
  for (const part of parts) {
    const geometry = part.geometry ?? part, position = geometry.attributes?.position;
    if (!position || position.itemSize !== 3) throw Error('Plinth57 missing XYZ positions');
    const index = geometry.index, count = index?.count ?? position.count;
    if (count % 3) throw Error('Plinth57 requires triangulated geometry');
    const id = i => index ? component(index, i, 0) : i;
    for (let i = 0; i < count; i += 3) {
      const a = id(i), b = id(i + 1), c = id(i + 2);
      const ax = component(position,a,0), ay = component(position,a,1), az = component(position,a,2);
      const bx = component(position,b,0), by = component(position,b,1), bz = component(position,b,2);
      const cx = component(position,c,0), cy = component(position,c,1), cz = component(position,c,2);
      if (![ax,ay,az,bx,by,bz,cx,cy,cz].every(Number.isFinite)) throw Error('Plinth57 nonfinite triangle');
      const ux=bx-ax, uz=bz-az, vx=cx-ax, vz=cz-az, det=ux*vz-uz*vx;
      // Y-up outward top faces have negative XZ determinant. Bottom faces and
      // zero-footprint vertical sides must not become walkable alternatives.
      if (det >= -1e-14) continue;
      const t = triangles.length;
      triangles.push([ax,az,ay,ux,uz,vx,vz,by-ay,cy-ay,1/det]);
      const x0=cell(Math.min(ax,bx,cx)), x1=cell(Math.max(ax,bx,cx));
      const z0=cell(Math.min(az,bz,cz)), z1=cell(Math.max(az,bz,cz));
      for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)bins[z*columns+x].push(t);
    }
  }
  if (!triangles.length) throw Error('Plinth57 has no upward-facing floor/rim triangles');
  const sample = (x,z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z) || x*x+z*z > R2) return null;
    let y=-Infinity;
    for(const index of bins[cell(z)*columns+cell(x)]) {
      const t=triangles[index], dx=x-t[0], dz=z-t[1];
      const u=(dx*t[6]-dz*t[5])*t[9];
      if(u < -1e-8 || u > 1.00000001) continue;
      const v=(t[3]*dz-t[4]*dx)*t[9];
      if(v < -1e-8 || u+v > 1.00000001) continue;
      y=Math.max(y,t[2]+u*t[7]+v*t[8]);
    }
    return y === -Infinity ? null : y;
  };
  Object.defineProperty(sample,'stats',{value:Object.freeze({triangles:triangles.length,cells:bins.length,cellSize}),enumerable:true});
  return sample;
}

// Reference-only analytical equivalent of the authored planar lathe faces.
// The angular correction maps a circular radius to the 192-gon's ring radius;
// using a circle alone can miss the narrow outer rim by over a millimeter.
// Actual-triangle createPlinthSampler57 remains the integration authority.
const PROFILE57 = Object.freeze([
  [13.08,.32],[13.095,.350],[13.112,.410],[13.145,.475],
  [13.19,.522],[13.245,.548],[13.30,.55],[13.37,.525],
  [13.43,.475],[13.47,.405],[13.48,.32],
]);
export function samplePlinthProfile57(x,z) {
  if(!Number.isFinite(x)||!Number.isFinite(z)||x*x+z*z>R2)return null;
  const radius=Math.hypot(x,z),step=2*Math.PI/PLINTH_SEGMENTS57;
  const angle=Math.atan2(z,x),sector=Math.floor(angle/step),mid=(sector+.5)*step;
  const effective=radius*Math.cos(angle-mid)/Math.cos(step/2);
  if(effective>PLINTH_RADIUS57)return null;
  if(effective<=PROFILE57[0][0])return .32;
  for(let i=1;i<PROFILE57.length;i++) {
    const a=PROFILE57[i-1],b=PROFILE57[i];
    if(effective<=b[0])return a[1]+(b[1]-a[1])*(effective-a[0])/(b[0]-a[0]);
  }
  return null;
}
