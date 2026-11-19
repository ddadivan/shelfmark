import { ASK_LIMIT } from '@shelfmark/contracts';

/**
 * The mock Ask chat like the API's (ADR 0055 point 10): `meta` after `MetaMs`, each tool's activity
 * for `ToolMs`, then one word every `ChunkMs`. Question triggers next to `MOCK_AI_URL_MARKER`
 * (`ai-fail`, `ai-refuse`, `ai-quota`): `ai-slow` keeps searching past the first-output deadline,
 * `ai-cut` fails after `CutAfterChunks` words, `ai-loop` searches every round before the forced
 * answer, `sourdough` finds nothing ("not in your links").
 */
export const MOCK_ASK = {
  MetaMs: 300,
  ToolMs: 400,
  ChunkMs: 30,
  RoundFirstOutputMs: ASK_LIMIT.RoundFirstOutputMs,
  CutAfterChunks: 2,
  TemplateSourcesMax: 3,
  CardsMax: 6,
  SearchMax: 40,
  SlowMarker: 'ai-slow',
  CutMarker: 'ai-cut',
  LoopMarker: 'ai-loop',
  NotFoundMarker: 'sourdough',
} as const;
