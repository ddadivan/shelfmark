import { mapLimit } from './map-limit';

describe('mapLimit', () => {
  it('keeps the order and never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const result = await mapLimit([5, 1, 4, 2, 3], 2, async (value) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, value));
      running -= 1;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it('answers an empty list for no items', async () => {
    expect(await mapLimit([], 8, () => Promise.resolve(1))).toEqual([]);
  });
});
