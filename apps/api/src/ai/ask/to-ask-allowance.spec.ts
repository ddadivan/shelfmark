import { AI_QUOTA, ASK_PERIOD } from '@shelfmark/contracts';
import { askDayResetsOn, toAskAllowance } from './to-ask-allowance';

const NOW = new Date('2026-11-17T23:59:59.000Z');

describe('toAskAllowance', () => {
  it('shows the day for the AI pack while the month has more room', () => {
    expect(toAskAllowance(AI_QUOTA['ai-pack'], 3, 40, NOW)).toEqual({
      questionsLeft: 47,
      period: ASK_PERIOD.Day,
      resetsOn: '2026-11-18',
    });
  });

  it('shows the month once it binds, and on a tie', () => {
    expect(toAskAllowance(AI_QUOTA['ai-pack'], 0, 495, NOW)).toEqual({
      questionsLeft: 5,
      period: ASK_PERIOD.Month,
      resetsOn: '2026-12-01',
    });
    expect(toAskAllowance(AI_QUOTA.free, 0, 0, NOW)).toEqual({
      questionsLeft: 5,
      period: ASK_PERIOD.Month,
      resetsOn: '2026-12-01',
    });
  });

  it('never goes below zero', () => {
    expect(toAskAllowance(AI_QUOTA.free, 9, 9, NOW).questionsLeft).toBe(0);
  });

  it('resets the day at the next UTC midnight across a month and a year', () => {
    expect(askDayResetsOn(new Date('2026-11-30T12:00:00.000Z'))).toBe('2026-12-01');
    expect(askDayResetsOn(new Date('2026-12-31T00:00:00.000Z'))).toBe('2027-01-01');
  });
});
