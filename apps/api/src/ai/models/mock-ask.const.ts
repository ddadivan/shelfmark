/**
 * The mock Ask stream (ADR 0051 point 9): one chunk per word every `ChunkMs`; question triggers for
 * tests and e2e: `ai-fail` (error before any text), `ai-refuse` (refusal), `ai-slow` (no text until
 * `SlowMs`, past the first-text deadline), `ai-cut` (fails after `CutAfterChunks` chunks),
 * `sourdough` (an answer that cites nothing, so "not in your links").
 */
export const MOCK_ASK = {
  ChunkMs: 30,
  FailMarker: 'ai-fail',
  RefuseMarker: 'ai-refuse',
  SlowMarker: 'ai-slow',
  CutMarker: 'ai-cut',
  NotFoundMarker: 'sourdough',
  SlowMs: 30_000,
  CutAfterChunks: 2,
  TitleMax: 80,
  TemplateSourcesMax: 3,
} as const;
