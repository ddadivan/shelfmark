import type { EMBEDDING_INPUT_TYPE } from './embedding-input-type.const';

/** One of `EMBEDDING_INPUT_TYPE`. */
export type EmbeddingInputType = (typeof EMBEDDING_INPUT_TYPE)[keyof typeof EMBEDDING_INPUT_TYPE];
