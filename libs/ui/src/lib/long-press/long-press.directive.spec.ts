import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LongPressDirective } from './long-press.directive';
import {
  LONG_PRESS_CLICK_GUARD_MS,
  LONG_PRESS_DURATION_MS,
  LONG_PRESS_MOVE_TOLERANCE_PX,
} from './models/long-press.const';
import type { UiLongPressEvent } from './models/long-press-event.interface';

@Component({
  imports: [LongPressDirective],
  template: `
    <button
      type="button"
      uiLongPress
      [uiLongPressDisabled]="disabled()"
      (uiLongPress)="events.push($event)"
      (click)="clicks.set(clicks() + 1)"
    >
      Card
    </button>
  `,
})
class HostComponent {
  readonly disabled = signal(false);
  readonly clicks = signal(0);
  readonly events: UiLongPressEvent[] = [];
}

function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    isPrimary: true,
    pointerType: 'touch',
    clientX: 20,
    clientY: 30,
    ...init,
  });
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const el = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  return { fixture, cmp: fixture.componentInstance, el };
}

describe('LongPressDirective', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('emits after the hold with the origin element and position', () => {
    const { cmp, el } = setup();
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS - 1);
    expect(cmp.events).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(cmp.events).toEqual([{ origin: el, x: 20, y: 30 }]);
  });

  it('works with a pen but ignores a mouse and non-primary pointers', () => {
    const { cmp, el } = setup();
    el.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    el.dispatchEvent(pointer('pointerdown', { isPrimary: false }));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    expect(cmp.events).toHaveLength(0);
    el.dispatchEvent(pointer('pointerdown', { pointerType: 'pen' }));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    expect(cmp.events).toHaveLength(1);
  });

  it('cancels on a move beyond the threshold but not within it', () => {
    const { cmp, el } = setup();
    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(pointer('pointermove', { clientX: 20 + LONG_PRESS_MOVE_TOLERANCE_PX }));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    expect(cmp.events).toHaveLength(1);

    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(pointer('pointermove', { clientX: 20 + LONG_PRESS_MOVE_TOLERANCE_PX + 1 }));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    expect(cmp.events).toHaveLength(1);
  });

  it('cancels on pointerup, pointercancel and scroll', () => {
    const { cmp, el } = setup();
    for (const cancel of [
      () => el.dispatchEvent(pointer('pointerup')),
      () => el.dispatchEvent(pointer('pointercancel')),
      () => document.dispatchEvent(new Event('scroll')),
    ]) {
      el.dispatchEvent(pointer('pointerdown'));
      vi.advanceTimersByTime(LONG_PRESS_DURATION_MS - 100);
      cancel();
      vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    }
    expect(cmp.events).toHaveLength(0);
  });

  it('swallows the following click and the context menu only when it fired', () => {
    const { fixture, cmp, el } = setup();
    // No long press: the click and the context menu are untouched.
    el.dispatchEvent(pointer('pointerdown'));
    el.dispatchEvent(pointer('pointerup'));
    const plainMenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    el.dispatchEvent(plainMenu);
    el.click();
    expect(plainMenu.defaultPrevented).toBe(false);
    expect(cmp.clicks()).toBe(1);

    // After a long press both are swallowed, once.
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    el.dispatchEvent(menu);
    el.dispatchEvent(pointer('pointerup'));
    el.click();
    fixture.detectChanges();
    expect(menu.defaultPrevented).toBe(true);
    expect(cmp.clicks()).toBe(1);
    el.click();
    expect(cmp.clicks()).toBe(2);
  });

  it('stops swallowing after the guard time', () => {
    const { cmp, el } = setup();
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    el.dispatchEvent(pointer('pointerup'));
    vi.advanceTimersByTime(LONG_PRESS_CLICK_GUARD_MS);
    el.click();
    expect(cmp.clicks()).toBe(1);
  });

  it('does nothing while disabled and never reacts to the keyboard', () => {
    const { fixture, cmp, el } = setup();
    cmp.disabled.set(true);
    fixture.detectChanges();
    el.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(cmp.events).toHaveLength(0);
  });

  it('turns off the iOS touch callout and clears timers on destroy', () => {
    const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty');
    const { fixture, cmp, el } = setup();
    expect(setProperty).toHaveBeenCalledWith('-webkit-touch-callout', 'none');
    setProperty.mockRestore();
    el.dispatchEvent(pointer('pointerdown'));
    fixture.destroy();
    vi.advanceTimersByTime(LONG_PRESS_DURATION_MS);
    expect(cmp.events).toHaveLength(0);
  });
});
