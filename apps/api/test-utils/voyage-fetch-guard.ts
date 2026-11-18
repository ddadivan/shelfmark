/** The embeddings host that no spec may reach (ADR 0051). */
export const VOYAGE_TEST_GUARD_HOST = 'api.voyageai.com';

const attempts: string[] = [];
let installed = false;

function requestHost(input: string | URL | Request): string | null {
  try {
    return new URL(input instanceof Request ? input.url : input.toString()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Wraps `globalThis.fetch` (once per worker, from `vitest.setup.ts`) so that any request to the
 * Voyage host throws and is recorded; everything else goes to the fetch underneath. Specs that fake
 * `fetch` themselves (`stubOAuthProviders`, an injected fetch) replace this wrapper only for their
 * own calls.
 */
export function installVoyageFetchGuard(): void {
  if (installed) return;
  installed = true;
  const underlying = globalThis.fetch;
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (requestHost(input) === VOYAGE_TEST_GUARD_HOST) {
      attempts.push(expect.getState().currentTestName ?? 'unknown test');
      throw new Error('The Voyage embeddings API must never be called in tests');
    }
    return underlying(input, init);
  };
}

/** The tests that tried to reach Voyage since the last call (and forgets them). */
export function takeVoyageAttempts(): string[] {
  return attempts.splice(0);
}
