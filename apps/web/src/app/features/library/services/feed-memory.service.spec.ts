import { TestBed } from '@angular/core/testing';
import { LIBRARY_SORT, LIBRARY_VIEW } from '@shelfmark/contracts';
import { FeedMemoryService } from './feed-memory.service';
import { FEED_MEMORY_LIMIT } from '../models/feed-memory-limit.const';
import { FEED_MEMORY_STORAGE_KEY } from '../models/feed-memory-storage-key.const';

function create(): FeedMemoryService {
  TestBed.resetTestingModule();
  return TestBed.inject(FeedMemoryService);
}

describe('FeedMemoryService', () => {
  beforeEach(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(FEED_MEMORY_STORAGE_KEY));

  it('knows nothing until a feed is switched', () => {
    const memory = create();
    expect(memory.view('all')).toBeUndefined();
    expect(memory.sort('folder:f1')).toBeUndefined();
  });

  it('remembers view and sort per feed and keeps them over a reload', () => {
    const memory = create();
    memory.remember('folder:f1', { view: LIBRARY_VIEW.List });
    memory.remember('folder:f1', { sort: LIBRARY_SORT.Title });
    memory.remember('all', { sort: LIBRARY_SORT.Oldest });

    const restored = create();
    expect(restored.view('folder:f1')).toBe(LIBRARY_VIEW.List);
    expect(restored.sort('folder:f1')).toBe(LIBRARY_SORT.Title);
    expect(restored.sort('all')).toBe(LIBRARY_SORT.Oldest);
    expect(restored.view('all')).toBeUndefined();
    expect(restored.view('folder:f2')).toBeUndefined();
  });

  it('drops broken entries and survives corrupt storage', () => {
    localStorage.setItem(
      FEED_MEMORY_STORAGE_KEY,
      JSON.stringify({ a: { view: 'grid', sort: 'title' }, b: 'list', c: { view: 'list' } }),
    );
    const memory = create();
    expect(memory.view('a')).toBeUndefined();
    expect(memory.sort('a')).toBe(LIBRARY_SORT.Title);
    expect(memory.view('b')).toBeUndefined();
    expect(memory.view('c')).toBe(LIBRARY_VIEW.List);

    localStorage.setItem(FEED_MEMORY_STORAGE_KEY, '{nope');
    expect(create().view('c')).toBeUndefined();
    localStorage.setItem(FEED_MEMORY_STORAGE_KEY, '[1]');
    expect(create().view('c')).toBeUndefined();
  });

  it(`keeps at most ${FEED_MEMORY_LIMIT} feeds, dropping the least recently changed`, () => {
    const memory = create();
    for (let index = 0; index <= FEED_MEMORY_LIMIT; index++) {
      memory.remember(`folder:${index}`, { view: LIBRARY_VIEW.List });
    }
    expect(memory.view('folder:0')).toBeUndefined();
    expect(memory.view('folder:1')).toBe(LIBRARY_VIEW.List);
    expect(memory.view(`folder:${FEED_MEMORY_LIMIT}`)).toBe(LIBRARY_VIEW.List);
    // Changing a feed again moves it to the end.
    memory.remember('folder:1', { sort: LIBRARY_SORT.Oldest });
    memory.remember('folder:new', { view: LIBRARY_VIEW.Cards });
    expect(memory.view('folder:1')).toBe(LIBRARY_VIEW.List);
    expect(memory.view('folder:2')).toBeUndefined();
  });

  it('keeps the choice for the session when storage is blocked', () => {
    const memory = create();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    memory.remember('all', { view: LIBRARY_VIEW.List });
    expect(memory.view('all')).toBe(LIBRARY_VIEW.List);
    spy.mockRestore();
  });

  describe('grid size and card fields', () => {
    it('remembers the grid step and the fields per feed over a reload', () => {
      const memory = create();
      memory.remember('all', { grid: 2, fields: { note: false, date: true } });
      memory.remember('all', { view: LIBRARY_VIEW.Masonry });

      const restored = create();
      expect(restored.grid('all')).toBe(2);
      expect(restored.fields('all')).toEqual({ note: false, date: true });
      expect(restored.view('all')).toBe(LIBRARY_VIEW.Masonry);
      expect(restored.grid('folder:f1')).toBeUndefined();
      expect(restored.fields('folder:f1')).toBeUndefined();
    });

    it.each([0, 7, 2.5, '3', null, -1])('drops the invalid grid step %s', (grid) => {
      localStorage.setItem(FEED_MEMORY_STORAGE_KEY, JSON.stringify({ a: { grid } }));
      expect(create().grid('a')).toBeUndefined();
    });

    it.each([1, 6])('keeps the grid step %s at the edge of the range', (grid) => {
      localStorage.setItem(FEED_MEMORY_STORAGE_KEY, JSON.stringify({ a: { grid } }));
      expect(create().grid('a')).toBe(grid);
    });

    it('keeps only known field names with boolean values', () => {
      localStorage.setItem(
        FEED_MEMORY_STORAGE_KEY,
        JSON.stringify({
          a: { fields: { note: false, tags: 'no', folder: 1, bogus: true, date: true } },
        }),
      );
      expect(create().fields('a')).toEqual({ note: false, date: true });
    });

    it.each([[[true]], ['note'], [{ bogus: true }], [{}], [null]])(
      'drops the fields value %j when none of it is usable',
      (fields) => {
        localStorage.setItem(FEED_MEMORY_STORAGE_KEY, JSON.stringify({ a: { fields } }));
        expect(create().fields('a')).toBeUndefined();
      },
    );

    it('drops a whole entry when nothing in it is valid', () => {
      localStorage.setItem(
        FEED_MEMORY_STORAGE_KEY,
        JSON.stringify({ a: { grid: 99, fields: { bogus: true }, view: 'grid' }, b: null }),
      );
      const memory = create();
      expect(memory.grid('a')).toBeUndefined();
      expect(memory.fields('a')).toBeUndefined();
      expect(memory.view('b')).toBeUndefined();
    });
  });
});
