import { clampDrawerWidth, drawerKeyWidth, drawerMaxWidth } from './drawer-resize';

describe('drawer resize helpers', () => {
  it('caps the maximum at 70% of the window, never under the minimum', () => {
    expect(drawerMaxWidth(440, 880, 1600)).toBe(880);
    expect(drawerMaxWidth(440, 880, 1000)).toBe(700);
    expect(drawerMaxWidth(440, 880, 500)).toBe(440);
  });

  it('clamps and rounds a width', () => {
    expect(clampDrawerWidth(300, 440, 880)).toBe(440);
    expect(clampDrawerWidth(1000.4, 440, 880)).toBe(880);
    expect(clampDrawerWidth(612.6, 440, 880)).toBe(613);
  });

  it('moves the handle with the arrows in 40px steps and jumps with Home and End', () => {
    const end = { min: 440, max: 880, growsTowardsLeft: true };
    expect(drawerKeyWidth('ArrowLeft', 440, end)).toBe(480);
    expect(drawerKeyWidth('ArrowRight', 480, end)).toBe(440);
    expect(drawerKeyWidth('ArrowRight', 440, end)).toBe(440);
    expect(drawerKeyWidth('ArrowLeft', 860, end)).toBe(880);
    expect(drawerKeyWidth('Home', 700, end)).toBe(440);
    expect(drawerKeyWidth('End', 500, end)).toBe(880);
    expect(drawerKeyWidth('ArrowRight', 440, { ...end, growsTowardsLeft: false })).toBe(480);
    expect(drawerKeyWidth('Enter', 500, end)).toBeNull();
  });
});
