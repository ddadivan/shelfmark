import { LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import { feedSortOf, sortFieldsOf } from './view-sort';

describe('view sort', () => {
  it('maps the three feed sorts to the stored sort and back', () => {
    for (const sort of Object.values(FEED_SORT)) {
      expect(feedSortOf(sortFieldsOf(sort))).toBe(sort);
    }
  });

  it('stores title as A to Z and oldest as ascending creation', () => {
    expect(sortFieldsOf(FEED_SORT.Title)).toEqual({
      sort: LINK_SORT_FIELD.Title,
      order: SORT_ORDER.Asc,
    });
    expect(sortFieldsOf(FEED_SORT.Oldest)).toEqual({
      sort: LINK_SORT_FIELD.CreatedAt,
      order: SORT_ORDER.Asc,
    });
  });

  it('reads an unknown sort as newest first', () => {
    expect(sortFieldsOf('nonsense')).toEqual({
      sort: LINK_SORT_FIELD.CreatedAt,
      order: SORT_ORDER.Desc,
    });
  });
});
