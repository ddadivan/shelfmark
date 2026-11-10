import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ToastService } from './toast.service';
import { toastShortcutKeys, toastShortcutLabel } from './toast-shortcut-label';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../overlay/overlay-layer';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { TOAST_DISMISS_LABEL } from './models/toast-dismiss-label.token';
import { TOAST_DURATION_MS } from './models/toast-duration.const';
import { TOAST_KIND } from './models/toast-kind.const';
import type { ToastOptions } from './models/toast-options.interface';
import { toastDefaultDuration } from './toast-default-duration';
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

  it('creates one persistent polite and one persistent assertive live region, before any toast', () => {
    setup();
    const live = region();
    const polite = live.querySelector('[role="status"]');
    const assertive = live.querySelector('[role="alert"]');
    expect(polite?.getAttribute('aria-live')).toBe('polite');
    expect(assertive?.getAttribute('aria-live')).toBe('assertive');
    expect(live.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(2);
    expect(live.textContent?.trim()).toBe('');
    expect(live.closest(`.${overlayLayerClass(OVERLAY_LAYER.Toast)}`)).not.toBeNull();
    expect(document.querySelectorAll('ui-toast-region')).toHaveLength(1);
  });

  it('announces normal kinds politely and danger assertively, in regions that never move', () => {
    const service = setup();
    const polite = region().querySelector('[role="status"]') as HTMLElement;
    const assertive = region().querySelector('[role="alert"]') as HTMLElement;
    for (const kind of [
      TOAST_KIND.Saved,
      TOAST_KIND.Moved,
      TOAST_KIND.Success,
      TOAST_KIND.Warn,
      TOAST_KIND.Info,
    ]) {
      service.show({ kind, title: kind });
    }
    service.show({ kind: TOAST_KIND.Danger, title: 'Couldn’t save' });
    render();
    expect(polite.querySelectorAll('ui-toast').length).toBeGreaterThan(0);
    expect(polite.textContent).not.toContain('Couldn’t save');
    expect(assertive.querySelectorAll('ui-toast')).toHaveLength(1);
    expect(assertive.textContent).toContain('Couldn’t save');
    expect(region().querySelector('[role="status"]')).toBe(polite);
    expect(region().querySelector('[role="alert"]')).toBe(assertive);
  });

  it('announces a red Undo toast after a delete politely, not as an alert', () => {
    const service = setup();
    service.show({
      kind: TOAST_KIND.Danger,
      title: 'Link deleted',
      action: { label: 'Undo', run: () => undefined },
      duration: TOAST_DURATION_MS.Undo,
    });
    render();
    const polite = region().querySelector('[role="status"]') as HTMLElement;
    const assertive = region().querySelector('[role="alert"]') as HTMLElement;
    expect(polite.textContent).toContain('Link deleted');
    expect(assertive.querySelectorAll('ui-toast')).toHaveLength(0);
  });

  it('shows text with the default kind and an icon, and keeps the same region', () => {
    const service = setup();
    const live = region();
    service.show({ kind: TOAST_KIND.Info, title: 'Link saved' });
    render();
    expect(region()).toBe(live);
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].textContent).toContain('Link saved');
    expect(toasts()[0].querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(toasts()[0].querySelector('.ui-toast__action')).toBeNull();
    expect(toasts()[0].querySelector('.ui-toast__close')).not.toBeNull();
    expect(document.querySelectorAll('ui-toast-region')).toHaveLength(1);
  });

  it.each([
    [TOAST_KIND.Info, 'info'],
    [TOAST_KIND.Success, 'check'],
    [TOAST_KIND.Danger, 'error'],
    [TOAST_KIND.Warn, 'warning'],
    [TOAST_KIND.Saved, 'saved-link'],
    [TOAST_KIND.Moved, 'folder'],
  ] as const)('the %s kind draws the %s icon', (kind, icon) => {
    const service = setup();
    service.show({ title: 'x', kind });
    render();
    const toast = toasts()[0];
    expect(toast.querySelector('use')?.getAttribute('href')).toContain(`#sm-${icon}`);
    expect(toast.querySelector('.ui-toast__icon, .ui-toast__thumb, ui-folder-icon')).not.toBeNull();
  });

  it('closes after 4 s by default', () => {
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'Saved' });
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
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
    render();
    vi.advanceTimersByTime(7999);
    render();
    expect(toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    render();
    expect(toasts()).toHaveLength(0);

    service.show({ kind: TOAST_KIND.Info, title: 'Quick', duration: 1000 });
    render();
    vi.advanceTimersByTime(1000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('pauses on hover and resumes with the remaining time', () => {
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'Saved' });
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
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
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
    service.show({ kind: TOAST_KIND.Info, title: 'Saved' });
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
    service.show({ kind: TOAST_KIND.Info, title: 'Link deleted', action: { label: 'Undo', run } });
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
      kind: TOAST_KIND.Info,
      title: 'x',
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
    const first = service.show({ kind: TOAST_KIND.Info, title: 'one' });
    render();
    first.dismiss();
    render();
    expect(toasts()).toHaveLength(0);

    const second = service.show({ kind: TOAST_KIND.Info, title: 'two' });
    render();
    first.dismiss();
    render();
    expect(toasts()).toHaveLength(1);
    second.dismiss();
    render();
    expect(toasts()).toHaveLength(0);

    service.show({ kind: TOAST_KIND.Info, title: 'three' });
    render();
    service.dismiss();
    service.dismiss();
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('a newer toast stacks on the older one without touching its timer', () => {
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'old' });
    render();
    vi.advanceTimersByTime(3000);
    service.show({ kind: TOAST_KIND.Info, title: 'new' });
    render();
    expect(toasts()).toHaveLength(2);
    vi.advanceTimersByTime(1000);
    render();
    expect(toasts().map((t) => t.textContent)).toEqual([expect.stringContaining('new')]);
    vi.advanceTimersByTime(3000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('stacks up to three, newest in front, and a fourth pushes out the oldest', async () => {
    const service = setup();
    const refs = ['a', 'b', 'c', 'd'].map((title) =>
      service.show({ kind: TOAST_KIND.Info, title, duration: 0 }),
    );
    render();
    const live = toasts().filter((t) => !t.className.includes('leave'));
    expect(live.map((t) => t.querySelector('.ui-toast__title')?.textContent)).toEqual([
      'b',
      'c',
      'd',
    ]);
    expect(live.map((t) => t.getAttribute('data-depth'))).toEqual(['2', '1', '0']);
    expect(live.map((t) => t.style.getPropertyValue('--ui-toast-index'))).toEqual(['0', '1', '2']);
    await expect(refs[0].closed).resolves.toBe(TOAST_CLOSE_REASON.Replaced);
    refs[3].dismiss();
    render();
    expect(toasts().map((t) => t.getAttribute('data-depth'))).toEqual(['1', '0']);
  });

  it('keeps one timer per toast: pausing one leaves the others running', () => {
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'one' });
    service.show({ kind: TOAST_KIND.Info, title: 'two' });
    render();
    toasts()[1].dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(4000);
    render();
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].textContent).toContain('two');
  });

  describe('closed', () => {
    function track(promise: Promise<ToastCloseReason>): ToastCloseReason[] {
      const seen: ToastCloseReason[] = [];
      void promise.then((reason) => seen.push(reason));
      return seen;
    }

    it('resolves with action when the action button is used', async () => {
      const service = setup();
      const ref = service.show({
        kind: TOAST_KIND.Info,
        title: 'x',
        action: { label: 'Undo', run: vi.fn() },
      });
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
        kind: TOAST_KIND.Info,
        title: 'x',
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
        kind: TOAST_KIND.Info,
        title: 'Deleted',
        action: {
          label: 'Undo',
          run: () => service.show({ kind: TOAST_KIND.Info, title: 'Restored' }),
        },
      });
      render();
      (toasts()[0].querySelector('button') as HTMLButtonElement).click();
      render();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Action);
      expect(toasts().some((t) => t.textContent?.includes('Restored'))).toBe(true);
    });

    it('resolves a pending toast as dismissed when the injector is destroyed', async () => {
      const service = setup();
      const ref = service.show({ kind: TOAST_KIND.Info, title: 'x' });
      TestBed.resetTestingModule();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
      vi.advanceTimersByTime(10_000);
    });

    it('resolves with timeout when the timer ends, after a pause too', async () => {
      const service = setup();
      const ref = service.show({ kind: TOAST_KIND.Info, title: 'x' });
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
      const first = service.show({ kind: TOAST_KIND.Info, title: 'one' });
      first.dismiss();
      await expect(first.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
      const second = service.show({ kind: TOAST_KIND.Info, title: 'two' });
      service.dismiss();
      await expect(second.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
    });

    it('resolves with replaced when a fourth toast pushes it out', async () => {
      const service = setup();
      const first = service.show({ kind: TOAST_KIND.Info, title: 'old' });
      const second = service.show({ kind: TOAST_KIND.Info, title: 'new' });
      service.show({ kind: TOAST_KIND.Info, title: 'c' });
      service.show({ kind: TOAST_KIND.Info, title: 'd' });
      await expect(first.closed).resolves.toBe(TOAST_CLOSE_REASON.Replaced);
      const seen = track(second.closed);
      await Promise.resolve();
      expect(seen).toEqual([]);
    });

    it('resolves exactly once: the first reason wins', async () => {
      const service = setup();
      const ref = service.show({ kind: TOAST_KIND.Info, title: 'x' });
      const seen = track(ref.closed);
      ref.dismiss();
      service.show({ kind: TOAST_KIND.Info, title: 'y' });
      ref.dismiss();
      vi.advanceTimersByTime(10_000);
      await ref.closed;
      await Promise.resolve();
      expect(seen).toEqual([TOAST_CLOSE_REASON.Dismissed]);
    });
  });

  it('duration 0 keeps the toast until it is dismissed', () => {
    const service = setup();
    const ref = service.show({ kind: TOAST_KIND.Info, title: 'Stays', duration: 0 });
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

  it('a toast that appears under a resting pointer waits for the pointer to leave', () => {
    const matches = vi.spyOn(HTMLElement.prototype, 'matches').mockImplementation(function (
      this: HTMLElement,
      selector: string,
    ) {
      return selector === ':hover';
    });
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'new' });
    render();
    vi.advanceTimersByTime(60_000);
    render();
    expect(toasts()).toHaveLength(1);

    matches.mockRestore();
    toasts()[0].dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(4000);
    render();
    expect(toasts()).toHaveLength(0);
  });

  it('focusAction() focuses the action only when called, and pauses the timer', () => {
    const service = setup();
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
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
    service.show({ kind: TOAST_KIND.Info, title: 'No action' });
    render();
    service.focusAction();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('handleShortcut() focuses the action of the toast on screen and cancels the key', () => {
    const service = setup();
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
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
    service.show({ kind: TOAST_KIND.Info, title: 'No action' });
    render();
    expect(service.handleShortcut(key({}))).toBe(false);
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
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
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Plain',
      action: { label: 'Undo', run: vi.fn() },
    });
    render();
    expect(toasts()[0].querySelector('kbd')).toBeNull();
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Hinted',
      actionHint: 'Hint',
      action: { label: 'Undo', run: vi.fn() },
    });
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
    service.show({ title: 'Saved', kind: 'success' });
    render();
    expect(toasts()[0].classList).toContain('ui-toast--success');
    service.show({ title: 'Failed', kind: TOAST_KIND.Danger });
    render();
    expect(toasts().at(-1)?.classList).toContain('ui-toast--danger');
  });

  it('announces the hint only for a toast with an action', () => {
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'Plain', actionHint: 'Press it' });
    render();
    expect(toasts()[0].querySelector('.ui-toast__hint')).toBeNull();
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
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
      const ref = service.show({
        kind: TOAST_KIND.Info,
        title: 'Link deleted',
        action: { label: 'Undo', run: vi.fn() },
      });
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
      service.show({
        kind: TOAST_KIND.Info,
        title: 'Newer',
        action: { label: 'Undo', run: vi.fn() },
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).not.toBe(outside);
      outside.remove();
    });

    it('does not take body as the place to return to', () => {
      const service = setup();
      const ref = service.show({
        kind: TOAST_KIND.Info,
        title: 'Link deleted',
        action: { label: 'Undo', run: vi.fn() },
      });
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
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
    render();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('has the action reachable by keyboard (a native button in the tab order)', () => {
    const service = setup();
    service.show({
      kind: TOAST_KIND.Info,
      title: 'Link deleted',
      action: { label: 'Undo', run: vi.fn() },
    });
    render();
    const button = toasts()[0].querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
  });

  describe('durations by kind', () => {
    function stays(service: ToastService, options: ToastOptions): number {
      service.show(options);
      render();
      let elapsed = 0;
      while (toasts().length > 0 && elapsed < 20_000) {
        vi.advanceTimersByTime(500);
        render();
        elapsed += 500;
      }
      return elapsed;
    }
    const undo = { label: 'Undo', run: vi.fn() };

    it.each([
      [TOAST_KIND.Success, undefined, 3000],
      [TOAST_KIND.Info, undefined, 4000],
      [TOAST_KIND.Moved, undefined, 4000],
      [TOAST_KIND.Saved, undefined, 5000],
      [TOAST_KIND.Saved, undo, 5000],
      [TOAST_KIND.Moved, undo, 8000],
      [TOAST_KIND.Success, undo, 8000],
    ] as const)('%s with action %o closes after %i ms', (kind, action, ms) => {
      const service = setup();
      expect(stays(service, { kind, title: 'x', action })).toBe(ms);
    });

    it('danger and warn stay until handled, even with an action', () => {
      const service = setup();
      expect(stays(service, { kind: TOAST_KIND.Danger, title: 'x' })).toBe(20_000);
      service.dismiss();
      render();
      expect(stays(service, { kind: TOAST_KIND.Warn, title: 'x', action: undo })).toBe(20_000);
      service.dismiss();
      render();
      expect(
        stays(service, {
          kind: TOAST_KIND.Danger,
          title: 'x',
          action: undo,
          duration: TOAST_DURATION_MS.Undo,
        }),
      ).toBe(8000);
    });

    it('toastDefaultDuration documents the table', () => {
      expect(toastDefaultDuration(TOAST_KIND.Success, false)).toBe(TOAST_DURATION_MS.Quick);
      expect(toastDefaultDuration(TOAST_KIND.Danger, true)).toBe(TOAST_DURATION_MS.Sticky);
    });
  });

  describe('lead and content', () => {
    it('shows the link thumbnail with a check badge for a saved link, an icon without it', () => {
      const service = setup();
      service.show({ kind: TOAST_KIND.Saved, title: 'Saved', thumb: '/api/links/1/image?v=a' });
      service.show({ kind: TOAST_KIND.Saved, title: 'Saved too' });
      render();
      const [withThumb, without] = toasts();
      expect(withThumb.querySelector('img')?.getAttribute('src')).toBe('/api/links/1/image?v=a');
      expect(withThumb.querySelector('img')?.getAttribute('alt')).toBe('');
      expect(withThumb.querySelector('.ui-toast__badge')).not.toBeNull();
      expect(without.querySelector('img')).toBeNull();
      expect(without.querySelector('.ui-toast__thumb ui-icon')).not.toBeNull();
      expect(without.querySelector('.ui-toast__badge')).not.toBeNull();
    });

    it('shows the folder tile in its colour for a move, graphite by default', () => {
      const service = setup();
      service.show({
        kind: TOAST_KIND.Moved,
        title: 'Moved to Clothes',
        folder: { colour: FOLDER_COLOUR.Clay },
      });
      service.show({ kind: TOAST_KIND.Moved, title: 'Moved' });
      render();
      const [clay, graphite] = toasts();
      expect(clay.querySelector('ui-folder-icon')?.classList).toContain('ui-folder-icon--clay');
      expect(graphite.querySelector('ui-folder-icon')?.classList).toContain(
        'ui-folder-icon--graphite',
      );
    });

    it('shows the title and a detail line, and no detail element without one', () => {
      const service = setup();
      service.show({ kind: TOAST_KIND.Info, title: 'Back online', detail: '4 changes synced' });
      service.show({ kind: TOAST_KIND.Info, title: 'Link copied' });
      render();
      expect(toasts()[0].querySelector('.ui-toast__title')?.textContent).toBe('Back online');
      expect(toasts()[0].querySelector('small')?.textContent).toBe('4 changes synced');
      expect(toasts()[1].querySelector('small')).toBeNull();
    });

    it('runs the secondary action once and dismisses', async () => {
      const service = setup();
      const run = vi.fn();
      const later = vi.fn();
      const ref = service.show({
        kind: TOAST_KIND.Warn,
        title: 'Reminder',
        action: { label: 'Open', run },
        secondary: { label: 'Later', run: later },
      });
      render();
      const buttons = toasts()[0].querySelectorAll<HTMLButtonElement>('.ui-toast__action');
      expect([...buttons].map((b) => b.textContent?.trim())).toEqual(['Open', 'Later']);
      buttons[1].click();
      render();
      expect(later).toHaveBeenCalledTimes(1);
      expect(run).not.toHaveBeenCalled();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Action);
      expect(toasts()).toHaveLength(0);
    });

    it('closes with the close button as dismissed, named by the dismiss label', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: TOAST_DISMISS_LABEL, useValue: () => 'Close it' }],
      });
      const service = setup();
      const ref = service.show({ kind: TOAST_KIND.Danger, title: 'Error' });
      render();
      const close = toasts()[0].querySelector('.ui-toast__close') as HTMLButtonElement;
      expect(close.getAttribute('aria-label')).toBe('Close it');
      close.click();
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
    });

    it('names the close button Dismiss by default', () => {
      const service = setup();
      service.show({ kind: TOAST_KIND.Info, title: 'x' });
      render();
      expect(toasts()[0].querySelector('.ui-toast__close')?.getAttribute('aria-label')).toBe(
        'Dismiss',
      );
    });
  });

  describe('Undo countdown line', () => {
    const undo = { label: 'Undo', run: vi.fn() };

    it('runs for the duration of an Undo toast and only for it', () => {
      const service = setup();
      service.show({ kind: TOAST_KIND.Moved, title: 'Moved', action: undo });
      service.show({ kind: TOAST_KIND.Saved, title: 'Saved', action: undo });
      service.show({ kind: TOAST_KIND.Info, title: 'No action' });
      render();
      const [moved, saved, plain] = toasts();
      const timer = moved.querySelector<HTMLElement>('.ui-toast__timer');
      expect(timer?.getAttribute('aria-hidden')).toBe('true');
      expect(timer?.style.getPropertyValue('--ui-toast-duration')).toBe('8000ms');
      expect(saved.querySelector('.ui-toast__timer')).toBeNull();
      expect(plain.querySelector('.ui-toast__timer')).toBeNull();
    });

    it('pauses with the timer', () => {
      const service = setup();
      service.show({ kind: TOAST_KIND.Moved, title: 'Moved', action: undo });
      render();
      const toast = toasts()[0];
      toast.dispatchEvent(new Event('pointerenter'));
      render();
      expect(toast.classList).toContain('ui-toast--paused');
      toast.dispatchEvent(new Event('pointerleave'));
      render();
      expect(toast.classList).not.toContain('ui-toast--paused');
    });
  });

  describe('keyboard', () => {
    const undoToast = (service: ToastService, run = vi.fn()) =>
      service.show({
        kind: TOAST_KIND.Danger,
        title: 'Deleted',
        duration: TOAST_DURATION_MS.Undo,
        action: { label: 'Undo', run },
      });

    function press(init: KeyboardEventInit, target: EventTarget = document.body): KeyboardEvent {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    }

    it('Ctrl+Z and Cmd+Z run the Undo of the newest Undo toast, once', async () => {
      const service = setup();
      const run = vi.fn();
      const ref = undoToast(service, run);
      render();
      const event = press({ code: 'KeyZ', ctrlKey: true });
      expect(event.defaultPrevented).toBe(true);
      expect(run).toHaveBeenCalledTimes(1);
      await expect(ref.closed).resolves.toBe(TOAST_CLOSE_REASON.Action);
      press({ code: 'KeyZ', ctrlKey: true });
      expect(run).toHaveBeenCalledTimes(1);

      const again = vi.fn();
      undoToast(service, again);
      render();
      press({ code: 'KeyZ', metaKey: true });
      expect(again).toHaveBeenCalledTimes(1);
    });

    it('ignores Ctrl+Z without an Undo toast, with extra modifiers and in editable fields', () => {
      const service = setup();
      const run = vi.fn();
      service.show({
        kind: TOAST_KIND.Info,
        title: 'Plain',
        duration: 0,
        action: { label: 'View', run },
      });
      render();
      expect(press({ code: 'KeyZ', ctrlKey: true }).defaultPrevented).toBe(false);
      service.dismiss();
      render();

      undoToast(service, run);
      render();
      expect(press({ code: 'KeyZ', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
      expect(press({ code: 'KeyZ' }).defaultPrevented).toBe(false);
      const input = document.createElement('input');
      const editable = document.createElement('div');
      editable.setAttribute('contenteditable', 'true');
      document.body.append(input, editable);
      expect(press({ code: 'KeyZ', ctrlKey: true }, input).defaultPrevented).toBe(false);
      expect(press({ code: 'KeyZ', ctrlKey: true }, editable).defaultPrevented).toBe(false);
      expect(run).not.toHaveBeenCalled();
      input.remove();
      editable.remove();
    });

    it('Esc dismisses the newest toast, one per press', async () => {
      const service = setup();
      const first = service.show({ kind: TOAST_KIND.Info, title: 'one', duration: 0 });
      const second = service.show({ kind: TOAST_KIND.Danger, title: 'two', duration: 0 });
      render();
      expect(press({ key: 'Escape' }).defaultPrevented).toBe(true);
      await expect(second.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
      render();
      expect(toasts()).toHaveLength(1);
      press({ key: 'Escape' });
      await expect(first.closed).resolves.toBe(TOAST_CLOSE_REASON.Dismissed);
    });

    it('leaves Esc alone without a toast, in dialogs and fields, and when already handled', () => {
      const service = setup();
      expect(press({ key: 'Escape' }).defaultPrevented).toBe(false);
      service.show({ kind: TOAST_KIND.Info, title: 'one', duration: 0 });
      render();
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      const field = document.createElement('input');
      dialog.append(field);
      document.body.append(dialog);
      expect(press({ key: 'Escape' }, field).defaultPrevented).toBe(false);
      expect(press({ key: 'Escape' }, dialog).defaultPrevented).toBe(false);
      const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      handled.preventDefault();
      document.body.dispatchEvent(handled);
      expect(toasts()).toHaveLength(1);
      press({ key: 'Escape' }, document.createTextNode('x'));
      dialog.remove();
    });

    it('stops listening when the injector is destroyed', () => {
      const service = setup();
      service.show({ kind: TOAST_KIND.Info, title: 'one', duration: 0 });
      TestBed.resetTestingModule();
      expect(press({ key: 'Escape' }).defaultPrevented).toBe(false);
    });

    it('focusAction() goes to the newest toast that has an action', () => {
      const service = setup();
      service.show({
        kind: TOAST_KIND.Info,
        title: 'old',
        action: { label: 'Undo', run: vi.fn() },
      });
      service.show({ kind: TOAST_KIND.Info, title: 'newest, no action' });
      render();
      service.focusAction();
      expect(document.activeElement).toBe(toasts()[0].querySelector('.ui-toast__action'));
    });
  });

  it('has the text once in the document (single live region)', () => {
    const service = setup();
    service.show({ kind: TOAST_KIND.Info, title: 'Link saved unique' });
    render();
    expect(document.body.textContent?.split('Link saved unique').length).toBe(2);
  });

  it('has no axe violations for every kind, with and without an action', async () => {
    vi.useRealTimers();
    const service = setup();
    for (const kind of Object.values(TOAST_KIND)) {
      service.show({ title: 'Something happened', kind, action: { label: 'Undo', run: vi.fn() } });
      render();
      expect(await axeViolations(region())).toEqual([]);
      service.show({ title: 'Something happened', kind });
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
      service.show({
        kind: TOAST_KIND.Info,
        title: 'Tag deleted',
        action: { label: 'Undo', run: vi.fn() },
      });
      render();
      expect(raise).toHaveBeenCalledTimes(1);
      // A second toast is already in front: no flicker.
      service.show({ kind: TOAST_KIND.Info, title: 'Another' });
      expect(raise).toHaveBeenCalledTimes(1);
    });

    it('is never aria-hidden by a modal overlay: the region sits in the overlay container', () => {
      const service = setup();
      document.body.setAttribute('aria-hidden', 'false');
      service.show({ kind: TOAST_KIND.Info, title: 'Tag deleted' });
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
