import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { ResizeHandleComponent } from './resize-handle.component';
import { UiResizeHandleHarness } from './testing/resize-handle.harness';

@Component({
  imports: [ResizeHandleComponent],
  template: `
    <ui-resize-handle
      label="Resize the preview panel"
      hint="Drag or use the arrow keys"
      [min]="200"
      [max]="600"
      [(value)]="value"
      (resetRequested)="resets.set(resets() + 1)"
    />
  `,
})
class HostComponent {
  readonly value = signal(400);
  readonly resets = signal(0);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const harness = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiResizeHandleHarness);
  const el = fixture.nativeElement as HTMLElement;
  const handle = el.querySelector<HTMLElement>('[role="separator"]') as HTMLElement;
  return { fixture, harness, host: fixture.componentInstance, el, handle };
}

function pointer(type: string, init: PointerEventInit): PointerEvent {
  return new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, ...init });
}

describe('ui-resize-handle', () => {
  it('is a named vertical separator that reports value and limits', async () => {
    const { harness, handle, fixture, el } = await setup();
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(await harness.label()).toBe('Resize the preview panel');
    expect(await harness.getValue()).toBe(400);
    expect(await harness.getLimits()).toEqual({ min: 200, max: 600 });
    expect(await axeViolations(el)).toEqual([]);
    expect(fixture.componentInstance.value()).toBe(400);
  });

  it('moves 16px with the arrows and 64px with Shift', async () => {
    const { harness, host } = await setup();
    await harness.pressKey('ArrowRight');
    expect(host.value()).toBe(416);
    await harness.pressKey('ArrowLeft');
    expect(host.value()).toBe(400);
    await harness.pressKey('ArrowRight', { shift: true });
    expect(host.value()).toBe(464);
  });

  it('jumps with Home and End and asks to reset on Enter and double click', async () => {
    const { harness, host } = await setup();
    await harness.pressKey('End');
    expect(await harness.getValue()).toBe(600);
    await harness.pressKey('Home');
    expect(host.value()).toBe(200);
    await harness.pressKey('Enter');
    await harness.doubleClick();
    expect(host.resets()).toBe(2);
  });

  it('ignores other keys', async () => {
    const { handle, host } = await setup();
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    handle.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(host.value()).toBe(400);
  });

  it('drags with the pointer, clamps, and sets the dragging state and body cursor', async () => {
    const { handle, host, fixture } = await setup();
    handle.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    fixture.detectChanges();
    expect(handle.classList).toContain('ui-resize-handle--dragging');
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    handle.dispatchEvent(pointer('pointermove', { clientX: 150 }));
    expect(host.value()).toBe(450);
    handle.dispatchEvent(pointer('pointermove', { clientX: 5000 }));
    expect(host.value()).toBe(600);
    handle.dispatchEvent(pointer('pointermove', { clientX: -5000 }));
    expect(host.value()).toBe(200);

    handle.dispatchEvent(pointer('pointerup', { clientX: 0 }));
    fixture.detectChanges();
    expect(handle.classList).not.toContain('ui-resize-handle--dragging');
    expect(document.body.style.cursor).toBe('');
    handle.dispatchEvent(pointer('pointermove', { clientX: 300 }));
    expect(host.value()).toBe(200);
  });

  it('drops its hint while a drag runs, so the tooltip never follows the pointer', async () => {
    const { handle, fixture } = await setup();
    expect(handle.getAttribute('aria-description')).toBe('Drag or use the arrow keys');
    handle.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    await fixture.whenStable();
    expect(handle.hasAttribute('aria-description')).toBe(false);
    handle.dispatchEvent(pointer('pointerup', { clientX: 120 }));
    await fixture.whenStable();
    expect(handle.getAttribute('aria-description')).toBe('Drag or use the arrow keys');
  });

  it('takes no focus from a pointer drag, so the page keeps its keys', async () => {
    const { handle } = await setup();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    handle.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    handle.dispatchEvent(pointer('pointerup', { clientX: 140 }));
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('ignores other buttons and other pointers, and restores the body on destroy', async () => {
    const { handle, host, fixture } = await setup();
    handle.dispatchEvent(pointer('pointerdown', { clientX: 100, button: 2 }));
    handle.dispatchEvent(pointer('pointermove', { clientX: 150 }));
    expect(host.value()).toBe(400);

    handle.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    handle.dispatchEvent(pointer('pointermove', { clientX: 150, pointerId: 2 }));
    handle.dispatchEvent(pointer('pointerup', { pointerId: 2 }));
    expect(host.value()).toBe(400);
    expect(document.body.style.cursor).toBe('col-resize');
    fixture.destroy();
    expect(document.body.style.cursor).toBe('');
  });

  it('keeps the grip visible and turns it accent on hover, focus and drag', () => {
    const css = compileScss('lib/components/resize-handle/resize-handle.component.scss');
    expect(css).toContain('var(--border-control)');
    expect(css).toMatch(/hover: hover[\s\S]*var\(--accent\)/);
    expect(css).toMatch(/focus-visible[\s\S]*var\(--accent\)/);
    expect(css).toMatch(/dragging[\s\S]*var\(--accent\)/);
    expect(css).toContain('prefers-reduced-motion');
  });
});
