/**
 * Tags of the Ask chat messages (`buildAskMessages`, ADR 0055 point 6); the system prompts refer to
 * them and the mock reads them. Free text inside them has `<` escaped.
 */
export const ASK_CHAT_BLOCK = {
  Today: 'today',
  Question: 'question',
  ShownLinks: 'shown_links',
  Link: 'link',
  Gathered: 'gathered',
} as const;
