/** The `fetch` the Voyage provider calls (injected in specs; `globalThis.fetch` otherwise). */
export type EmbeddingFetch = (url: string, init: RequestInit) => Promise<Response>;
