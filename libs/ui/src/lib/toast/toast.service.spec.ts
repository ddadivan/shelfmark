import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ToastService } from './toast.service';
import { toastShortcutKeys, toastShortcutLabel } from './toast-shortcut-label';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../overlay/overlay-layer';
import { TOAST_KIND } from './models/toast-kind.const';
import { TOAST_CLOSE_REASON } from './models/toast-close-reason.const';
import type { ToastCloseReason } from './models/toast-close-reason.type';

function setup() {
  const service = TestBed.inject(ToastService);
  TestBed.tick();
  return service;
}

function region(): HTMLElement {
  const element = document.querySelector<HTMLElement>('ui-toast-region');
  if (!element) {
    throw new Error('no toast region');
  }
  return element;
}

function toasts(): HTMLElement[] {
  return Array.from(region().querySelectorAll<HTMLElement>('ui-toast'));
}

function render(): void {
  TestBed.tick();
}

describe('ToastService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Destroys the root injector: the overlay (and its region) is disposed.
    TestBed.resetTestingModule();
  });

  it('creates one persistent polite live region in the toast layer, before any toast', () => {
    setup();
    const live = region();
    expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent?.trim()).toBe('');
    expect(live.closest(`.${overlayLayerClass(OVERLAY_LAYER.Toast)}`)).not.toBeNull();
    expect(document.querySelectorAll('ui-toast-region')).toHaveLength(1);
  });

  it('shows text with the default kind and an icon, and keeps the same region', () => {
    const service = setup();
    const live = region();
    service.show({ text: 'Link saved' });
    render();
    expect(region()).toBe(live);
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].textContent).toContain('Link saved');
    expect(toasts()[0].querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(toasts()[0].querySelector('button')).toBeNull();
    expect(document.querySelectorAll('ui-toast-region')).toHaveLength(1);
  });

  it.each([
    [TOAST_KIND.Info, 'info'],
    [TOAST_KIND.Success, 'check'],
    [TOAST_KIND.Error, 'error'],
  ] as const)('the %s kind draws the %s icon', (kind, icon) => {
    const service = setup();
    service.show({ text: 'x', kind });
    render();
    const toast = toasts()[0];
    expect(toast.querySelector('use')?.getAttribute('href')).toContain(`#sm-${icon}`);
  });

  it('closes after 4 s by default', () => {
    const service = setup();
    service.show({ text: 'Saved' });
    render();
    vi.advanceTimersByTime(3999);
    render();
    expect(toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    render();
    expect(toasts().filter((t) => !t.className.includes('leave'))).toHaveLength(0);
  });

  it('lasts 8 s with an action and honours an explicit duration', () => {
    const service = setup();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    vi.advanceTimersByTime(7999);
    render();
    expect(toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    render();
    expect(toasts()).toHaveLength(0);

    service.show({ text: 'Quick', duration: 1000 });
    render();
    vi.advanceTimersByTime(1000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('pauses on hover and resumes with the remaining time', () => {
    const service = setup();
    service.show({ text: 'Saved' });
    render();
    vi.advanceTimersByTime(3000);
    toasts()[0].dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(60_000);
    render();
    expect(toasts()).toHaveLength(1);

    toasts()[0].dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(999);
    render();
    expect(toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('pauses while focus is inside and stays paused when focus moves within', () => {
    const service = setup();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    const toast = toasts()[0];
    const button = toast.querySelector('button') as HTMLButtonElement;
    button.focus();
    vi.advanceTimersByTime(30_000);
    render();
    expect(toasts()).toHaveLength(1);

    toast.dispatchEvent(new FocusEvent('focusout', { relatedTarget: toast, bubbles: true }));
    vi.advanceTimersByTime(30_000);
    render();
    expect(toasts()).toHaveLength(1);

    toast.dispatchEvent(new FocusEvent('focusout', { relatedTarget: null, bubbles: true }));
    vi.advanceTimersByTime(8000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('stays paused while one of hover and focus remains', () => {
    const service = setup();
    service.show({ text: 'Saved' });
    render();
    const toast = toasts()[0];
    toast.dispatchEvent(new Event('pointerenter'));
    toast.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    toast.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(60_000);
    render();
    expect(toasts()).toHaveLength(1);
  });

  it('runs the action once and dismisses the toast', () => {
    const service = setup();
    const run = vi.fn();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run } });
    render();
    const button = toasts()[0].querySelector('button') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Undo');
    button.click();
    render();
    expect(run).toHaveBeenCalledTimes(1);
    expect(toasts()).toHaveLength(0);
    vi.advanceTimersByTime(10_000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the action throws and reports the error to the ErrorHandler', () => {
    const error = new Error('boom');
    const handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useValue: { handleError } }],
    });
    const service = setup();
    service.show({
      text: 'x',
      action: {
        label: 'Retry',
        run: () => {
          throw error;
        },
      },
    });
    render();
    const button = toasts()[0].querySelector('button') as HTMLButtonElement;
    button.click();
    render();
    expect(handleError).toHaveBeenCalledWith(error);
    expect(toasts()).toHaveLength(0);
  });

  it('dismiss() on the ref and on the service closes it; a stale ref does nothing', () => {
    const service = setup();
    const first = service.show({ text: 'one' });
    render();
    first.dismiss();
    render();
    expect(toasts()).toHaveLength(0);

    const second = service.show({ text: 'two' });
    render();
    first.dismiss();
    render();
    expect(toasts()).toHaveLength(1);
    second.dismiss();
    render();
    expect(toasts()).toHaveLength(0);

    service.show({ text: 'three' });
    render();
    service.dismiss();
    service.dismiss();
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('a newer toast replaces the older one and restarts the timer', () => {
    const service = setup();
    service.show({ text: 'old' });
    render();
    vi.advanceTimersByTime(3000);
    service.show({ text: 'new' });
    render();
    const texts = toasts().map((t) => t.textContent);
    expect(texts.some((t) => t?.includes('new'))).toBe(true);
    vi.advanceTimersByTime(3000);
    render();
    expect(toasts().some((t) => t.textContent?.includes('new'))).toBe(true);
    vi.advanceTimersByTime(1000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  describe('closed', () => {
    function track(promise: Promise<ToastCloseReason>): ToastCloseReason[] {
      const seen: ToastCloseReason[] = [];
      void promise.then((reason) => seen.push(reason));
      return seen;
    }

    it('resolves with action when the action button is used', async () => {
      const service = setup();
      const ref = service.show({ text: 'x', action: { label: 'Undo', run: vi.fn() } });
      render();
      (toasts()[0].querySelector('button') as HTMLButtonElement).click();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Action);
    });

    it('resolves with action even when the action throws', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: ErrorHandler, useValue: { handleError: vi.fn() } }],
      });
      const service = setup();
      const ref = service.show({
        text: 'x',
        action: {
          label: 'Retry',
          run: () => {
            throw new Error('boom');
          },
        },
      });
      render();
      (toasts()[0].querySelector('button') as HTMLButtonElement).click();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Action);
    });

    it('resolves with action when the action shows another toast', async () => {
      const service = setup();
      const ref = service.show({
        text: 'Deleted',
        action: { label: 'Undo', run: () => service.show({ text: 'Restored' }) },
      });
      render();
      (toasts()[0].querySelector('button') as HTMLButtonElement).click();
      render();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Action);
      expect(toasts().some((t) => t.textContent?.includes('Restored'))).toBe(true);
    });

    it('resolves a pending toast as dismissed when the injector is destroyed', async () => {
      const service = setup();
      const ref = service.show({ text: 'x' });
      TestBed.resetTestingModule();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
      vi.advanceTimersByTime(10_000);
    });

    it('resolves with timeout when the timer ends, after a pause too', async () => {
      const service = setup();
      const ref = service.show({ text: 'x' });
      render();
      vi.advanceTimersByTime(3000);
      toasts()[0].dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(10_000);
      const seen = track(ref.closed);
      await Promise.resolve();
      expect(seen).toEqual([]);
      toasts()[0].dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(1000);
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Timeout);
    });

    it('resolves with dismissed on ref.dismiss() and on service.dismiss()', async () => {
      const service = setup();
      const first = service.show({ text: 'one' });
      first.dismiss();
      await expect(first.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
      const second = service.show({ text: 'two' });
      service.dismiss();
      await expect(second.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
    });

    it('resolves with replaced when a newer toast replaces it', async () => {
      const service = setup();
      const first = service.show({ text: 'old' });
      const second = service.show({ text: 'new' });
      await expect(first.closed).resolves.toBe(TOAST_CLOSE_REASON.Replaced);
      const seen = track(second.closed);
      await Promise.resolve();
      expect(seen).toEqual([]);
    });

    it('resolves exactly once: the first reason wins', async () => {
      const service = setup();
      const ref = service.show({ text: 'x' });
      const seen = track(ref.closed);
      ref.dismiss();
      service.show({ text: 'y' });
      ref.dismiss();
      vi.advanceTimersByTime(10_000);
      await ref.closed;
      await Promise.resolve();
      expect(seen).toEqual([TOAST_CLOSE_REASON.Dismissed]);
    });
  });

  it('duration 0 keeps the toast until it is dismissed', () => {
    const service = setup();
    const ref = service.show({ text: 'Stays', duration: 0 });
    render();
    vi.advanceTimersByTime(600_000);
    render();
    expect(toasts()).toHaveLength(1);
    toasts()[0].dispatchEvent(new Event('pointerenter'));
    toasts()[0].dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(600_000);
    render();
    expect(toasts()).toHaveLength(1);
    ref.dismiss();
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('a replacement that appears under a resting pointer waits for the pointer to leave', () => {
    const matches = vi.spyOn(HTMLElement.prototype, 'matches').mockImplementation(function (
      this: HTMLElement,
      selector: string,
    ) {
      return selector === ':hover';
    });
    const service = setup();
    service.show({ text: 'old' });
    render();
    service.show({ text: 'new' });
    render();
    vi.advanceTimersByTime(60_000);
    render();
    expect(toasts().some((t) => t.textContent?.includes('new'))).toBe(true);

    matches.mockRestore();
    const current = toasts().find((t) => t.textContent?.includes('new')) as HTMLElement;
    current.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(4000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('focusAction() focuses the action only when called, and pauses the timer', () => {
    const service = setup();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    const button = toasts()[0].querySelector('button') as HTMLButtonElement;
    expect(document.activeElement).not.toBe(button);
    service.focusAction();
    expect(document.activeElement).toBe(button);
    vi.advanceTimersByTime(60_000);
    render();
    expect(toasts()).toHaveLength(1);
  });

  it('focusAction() does nothing without a toast or without an action', () => {
    const service = setup();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    service.focusAction();
    service.show({ text: 'No action' });
    render();
    service.focusAction();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('handleShortcut() focuses the action of the toast on screen and cancels the key', () => {
    const service = setup();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    const event = new KeyboardEvent('keydown', {
      code: 'KeyT',
      altKey: true,
      shiftKey: true,
      cancelable: true,
    });
    expect(service.handleShortcut(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(toasts()[0].querySelector('button'));
  });

  it('handleShortcut() ignores other keys, other modifiers and toasts without an action', () => {
    const service = setup();
    const key = (init: KeyboardEventInit) =>
      new KeyboardEvent('keydown', { code: 'KeyT', altKey: true, shiftKey: true, ...init });
    service.show({ text: 'No action' });
    render();
    expect(service.handleShortcut(key({}))).toBe(false);
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    expect(service.handleShortcut(key({ code: 'KeyK' }))).toBe(false);
    expect(service.handleShortcut(key({ shiftKey: false }))).toBe(false);
    expect(service.handleShortcut(key({ altKey: false }))).toBe(false);
    expect(service.handleShortcut(key({ ctrlKey: true }))).toBe(false);
    expect(service.handleShortcut(key({ metaKey: true }))).toBe(false);
    expect(service.handleShortcut(key({ isComposing: true }))).toBe(false);
    const prevented = key({ cancelable: true });
    prevented.preventDefault();
    expect(service.handleShortcut(prevented)).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('labels the shortcut for the platform and shows it only with a hint', () => {
    expect(toastShortcutLabel(true)).toBe('Option+Shift+T');
    expect(toastShortcutLabel(false)).toBe('Alt+Shift+T');
    expect(toastShortcutLabel()).toMatch(/^(Alt|Option)\+Shift\+T$/);
    const service = setup();
    service.show({ text: 'Plain', action: { label: 'Undo', run: vi.fn() } });
    render();
    expect(toasts()[0].querySelector('kbd')).toBeNull();
    service.show({ text: 'Hinted', actionHint: 'Hint', action: { label: 'Undo', run: vi.fn() } });
    render();
    const caps = [...(toasts().at(-1)?.querySelectorAll('kbd') ?? [])];
    expect(
      caps.map((cap) => cap.textContent?.trim() || cap.querySelector('ui-icon')?.localName),
    ).toEqual(toastShortcutKeys().map((key) => (key.icon ? 'ui-icon' : key.label)));
    expect(toasts().at(-1)?.querySelector('.ui-toast__keys')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('draws the shortcut as key caps: icons for the macOS signs, words elsewhere', () => {
    expect(toastShortcutKeys(true)).toEqual([
      { label: 'Option', icon: 'key-option' },
      { label: 'Shift', icon: 'key-shift' },
      { label: 'T' },
    ]);
    expect(toastShortcutKeys(false)).toEqual([
      { label: 'Alt' },
      { label: 'Shift' },
      { label: 'T' },
    ]);
    expect(toastShortcutKeys().map((key) => key.label)).toHaveLength(3);
  });

  it('marks the toast with its kind so the icon takes the kind colour', () => {
    const service = setup();
    service.show({ text: 'Saved', kind: 'success' });
    render();
    expect(toasts()[0].classList).toContain('ui-toast--success');
    service.show({ text: 'Failed', kind: 'error' });
    render();
    expect(toasts().at(-1)?.classList).toContain('ui-toast--error');
  });

  it('announces the hint only for a toast with an action', () => {
    const service = setup();
    service.show({ text: 'Plain', actionHint: 'Press it' });
    render();
    expect(toasts()[0].querySelector('.ui-toast__hint')).toBeNull();
    service.show({
      text: 'Link deleted',
      actionHint: 'Press Alt+Shift+T to reach Undo',
      action: { label: 'Undo', run: vi.fn() },
    });
    render();
    expect(toasts().at(-1)?.querySelector('.ui-toast__hint')?.textContent).toBe(
      'Press Alt+Shift+T to reach Undo',
    );
  });

  describe('focus return', () => {
    function focusedToast() {
      const service = setup();
      const outside = document.createElement('button');
      document.body.append(outside);
      outside.focus();
      const ref = service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
      render();
      service.focusAction();
      return { service, outside, ref };
    }

    it('goes back when the action runs', async () => {
      const { outside } = focusedToast();
      (toasts()[0].querySelector('button') as HTMLButtonElement).click();
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).toBe(outside);
      outside.remove();
    });

    it('goes back when the toast is dismissed', async () => {
      const { outside, ref } = focusedToast();
      ref.dismiss();
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).toBe(outside);
      outside.remove();
    });

    it('does not move focus when the focused toast is replaced', async () => {
      const { service, outside } = focusedToast();
      service.show({ text: 'Newer', action: { label: 'Undo', run: vi.fn() } });
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).not.toBe(outside);
      outside.remove();
    });

    it('does not take body as the place to return to', () => {
      const service = setup();
      const ref = service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
      render();
      service.focusAction();
      ref.dismiss();
      expect(document.activeElement).not.toBeNull();
    });

    it('leaves focus alone when the user already moved it', async () => {
      const { outside, ref } = focusedToast();
      const other = document.createElement('button');
      document.body.append(other);
      other.focus();
      ref.dismiss();
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).toBe(other);
      outside.remove();
      other.remove();
    });

    it('does nothing when the old target is gone', async () => {
      const { outside, ref } = focusedToast();
      outside.remove();
      ref.dismiss();
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).toBe(document.body);
    });
  });

  it('never moves focus', () => {
    const service = setup();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('has the action reachable by keyboard (a native button in the tab order)', () => {
    const service = setup();
    service.show({ text: 'Link deleted', action: { label: 'Undo', run: vi.fn() } });
    render();
    const button = toasts()[0].querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
  });

  it('has the text once in the document (single live region)', () => {
    const service = setup();
    service.show({ text: 'Link saved unique' });
    render();
    expect(document.body.textContent?.split('Link saved unique').length).toBe(2);
  });

  it('has no axe violations for every kind, with and without an action', async () => {
    vi.useRealTimers();
    const service = setup();
    for (const kind of Object.values(TOAST_KIND)) {
      service.show({ text: 'Something happened', kind, action: { label: 'Undo', run: vi.fn() } });
      render();
      expect(await axeViolations(region())).toEqual([]);
      service.show({ text: 'Something happened', kind });
      render();
      expect(await axeViolations(region())).toEqual([]);
    }
  });

  it('puts the region in a passthrough CDK pane, so the strip never blocks the page', () => {
    setup();
    const pane = region().closest('.cdk-overlay-pane');
    expect(pane?.classList.contains('ui-overlay-pane--passthrough')).toBe(true);
  });

  describe('over a modal overlay', () => {
    function regionHost(): HTMLElement {
      return region().closest('.ui-overlay-layer--toast') as HTMLElement;
    }

    it('raises the region when the first toast appears, so it is above an open drawer', () => {
      const service = setup();
      // The test DOM has no Popover API: stand-ins on the host element.
      const raise = vi.fn();
      Object.assign(regionHost(), { hidePopover: raise, showPopover: vi.fn() });
      service.show({ text: 'Tag deleted', action: { label: 'Undo', run: vi.fn() } });
      render();
      expect(raise).toHaveBeenCalledTimes(1);
      // A second toast is already in front: no flicker.
      service.show({ text: 'Another' });
      expect(raise).toHaveBeenCalledTimes(1);
    });

    it('is never aria-hidden by a modal overlay: the region sits in the overlay container', () => {
      const service = setup();
      document.body.setAttribute('aria-hidden', 'false');
      service.show({ text: 'Tag deleted' });
      render();
      let node: HTMLElement | null = region();
      while (node && node !== document.body) {
        expect(node.getAttribute('aria-hidden')).toBeNull();
        node = node.parentElement;
      }
      expect(region().closest('.cdk-overlay-container')).not.toBeNull();
      document.body.removeAttribute('aria-hidden');
    });
  });
});
