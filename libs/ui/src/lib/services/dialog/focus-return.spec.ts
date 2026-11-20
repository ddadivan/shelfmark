import {
  consumeFocusReturn,
  INPUT_MODALITY_ATTRIBUTE,
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
  const modality = (): string | null =>
    document.documentElement.getAttribute(INPUT_MODALITY_ATTRIBUTE);
  const key = (init: KeyboardEventInit): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', init));
  };

  it('counts as pointer until a key, keeps it on a modifier alone, back to pointer on a press', () => {
    trackInputModality();
    expect(modality()).toBe(INPUT_MODALITY.Pointer);
    expect(lastInputWasPointer()).toBe(true);

    key({ key: 'Shift', shiftKey: true });
    expect(modality()).toBe(INPUT_MODALITY.Pointer);

    key({ key: KEYBOARD_KEY.Tab });
    expect(modality()).toBe(INPUT_MODALITY.Keyboard);
    expect(lastInputWasPointer()).toBe(false);

    document.dispatchEvent(new Event('pointerdown'));
    expect(modality()).toBe(INPUT_MODALITY.Pointer);
    expect(lastInputWasPointer()).toBe(true);
  });
});
