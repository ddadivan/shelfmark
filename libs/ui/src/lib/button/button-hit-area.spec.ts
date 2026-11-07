import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { compileScss, mediaBlocks } from '../../testing/scss';
import { ButtonComponent } from './button.component';
import { BUTTON_HIT_AREA } from './models/button-hit-area.const';
import type { ButtonHitArea } from './models/button-hit-area.type';

@Component({
  imports: [ButtonComponent],
  template: `<ui-button
    iconLeft="star"
    iconOnly
    ariaLabel="Add to favorites"
    [hitArea]="hitArea()"
  />`,
})
class HostComponent {
  readonly hitArea = signal<ButtonHitArea>(BUTTON_HIT_AREA.Grow);
}

@Component({
  imports: [ButtonComponent],
  template: `<ui-button hitArea="overlay">Save</ui-button>`,
})
class LabelledHostComponent {}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const button = () => (fixture.nativeElement as HTMLElement).querySelector('button')!;
  return { fixture, host: fixture.componentInstance, button };
}

describe('ButtonComponent hitArea', () => {
  it('grows by default: no overlay class, ripple on', async () => {
    const { button } = await setup();

    expect(button().classList.contains('ui-button--hit-overlay')).toBe(false);
    expect(button().classList.contains('ui-ripple-host')).toBe(true);
  });

  it('overlay keeps the visual size and turns the ripple off', async () => {
    const { fixture, host, button } = await setup();
    host.hitArea.set(BUTTON_HIT_AREA.Overlay);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(button().classList.contains('ui-button--hit-overlay')).toBe(true);
    expect(button().classList.contains('ui-ripple-host')).toBe(false);
  });

  it('ignores overlay on a button with a label: no overlay class, ripple on', async () => {
    const fixture = TestBed.createComponent(LabelledHostComponent);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.classList.contains('ui-button--hit-overlay')).toBe(false);
    expect(button.classList.contains('ui-ripple-host')).toBe(true);
  });

  it('styles: 44px minimum for grow on coarse pointers, rem hit area for overlay', () => {
    const css = compileScss('lib/button/button.component.scss');
    const coarse = mediaBlocks(css, /pointer:\s*coarse/).join('\n');

    expect(coarse).toMatch(
      /\.ui-button--icon:not\(\.ui-button--hit-overlay\)\s*{[^}]*min-width: 2\.75rem/,
    );
    expect(coarse).toMatch(/\.ui-button--hit-overlay::after\s*{[^}]*inset: -0\.625rem/);
    expect(css).toMatch(/\.ui-button--hit-overlay::after\s*{[^}]*inset: -0\.375rem/);
    expect(css).toMatch(/\.ui-button--hit-overlay:disabled::after[^{]*{[^}]*pointer-events: none/);
  });

  it('styles: every size reaches 44px on coarse pointers, except the overlay hit area', () => {
    const css = compileScss('lib/button/button.component.scss');
    const coarse = mediaBlocks(css, /pointer:\s*coarse/).join('\n');

    expect(coarse).toMatch(
      /\.ui-button:not\(\.ui-button--hit-overlay\)\s*{[^}]*min-height: 2\.75rem/,
    );
  });

  it('styles: the fab is 3.5rem with the popover shadow', () => {
    const css = compileScss('lib/button/button.component.scss');

    expect(css).toMatch(
      /\.ui-button\.ui-button--fab\s*{[^}]*width: 3\.5rem;[^}]*height: 3\.5rem;[^}]*box-shadow: var\(--shadow-popover\)/,
    );
  });
});
