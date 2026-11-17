/** Why the mock refuses to start "Process existing links" (the API answers 409 for each). */
export type MockBackfillRefusal = 'unavailable' | 'off' | 'running';
