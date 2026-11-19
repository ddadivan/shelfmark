import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { ChipComponent } from '../chip/chip.component';
import { PopoverTriggerDirective } from '../../directives/popover-trigger/popover-trigger.directive';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { overlayLayerClass } from '../../services/overlay/overlay-layer';
import { PopoverComponent } from './popover.component';
import { popoverPositions } from './popover-positions';

@Component({
  imports: [ChipComponent, PopoverComponent, PopoverTriggerDirective],
  template: `
    <ui-chip
      id="more"
      variant="neutral"
      clickable
      ariaLabel="2 more tags: video, reading"
      [uiPopoverTrigger]="pop"
      >+2</ui-chip
    >
    <button id="outside" type="button">Outside</button>
    <ui-popover
      #pop
      heading="All tags"
      (opened)="opened.set(opened() + 1)"
      (closed)="closed.set(closed() + 1)"
    >
      @if (withChips()) {
        <ul>
          <li><ui-chip clickable>angular</ui-chip></li>
          <li><ui-chip clickable>video</ui-chip></li>
          <li><ui-chip clickable>reading</ui-chip></li>
        </ul>
      } @else {
        <p>No controls</p>
      }
    </ui-popover>
  `,
})
class HostComponent {
  readonly opened = signal(0);
  readonly closed = signal(0);
  readonly withChips = signal(true);
}

@Component({
  imports: [PopoverComponent],
  template: `<ui-popover inline heading="Folders"><p>Nothing else here.</p></ui-popover>`,
})
class InlineHostComponent {}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      TestBed.tick();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  await settle();
  const root = fixture.nativeElement as HTMLElement;
  const trigger = root.querySelector<HTMLButtonElement>('#more button') as HTMLButtonElement;
  const outside = root.querySelector<HTMLElement>('#outside') as HTMLElement;
  const popHost = root.querySelector<HTMLElement>('ui-popover') as HTMLElement;
  const popover = fixture.debugElement.children
    .map((child) => child.componentInstance as unknown)
    .find((instance): instance is PopoverComponent => instance instanceof PopoverComponent);
  if (!popover) {
    throw new Error('no popover');
  }
  const surface = () => popHost.querySelector('.ui-popover__surface');
  const chips = () => [...popHost.querySelectorAll<HTMLButtonElement>('button.ui-chip__body')];
  const key = async (target: EventTarget, name: string, init: KeyboardEventInit = {}) => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
    );
    await settle();
  };
  return { fixture, settle, trigger, outside, popHost, popover, surface, chips, key };
}

