import { consumeFocusReturn, returnFocus } from './focus-return';

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
