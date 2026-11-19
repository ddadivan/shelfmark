/**
 * Ask your shelf limits (AI-4, ADR 0052 and 0055): question length (after trimming and collapsing
 * whitespace), the server-side answer cap, the chat history the web sends back, the tool loop
 * (rounds per model, calls per round, cards per `show_links`), the deadlines inside the 30 s
 * `maxDuration` (first output of each model call, each tool round, the reserve for a forced
 * answer, the latest escalation, the hard stop) and the starters shown.
 */
export const ASK_LIMIT = {
  QuestionMin: 3,
  QuestionMax: 500,
  AnswerMaxChars: 4000,
  StreamMaxMs: 24000,
  StartersMax: 3,
  HistoryTurnsMax: 10,
  LinksPerTurnMax: 20,
  LinkMarkerMax: 99,
  ToolRoundsMax: 4,
  ToolCallsPerRoundMax: 4,
  CardsMax: 12,
  RoundFirstOutputMs: 8000,
  ToolRoundMs: 4000,
  FinalAnswerReserveMs: 8000,
  EscalateBeforeMs: 10000,
} as const;
