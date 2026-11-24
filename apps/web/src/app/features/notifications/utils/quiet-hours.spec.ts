import { quietHourValues } from './quiet-hours';

describe('quietHourValues', () => {
  it('lists the 24 whole hours', () => {
    const values = quietHourValues();
    expect(values).toHaveLength(24);
    expect(values[0]).toBe('00:00');
    expect(values[8]).toBe('08:00');
    expect(values[23]).toBe('23:00');
  });
});
