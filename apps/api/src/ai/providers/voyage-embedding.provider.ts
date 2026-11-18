import { EMBEDDING_INPUT_TYPE } from '../models/embedding-input-type.const';
import { EMBEDDING_LIMIT } from '../models/embedding-limit.const';
import { VOYAGE_LIMIT } from '../models/voyage-limit.const';
import type { AiConfig } from '../models/ai-config.interface';
import type { EmbedOutcome } from '../models/embed-outcome.type';
import type { EmbeddingFetch } from '../models/embedding-fetch.type';
import type { EmbeddingInputType } from '../models/embedding-input-type.type';
import type { EmbeddingProvider } from '../models/embedding-provider.interface';

const RETRYABLE: EmbedOutcome = { ok: false, retryable: true };
const FINAL: EmbedOutcome = { ok: false, retryable: false };
const TOO_LARGE = Symbol('too-large');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads the body up to `max` bytes; `TOO_LARGE` past it, `null` when the stream fails. */
async function readCapped(
  response: Response,
  max: number,
): Promise<string | null | typeof TOO_LARGE> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) {
    await response.body?.cancel().catch(() => undefined);
    return TOO_LARGE;
  }
  if (response.body === null) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => undefined);
        return TOO_LARGE;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** One finite vector of the expected length, or `null`. */
function toVector(value: unknown, dimensions: number): number[] | null {
  if (!Array.isArray(value) || value.length !== dimensions) return null;
  const vector: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item)) return null;
    vector.push(item);
  }
  return vector;
}

/**
 * Narrows Voyage's answer (`{ data: [{ embedding, index }], usage: { total_tokens } }`): exactly one
 * vector per input, each index once, `dimensions` finite numbers each; anything else is `null`.
 */
export function parseVoyageResponse(
  body: unknown,
  count: number,
  dimensions: number,
): { vectors: number[][]; tokens: number } | null {
  if (!isRecord(body) || !Array.isArray(body['data']) || body['data'].length !== count) return null;
  const vectors = new Array<number[] | undefined>(count).fill(undefined);
  for (const item of body['data']) {
    if (!isRecord(item)) return null;
    const index = item['index'];
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= count) {
      return null;
    }
    if (vectors[index] !== undefined) return null;
    const vector = toVector(item['embedding'], dimensions);
    if (vector === null) return null;
    vectors[index] = vector;
  }
  const usage = body['usage'];
  const total = isRecord(usage) ? usage['total_tokens'] : undefined;
  const tokens = typeof total === 'number' && Number.isFinite(total) && total >= 0 ? total : 0;
  return { vectors: vectors.filter((vector): vector is number[] => vector !== undefined), tokens };
}

/**
 * Voyage AI embeddings over plain HTTPS (ADR 0051 point 1; the fixed-host exception of
 * `apps/api/CLAUDE.md`): a POST to the pinned `VOYAGE_LIMIT.Url`, redirects refused, a timeout per
 * input type, the answer size-capped and narrowed. Never throws; never logs or returns the texts,
 * the vectors or the key (failures carry no response data). This is the only file in `src` that may
 * call `fetch` besides the Sentry tunnel (ESLint `no-restricted-globals`).
 */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'voyage';
  readonly model = VOYAGE_LIMIT.Model;
  readonly dimensions = EMBEDDING_LIMIT.Dimensions;
  readonly minSimilarity = VOYAGE_LIMIT.MinSimilarity;

  constructor(
    private readonly apiKey: string,
    // Resolved per call, so the test guard on `globalThis.fetch` always applies.
    private readonly fetchFn: EmbeddingFetch = (url, init) => fetch(url, init),
  ) {}

  async embed(texts: readonly string[], inputType: EmbeddingInputType): Promise<EmbedOutcome> {
    if (texts.length === 0) return { ok: true, vectors: [], tokens: 0 };
    if (texts.length > EMBEDDING_LIMIT.BatchMax) return FINAL;
    const timeoutMs =
      inputType === EMBEDDING_INPUT_TYPE.Query
        ? VOYAGE_LIMIT.QueryTimeoutMs
        : VOYAGE_LIMIT.DocumentTimeoutMs;
    let response: Response;
    try {
      response = await this.fetchFn(VOYAGE_LIMIT.Url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          input: texts,
          model: VOYAGE_LIMIT.Model,
          input_type: inputType,
          output_dimension: EMBEDDING_LIMIT.Dimensions,
          output_dtype: 'float',
          truncation: true,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      // Network failure, timeout or a refused redirect: nothing of the error is kept.
      return RETRYABLE;
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      const status = response.status;
      return status === 408 || status === 429 || status >= 500 ? RETRYABLE : FINAL;
    }
    const text = await readCapped(response, VOYAGE_LIMIT.MaxResponseBytes);
    if (text === TOO_LARGE) return FINAL;
    if (text === null) return RETRYABLE;
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return FINAL;
    }
    const parsed = parseVoyageResponse(body, texts.length, this.dimensions);
    return parsed === null ? FINAL : { ok: true, ...parsed };
  }
}

/** Builds the Voyage provider from the boot configuration; only when `useRealEmbeddings` is true. */
export function createVoyageEmbeddingProvider(config: AiConfig): EmbeddingProvider {
  if (config.voyageApiKey === null) {
    throw new Error('Invalid configuration: VOYAGE_API_KEY is required for the real embeddings');
  }
  return new VoyageEmbeddingProvider(config.voyageApiKey);
}
