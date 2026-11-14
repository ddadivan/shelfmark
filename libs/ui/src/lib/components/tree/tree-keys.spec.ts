import { KEYBOARD_KEY } from '../../models/keyboard';
import { isEchoedMenuKey, isMenuKey, reorderStep } from './tree-keys';

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('tree keys', () => {
  it('knows the menu keys and which of them the browser echoes', () => {
    expect(isEchoedMenuKey(key({ key: KEYBOARD_KEY.ContextMenu }))).toBe(true);
    expect(isEchoedMenuKey(key({ key: KEYBOARD_KEY.F10, shiftKey: true }))).toBe(true);
    expect(isEchoedMenuKey(key({ key: KEYBOARD_KEY.F10 }))).toBe(false);
    expect(isEchoedMenuKey(key({ key: KEYBOARD_KEY.Enter, altKey: true }))).toBe(false);
    expect(isMenuKey(key({ key: KEYBOARD_KEY.Enter, altKey: true }))).toBe(true);
    expect(isMenuKey(key({ key: KEYBOARD_KEY.ContextMenu }))).toBe(true);
    expect(isMenuKey(key({ key: KEYBOARD_KEY.Enter }))).toBe(false);
  });

  it('reads Alt+Up and Alt+Down without other modifiers as a step', () => {
    expect(reorderStep(key({ key: KEYBOARD_KEY.ArrowUp, altKey: true }))).toBe(-1);
    expect(reorderStep(key({ key: KEYBOARD_KEY.ArrowDown, altKey: true }))).toBe(1);
    expect(reorderStep(key({ key: KEYBOARD_KEY.ArrowDown }))).toBe(0);
    expect(reorderStep(key({ key: KEYBOARD_KEY.ArrowLeft, altKey: true }))).toBe(0);
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey'] as const) {
      expect(reorderStep(key({ key: KEYBOARD_KEY.ArrowUp, altKey: true, [modifier]: true }))).toBe(
        0,
      );
    }
  });
});
