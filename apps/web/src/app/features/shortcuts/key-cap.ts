import type { KeyCap } from './models/key-cap.interface';
import { SHORTCUT_KEY } from './models/shortcut-key.const';
import type { ShortcutKey } from './models/shortcut-key.type';

const word = (nameKey: string): KeyCap => ({ icon: null, text: null, nameKey });
const symbol = (text: string, nameKey: string): KeyCap => ({ icon: null, text, nameKey });
const letter = (text: string): KeyCap => ({ icon: null, text, nameKey: null });

/**
 * The cap of a key: Apple devices get the modifier glyphs (command, option, shift) as icons, the
 * rest the words Ctrl, Alt and Shift. Arrows and letters are the same everywhere.
 */
export function keyCap(key: ShortcutKey, mac: boolean): KeyCap {
  switch (key) {
    case SHORTCUT_KEY.Command:
      return mac
        ? { icon: 'key-command', text: null, nameKey: 'shortcuts.keys.command' }
        : word('shortcuts.keys.ctrl');
    case SHORTCUT_KEY.Alt:
      return mac
        ? { icon: 'key-option', text: null, nameKey: 'shortcuts.keys.option' }
        : word('shortcuts.keys.alt');
    case SHORTCUT_KEY.Shift:
      return mac
        ? { icon: 'key-shift', text: null, nameKey: 'shortcuts.keys.shift' }
        : word('shortcuts.keys.shift');
    case SHORTCUT_KEY.Enter:
      return { icon: 'key-enter', text: null, nameKey: 'shortcuts.keys.enter' };
    case SHORTCUT_KEY.Escape:
      return word('shortcuts.keys.escape');
    case SHORTCUT_KEY.Up:
      return symbol('↑', 'shortcuts.keys.up');
    case SHORTCUT_KEY.Down:
      return symbol('↓', 'shortcuts.keys.down');
    case SHORTCUT_KEY.Left:
      return symbol('←', 'shortcuts.keys.left');
    case SHORTCUT_KEY.Right:
      return symbol('→', 'shortcuts.keys.right');
    case SHORTCUT_KEY.Question:
      return symbol('?', 'shortcuts.keys.question');
    case SHORTCUT_KEY.F10:
      return letter('F10');
    case SHORTCUT_KEY.K:
      return letter('K');
    case SHORTCUT_KEY.T:
      return letter('T');
    case SHORTCUT_KEY.V:
      return letter('V');
    case SHORTCUT_KEY.Z:
      return letter('Z');
  }
}
