import type { ParsedImport } from '../models/parsed-import.interface';
import { chunkBySize } from './chunk-by-size';
import { planImport, repeatIndexes, reviewCounts } from './plan-import';

const PARSED: ParsedImport = {
  folders: [
    { key: 'f1', parentKey: null, name: 'Bar' },
    { key: 'f2', parentKey: 'f1', name: 'Recipes' },
    { key: 'f3', parentKey: null, name: 'Other' },
  ],
  links: [
    {
      url: 'https://a.example/',
      title: 'A',
      folderKey: 'f1',
      tags: ['x'],
      addedAt: '2024-01-01T00:00:00.000Z',
    },
    { url: 'https://b.example/?utm_source=mail', folderKey: 'f2', tags: [], note: 'Note' },
    { url: 'https://A.example', title: 'A again', folderKey: 'f3', tags: [] },
    { url: 'https://c.example/', folderKey: null, tags: [] },
  ],
  notWeb: 2,
};

function keys(): () => string {
  let next = 0;
  return () => `key-${(next += 1)}`;
}

describe('repeatIndexes / reviewCounts', () => {
  it('finds repeats by normalised address and counts a saved repeat once', () => {
    expect([...repeatIndexes(PARSED.links)]).toEqual([2]);
    expect(reviewCounts(PARSED, new Set([3]))).toEqual({
      links: 4,
      folders: 3,
      saved: 1,
      repeats: 1,
    });
    expect(reviewCounts(PARSED, new Set([2]))).toEqual({
      links: 4,
      folders: 3,
      saved: 1,
      repeats: 0,
    });
  });
});

describe('planImport', () => {
  it('skips duplicates and keeps the folders that still hold links', () => {
    const plan = planImport(PARSED, new Set([3]), {
      skipDuplicates: true,
      keepStructure: true,
      newKey: keys(),
    });

    expect(plan.links).toEqual([
      {
        folderKey: 'f1',
        item: {
          url: 'https://a.example/',
          idempotencyKey: 'key-1',
          title: 'A',
          tags: ['x'],
          addedAt: '2024-01-01T00:00:00.000Z',
        },
      },
      {
        folderKey: 'f2',
        item: { url: 'https://b.example/', idempotencyKey: 'key-2', note: 'Note' },
      },
    ]);
    // "Other" only held the repeat.
    expect(plan.folders.map((folder) => folder.key)).toEqual(['f1', 'f2']);
    expect(plan.skipped).toBe(4);
  });

  it('keeps every link and flattens when asked', () => {
    const plan = planImport(PARSED, new Set([3]), {
      skipDuplicates: false,
      keepStructure: false,
      newKey: keys(),
    });

    expect(plan.links).toHaveLength(4);
    expect(plan.links.every((link) => link.folderKey === null)).toBe(true);
    expect(plan.folders).toEqual([]);
    expect(plan.skipped).toBe(2);
  });
});

describe('chunkBySize', () => {
  it('splits by count and by size', () => {
    expect(chunkBySize([1, 2, 3, 4, 5], 2, 1000)).toEqual([[1, 2], [3, 4], [5]]);
    const big = 'x'.repeat(40);
    expect(chunkBySize([big, big, big], 10, 100)).toHaveLength(2);
    expect(chunkBySize(['x'.repeat(500)], 10, 100)).toHaveLength(1);
    expect(chunkBySize([], 10, 100)).toEqual([]);
  });

  it('leaves out a link whose saved address the API would reject', () => {
    const parsed: ParsedImport = {
      folders: [],
      links: [
        { url: 'https://u:p@a.example/', folderKey: null, tags: [] },
        { url: 'https://b.example/', folderKey: null, tags: [] },
      ],
      notWeb: 0,
    };
    const plan = planImport(parsed, new Set(), {
      skipDuplicates: true,
      keepStructure: false,
      newKey: keys(),
    });

    expect(plan.links.map((link) => link.item.url)).toEqual(['https://b.example/']);
    expect(plan.skipped).toBe(1);
  });
});
