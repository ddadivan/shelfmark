import { TestBed } from '@angular/core/testing';
import { selectRange } from '../features/links/selection/select-range';
import { LinkSelectionStore } from './link-selection.store';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

describe('selectRange', () => {
  it('spans from the anchor to the target in either direction', () => {
    expect(selectRange(ORDER, 'b', 'd')).toEqual(['b', 'c', 'd']);
    expect(selectRange(ORDER, 'd', 'b')).toEqual(['b', 'c', 'd']);
    expect(selectRange(ORDER, 'c', 'c')).toEqual(['c']);
  });

  it('is just the target without an anchor on screen, and nothing for an unknown target', () => {
    expect(selectRange(ORDER, null, 'c')).toEqual(['c']);
    expect(selectRange(ORDER, 'gone', 'c')).toEqual(['c']);
    expect(selectRange(ORDER, 'a', 'gone')).toEqual([]);
  });
});

describe('LinkSelectionStore', () => {
  const setup = () => TestBed.inject(LinkSelectionStore);

  it('toggles single links and sets the anchor', () => {
    const store = setup();
    expect(store.selecting()).toBe(false);
    store.toggle('b', ORDER);
    store.toggle('d', ORDER);
    expect(store.ids()).toEqual(['b', 'd']);
    expect(store.count()).toBe(2);
    expect(store.has('b')).toBe(true);
    store.toggle('b', ORDER);
    expect(store.ids()).toEqual(['d']);
    expect(store.anchor()).toBe('b');
  });

  it('selects a range from the anchor with Shift, adding only', () => {
    const store = setup();
    store.toggle('b', ORDER);
    store.toggle('e', ORDER, true);
    expect(store.ids()).toEqual(['b', 'c', 'd', 'e']);
    // The anchor stays: a second range starts from it again.
    store.toggle('a', ORDER, true);
    expect([...store.ids()].sort()).toEqual(ORDER);
    expect(store.anchor()).toBe('b');
  });

  it('treats a Shift toggle without an anchor as a plain toggle', () => {
    const store = setup();
    store.toggle('c', ORDER, true);
    expect(store.ids()).toEqual(['c']);
    expect(store.anchor()).toBe('c');
  });

  it('selects all, keeps what is on screen and clears', () => {
    const store = setup();
    store.toggle('a', ORDER);
    store.selectAll(ORDER);
    expect(store.ids()).toEqual(ORDER);
    store.keep(['a', 'c']);
    expect(store.ids()).toEqual(['a', 'c']);
    store.keep(['a', 'c']);
    expect(store.ids()).toEqual(['a', 'c']);
    store.clear();
    expect(store.selecting()).toBe(false);
    expect(store.anchor()).toBeNull();
  });
});
