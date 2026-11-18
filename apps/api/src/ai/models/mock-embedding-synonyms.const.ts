/**
 * Stems the mock embedding provider treats as one meaning, tuned to the demo seed: each entry maps a
 * stem to the stem it stands for, so "jacket" lands near "coat".
 */
export const MOCK_EMBEDDING_SYNONYMS: Readonly<Record<string, string>> = {
  jacket: 'coat',
  parka: 'coat',
  raincoat: 'coat',
  reactiv: 'signal',
  noodl: 'ramen',
  udon: 'ramen',
  fast: 'perform',
  speed: 'perform',
  slow: 'perform',
  recip: 'cook',
  kitchen: 'cook',
  travel: 'trip',
  journey: 'trip',
  vacation: 'trip',
};
