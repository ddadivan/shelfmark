import { isPlainLeftClick } from './is-plain-left-click';

describe('isPlainLeftClick', () => {
  it('is true for the primary button without modifiers', () => {
    expect(isPlainLeftClick(new MouseEvent('click', { button: 0 }))).toBe(true);
  });

  it('is false for other buttons and every modifier', () => {
    expect(isPlainLeftClick(new MouseEvent('click', { button: 1 }))).toBe(false);
    expect(isPlainLeftClick(new MouseEvent('click', { button: 2 }))).toBe(false);
    for (const init of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
    ]) {
      expect(isPlainLeftClick(new MouseEvent('click', { button: 0, ...init }))).toBe(false);
    }
  });
});
