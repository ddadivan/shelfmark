import { LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { feedSortQuery, parseFeedSort } from './feed-sort';
import { FEED_SORT } from '../models/feed-sort.const';

describe('parseFeedSort', () => {
  it('reads the known values', () => {
    expect(parseFeedSort('oldest')).toBe(FEED_SORT.Oldest);
    expect(parseFeedSort('title')).toBe(FEED_SORT.Title);
    expect(parseFeedSort('newest')).toBe(FEED_SORT.Newest);
  });

  it('falls back to newest for anything else', () => {
    expect(parseFeedSort(undefined)).toBe(FEED_SORT.Newest);
    expect(parseFeedSort('')).toBe(FEED_SORT.Newest);
    expect(parseFeedSort('random')).toBe(FEED_SORT.Newest);
    expect(parseFeedSort(['oldest', 'title'])).toBe(FEED_SORT.Newest);
  });
});

describe('feedSortQuery', () => {
  it('maps each sort to the API sort and order', () => {
    expect(feedSortQuery(FEED_SORT.Newest)).toEqual({
      sort: LINK_SORT_FIELD.CreatedAt,
      order: SORT_ORDER.Desc,
    });
    expect(feedSortQuery(FEED_SORT.Oldest)).toEqual({
      sort: LINK_SORT_FIELD.CreatedAt,
      order: SORT_ORDER.Asc,
    });
    expect(feedSortQuery(FEED_SORT.Title)).toEqual({
      sort: LINK_SORT_FIELD.Title,
      order: SORT_ORDER.Asc,
    });
  });
});