describe('PopoverComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('is a dialog named by its heading, hidden and empty while closed', async () => {
    const { popHost, surface, popover } = await setup();
    expect(popHost.getAttribute('role')).toBe('dialog');
    expect(popHost.id).toBe(popover.id);
    expect(popHost.classList).not.toContain('ui-popover--shown');
    expect(surface()).toBeNull();
    expect(popover.isOpen()).toBe(false);
  });

  it('opens in an overlay pane of the menu layer, with its heading and content', async () => {
    const { settle, trigger, popHost, popover, surface, fixture } = await setup();
    popover.openFrom(trigger);
    await settle();

    expect(popHost.closest('.cdk-overlay-pane')).not.toBeNull();
    expect(popHost.closest('.cdk-overlay-connected-position-bounding-box')?.classList).toContain(
      overlayLayerClass(OVERLAY_LAYER.Menu),
    );
    const heading = popHost.querySelector('.ui-popover__heading');
    expect(heading?.textContent.trim()).toBe('All tags');
    expect(popHost.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(surface()?.textContent).toContain('reading');
    expect(popover.anchor()).toBe(trigger);
    expect(fixture.componentInstance.opened()).toBe(1);
    // Opened in code without focus: focus stays where it was.
    expect(popover.containsFocus()).toBe(false);
  });

  it('prefers the space above the trigger, start edge first', () => {
    const [first, second, third] = popoverPositions();
    expect(first).toEqual({
      originX: 'start',
      overlayX: 'start',
      originY: 'top',
      overlayY: 'bottom',
    });
    expect(second?.originX).toBe('end');
    expect(third?.originY).toBe('bottom');
  });

  it('moves focus to its first control with focus, or to the panel when it has none', async () => {
    const { fixture, settle, trigger, popover, chips, surface } = await setup();
    popover.openFrom(trigger, { focus: true });
    await settle();
    expect(document.activeElement).toBe(chips()[0]);

    popover.close();
    await settle();
    fixture.componentInstance.withChips.set(false);
    await settle();
    popover.openFrom(trigger, { focus: true });
    await settle();
    expect(document.activeElement).toBe(surface());
  });

  it('closes on Esc from inside and gives focus back to the trigger', async () => {
    const { fixture, settle, trigger, popover, chips, key } = await setup();
    document.body.append(fixture.nativeElement as HTMLElement);
    popover.openFrom(trigger, { focus: true });
    await settle();
    await key(chips()[1] as HTMLElement, KEYBOARD_KEY.Escape);

    expect(popover.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.closed()).toBe(1);
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('closes on Esc while focus is on the trigger (opened by focus or hover)', async () => {
    const { settle, trigger, popover, key } = await setup();
    trigger.focus();
    popover.openFrom(trigger);
    await settle();
    await key(trigger, KEYBOARD_KEY.Escape);
    expect(popover.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on a press outside without moving focus, and stays open for a press inside', async () => {
    const { settle, trigger, outside, popover, chips } = await setup();
    popover.openFrom(trigger);
    await settle();
    chips()[0]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(popover.isOpen()).toBe(true);

    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(popover.isOpen()).toBe(false);
    expect(document.activeElement).not.toBe(trigger);
  });

  it('Tab past the last control or Shift+Tab before the first closes it on the trigger', async () => {
    const { settle, trigger, popover, chips, key } = await setup();
    popover.openFrom(trigger, { focus: true });
    await settle();
    (chips()[2] as HTMLElement).focus();
    await key(chips()[2] as HTMLElement, KEYBOARD_KEY.Tab);
    expect(popover.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);

    popover.openFrom(trigger, { focus: true });
    await settle();
    const back = new KeyboardEvent('keydown', {
      key: KEYBOARD_KEY.Tab,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    chips()[0]?.dispatchEvent(back);
    await settle();
    expect(back.defaultPrevented).toBe(true);
    expect(popover.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('Tab between its controls keeps it open', async () => {
    const { settle, trigger, popover, chips, key } = await setup();
    popover.openFrom(trigger, { focus: true });
    await settle();
    await key(chips()[0] as HTMLElement, KEYBOARD_KEY.Tab);
    expect(popover.isOpen()).toBe(true);
  });

  it('closes when focus leaves for an element outside', async () => {
    const { settle, trigger, outside, popover, popHost } = await setup();
    popover.openFrom(trigger, { focus: true });
    await settle();
    popHost.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await settle();
    expect(popover.isOpen()).toBe(false);
  });

  it('reports the pointer over the panel', async () => {
    const { settle, trigger, popover, popHost } = await setup();
    popover.openFrom(trigger);
    await settle();
    popHost.dispatchEvent(new PointerEvent('pointerenter'));
    expect(popover.hovered()).toBe(true);
    popHost.dispatchEvent(new PointerEvent('pointerleave'));
    expect(popover.hovered()).toBe(false);
  });

  it('removes its document listeners and host on destroy', async () => {
    const { fixture, settle, trigger, popover, popHost } = await setup();
    popover.openFrom(trigger);
    await settle();
    const remove = vi.spyOn(document, 'removeEventListener');
    fixture.destroy();
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(popHost.isConnected).toBe(false);
    remove.mockRestore();
  });

  it('inline renders the panel in place, always open, and ignores open and close', async () => {
    const fixture = TestBed.createComponent(InlineHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const popHost = root.querySelector<HTMLElement>('ui-popover') as HTMLElement;
    const popover = fixture.debugElement.children[0]?.componentInstance as PopoverComponent;
    expect(popHost.classList).toContain('ui-popover--inline');
    expect(popHost.querySelector('.ui-popover__surface')?.textContent).toContain('Folders');
    popover.openFrom(root);
    popover.close();
    fixture.detectChanges();
    expect(popHost.closest('.cdk-overlay-pane')).toBeNull();
    expect(popHost.querySelector('.ui-popover__surface')).not.toBeNull();
    expect(popover.isOpen()).toBe(false);
  });

  it('has no axe violations, closed and open', async () => {
    const { fixture, settle, trigger, popover, popHost } = await setup();
    document.body.append(fixture.nativeElement as HTMLElement);
    expect(await axeViolations(fixture.nativeElement as HTMLElement)).toEqual([]);
    popover.openFrom(trigger);
    await settle();
    expect(await axeViolations(popHost)).toEqual([]);
    (fixture.nativeElement as HTMLElement).remove();
  });
});
