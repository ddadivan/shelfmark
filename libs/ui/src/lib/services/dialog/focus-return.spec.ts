import {
  consumeFocusReturn,
  INPUT_MODALITY_ATTRIBUTE,
  isUserKey,
  lastInputWasPointer,
  returnFocus,
  trackInputModality,
} from './focus-return';
import { INPUT_MODALITY } from './models/input-modality.const';
import { KEYBOARD_KEY } from '../../models/keyboard';

describe('returnFocus', () => {
  let target: HTMLButtonElement;

  beforeEach(() => {
    vi.useFakeTimers();
    target = document.createElement('button');
    document.body.appendChild(target);
  });

  afterEach(() => {
    target.remove();
    vi.useRealTimers();
  });

  it('focuses the trigger and marks that one focus as a return (no tooltip for it)', () => {
    const returns: boolean[] = [];
    target.addEventListener('focus', () => returns.push(consumeFocusReturn(target)));

    returnFocus(target, false);
    vi.runAllTimers();
    target.blur();
    target.focus();

    expect(returns).toEqual([true, false]);
  });

  it('asks for no focus ring after a pointer activation, the normal ring after a key', () => {
    const focus = vi.spyOn(target, 'focus');

    returnFocus(target, true);
    returnFocus(target, false);

    expect(focus).toHaveBeenNthCalledWith(1, { focusVisible: false });
    expect(focus).toHaveBeenNthCalledWith(2, {});
  });

  it('does not swallow a later real focus when the element was already focused', () => {
    target.focus();
    returnFocus(target, false);

    expect(consumeFocusReturn(target)).toBe(false);
  });
});

describe('trackInputModality', () => {
  it('marks <html> as pointer, also again after a press', () => {
    trackInputModality();
    document.documentElement.setAttribute(INPUT_MODALITY_ATTRIBUTE, INPUT_MODALITY.Keyboard);
    document.dispatchEvent(new Event('pointerdown'));

    expect(document.documentElement.getAttribute(INPUT_MODALITY_ATTRIBUTE)).toBe(
      INPUT_MODALITY.Pointer,
    );
    expect(lastInputWasPointer()).toBe(true);
  });
});

describe('isUserKey', () => {
  const key = (name: string, trusted: boolean, modifier = false) => ({
    key: name,
    isTrusted: trusted,
    getModifierState: () => modifier,
  });

  it('counts a real key, not a modifier alone or a key dispatched by code', () => {
    expect(isUserKey(key(KEYBOARD_KEY.Tab, true))).toBe(true);
    expect(isUserKey(key('Shift', true, true))).toBe(false);
    expect(isUserKey(key(KEYBOARD_KEY.Home, false))).toBe(false);
  });
});
