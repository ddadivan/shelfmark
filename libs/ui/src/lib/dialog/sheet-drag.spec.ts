import { shouldCloseSheet } from './sheet-drag';

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
