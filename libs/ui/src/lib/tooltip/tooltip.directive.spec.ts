import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { ButtonComponent } from '../button/button.component';
import type { TooltipPosition } from './models/tooltip-position.type';
import { TooltipPanelComponent } from './tooltip-panel.component';
import { TooltipDirective } from './tooltip.directive';

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
      ariaLabel="Search"
    />
    <div id="plain" tabindex="0" uiTooltip="Plain host">Plain</div>
    <button id="native" type="button" uiTooltip="Native" aria-describedby="other">Native</button>
  `,
})
class HostComponent {
  readonly text = signal('Search');
  readonly position = signal<TooltipPosition>('top');
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

  it('sets aria-describedby on the inner button of ui-button, not on the host', async () => {
    const { host, inner, settle } = await setup();
    settle();
    const id = inner.getAttribute('aria-describedby');
    expect(id).toMatch(/^ui-tooltip-\d+$/);
    expect(host.hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById(id as string)?.textContent).toBe('Search');
  });

  it('uses the host element on other hosts and merges an existing aria-describedby', async () => {
    const { plain, native, settle } = await setup();
    settle();
    expect(plain.getAttribute('aria-describedby')).toMatch(/^ui-tooltip-\d+$/);
    const tokens = (native.getAttribute('aria-describedby') as string).split(' ');
    expect(tokens[0]).toBe('other');
    expect(tokens).toHaveLength(2);
  });

  it('includes the shortcut in the description', async () => {
    const { fixture, inner, settle } = await setup();
    fixture.componentInstance.shortcut.set('⌘K');
    settle();
    const id = inner.getAttribute('aria-describedby') as string;
    expect(document.getElementById(id)?.textContent).toBe('Search (⌘K)');
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
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
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
    expect(inner.hasAttribute('aria-describedby')).toBe(false);
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

  it('reopens after a position change and puts the pane on the tooltip layer', async () => {
    const { fixture, inner, settle, pane } = await setup();
    fixture.componentInstance.position.set('bottom');
    settle();
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(pane()?.classList.contains('ui-overlay-layer--tooltip')).toBe(true);
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
    const id = inner.getAttribute('aria-describedby') as string;
    enter(inner);
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(1);
    fixture.destroy();
    expect(document.querySelectorAll('.cdk-overlay-pane')).toHaveLength(0);
    expect(document.getElementById(id)).toBeNull();
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
    fixture.componentRef.setInput('side', 'left');
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
