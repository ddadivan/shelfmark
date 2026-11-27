import { DOCUMENT } from '@angular/common';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Dismissable } from './dismissable';
import type { DismissableEvent } from './models/dismissable-event.interface';

function setup(options: { escape?: boolean; ignore?: string } = {}) {
  const doc = TestBed.inject(DOCUMENT);
  const layer = doc.createElement('div');
  const input = doc.createElement('input');
  layer.append(input);
  const toast = doc.createElement('div');
  toast.className = 'toast';
  const toastButton = doc.createElement('button');
  toast.append(toastButton);
  const outside = doc.createElement('button');
  doc.body.append(layer, toast, outside);
  const events: DismissableEvent[] = [];
  const dismissable = runInInjectionContext(
    TestBed.inject(Injector),
    () =>
      new Dismissable({
        inside: () => [layer, null],
        dismissed: (event) => events.push(event),
        ...options,
      }),
  );
  return { doc, layer, input, toast, toastButton, outside, events, dismissable };
}

const press = (target: Element): void => {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
};

describe('Dismissable', () => {
  it('does nothing until armed', () => {
    const { outside, events } = setup();
    press(outside);
    expect(events).toEqual([]);
  });

  it('dismisses on a press outside, not inside', () => {
    const { dismissable, outside, layer, events } = setup();
    dismissable.arm();
    press(layer);
    expect(events).toEqual([]);
    press(outside);
    expect(events.map((e) => e.reason)).toEqual(['pointer']);
    expect(events[0]?.focusInside).toBe(false);
  });

  it('treats the ignore selector as inside', () => {
    const { dismissable, toastButton, toast, events } = setup({ ignore: '.toast' });
    dismissable.arm();
    press(toastButton);
    expect(events).toEqual([]);
    expect(dismissable.contains(toast)).toBe(true);
  });

  it('dismisses on Esc and stops it only while focus is inside', () => {
    const { dismissable, input, outside, doc, events } = setup();
    dismissable.arm();
    const stop = vi.fn();
    const inside = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    inside.stopPropagation = stop;
    input.focus();
    doc.dispatchEvent(inside);
    expect(stop).toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({ reason: 'escape', focusInside: true });

    outside.focus();
    const other = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    other.stopPropagation = stop;
    stop.mockClear();
    doc.dispatchEvent(other);
    expect(stop).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({ reason: 'escape', focusInside: false });
  });

  it('ignores other keys and, with escape off, Esc', () => {
    const { dismissable, doc, events } = setup({ escape: false });
    dismissable.arm();
    doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(events).toEqual([]);
  });

  it('removes its listeners on disarm and on destroy', () => {
    const { dismissable, outside, events } = setup();
    const spy = vi.spyOn(TestBed.inject(DOCUMENT), 'removeEventListener');
    dismissable.arm();
    dismissable.arm();
    expect(dismissable.armed).toBe(true);
    dismissable.disarm();
    expect(dismissable.armed).toBe(false);
    press(outside);
    expect(events).toEqual([]);
    dismissable.arm();
    TestBed.resetTestingModule();
    expect(spy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(dismissable.armed).toBe(false);
  });
});
