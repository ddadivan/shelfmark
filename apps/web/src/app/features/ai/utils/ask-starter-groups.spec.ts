import { askStarterGroups } from './ask-starter-groups';

describe('askStarterGroups', () => {
  it('builds the four cards with folder questions from the largest folders', () => {
    const groups = askStarterGroups([
      { name: 'Learning', linkCount: 6 },
      { name: 'Tools', linkCount: 4 },
      { name: 'Empty', linkCount: 0 },
    ]);
    expect(groups.map((group) => group.titleKey)).toEqual([
      'ai.ask.caps.find',
      'ai.ask.caps.count',
      'ai.ask.caps.summarise',
      'ai.ask.caps.plan',
    ]);
    expect(groups[0].questions[0]).toEqual({
      key: 'ai.ask.examples.findFolder',
      folder: 'Learning',
    });
    expect(groups[2].questions[1]).toEqual({ key: 'ai.ask.examples.ideasFolder', folder: 'Tools' });
    // Only two folders: the third question takes the largest again.
    expect(groups[3].questions[1]).toEqual({
      key: 'ai.ask.examples.firstFolder',
      folder: 'Learning',
    });
  });

  it('falls back to folder-free questions without folders', () => {
    const groups = askStarterGroups([]);
    const keys = groups.flatMap((group) => group.questions);
    expect(keys.every((question) => question.folder === null)).toBe(true);
    expect(groups[0].questions[0].key).toBe('ai.ask.examples.find');
    expect(groups[3].questions[1].key).toBe('ai.ask.examples.first');
  });
});
