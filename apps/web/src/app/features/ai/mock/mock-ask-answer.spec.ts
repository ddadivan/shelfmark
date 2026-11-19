import { mockAskAnswer } from './mock-ask-answer';
import type { MockAskSource } from './models/mock-ask-source.interface';

const SOURDOUGH: MockAskSource = {
  n: 2,
  title: 'Sourdough starter',
  host: 'b',
  tags: [],
  summary: 'bread',
};
const RAMEN: MockAskSource[] = [
  {
    n: 1,
    title: 'Quick shoyu ramen for weeknights',
    host: 'a',
    tags: ['cooking'],
    summary: 'noodles',
  },
  { n: 2, title: 'Sourdough starter', host: 'b', tags: [], summary: 'bread' },
  { n: 3, title: 'Rich tonkotsu ramen broth', host: 'c', tags: [], summary: null },
];

describe('mockAskAnswer', () => {
  it('answers a theme from the matching sources with their numbers', () => {
    expect(mockAskAnswer('Which ramen recipes did I save?', RAMEN)).toBe(
      'You saved a few ramen recipes. Quick shoyu ramen for weeknights is the quickest one for a weeknight. [1] ' +
        'For a slow, rich broth, Rich tonkotsu ramen broth goes step by step. [3]',
    );
  });

  it('answers without citations for sourdough and with a template otherwise', () => {
    expect(mockAskAnswer('sourdough?', RAMEN)).not.toMatch(/\[\d\]/u);
    expect(mockAskAnswer('anything else', [{ ...SOURDOUGH, title: '' }])).toBe(
      'You saved 1 link about this. b looks closest [2].',
    );
    expect(mockAskAnswer('ramen please', [SOURDOUGH])).toContain('You saved 1 link');
  });
});
