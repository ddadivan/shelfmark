import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import type { IconName } from '../icon/models/icon-name.type';
import { BadgeComponent } from './badge.component';
import { BADGE_VARIANT } from './models/badge-variant.const';
import type { BadgeVariant } from './models/badge-variant.type';

@Component({
  imports: [BadgeComponent],
  template: `<p>
    Angular 22 <ui-badge [variant]="variant()" [icon]="icon()">Already saved</ui-badge>
  </p>`,
})
class HostComponent {
  readonly variant = signal<BadgeVariant>(BADGE_VARIANT.Neutral);
  readonly icon = signal<IconName | undefined>(undefined);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const badge = host.querySelector('ui-badge') as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { host, badge, update };
}

describe('BadgeComponent', () => {
  it('is a neutral pill with the projected words and no role of its own', () => {
    const { badge } = setup();
    expect(badge.classList.contains('ui-badge')).toBe(true);
    expect(badge.className).not.toMatch(/ui-badge--/);
    expect(badge.textContent?.trim()).toBe('Already saved');
    expect(badge.getAttribute('role')).toBeNull();
  });

  it.each([
    [BADGE_VARIANT.Accent, 'ui-badge--accent'],
    [BADGE_VARIANT.Warn, 'ui-badge--warn'],
    [BADGE_VARIANT.Danger, 'ui-badge--danger'],
  ])('%s sets %s', (variant, className) => {
    const { badge, update } = setup();
    update((c) => c.variant.set(variant));
    expect(badge.classList.contains(className)).toBe(true);
  });

  it('draws an optional decorative icon first', () => {
    const { badge, update } = setup();
    expect(badge.querySelector('ui-icon')).toBeNull();
    update((c) => c.icon.set('warning'));
    const icon = badge.querySelector('ui-icon');
    expect(icon).not.toBeNull();
    expect(badge.firstElementChild).toBe(icon);
    expect(badge.querySelector('use')?.getAttribute('href')).toMatch(/#sm-warning$/);
  });

  it('has no axe violations in every variant', async () => {
    const { host, update } = setup();
    for (const variant of Object.values(BADGE_VARIANT)) {
      update((c) => {
        c.variant.set(variant);
        c.icon.set('check');
      });
      expect(await axeViolations(host)).toEqual([]);
    }
  });
});
