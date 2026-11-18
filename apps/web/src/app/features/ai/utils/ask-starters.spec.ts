import { ASK_STARTER_GENERIC, askStarters } from './ask-starters';

describe('askStarters', () => {
  it('builds up to three starters from the largest folders', () => {
    expect(
      askStarters([
        { name: 'Empty', linkCount: 0 },
        { name: 'Recipes', linkCount: 9 },
        { name: 'Angular', linkCount: 12 },
        { name: 'Clothes', linkCount: 4 },
        { name: 'Books', linkCount: 4 },
      ]),
    ).toEqual([
      { key: 'ai.ask.starters.saved', folder: 'Angular' },
      { key: 'ai.ask.starters.ideas', folder: 'Recipes' },
      { key: 'ai.ask.starters.recent', folder: 'Books' },
    ]);
  });

  it('falls back to one generic starter without folders that hold links', () => {
    expect(askStarters([{ name: 'Empty', linkCount: 0 }])).toEqual([
      { key: ASK_STARTER_GENERIC, folder: null },
    ]);
  });
});
