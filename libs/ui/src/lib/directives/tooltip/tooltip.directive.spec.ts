import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { ButtonComponent } from '../../components/button/button.component';
import type { TooltipPosition } from './models/tooltip-position.type';
import { TooltipPanelComponent } from './tooltip-panel/tooltip-panel.component';
import { TooltipDirective } from './tooltip.directive';
import { markFocusReturn } from '../../services/dialog/focus-return';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { OVERLAY_SIDE } from '../../services/overlay/models/overlay-side.const';
import { overlayLayerClass } from '../../services/overlay/overlay-layer';
import type { OverlaySide } from '../../services/overlay/models/overlay-side.type';

@Component({
  imports: [TooltipDirective, ButtonComponent],
  template: `
    <ui-button
      id="btn"
      [uiTooltip]="text()"
      [position]="position()"
      [delay]="delay()"
      [uiTooltipShortcut]="shortcut()"
      iconLeft="search"
      iconOnly
      ariaLabel="Open search"
    />
    <div id="plain" tabindex="0" uiTooltip="Plain host">Plain</div>
    <button id="native" type="button" uiTooltip="Native" aria-describedby="other">Native</button>
    <button id="wide" type="button" uiTooltip="Wide" [uiTooltipPointerTarget]="label">
      <span #label id="label">Label</span>
    </button>
  `,
})
class HostComponent {
  readonly text = signal('Search');
  readonly position = signal<TooltipPosition>(OVERLAY_SIDE.Top);
  readonly delay = signal(400);
  readonly shortcut = signal('');
}

function mockMatchMedia(noHover: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: noHover && query.includes('hover: none'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

async function setup(options: { noHover?: boolean } = {}) {
  mockMatchMedia(options.noHover ?? false);
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  // No `whenStable()`: with fake timers the zoneless scheduler never settles.
  fixture.detectChanges();
  TestBed.tick();
  const root = fixture.nativeElement as HTMLElement;
  const host = root.querySelector<HTMLElement>('#btn') as HTMLElement;
  const inner = host.querySelector<HTMLElement>('button') as HTMLElement;
  const plain = root.querySelector<HTMLElement>('#plain') as HTMLElement;
  const native = root.querySelector<HTMLElement>('#native') as HTMLElement;
  const settle = (): void => {
    fixture.detectChanges();
    TestBed.tick();
  };
  const panelEl = () => document.querySelector<HTMLElement>('.ui-tooltip');
  const pane = () => document.querySelector<HTMLElement>('.cdk-overlay-pane');
  return { fixture, host, inner, plain, native, settle, panelEl, pane };
}

function enter(el: HTMLElement, pointerType = 'mouse'): void {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType }));
}

function leave(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerleave'));
}

