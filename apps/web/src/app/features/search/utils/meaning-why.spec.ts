import { MEANING_REASON_SOURCE } from '@shelfmark/contracts';
import { meaningWhy } from './meaning-why';

describe('meaningWhy', () => {
  it('joins the reasons after "Close to"', () => {
    expect(
      meaningWhy([
        { source: MEANING_REASON_SOURCE.Tag, text: 'angular' },
        { source: MEANING_REASON_SOURCE.Summary, text: 'faster rendering' },
      ]),
    ).toEqual({ key: 'ai.search.why', reasons: 'angular, faster rendering' });
  });

  it('says "from the summary" when every reason is a summary clause', () => {
    expect(
      meaningWhy([
        { source: MEANING_REASON_SOURCE.Summary, text: 'rendering performance' },
        { source: MEANING_REASON_SOURCE.Summary, text: 'fewer re-renders' },
      ]),
    ).toEqual({
      key: 'ai.search.fromSummary',
      reasons: 'rendering performance, fewer re-renders',
    });
  });

  it('is nothing without a reason', () => {
    expect(meaningWhy([])).toBeNull();
    expect(meaningWhy([{ source: MEANING_REASON_SOURCE.Tag, text: '  ' }])).toBeNull();
  });
});
