// Online vehicles are authoritative on the server. Local collision geometry
// may differ slightly from the server's floor mesh: it can constrain visual
// prediction, but must never strand the visible car at an old position.
export function reconcileVehicle(current, predicted, server, alpha, area, spec, sweep) {
  const finite = p => p && [p.x, p.y, p.z, p.yaw].every(Number.isFinite);
  if (!finite(server)) return finite(current) ? current : null;
  // A recovery is an explicit server teleport, even when the nearest curb is
  // only a metre away. Never blend across the water or replay the old pose.
  if ((current?.recoverySerial??0)!==(server.recoverySerial??0)) return server;
  if (!finite(current) || !finite(predicted)) return server;
  if (!area.check(server.x, server.z, server.yaw, spec).ok ||
      !area.check(current.x, current.z, current.yaw, spec).ok) return server;
  const blend = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  const yawDelta = Math.atan2(Math.sin(predicted.yaw - current.yaw), Math.cos(predicted.yaw - current.yaw));
  const target = {
    x: current.x + (predicted.x - current.x) * blend,
    z: current.z + (predicted.z - current.z) * blend,
    yaw: current.yaw + yawDelta * blend,
  };
  const result = sweep(current, target, area, spec);
  return finite(result) && !result.clipped ? result : server;
}