describe('TooltipDirective', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('sets aria-description on the inner button of ui-button, not on the host', async () => {
    const { host, inner, settle } = await setup();
    settle();
    expect(inner.getAttribute('aria-description')).toBe('Search');
    expect(host.hasAttribute('aria-description')).toBe(false);
  });

  it('uses the host element on other hosts and leaves an existing aria-describedby alone', async () => {
    const { plain, native, settle } = await setup();
    settle();
    expect(plain.getAttribute('aria-description')).toBe('Plain host');
    expect(native.getAttribute('aria-describedby')).toBe('other');
    expect(native.getAttribute('aria-description')).toBe('Native');
  });

  it('includes the shortcut in the description', async () => {
    const { fixture, inner, settle } = await setup();
    fixture.componentInstance.shortcut.set('⌘K');
    settle();
    expect(inner.getAttribute('aria-description')).toBe('Search (⌘K)');
  });

  it('creates no node in the body for the description', async () => {
    const { settle } = await setup();
    settle();
    expect(document.querySelector('.ui-tooltip-description')).toBeNull();
    expect(document.querySelector('[id^="ui-tooltip-"]')).toBeNull();
  });

  it('shows after 400 ms on hover and hides after the pointer leaves', async () => {
    const { inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(399);
    expect(panelEl()).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    settle();
    expect(panelEl()?.textContent).toContain('Search');
    leave(inner);
    await vi.advanceTimersByTimeAsync(150);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('reads hover on uiTooltipPointerTarget only; focus and the description stay on the host', async () => {
    const { fixture, settle, panelEl } = await setup();
    const root = fixture.nativeElement as HTMLElement;
    const wide = root.querySelector<HTMLElement>('#wide') as HTMLElement;
    const label = root.querySelector<HTMLElement>('#label') as HTMLElement;
    settle();
    expect(wide.getAttribute('aria-description')).toBe('Wide');

    enter(wide);
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();

    enter(label);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()?.textContent).toContain('Wide');
    leave(label);
    await vi.advanceTimersByTimeAsync(150);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('honours a custom delay', async () => {
    const { fixture, inner, settle, panelEl } = await setup();
    fixture.componentInstance.delay.set(100);
    settle();
    enter(inner);
    await vi.advanceTimersByTimeAsync(100);
    settle();
    expect(panelEl()).not.toBeNull();
  });

  it('shows on keyboard focus and hides on blur', async () => {
    const { inner, settle, panelEl } = await setup();
    const spy = vi.spyOn(inner, 'matches').mockReturnValue(true);
    inner.dispatchEvent(new FocusEvent('focus'));
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
    inner.dispatchEvent(new FocusEvent('blur'));
    await vi.advanceTimersByTimeAsync(150);
    settle();
    expect(panelEl()).toBeNull();
    spy.mockRestore();
  });

  it('ignores focus that is not keyboard focus', async () => {
    const { inner, settle, panelEl } = await setup();
    vi.spyOn(inner, 'matches').mockReturnValue(false);
    inner.dispatchEvent(new FocusEvent('focus'));
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('ignores focus that a closing dialog hands back, and opens for the next real focus', async () => {
    const { inner, settle, panelEl } = await setup();
    vi.spyOn(inner, 'matches').mockReturnValue(true);
    markFocusReturn();
    inner.dispatchEvent(new FocusEvent('focus'));
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();

    inner.dispatchEvent(new FocusEvent('blur'));
    await vi.advanceTimersByTimeAsync(200);
    inner.dispatchEvent(new FocusEvent('focus'));
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
  });

  it('shows on keyboard focus of a real element and on a plain host', async () => {
    const { plain, settle, panelEl } = await setup();
    plain.focus();
    await vi.advanceTimersByTimeAsync(400);
    settle();
    // jsdom may not report :focus-visible; the tooltip appears either way for hover below.
    leave(plain);
    enter(plain);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()?.textContent).toContain('Plain host');
  });

  it('Esc closes it without moving focus and it stays closed until the pointer leaves', async () => {
    const { inner, settle, panelEl } = await setup();
    inner.focus();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
    const event = new KeyboardEvent('keydown', {
      key: KEYBOARD_KEY.Escape,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    settle();
    expect(panelEl()).toBeNull();
    expect(document.activeElement).toBe(inner);
    enter(inner);
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();
    inner.blur();
    leave(inner);
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
  });

  it('Esc while only the show timer is pending cancels it and lets Esc pass on', async () => {
    const { inner, settle, panelEl } = await setup();
    const seen = vi.fn();
    document.body.addEventListener('keydown', seen);
    enter(inner);
    await vi.advanceTimersByTimeAsync(200);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true }),
    );
    expect(seen).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();
    document.body.removeEventListener('keydown', seen);
  });

  it('Esc on an open tooltip of the focused trigger does not reach other listeners', async () => {
    const { inner, settle } = await setup();
    const seen = vi.fn();
    document.body.addEventListener('keydown', seen);
    inner.focus();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true }),
    );
    expect(seen).not.toHaveBeenCalled();
    document.body.removeEventListener('keydown', seen);
  });

  it('Esc closes a pointer-opened tooltip and still reaches a field focused elsewhere', async () => {
    const { inner, settle, panelEl } = await setup();
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    const seen = vi.fn();
    field.addEventListener('keydown', seen);
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
    field.dispatchEvent(new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Escape, bubbles: true }));
    settle();
    expect(panelEl()).toBeNull();
    expect(seen).toHaveBeenCalledTimes(1);
    field.remove();
  });

  it('skips the description when the text equals the accessible name', async () => {
    const { fixture, inner, settle } = await setup();
    fixture.componentInstance.text.set('Open search');
    settle();
    // the ui-button has aria-label "Open search": no double announcement
    expect(inner.getAttribute('aria-label')).toBe('Open search');
    expect(inner.hasAttribute('aria-description')).toBe(false);
    fixture.componentInstance.text.set('Find links');
    settle();
    expect(inner.hasAttribute('aria-description')).toBe(true);
  });

  it('keeps the description with a shortcut even if the name matches', async () => {
    const { fixture, inner, settle } = await setup();
    fixture.componentInstance.text.set('Open search');
    fixture.componentInstance.shortcut.set('⌘K');
    settle();
    expect(inner.hasAttribute('aria-description')).toBe(true);
  });

  it('removes the description when the text becomes empty', async () => {
    const { fixture, inner, settle } = await setup();
    fixture.componentInstance.text.set('Find links');
    settle();
    expect(inner.getAttribute('aria-description')).toBe('Find links');
    fixture.componentInstance.text.set('');
    settle();
    expect(inner.hasAttribute('aria-description')).toBe(false);
  });

  it('keeps working when the position changes while open', async () => {
    const { fixture, inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    fixture.componentInstance.position.set(OVERLAY_SIDE.Right);
    settle();
    expect(panelEl()).toBeNull();
    leave(inner);
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
  });

  it('survives rapid hover in and out with a re-hover during the leave', async () => {
    const { inner, settle, panelEl } = await setup();
    for (let i = 0; i < 3; i++) {
      enter(inner);
      await vi.advanceTimersByTimeAsync(400);
      settle();
      leave(inner);
      await vi.advanceTimersByTimeAsync(110);
      settle();
    }
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
  });

  it('after a flip, re-measures only once the panel has rendered the new side', async () => {
    let report: ((side: OverlaySide) => void) | undefined;
    const connect = UiOverlay.prototype.connect;
    vi.spyOn(UiOverlay.prototype, 'connect').mockImplementation(function (
      this: UiOverlay,
      config,
      options,
    ) {
      report = options?.onPositionChange;
      return connect.call(this, config, options);
    });
    const update = vi.spyOn(ConnectedOverlay.prototype, 'updatePosition');
    const { inner, settle } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    update.mockClear();
    report?.(OVERLAY_SIDE.Bottom);
    expect(update).not.toHaveBeenCalled();
    settle();
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.ui-tooltip-hit--bottom')).not.toBeNull();
  });

  it('re-checks the accessible name when the tooltip opens', async () => {
    const { inner, settle } = await setup();
    expect(inner.hasAttribute('aria-description')).toBe(true);
    inner.setAttribute('aria-label', 'Search');
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(inner.hasAttribute('aria-description')).toBe(false);
  });

  it('ignores other keys', async () => {
    const { inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    settle();
    expect(panelEl()).not.toBeNull();
  });

  it('stays open while the pointer is over the tooltip', async () => {
    const { inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    const hit = document.querySelector<HTMLElement>('.ui-tooltip-hit') as HTMLElement;
    leave(inner);
    hit.dispatchEvent(new PointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).not.toBeNull();
    hit.dispatchEvent(new PointerEvent('pointerleave'));
    await vi.advanceTimersByTimeAsync(150);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('closes when the control is activated', async () => {
    const { inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    inner.click();
    settle();
    expect(panelEl()).toBeNull();
  });

  it('never shows on touch-only devices', async () => {
    const { inner, settle, panelEl } = await setup({ noHover: true });
    enter(inner);
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('ignores touch pointers', async () => {
    const { inner, settle, panelEl } = await setup();
    enter(inner, 'touch');
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('does nothing without text', async () => {
    const { fixture, inner, settle, panelEl } = await setup();
    fixture.componentInstance.text.set('');
    settle();
    expect(inner.hasAttribute('aria-description')).toBe(false);
    enter(inner);
    await vi.advanceTimersByTimeAsync(500);
    settle();
    expect(panelEl()).toBeNull();
  });

  it('renders the shortcut as kbd', async () => {
    const { fixture, inner, settle } = await setup();
    fixture.componentInstance.shortcut.set('⌘K');
    settle();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(document.querySelector('.ui-tooltip kbd')?.textContent).toBe('⌘K');
  });

  it('updates an open tooltip when the text changes', async () => {
    const { fixture, inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    fixture.componentInstance.text.set('Find');
    settle();
    expect(panelEl()?.textContent).toContain('Find');
  });

  it('reopens after a position change and puts the host on the tooltip layer', async () => {
    const { fixture, inner, settle, pane } = await setup();
    fixture.componentInstance.position.set(OVERLAY_SIDE.Bottom);
    settle();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(
      pane()?.parentElement?.classList.contains(overlayLayerClass(OVERLAY_LAYER.Tooltip)),
    ).toBe(true);
  });

  it('a second hover during the leave works and the pane is reused', async () => {
    const { inner, settle, panelEl } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    leave(inner);
    await vi.advanceTimersByTimeAsync(100);
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(panelEl()).not.toBeNull();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
  });

  it('removes the overlay, description and listeners on destroy', async () => {
    const { fixture, inner, settle } = await setup();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
    fixture.destroy();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(0);
  });

  it('leaves no tooltip node in the body after 50 hosts are shown and destroyed', async () => {
    const refs = Array.from({ length: 50 }, () => {
      const ref = TestBed.createComponent(HostComponent);
      ref.detectChanges();
      return ref;
    });
    TestBed.tick();
    const nodes = (): number =>
      document.body.querySelectorAll(
        '.ui-tooltip-description, [id^="ui-tooltip-"], ui-tooltip-panel, .ui-tooltip',
      ).length;
    expect(nodes()).toBe(0);
    const inner = refs[0].nativeElement.querySelector('#btn button') as HTMLElement;
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    refs.forEach((ref) => {
      ref.detectChanges();
    });
    TestBed.tick();
    expect(nodes()).toBeGreaterThan(0);
    refs.forEach((ref) => {
      ref.destroy();
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(nodes()).toBe(0);
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(0);
  });

  it('has no axe violations while open', async () => {
    vi.useRealTimers();
    const { fixture, inner, settle } = await setup();
    enter(inner);
    await new Promise((resolve) => setTimeout(resolve, 450));
    settle();
    expect(document.querySelector('.ui-tooltip')).not.toBeNull();
    expect(await axeViolations(fixture.nativeElement as HTMLElement)).toEqual([]);
    expect(
      await axeViolations(document.querySelector('.cdk-overlay-container') as HTMLElement),
    ).toEqual([]);
  });
});

describe('TooltipPanelComponent', () => {
  it('renders text, shortcut and the side that keeps the gap, and leaves when closed', () => {
    // `animate.enter` / `animate.leave` need a real CSS animation engine (jsdom has none, the
    // classes are never applied); the presets themselves are covered in styles.spec.ts and the
    // Storybook stories run them in a browser.
    const fixture = TestBed.createComponent(TooltipPanelComponent);
    fixture.componentRef.setInput('text', 'Search');
    fixture.componentRef.setInput('shortcut', '⌘K');
    fixture.componentRef.setInput('side', OVERLAY_SIDE.Left);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ui-tooltip-hit--left')).not.toBeNull();
    expect(el.querySelector('.ui-tooltip__text')?.textContent).toBe('Search');
    expect(el.querySelector('kbd')?.textContent).toBe('⌘K');
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    TestBed.tick();
    expect(el.querySelector('.ui-tooltip')).toBeNull();
  });
});
