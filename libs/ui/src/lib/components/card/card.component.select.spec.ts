import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks } from '../../../testing/scss';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { CardComponent } from './card.component';

@Component({
  imports: [CardComponent, CheckboxComponent],
  template: `
    <ui-card href="https://example.test/" [checked]="checked()" [selecting]="selecting()">
      <ui-checkbox slot="select" hideLabel label="Select Wool coat" [checked]="checked()" />
      <span slot="title">Wool coat</span>
    </ui-card>
  `,
})
class HostComponent {
  readonly checked = signal(false);
  readonly selecting = signal(false);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const card = host.querySelector('ui-card') as HTMLElement;
  return { fixture, host, card, cmp: fixture.componentInstance };
}

describe('CardComponent select slot', () => {
  it('projects the checkbox outside the title link, above it', () => {
    const { host } = setup();
    const select = host.querySelector('.ui-card__select');
    expect(select?.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(host.querySelector('.ui-card__link')?.contains(select ?? null)).toBe(false);
    const css = compileScss('lib/components/card/card.component.scss');
    expect(css).toMatch(/\.ui-card__select\s*\{[^}]*z-index: 2/);
  });

  it('sets the checked and selecting classes without aria-current', () => {
    const { card, cmp, fixture, host } = setup();
    expect(card.classList.contains('ui-card--checked')).toBe(false);
    cmp.checked.set(true);
    cmp.selecting.set(true);
    fixture.detectChanges();
    expect(card.classList.contains('ui-card--checked')).toBe(true);
    expect(card.classList.contains('ui-card--selecting')).toBe(true);
    expect(host.querySelector('.ui-card__link')?.hasAttribute('aria-current')).toBe(false);
  });

  it('shows the checkbox on hover only for hover pointers, on focus, while selecting and on touch', () => {
    const css = compileScss('lib/components/card/card.component.scss');
    const hover = mediaBlocks(css, /\(hover: ?hover\)/).join('\n');
    expect(hover).toContain('.ui-card__select');
    const touch = mediaBlocks(css, /\(hover: ?none\)/).join('\n');
    expect(touch).toContain('.ui-card__select');
    const base = css;
    expect(base).toContain('.ui-card--selecting');
    expect(base).toMatch(/box-shadow: 0 0 0 2px var\(--accent\)/);
  });

  it('has no axe violations, checked or not', async () => {
    const { host, cmp, fixture } = setup();
    expect(await axeViolations(host)).toEqual([]);
    cmp.checked.set(true);
    fixture.detectChanges();
    expect(await axeViolations(host)).toEqual([]);
  });
});
