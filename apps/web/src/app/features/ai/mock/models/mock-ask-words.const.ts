/**
 * How the mock Ask chat reads a question, like the API mock's `MOCK_ASK_WORDS` (lower case, whole
 * words or phrases): counting, finding, follow-ups and the deep hand-over.
 */
export const MOCK_ASK_WORDS = {
  Count: ['how many', 'count', 'number of'],
  Find: ['find', 'show', 'list', 'which'],
  More: ['more', 'what else', 'anything else', 'others'],
  First: ['the first one', 'first one', 'the first'],
  Deep: ['compare', 'in depth', 'explain', 'think harder', 'summarise', 'summarize'],
} as const;
