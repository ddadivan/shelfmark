import { keyCap } from './key-cap';
import { SHORTCUT_GROUPS } from '../models/shortcut-groups.const';
import { SHORTCUT_KEY } from '../models/shortcut-key.const';

describe('keyCap', () => {
  it('draws the modifier glyphs as icons on Apple devices', () => {
    expect(keyCap(SHORTCUT_KEY.Command, true).icon).toBe('key-command');
    expect(keyCap(SHORTCUT_KEY.Alt, true).icon).toBe('key-option');
    expect(keyCap(SHORTCUT_KEY.Shift, true).icon).toBe('key-shift');
  });

  it('uses the words Ctrl, Alt and Shift elsewhere', () => {
    expect(keyCap(SHORTCUT_KEY.Command, false)).toEqual({
      icon: null,
      text: null,
      nameKey: 'shortcuts.keys.ctrl',
    });
    expect(keyCap(SHORTCUT_KEY.Alt, false).nameKey).toBe('shortcuts.keys.alt');
    expect(keyCap(SHORTCUT_KEY.Shift, false).nameKey).toBe('shortcuts.keys.shift');
  });

  it('shows arrows with a spoken name and letters as they are', () => {
    expect(keyCap(SHORTCUT_KEY.Up, false)).toEqual({
      icon: null,
      text: '↑',
      nameKey: 'shortcuts.keys.up',
    });
    expect(keyCap(SHORTCUT_KEY.K, false)).toEqual({ icon: null, text: 'K', nameKey: null });
    expect(keyCap(SHORTCUT_KEY.Enter, false).icon).toBe('key-enter');
  });

  it('has a cap for every key of the list', () => {
    for (const group of SHORTCUT_GROUPS) {
      for (const shortcut of group.shortcuts) {
        for (const key of shortcut.keys) {
          const cap = keyCap(key, false);
          expect(cap.icon ?? cap.text ?? cap.nameKey).not.toBeNull();
        }
      }
    }
  });
});
