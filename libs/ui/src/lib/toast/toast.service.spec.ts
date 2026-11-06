import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ToastService } from './toast.service';

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
    expect(live.closest('.ui-overlay-layer--toast')).not.toBeNull();
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
    ['info', 'info'],
    ['success', 'check'],
    ['error', 'error'],
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
    for (const kind of ['info', 'success', 'error'] as const) {
      service.show({ text: 'Something happened', kind, action: { label: 'Undo', run: vi.fn() } });
      render();
      expect(await axeViolations(region())).toEqual([]);
      service.show({ text: 'Something happened', kind });
      render();
      expect(await axeViolations(region())).toEqual([]);
    }
  });
});
