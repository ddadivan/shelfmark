import { AI_LIMIT } from '@shelfmark/contracts';
import { mockAiOutcome } from './mock-ai-outcome';
import type { MockAiLibrary } from './models/mock-ai-library.interface';

const LIBRARY: MockAiLibrary = {
  folders: [
    { id: 'f-recipes', name: 'Recipes' },
    { id: 'f-work', name: 'Work' },
  ],
  tags: ['angular', 'video', 'docs', 'reading', 'cacio e pepe'],
  links: [
    { url: 'https://github.com/a/b', folderId: 'f-work' },
    { url: 'https://github.com/c/d', folderId: 'f-work' },
    { url: 'https://github.com/e/f', folderId: null },
  ],
};

describe('mockAiOutcome', () => {
  it('suggests own tags and a folder named in the title or URL, nothing else', () => {
    const outcome = mockAiOutcome(
      'https://angular.dev/docs/recipes',
      'Angular video about docs and reading',
      LIBRARY,
    );
    expect(outcome.tags).toEqual(['angular', 'docs', 'reading']);
    expect(outcome.tags.length).toBeLessThanOrEqual(AI_LIMIT.SuggestedTagsMax);
    expect(outcome.folderId).toBe('f-recipes');
  });

  it('needs every word of a multi-word tag', () => {
    expect(mockAiOutcome('https://x.example/cacio', 'Cacio', LIBRARY).tags).toEqual([]);
    expect(mockAiOutcome('https://x.example/', 'Cacio e pepe', LIBRARY).tags).toEqual([
      'cacio e pepe',
    ]);
  });

  it('falls back to the folder most links of the same host are in', () => {
    expect(mockAiOutcome('https://github.com/new/repo', 'A repo', LIBRARY).folderId).toBe('f-work');
    expect(mockAiOutcome('https://other.example/', 'Nothing', LIBRARY).folderId).toBeNull();
  });

  it('proposes the site name as the one new tag unless it is a tag already', () => {
    expect(mockAiOutcome('https://www.github.com/x', 'X', LIBRARY).newTag).toBe('github');
    expect(mockAiOutcome('https://angular.dev/x', 'X', LIBRARY).newTag).toBeNull();
    expect(mockAiOutcome('https://ab.example/x', 'X', LIBRARY).newTag).toBeNull();
  });

  it('writes a plain summary within the limit', () => {
    const outcome = mockAiOutcome('https://a.example/', 'T'.repeat(400), LIBRARY);
    expect(outcome.summary.length).toBe(AI_LIMIT.SummaryMax);
    expect(mockAiOutcome('https://a.example/', 'Title', LIBRARY).summary).toContain('a.example');
  });
});
