import { parseLinkOutput } from './parse-link-output';
import type { ParseLinkContext } from '../models/parse-link-context.interface';

const context: ParseLinkContext = {
  parts: ['tags', 'folder', 'summary'],
  tags: ['CSS', 'ux', 'to-read'],
  title: { wanted: false, page: null },
  folders: [
    { key: 'f1', path: 'Work' },
    { key: 'f2', path: 'Work / Design' },
  ],
};

const valid = {
  tags: ['css', 'UX'],
  newTags: ['grid layout'],
  moreTags: ['layout'],
  folder: 'f2',
  summary: '  A guide   to grid. ',
  kind: 'article',
};

describe('parseLinkOutput', () => {
  it('accepts a good answer and canonicalises it', () => {
    expect(parseLinkOutput(valid, context)).toEqual({
      tags: ['CSS', 'ux'],
      newTags: ['grid-layout'],
      moreTags: ['layout'],
      folder: 'f2',
      summary: 'A guide to grid.',
      title: null,
      kind: 'article',
    });
  });

  it.each([null, undefined, 'text', 42, [], [valid], true])('rejects %j as a whole', (raw) => {
    expect(parseLinkOutput(raw, context)).toBeNull();
  });

  it.each([
    ['tags', 'css'],
    ['tags', { a: 1 }],
    ['newTags', 5],
    ['newTags', 'x'],
    ['folder', ['f1']],
    ['summary', { text: 'x' }],
    ['kind', 7],
  ])('rejects a wrong type for %s', (field, value) => {
    expect(parseLinkOutput({ ...valid, [field]: value }, context)).toBeNull();
  });

  it("keeps only the user's own tags, once, at most three", () => {
    const wide = { ...context, tags: ['a1', 'b2', 'c3', 'd4'] };
    const out = parseLinkOutput(
      { ...valid, tags: ['admin', 'A1', 'a1', 7, 'b2', 'c3', 'd4'], newTags: [] },
      wide,
    );
    expect(out?.tags).toEqual(['a1', 'b2', 'c3']);
  });

  it('matches an own tag after the tag whitespace rule', () => {
    const out = parseLinkOutput({ ...valid, tags: ['TO READ'] }, context);
    expect(out?.tags).toEqual(['to-read']);
  });

  it('drops a new tag that exists, is empty, too long, or has markup or separators', () => {
    for (const newTag of [
      'css',
      'CSS',
      '',
      '   ',
      'x'.repeat(51),
      '<b>',
      'a,b',
      'a&b',
      'a"b',
      '-lead',
      '\u0000',
      5,
      null,
    ]) {
      expect(parseLinkOutput({ ...valid, newTags: [newTag] }, context)?.newTags).toEqual([]);
    }
    expect(parseLinkOutput({ ...valid, newTags: ['c++'] }, context)?.newTags).toEqual(['c++']);
    expect(parseLinkOutput({ ...valid, newTags: ['Design Systems'] }, context)?.newTags).toEqual([
      'design-systems',
    ]);
    expect(parseLinkOutput({ ...valid, newTags: undefined }, context)?.newTags).toEqual([]);
    expect(parseLinkOutput({ ...valid, newTags: null }, context)?.newTags).toEqual([]);
  });

  it('keeps up to two valid new tags, skipping bad ones and repeats', () => {
    const out = parseLinkOutput(
      {
        ...valid,
        newTags: ['Stand-up', 'css', 'stand-up', '<b>', ' COMEDY ', 'airports', 'extra'],
      },
      context,
    );
    expect(out?.newTags).toEqual(['stand-up', 'comedy']);
    expect(parseLinkOutput({ ...valid, newTags: [] }, context)?.newTags).toEqual([]);
    // No new tag for a job that did not ask for tags.
    expect(parseLinkOutput(valid, { ...context, parts: ['summary'] })?.newTags).toEqual([]);
  });

  it('keeps up to three more tags, apart from the best ones, existing tags and repeats', () => {
    const out = parseLinkOutput(
      {
        ...valid,
        newTags: ['alpha', 'beta', 'gamma'],
        moreTags: ['Beta', 'delta', 'css', 'epsilon', 'delta', 'zeta', 'eta', '<b>'],
      },
      context,
    );
    expect(out?.newTags).toEqual(['alpha', 'beta']);
    expect(out?.moreTags).toEqual(['delta', 'epsilon', 'zeta']);
    expect(parseLinkOutput({ ...valid, moreTags: 'x' }, context)).toBeNull();
    expect(parseLinkOutput({ ...valid, moreTags: undefined }, context)?.moreTags).toEqual([]);
    expect(parseLinkOutput(valid, { ...context, parts: ['summary'] })?.moreTags).toEqual([]);
  });

  it('writes a new tag in lower case and keeps existing tags as the user spelled them', () => {
    const out = parseLinkOutput(
      { ...valid, tags: ['css', 'Ux'], newTags: ['AI-courses'] },
      context,
    );
    expect(out?.newTags).toEqual(['ai-courses']);
    expect(out?.tags).toEqual(['CSS', 'ux']);
    expect(parseLinkOutput({ ...valid, newTags: ['  Course '] }, context)?.newTags).toEqual([
      'course',
    ]);
    expect(parseLinkOutput({ ...valid, newTags: ['ÉCOLE'] }, context)?.newTags).toEqual(['école']);
    // An existing tag in another case is still not a new tag.
    expect(parseLinkOutput({ ...valid, newTags: ['To-Read'] }, context)?.newTags).toEqual([]);
  });

  it('accepts a folder only by one of the offered keys', () => {
    expect(parseLinkOutput({ ...valid, folder: 'f1' }, context)?.folder).toBe('f1');
    for (const folder of ['f9', 'Work', '01990000-0000-7000-8000-000000000000', '', null]) {
      expect(parseLinkOutput({ ...valid, folder }, context)?.folder).toBeNull();
    }
  });

  it('turns the summary into plain text of at most 300 characters', () => {
    const out = parseLinkOutput(
      { ...valid, summary: 'Hi <img src=x onerror=alert(1)> there\u0000\nfriend' },
      context,
    );
    expect(out?.summary).toBe('Hi there friend');
    expect(parseLinkOutput({ ...valid, summary: ' \n ' }, context)?.summary).toBeNull();
    expect(parseLinkOutput({ ...valid, summary: null }, context)?.summary).toBeNull();

    const long = `${'word '.repeat(100)}end`;
    const cut = parseLinkOutput({ ...valid, summary: long }, context)?.summary ?? '';
    expect(cut.length).toBeLessThanOrEqual(300);
    expect(cut.endsWith('word')).toBe(true);
    const unbroken = parseLinkOutput({ ...valid, summary: 'x'.repeat(500) }, context)?.summary;
    expect(unbroken).toHaveLength(300);
  });

  it('keeps a kind only from the known set', () => {
    expect(parseLinkOutput({ ...valid, kind: 'video' }, context)?.kind).toBe('video');
    expect(parseLinkOutput({ ...valid, kind: 'weapon' }, context)?.kind).toBeNull();
    expect(parseLinkOutput({ ...valid, kind: null }, context)?.kind).toBeNull();
  });

  it('returns nothing for a part the job did not ask for', () => {
    const out = parseLinkOutput(valid, { ...context, parts: ['summary'] });
    expect(out).toMatchObject({
      tags: [],
      newTags: [],
      moreTags: [],
      folder: null,
      summary: 'A guide to grid.',
    });
    const tagsOnly = parseLinkOutput(valid, { ...context, parts: ['tags'] });
    expect(tagsOnly?.summary).toBeNull();
    expect(tagsOnly?.folder).toBeNull();
  });

  it('treats missing fields as empty', () => {
    expect(parseLinkOutput({}, context)).toEqual({
      tags: [],
      newTags: [],
      moreTags: [],
      folder: null,
      summary: null,
      title: null,
      kind: null,
    });
  });
});

