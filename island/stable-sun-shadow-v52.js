import * as THREE from 'three';

// A following orthographic shadow must move in whole LIGHT-space texels.
// Otherwise a stationary rounded curb crosses a different depth-texel phase
// every frame, making its thin contact shadow pulse while the player moves.
// No new light, render pass, texture, filter, bias or world geometry is added.
export function createStableSunShadow52(light, offset) {
  const camera = light?.shadow?.camera;
  if (!light?.isDirectionalLight || !camera?.isOrthographicCamera ||
      !offset?.isVector3 || ![offset.x, offset.y, offset.z].every(Number.isFinite) ||
      !Number.isFinite(offset.lengthSq()) || offset.lengthSq() < 1e-12 ||
      ![camera.up.x,camera.up.y,camera.up.z].every(Number.isFinite)) throw new Error('Stable shadow v52: invalid sun');
  const sunOffset = offset.clone();
  const back = offset.clone().normalize();
  const right = new THREE.Vector3().crossVectors(camera.up, back);
  if (right.lengthSq() < 1e-12) throw new Error('Stable shadow v52: parallel sun/up');
  right.normalize();
  const up = new THREE.Vector3().crossVectors(back, right).normalize();
  const result = new THREE.Vector3();
  const state = { version: 52, texelX: 0, texelY: 0, offsetX: 0, offsetY: 0 };
  return {
    state,
    update(target) {
      const mapSize = light.shadow.mapSize;
      const tx = (camera.right - camera.left) / (mapSize.x * camera.zoom);
      const ty = (camera.top - camera.bottom) / (mapSize.y * camera.zoom);
      if (![target.x,target.y,target.z,tx,ty,camera.zoom].every(Number.isFinite) || tx <= 0 || ty <= 0 || camera.zoom <= 0)
        throw new Error('Stable shadow v52: invalid target/frustum');
      const x = target.dot(right), y = target.dot(up);
      const dx = Math.round(x / tx) * tx - x;
      const dy = Math.round(y / ty) * ty - y;
      // Preserve depth along the sun axis; only sub-texel lateral phase changes.
      // Never round world X/Z or clamp target Y back to zero afterwards.
      result.copy(target).addScaledVector(right, dx).addScaledVector(up, dy);
      if (![result.x,result.y,result.z,dx,dy].every(Number.isFinite))
        throw new Error('Stable shadow v52: target overflow');
      light.target.position.copy(result);
      light.position.copy(result).add(sunOffset);
      light.target.updateMatrixWorld();
      light.updateMatrixWorld();
      state.texelX = tx; state.texelY = ty; state.offsetX = dx; state.offsetY = dy;
      return result;
    }
  };
}
