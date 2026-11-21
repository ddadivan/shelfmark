import { describe, expect, it } from 'vitest';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { clampResizeValue, dragResizeValue, keyResizeValue } from './resize-handle-value';

const LTR = { min: 280, max: 640, rtl: false };
const RTL = { ...LTR, rtl: true };

describe('clampResizeValue', () => {
  it('keeps a value inside the range and rounds to whole px', () => {
    expect(clampResizeValue(400.4, 280, 640)).toBe(400);
    expect(clampResizeValue(100, 280, 640)).toBe(280);
    expect(clampResizeValue(900, 280, 640)).toBe(640);
  });

  it('treats a max under min as min', () => {
    expect(clampResizeValue(500, 300, 200)).toBe(300);
  });
});

describe('dragResizeValue', () => {
  it('adds the pointer travel in ltr and subtracts it in rtl', () => {
    expect(dragResizeValue(400, 100, 150, LTR)).toBe(450);
    expect(dragResizeValue(400, 100, 50, LTR)).toBe(350);
    expect(dragResizeValue(400, 100, 150, RTL)).toBe(350);
  });

  it('clamps to the limits', () => {
    expect(dragResizeValue(400, 100, 1000, LTR)).toBe(640);
    expect(dragResizeValue(400, 100, -1000, LTR)).toBe(280);
  });
});

describe('keyResizeValue', () => {
  it('moves 16px with the arrows and 64px with Shift', () => {
    expect(keyResizeValue(KEYBOARD_KEY.ArrowRight, 400, false, LTR)).toBe(416);
    expect(keyResizeValue(KEYBOARD_KEY.ArrowLeft, 400, false, LTR)).toBe(384);
    expect(keyResizeValue(KEYBOARD_KEY.ArrowRight, 400, true, LTR)).toBe(464);
    expect(keyResizeValue(KEYBOARD_KEY.ArrowLeft, 400, true, LTR)).toBe(336);
  });

  it('flips the arrows in rtl', () => {
    expect(keyResizeValue(KEYBOARD_KEY.ArrowRight, 400, false, RTL)).toBe(384);
    expect(keyResizeValue(KEYBOARD_KEY.ArrowLeft, 400, false, RTL)).toBe(416);
  });

  it('stops at the limits', () => {
    expect(keyResizeValue(KEYBOARD_KEY.ArrowRight, 640, false, LTR)).toBe(640);
    expect(keyResizeValue(KEYBOARD_KEY.ArrowLeft, 285, true, LTR)).toBe(280);
  });

  it('jumps to the limits with Home and End', () => {
    expect(keyResizeValue(KEYBOARD_KEY.Home, 400, false, LTR)).toBe(280);
    expect(keyResizeValue(KEYBOARD_KEY.End, 400, false, LTR)).toBe(640);
  });

  it('ignores other keys', () => {
    expect(keyResizeValue(KEYBOARD_KEY.Tab, 400, false, LTR)).toBeNull();
    expect(keyResizeValue('a', 400, false, LTR)).toBeNull();
  });
});
