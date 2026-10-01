// Large courts can take longer than one minute on a cold mobile connection.
// Keep boot and the server's all-players-ready barrier on the same bounded budget.
export const GAME_LOAD_TIMEOUT_MS=180000;
