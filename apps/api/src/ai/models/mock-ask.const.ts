/**
 * The mock Ask model (ADR 0052 point 9, ADR 0055 point 10): one chunk per word every `ChunkMs`;
 * question triggers for tests and e2e: `ai-fail` (error before any text), `ai-refuse` (refusal),
 * `ai-slow` (no output until `SlowMs`, past the first-output deadline), `ai-cut` (fails after
 * `CutAfterChunks` chunks), `sourdough` (searches find nothing, so "not in your links"), `ai-loop`
 * (tools until the round limit, then the forced answer), `ai-bad-args` (an invalid call, corrected
 * after the error result), `ai-deep-late` (escalation after text, refused) and `ai-inject` (echoes
 * instruction-like titles).
 */
export const MOCK_ASK = {
  ChunkMs: 30,
  FailMarker: 'ai-fail',
  RefuseMarker: 'ai-refuse',
  SlowMarker: 'ai-slow',
  CutMarker: 'ai-cut',
  NotFoundMarker: 'sourdough',
  LoopMarker: 'ai-loop',
  BadArgsMarker: 'ai-bad-args',
  DeepLateMarker: 'ai-deep-late',
  InjectMarker: 'ai-inject',
  SlowMs: 30_000,
  CutAfterChunks: 2,
  TitleMax: 120,
  TemplateSourcesMax: 3,
  CardsMax: 6,
  ToolCallId: 'mock-call-',
} as const;
