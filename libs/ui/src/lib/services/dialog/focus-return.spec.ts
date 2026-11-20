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

  it('counts as pointer until a real key, not on a modifier or a dispatched key, back on a press', () => {
    // jsdom cannot make a trusted event, so the keydown listener is called with event-like objects.
    const listeners = new Map<string, EventListener>();
    const add = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.set(type, listener as EventListener);
      });
    trackInputModality();
    add.mockRestore();
    const key = (name: string, trusted = true, modifier = false): void =>
      listeners.get('keydown')?.({
        key: name,
        isTrusted: trusted,
        getModifierState: () => modifier,
      } as unknown as Event);

    expect(modality()).toBe(INPUT_MODALITY.Pointer);
    expect(lastInputWasPointer()).toBe(true);

    key('Shift', true, true);
    expect(modality()).toBe(INPUT_MODALITY.Pointer);

    key(KEYBOARD_KEY.Home, false);
    expect(modality()).toBe(INPUT_MODALITY.Pointer);

    key(KEYBOARD_KEY.Tab);
    expect(modality()).toBe(INPUT_MODALITY.Keyboard);
    expect(lastInputWasPointer()).toBe(false);

    listeners.get('pointerdown')?.(new Event('pointerdown'));
    expect(modality()).toBe(INPUT_MODALITY.Pointer);
    expect(lastInputWasPointer()).toBe(true);
  });
});
