import { ASK_LIMIT } from '@shelfmark/contracts';

/**
 * The mock Ask stream like the API's (ADR 0051 point 9, plan 10.1): retrieval answers after
 * `MetaMs`, then one word every `ChunkMs`. Question triggers next to `MOCK_AI_URL_MARKER`
 * (`ai-fail`, `ai-refuse`, `ai-quota`): `ai-slow` misses the first-text deadline, `ai-cut` fails
 * after `CutAfterChunks` words, `sourdough` answers without citations ("not in your links").
 */
export const MOCK_ASK = {
  MetaMs: 300,
  ChunkMs: 30,
  FirstTokenMs: ASK_LIMIT.FirstTokenMs,
  CutAfterChunks: 2,
  TemplateSourcesMax: 3,
  SlowMarker: 'ai-slow',
  CutMarker: 'ai-cut',
  NotFoundMarker: 'sourdough',
} as const;
