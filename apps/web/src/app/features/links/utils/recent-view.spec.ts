import { RECENT_VIEW } from '../models/recent-view.const';
import { parseRecentView } from './recent-view';

describe('parseRecentView', () => {
  it('reads forgotten and falls back to opened for anything else', () => {
    expect(parseRecentView('forgotten')).toBe(RECENT_VIEW.Forgotten);
    expect(parseRecentView('opened')).toBe(RECENT_VIEW.Opened);
    expect(parseRecentView(undefined)).toBe(RECENT_VIEW.Opened);
    expect(parseRecentView(['forgotten', 'x'])).toBe(RECENT_VIEW.Opened);
    expect(parseRecentView('nope')).toBe(RECENT_VIEW.Opened);
  });
});