describe('parseLinkOutput title (drafts)', () => {
  const draft: ParseLinkContext = {
    ...context,
    title: { wanted: true, page: 'Wool coat, straight cut, graphite | COS' },
  };
  const answer = (title: unknown) => ({
    tags: [],
    newTags: [],
    moreTags: [],
    folder: null,
    summary: null,
    title,
    kind: null,
  });

  it('keeps a cleaned-up title as plain text', () => {
    expect(parseLinkOutput(answer('  Wool coat,  straight cut, graphite '), draft)?.title).toBe(
      'Wool coat, straight cut, graphite',
    );
    expect(parseLinkOutput(answer('<b>Wool</b> coat'), draft)?.title).toBe('Wool coat');
  });

  it('drops a title that is empty or only the page title again', () => {
    expect(parseLinkOutput(answer('  '), draft)?.title).toBeNull();
    expect(
      parseLinkOutput(answer('wool coat, straight cut, graphite | cos'), draft)?.title,
    ).toBeNull();
    expect(parseLinkOutput(answer(null), draft)?.title).toBeNull();
  });

  it('caps the length and rejects a wrong type', () => {
    expect(parseLinkOutput(answer('x'.repeat(500)), draft)?.title?.length).toBe(300);
    expect(parseLinkOutput(answer(5), draft)).toBeNull();
  });

  it('gives no title when the job did not ask for one', () => {
    expect(parseLinkOutput(answer('A title'), context)?.title).toBeNull();
  });
});
