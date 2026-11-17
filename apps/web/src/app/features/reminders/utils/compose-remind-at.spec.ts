import { composeRemindAt } from './compose-remind-at';

describe('composeRemindAt', () => {
  it('builds the local moment of a day and a time', () => {
    expect(composeRemindAt('2026-11-14', '10:30')).toEqual(new Date(2026, 10, 14, 10, 30));
  });

  it('uses the fallback time when no time is given', () => {
    expect(composeRemindAt('2026-11-14', '')).toEqual(new Date(2026, 10, 14, 9, 0));
    expect(composeRemindAt('2026-11-14', ' ', '18:00')).toEqual(new Date(2026, 10, 14, 18, 0));
  });

  it('refuses what it cannot read', () => {
    expect(composeRemindAt('14.11.2026', '10:00')).toBeNull();
    expect(composeRemindAt('2026-11-14', '25:00')).toBeNull();
    expect(composeRemindAt('2026-11-14', '10:60')).toBeNull();
    expect(composeRemindAt('2026-11-14', 'noon')).toBeNull();
  });
});
