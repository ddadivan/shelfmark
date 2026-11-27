import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SheetDragDirective } from './sheet-drag.directive';

@Component({
  imports: [SheetDragDirective],
  template: `
    <div #panel class="panel">
      <div
        #drag="uiSheetDrag"
        class="handle"
        [uiSheetDrag]="panel"
        [uiSheetDragEnabled]="enabled()"
        (closeRequested)="closed = closed + 1"
      >
        <button type="button" class="control">x</button>
      </div>
      <span class="state">{{ drag.dragging() }}/{{ drag.snapping() }}</span>
    </div>
  `,
})
class HostComponent {
  readonly enabled = signal(true);
  closed = 0;
}

function pointer(
  type: string,
  y: number,
  time: number,
  extra: PointerEventInit = {},
): PointerEvent {
  const event = new PointerEvent(type, {
    pointerId: 1,
    clientY: y,
    bubbles: true,
    button: 0,
    ...extra,
  });
  Object.defineProperty(event, 'timeStamp', { value: time });
  return event;
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root: HTMLElement = fixture.nativeElement;
  const handle = root.querySelector<HTMLElement>('.handle');
  const panel = root.querySelector<HTMLElement>('.panel');
  if (!handle || !panel) {
    throw new Error('missing');
  }
  panel.getBoundingClientRect = () => ({ height: 400 }) as DOMRect;
  return { fixture, root, handle, panel };
}

describe('SheetDragDirective', () => {
  it('follows the finger, closes past 30% of the height and keeps the offset', () => {
    const { fixture, handle, panel, root } = setup();
    handle.dispatchEvent(pointer('pointerdown', 100, 0));
    fixture.detectChanges();
    expect(root.querySelector('.state')?.textContent).toBe('true/false');
    handle.dispatchEvent(pointer('pointermove', 300, 900));
    expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('200px');
    handle.dispatchEvent(pointer('pointerup', 300, 1000));
    fixture.detectChanges();
    expect(fixture.componentInstance.closed).toBe(1);
    expect(root.querySelector('.state')?.textContent).toBe('false/false');
    expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('200px');
  });

  it('snaps back after a short drag', () => {
    const { fixture, handle, panel, root } = setup();
    handle.dispatchEvent(pointer('pointerdown', 100, 0));
    handle.dispatchEvent(pointer('pointermove', 120, 900));
    handle.dispatchEvent(pointer('pointerup', 120, 1000));
    fixture.detectChanges();
    expect(fixture.componentInstance.closed).toBe(0);
    expect(root.querySelector('.state')?.textContent).toBe('false/true');
    expect(panel.style.getPropertyValue('--ui-sheet-drag')).toBe('0px');
  });

  it('snaps back when the pointer is cancelled', () => {
    const { fixture, handle, root } = setup();
    handle.dispatchEvent(pointer('pointerdown', 100, 0));
    handle.dispatchEvent(pointer('pointercancel', 100, 10));
    fixture.detectChanges();
    expect(root.querySelector('.state')?.textContent).toBe('false/true');
  });

  it('ignores a press when disabled, on a control, or by another pointer', () => {
    const { fixture, handle, root } = setup();
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();
    handle.dispatchEvent(pointer('pointerdown', 100, 0));
    expect(root.querySelector('.state')?.textContent).toBe('false/false');
    fixture.componentInstance.enabled.set(true);
    fixture.detectChanges();
    root.querySelector('.control')?.dispatchEvent(pointer('pointerdown', 100, 0));
    fixture.detectChanges();
    expect(root.querySelector('.state')?.textContent).toBe('false/false');
    handle.dispatchEvent(pointer('pointerdown', 100, 0));
    handle.dispatchEvent(pointer('pointerup', 300, 10, { pointerId: 2 }));
    handle.dispatchEvent(pointer('pointercancel', 300, 10, { pointerId: 2 }));
    fixture.detectChanges();
    expect(root.querySelector('.state')?.textContent).toBe('true/false');
  });
});
