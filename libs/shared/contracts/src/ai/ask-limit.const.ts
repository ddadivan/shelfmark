/**
 * Ask your shelf limits (AI-4, ADR 0052): question length (after trimming and collapsing
 * whitespace), links sent as context, the server-side answer cap, the deadlines for the first
 * model text and the hard stop (inside the 30 s `maxDuration`), and the starters shown.
 */
export const ASK_LIMIT = {
  QuestionMin: 3,
  QuestionMax: 500,
  ContextLinksMax: 10,
  AnswerMaxChars: 4000,
  FirstTokenMs: 8000,
  StreamMaxMs: 24000,
  StartersMax: 3,
} as const;
