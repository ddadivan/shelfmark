import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { TextSwapComponent } from './text-swap.component';

@Component({
  imports: [TextSwapComponent],
  template: `<ui-text-swap [text]="text()" [shimmer]="shimmer()" />`,
})
class HostComponent {
  readonly text = signal('Create link');
  readonly shimmer = signal(false);
}

describe('TextSwapComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const texts = () =>
      Array.from(host.querySelectorAll<HTMLElement>('.ui-text-swap__text')).map(
        (el) => el.textContent,
      );
    return { fixture, host, texts };
  }

  it('renders the text by interpolation', () => {
    const { host, texts } = setup();
    expect(texts()).toEqual(['Create link']);
    expect(host.querySelector('.ui-text-swap')).not.toBeNull();
  });

  it('does not animate the text that is there from the start', () => {
    const { host } = setup();
    expect(host.querySelector('.ui-text-swap--enter')).toBeNull();
  });

  it('shows the new text after a change', async () => {
    const { fixture, texts } = setup();
    fixture.componentInstance.text.set('Creating…');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(texts()).toContain('Creating…');
  });

  it('never renders the text as HTML', () => {
    const { fixture, host } = setup();
    fixture.componentInstance.text.set('<b>x</b>');
    fixture.detectChanges();
    expect(host.querySelector('b')).toBeNull();
  });

  it('marks the shimmer variant', () => {
    const { fixture, host } = setup();
    fixture.componentInstance.shimmer.set(true);
    fixture.detectChanges();
    expect(host.querySelector('.ui-text-swap__text--shimmer')).not.toBeNull();
  });

  it('overlays both texts in one cell, with a cross-fade under reduced motion', () => {
    const css = compileScss('lib/components/text-swap/text-swap.component.scss');
    expect(css).toMatch(/\.ui-text-swap__text\s*\{[^}]*grid-area: 1\s*\/\s*1/);
    expect(css).toContain('ui-text-swap-in var(--duration-base) var(--ease-out) both');
    expect(css).toContain('ui-text-swap-out var(--duration-fast) var(--ease-out) both');
    expect(css).toContain('ui-reveal');
    expect(css).toContain('ui-fade-out');
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
