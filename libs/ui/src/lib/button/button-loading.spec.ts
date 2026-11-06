import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ButtonComponent } from './button.component';
import type { ButtonType } from './models/button-type.type';

@Component({
  imports: [ButtonComponent],
  template: `
    <form (submit)="submits.set(submits() + 1); $event.preventDefault()">
      <ui-button
        [loading]="loading()"
        [type]="type()"
        [href]="href()"
        [iconLeft]="iconLeft()"
        [iconOnly]="iconOnly()"
        [ariaLabel]="iconOnly() ? 'Save' : undefined"
        (click)="clicks.set(clicks() + 1)"
        (linkClick)="linkClicks.set(linkClicks() + 1)"
        >{{ loading() ? 'Saving…' : 'Save link' }}</ui-button
      >
    </form>
  `,
})
class HostComponent {
  readonly loading = signal(false);
  readonly type = signal<ButtonType>('button');
  readonly href = signal<string | undefined>(undefined);
  readonly iconLeft = signal<'add' | undefined>(undefined);
  readonly iconOnly = signal(false);
  readonly clicks = signal(0);
  readonly linkClicks = signal(0);
  readonly submits = signal(0);
}

/** jsdom has no layout: the width of a button follows its label so the lock is observable. */
const REST_WIDTH = 9 * 10 + 28;
const LOADING_WIDTH = 7 * 10 + 28 + 24;

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const control = () => root.querySelector('.ui-button') as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, root, control, settle };
}

describe('ButtonComponent loading', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains('ui-button')
        ? this.textContent?.includes('Saving')
          ? LOADING_WIDTH
          : REST_WIDTH
        : 0;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('is idle by default: no spinner, no aria-busy, no width lock', async () => {
    const { root, control } = await setup();

    expect(root.querySelector('ui-spinner')).toBeNull();
    expect(control().hasAttribute('aria-busy')).toBe(false);
    expect(control().style.width).toBe('');
  });

  it('shows a spinner, sets aria-busy and keeps the width of "Save link" for "Saving…"', async () => {
    const { host, root, control, settle } = await setup();
    host.loading.set(true);
    await settle();

    expect(control().textContent).toContain('Saving…');
    expect(root.querySelector('ui-spinner.ui-button__spinner')).not.toBeNull();
    expect(control().getAttribute('aria-busy')).toBe('true');
    // The label is wider or narrower now, but the locked width is the one it had at rest.
    expect(control().style.width).toBe(`${REST_WIDTH}px`);
    expect(control().offsetWidth).toBe(LOADING_WIDTH);
    expect(REST_WIDTH).not.toBe(LOADING_WIDTH);
  });

  it('releases the width and aria-busy when loading ends', async () => {
    const { host, root, control, settle } = await setup();
    host.loading.set(true);
    await settle();
    host.loading.set(false);
    await settle();
    await settle();

    expect(control().hasAttribute('aria-busy')).toBe(false);
    expect(control().style.width).toBe('');
    expect(root.querySelector('ui-spinner')).toBeNull();
    expect(control().textContent).toContain('Save link');
  });

  it('keeps the width until the spinner animations have finished', async () => {
    let finish: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const original = Element.prototype.getAnimations;
    Element.prototype.getAnimations = () => [{ finished } as unknown as Animation];
    try {
      const { host, control, settle } = await setup();
      host.loading.set(true);
      await settle();
      host.loading.set(false);
      await settle();

      expect(control().style.width).toBe(`${REST_WIDTH}px`);
      expect(control().hasAttribute('aria-busy')).toBe(false);

      finish();
      await vi.waitFor(async () => {
        await settle();
        expect(control().style.width).toBe('');
      });
    } finally {
      Element.prototype.getAnimations = original;
    }
  });

  it('does not release the width when loading restarts before the spinner left', async () => {
    let finish: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const original = Element.prototype.getAnimations;
    Element.prototype.getAnimations = () => [{ finished } as unknown as Animation];
    try {
      const { host, control, settle } = await setup();
      host.loading.set(true);
      await settle();
      host.loading.set(false);
      await settle();
      host.loading.set(true);
      await settle();
      finish();
      await finished;
      await settle();

      expect(control().style.width).toBe(`${REST_WIDTH}px`);
      expect(control().getAttribute('aria-busy')).toBe('true');
    } finally {
      Element.prototype.getAnimations = original;
    }
  });

  it('ignores clicks while loading and works again afterwards', async () => {
    const { host, control, settle } = await setup();
    control().click();
    expect(host.clicks()).toBe(1);

    host.loading.set(true);
    await settle();
    control().click();
    control().click();
    expect(host.clicks()).toBe(1);

    host.loading.set(false);
    await settle();
    control().click();
    expect(host.clicks()).toBe(2);
  });

  it('does not submit a form while loading', async () => {
    const { host, control, settle } = await setup();
    host.type.set('submit');
    await settle();
    control().click();
    expect(host.submits()).toBe(1);

    host.loading.set(true);
    await settle();
    control().click();
    expect(host.submits()).toBe(1);
  });

  it('stays focusable while loading', async () => {
    const { host, control, settle } = await setup();
    host.loading.set(true);
    await settle();

    expect((control() as HTMLButtonElement).disabled).toBe(false);
    control().focus();
    expect(document.activeElement).toBe(control());
  });

  it('blocks a link while loading', async () => {
    const { host, control, settle } = await setup();
    host.href.set('/links');
    await settle();
    host.loading.set(true);
    await settle();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    control().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(host.linkClicks()).toBe(0);
    expect(host.clicks()).toBe(0);
    expect(control().getAttribute('aria-busy')).toBe('true');
  });

  it('shows no ripple while loading', async () => {
    const { host, control, settle } = await setup();
    host.loading.set(true);
    await settle();
    control().dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, isPrimary: true }),
    );

    expect(control().querySelector('.ui-ripple')).toBeNull();
  });

  it('replaces the left icon with the spinner', async () => {
    const { host, root, settle } = await setup();
    host.iconLeft.set('add');
    await settle();
    expect(root.querySelector('ui-icon')).not.toBeNull();

    host.loading.set(true);
    await settle();
    expect(root.querySelector('ui-icon')).toBeNull();
    expect(root.querySelector('ui-spinner')).not.toBeNull();
  });

  it('shows a solo spinner instead of the icon of an icon-only button', async () => {
    const { host, root, control, settle } = await setup();
    host.iconOnly.set(true);
    host.iconLeft.set('add');
    await settle();
    host.loading.set(true);
    await settle();

    expect(root.querySelector('ui-icon')).toBeNull();
    expect(root.querySelector('ui-spinner.ui-button__spinner--solo')).not.toBeNull();
    expect(control().getAttribute('aria-label')).toBe('Save');
  });

  it('has no axe violations while loading', async () => {
    const { host, root, settle } = await setup();
    host.loading.set(true);
    await settle();

    expect(await axeViolations(root)).toEqual([]);
  });
});
