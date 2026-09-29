// The local controller already advances at most 50 ms per rendered frame.
// Rapier's variable step must use the same bound: integrating a previous
// velocity for 500 ms after a GPU stall launches/overshoots the character.
// Drop that stalled time rather than running an unbounded catch-up loop.
// Server match clocks and fixed-step simulations are intentionally separate.
export const MAX_SIMULATION_STEP = .05;
export function boundedSimulationStep(seconds){
 return Number.isFinite(seconds)?Math.max(0,Math.min(MAX_SIMULATION_STEP,seconds)):0;
}
