import { viewIdeas } from './view-ideas';

const source = (id: string, name: string, linkCount: number) => ({ id, name, linkCount });

describe('viewIdeas', () => {
  it('takes the biggest tags and folders, at most three', () => {
    const ideas = viewIdeas(
      [source('t1', 'docs', 5), source('t2', 'video', 9)],
      [source('f1', 'Reading', 39), source('f2', 'Work', 2)],
    );
    expect(ideas.map((idea) => idea.name)).toEqual(['Reading', 'video', 'docs']);
  });

  it('leaves out empty ones and a name that is both a tag and a folder', () => {
    const ideas = viewIdeas(
      [source('t1', 'Angular', 4), source('t2', 'unused', 0)],
      [source('f1', 'angular', 3)],
    );
    expect(ideas).toEqual([{ id: 't1', name: 'Angular' }]);
  });

  it('is empty for a new library', () => {
    expect(viewIdeas([], [])).toEqual([]);
  });
});
