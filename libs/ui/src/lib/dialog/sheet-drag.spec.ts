import { sheetVelocity, shouldCloseSheet } from './sheet-drag';

describe('sheetVelocity', () => {
  it('averages the kept samples', () => {
    expect(
      sheetVelocity(
        [
          { y: 0, time: 0 },
          { y: 20, time: 20 },
          { y: 60, time: 40 },
        ],
        50,
      ),
    ).toBeCloseTo(1.5);
  });

  it('is 0 after a pause of 100 ms or more, or without a usable span', () => {
    const samples = [
      { y: 0, time: 0 },
      { y: 80, time: 20 },
    ];
    expect(sheetVelocity(samples, 120)).toBe(0);
    expect(sheetVelocity([{ y: 5, time: 10 }], 20)).toBe(0);
    expect(sheetVelocity([], 20)).toBe(0);
  });
});

describe('shouldCloseSheet', () => {
  it('closes past 30% of the height', () => {
    expect(shouldCloseSheet(150, 500, 0)).toBe(true);
    expect(shouldCloseSheet(149, 500, 0)).toBe(false);
  });

  it('closes on a fast downward flick whatever the distance', () => {
    expect(shouldCloseSheet(20, 500, 0.6)).toBe(true);
    expect(shouldCloseSheet(20, 500, 0.3)).toBe(false);
  });

  it('never closes without a downward offset', () => {
    expect(shouldCloseSheet(0, 500, 2)).toBe(false);
    expect(shouldCloseSheet(-10, 500, 2)).toBe(false);
  });

  it('survives a zero height', () => {
    expect(shouldCloseSheet(10, 0, 0)).toBe(false);
  });
});
