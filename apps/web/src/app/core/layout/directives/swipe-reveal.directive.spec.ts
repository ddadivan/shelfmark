import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { queryRequired } from '../../../../testing/query-required';
import { SwipeRevealDirective } from './swipe-reveal.directive';

@Component({
  imports: [SwipeRevealDirective],
  template: `
    <div #actions class="actions"><button class="action">Remove</button></div>
    <button class="outside">Outside</button>
    <div
      #swipe="appSwipeReveal"
      class="surface"
      [appSwipeReveal]="enabled()"
      [appSwipeRevealActions]="actions"
    ></div>
  `,
})
class Host {
  readonly enabled = signal(true);
}

const WIDTH = 100;

function pointer(type: string, x: number, y = 0, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    clientX: x,
    clientY: y,
    isPrimary: true,
    button: 0,
    bubbles: true,
    ...init,
  });
}

describe('SwipeRevealDirective', () => {
  let host: Host;
  let surface: HTMLElement;
  let actions: HTMLElement;
  let outside: HTMLElement;
  let action: HTMLElement;
  let directive: SwipeRevealDirective;
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    surface = queryRequired<HTMLElement>(root, '.surface');
    actions = queryRequired<HTMLElement>(root, '.actions');
    outside = queryRequired<HTMLElement>(root, '.outside');
    action = queryRequired<HTMLElement>(root, '.action');
    Object.defineProperty(actions, 'offsetWidth', { value: WIDTH });
    surface.setPointerCapture = vi.fn();
    const found = fixture.debugElement.children
      .find((el) => el.nativeElement === surface)
      ?.injector.get(SwipeRevealDirective);
    if (!found) throw new Error('SwipeRevealDirective not found on the surface');
    directive = found;
    await fixture.whenStable();
  });

  afterEach(() => fixture.nativeElement.remove());

  it('starts closed', () => {
    expect(directive.offset()).toBe(0);
    expect(directive.open()).toBe(false);
    expect(directive.dragging()).toBe(false);
  });

  it('follows a sideways drag, clamped to the actions width, and snaps open past half', async () => {
    surface.dispatchEvent(pointer('pointerdown', 200));
    surface.dispatchEvent(pointer('pointermove', 150, 2, { pointerId: 1 }));
    expect(directive.dragging()).toBe(true);
    expect(surface.setPointerCapture).toHaveBeenCalledWith(1);
    expect(directive.offset()).toBe(-50);
    surface.dispatchEvent(pointer('pointermove', 20));
    expect(directive.offset()).toBe(-WIDTH);
    surface.dispatchEvent(pointer('pointerup', 20));
    expect(directive.open()).toBe(true);
    expect(directive.offset()).toBe(-WIDTH);
    expect(directive.dragging()).toBe(false);
    fixture.detectChanges();
    expect(surface.style.translate).toBe('-100px');
  });

  it('snaps back closed when released before half', () => {
    surface.dispatchEvent(pointer('pointerdown', 200));
    surface.dispatchEvent(pointer('pointermove', 170));
    surface.dispatchEvent(pointer('pointerup', 170));
    expect(directive.open()).toBe(false);
    expect(directive.offset()).toBe(0);
  });

  it('closes an open row with a drag to the right', () => {
    directive.setOpen(true);
    surface.dispatchEvent(pointer('pointerdown', 100));
    surface.dispatchEvent(pointer('pointermove', 190));
    surface.dispatchEvent(pointer('pointercancel', 190));
    expect(directive.open()).toBe(false);
    expect(directive.offset()).toBe(0);
  });

  it('leaves a vertical drag to the page scroll', () => {
    surface.dispatchEvent(pointer('pointerdown', 100, 100));
    surface.dispatchEvent(pointer('pointermove', 104, 140));
    surface.dispatchEvent(pointer('pointermove', 20, 140));
    expect(directive.dragging()).toBe(false);
    expect(directive.offset()).toBe(0);
  });

  it('ignores small movements and non-primary or non-main buttons', () => {
    surface.dispatchEvent(pointer('pointerdown', 100));
    surface.dispatchEvent(pointer('pointermove', 95));
    expect(directive.dragging()).toBe(false);
    surface.dispatchEvent(pointer('pointerup', 95));
    surface.dispatchEvent(pointer('pointerdown', 100, 0, { isPrimary: false }));
    surface.dispatchEvent(pointer('pointermove', 20));
    expect(directive.dragging()).toBe(false);
    surface.dispatchEvent(pointer('pointerdown', 100, 0, { button: 2 }));
    surface.dispatchEvent(pointer('pointermove', 20));
    expect(directive.dragging()).toBe(false);
  });

  it('does not swipe while disabled', async () => {
    host.enabled.set(false);
    fixture.detectChanges();
    surface.dispatchEvent(pointer('pointerdown', 200));
    surface.dispatchEvent(pointer('pointermove', 100));
    expect(directive.dragging()).toBe(false);
    expect(directive.offset()).toBe(0);
  });

  it('swallows the click that ends a drag, once', async () => {
    surface.dispatchEvent(pointer('pointerdown', 200));
    surface.dispatchEvent(pointer('pointermove', 100));
    surface.dispatchEvent(pointer('pointerup', 100));
    expect(directive.takeClick()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve));
    expect(directive.takeClick()).toBe(false);
  });

  it('opens when an action gets focus and closes when focus leaves', () => {
    action.focus();
    expect(directive.open()).toBe(true);
    expect(directive.offset()).toBe(-WIDTH);
    outside.focus();
    expect(directive.open()).toBe(false);
    expect(directive.offset()).toBe(0);
  });

  it('stays open while focus moves inside the actions', () => {
    action.focus();
    actions.dispatchEvent(new FocusEvent('focusout', { relatedTarget: action, bubbles: true }));
    expect(directive.open()).toBe(true);
  });
});
