// One shared policy for the lobby controls and authoritative room validation.
// Small private rooms remain available; other games retain their original sizes.
export const TUMBLE_DEFAULT_CAPACITY = 25;
export const TUMBLE_ROOM_CAPACITIES = Object.freeze([2, 3, 4, 10, 20, 25]);
const STANDARD_ROOM_CAPACITIES = Object.freeze([2, 3, 4]);

export function roomCapacities(mode) {
  return mode === 'tumble' ? TUMBLE_ROOM_CAPACITIES : STANDARD_ROOM_CAPACITIES;
}

export function validRoomCapacity(mode, capacity) {
  return roomCapacities(mode).includes(capacity);
}

// This only chooses a requested setting. The server must still reject any
// switch whose capacity cannot hold the current party; nobody is removed.
export function capacityOnModeChange(mode, previousCapacity) {
  if (mode === 'tumble') return TUMBLE_DEFAULT_CAPACITY;
  return STANDARD_ROOM_CAPACITIES.includes(previousCapacity) ? previousCapacity : 4;
}
