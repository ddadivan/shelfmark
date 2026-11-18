/** Waits `ms` or until `signal` aborts (the mock Ask stream's clock; specs pass an instant one). */
export type MockAskDelay = (ms: number, signal: AbortSignal) => Promise<void>;
