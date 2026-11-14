import { KEYBOARD_KEY } from '../../models/keyboard';
import { relayKey } from './relay-key';

function relayed(init: KeyboardEventInit): { source: KeyboardEvent; copy: KeyboardEvent | null } {
  const listbox = document.createElement('div');
  let copy: KeyboardEvent | null = null;
  listbox.addEventListener('keydown', (event) => (copy = event));
  const source = new KeyboardEvent('keydown', { ...init, cancelable: true });
  relayKey(source, listbox);
  return { source, copy };
}

describe('relayKey', () => {
  it('stops the key in the search box and dispatches a copy on the listbox', () => {
    const { source, copy } = relayed({ key: KEYBOARD_KEY.ArrowDown, shiftKey: true, altKey: true });
    expect(source.defaultPrevented).toBe(true);
    expect(copy).toMatchObject({ key: KEYBOARD_KEY.ArrowDown, shiftKey: true, altKey: true });
  });

  it('keeps Ctrl and Cmd on the arrows and Enter', () => {
    const { copy } = relayed({ key: KEYBOARD_KEY.Enter, ctrlKey: true, metaKey: true });
    expect(copy).toMatchObject({ ctrlKey: true, metaKey: true });
  });

  it('drops Ctrl and Cmd on Home and End', () => {
    expect(relayed({ key: KEYBOARD_KEY.Home, ctrlKey: true }).copy).toMatchObject({
      key: KEYBOARD_KEY.Home,
      ctrlKey: false,
    });
    expect(relayed({ key: KEYBOARD_KEY.End, metaKey: true }).copy).toMatchObject({
      key: KEYBOARD_KEY.End,
      metaKey: false,
    });
  });

  it('only prevents the default without a listbox', () => {
    const source = new KeyboardEvent('keydown', { key: KEYBOARD_KEY.ArrowUp, cancelable: true });
    relayKey(source, undefined);
    expect(source.defaultPrevented).toBe(true);
  });
});
