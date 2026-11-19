import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChipComponent } from '../../components/chip/chip.component';
import { PopoverComponent } from '../../components/popover/popover.component';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { POPOVER_DELAY_MS } from './models/popover-delay-ms.const';
import { PopoverTriggerDirective } from './popover-trigger.directive';

@Component({
  imports: [ChipComponent, PopoverComponent, PopoverTriggerDirective],
  template: `
    <ui-chip
      id="more"
      variant="neutral"
      clickable
      [uiPopoverTrigger]="pop"
      [uiPopoverTriggerHover]="hover()"
      >+2</ui-chip
    >
    <div id="plain" tabindex="0" [uiPopoverTrigger]="pop">Plain</div>
    <ui-popover #pop heading="All tags">
      <ui-chip clickable>angular</ui-chip>
      <ui-chip clickable>video</ui-chip>
    </ui-popover>
  `,
})
class HostComponent {
  readonly hover = signal(true);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
    }
  };
  await settle();
  const root = fixture.nativeElement as HTMLElement;
  const chipHost = root.querySelector<HTMLElement>('#more') as HTMLElement;
  const trigger = chipHost.querySelector<HTMLButtonElement>('button') as HTMLButtonElement;
  const plain = root.querySelector<HTMLElement>('#plain') as HTMLElement;
  const popHost = root.querySelector<HTMLElement>('ui-popover') as HTMLElement;
  const open = () => popHost.querySelector('.ui-popover__surface:not(.ui-popover--leave)') !== null;
  const wait = async (ms: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
    await settle();
  };
  return { fixture, settle, chipHost, trigger, plain, popHost, open, wait };
}

function pointer(el: HTMLElement, type: 'pointerenter' | 'pointerleave', pointerType = 'mouse') {
  el.dispatchEvent(new PointerEvent(type, { pointerType }));
}

describe('PopoverTriggerDirective', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('writes haspopup, expanded and controls on the inner button of a clickable chip', async () => {
    const { settle, chipHost, trigger, popHost, plain } = await setup();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(popHost.id);
    expect(chipHost.hasAttribute('aria-haspopup')).toBe(false);
    expect(plain.getAttribute('aria-haspopup')).toBe('dialog');

    trigger.click();
    await settle();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(plain.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens after the hover-intent delay and closes after the pointer leaves', async () => {
    const { trigger, open, wait } = await setup();
    pointer(trigger, 'pointerenter');
    await wait(POPOVER_DELAY_MS.Open - 10);
    expect(open()).toBe(false);
    await wait(10);
    expect(open()).toBe(true);
    // Focus stays on the page: hover never moves it.
    expect(document.activeElement).not.toBe(trigger);

    pointer(trigger, 'pointerleave');
    await wait(POPOVER_DELAY_MS.Close - 10);
    expect(open()).toBe(true);
    await wait(10);
    expect(open()).toBe(false);
  });

  it('a pointer that only passes over the trigger opens nothing', async () => {
    const { trigger, open, wait } = await setup();
    pointer(trigger, 'pointerenter');
    await wait(50);
    pointer(trigger, 'pointerleave');
    await wait(POPOVER_DELAY_MS.Open + POPOVER_DELAY_MS.Close);
    expect(open()).toBe(false);
  });

  it('stays open while the pointer moves from the trigger into the panel', async () => {
    const { trigger, popHost, open, wait } = await setup();
    pointer(trigger, 'pointerenter');
    await wait(POPOVER_DELAY_MS.Open);
    pointer(trigger, 'pointerleave');
    await wait(100);
    pointer(popHost, 'pointerenter');
    await wait(POPOVER_DELAY_MS.Close * 2);
    expect(open()).toBe(true);

    pointer(popHost, 'pointerleave');
    await wait(POPOVER_DELAY_MS.Close);
    expect(open()).toBe(false);
  });

  it('ignores touch hover and the hover input turned off', async () => {
    const { fixture, trigger, open, wait } = await setup();
    pointer(trigger, 'pointerenter', 'touch');
    await wait(POPOVER_DELAY_MS.Open * 2);
    expect(open()).toBe(false);

    fixture.componentInstance.hover.set(false);
    await wait(0);
    pointer(trigger, 'pointerenter');
    await wait(POPOVER_DELAY_MS.Open * 2);
    expect(open()).toBe(false);
  });

  it('opens on keyboard focus without moving focus, and closes on blur', async () => {
    const { trigger, open, wait } = await setup();
    trigger.focus();
    await wait(POPOVER_DELAY_MS.Open);
    expect(open()).toBe(true);
    expect(document.activeElement).toBe(trigger);

    trigger.blur();
    await wait(POPOVER_DELAY_MS.Close);
    expect(open()).toBe(false);
  });

  it('a click (or tap) pins it open; the pointer leaving keeps it; a second click closes', async () => {
    const { settle, trigger, open, wait } = await setup();
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();
    expect(open()).toBe(true);
    expect(document.activeElement).not.toBe(trigger.closest('ui-popover'));

    pointer(trigger, 'pointerleave');
    await wait(POPOVER_DELAY_MS.Close * 2);
    expect(open()).toBe(true);

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await wait(0);
    expect(open()).toBe(false);
  });

  it('a click on a popover opened by hover pins it instead of closing it', async () => {
    const { settle, trigger, open, wait } = await setup();
    pointer(trigger, 'pointerenter');
    await wait(POPOVER_DELAY_MS.Open);
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();
    pointer(trigger, 'pointerleave');
    await wait(POPOVER_DELAY_MS.Close * 2);
    expect(open()).toBe(true);
  });

  it('a keyboard activation moves focus into the panel; Esc brings it back to the trigger', async () => {
    const { fixture, settle, trigger, popHost, open, wait } = await setup();
    document.body.append(fixture.nativeElement as HTMLElement);
    trigger.focus();
    // Enter on a button: a click with `detail` 0.
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    await settle();
    expect(open()).toBe(true);
    expect(popHost.contains(document.activeElement)).toBe(true);

    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true }),
    );
    await wait(0);
    expect(open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('Enter on a popover opened by focus moves focus into it', async () => {
    const { settle, trigger, popHost, wait } = await setup();
    trigger.focus();
    await wait(POPOVER_DELAY_MS.Open);
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    await settle();
    expect(popHost.contains(document.activeElement)).toBe(true);
  });
});
