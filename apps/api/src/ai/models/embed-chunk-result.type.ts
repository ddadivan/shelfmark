import type { EMBED_CHUNK_RESULT } from './embed-chunk-result.const';

/** One of `EMBED_CHUNK_RESULT`. */
export type EmbedChunkResult = (typeof EMBED_CHUNK_RESULT)[keyof typeof EMBED_CHUNK_RESULT];
