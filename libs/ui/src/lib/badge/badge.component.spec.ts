import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import type { IconName } from '../icon/models/icon-name.type';
import { BadgeComponent } from './badge.component';
import { BADGE_TONE } from './models/badge-tone.const';
import type { BadgeTone } from './models/badge-tone.type';

@Component({
  imports: [BadgeComponent],
  template: `<ui-badge [tone]="tone()" [icon]="icon()">30 days left</ui-badge>`,
})
class HostComponent {
  readonly tone = signal<BadgeTone>(BADGE_TONE.Neutral);
  readonly icon = signal<IconName | undefined>(undefined);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const badge = (fixture.nativeElement as HTMLElement).querySelector('ui-badge') as HTMLElement;
  return { fixture, badge, cmp: fixture.componentInstance };
}

describe('BadgeComponent', () => {
  it('is neutral by default and projects the label', () => {
    const { badge } = setup();
    expect(badge.classList.contains('ui-badge')).toBe(true);
    expect(badge.classList.contains('ui-badge--neutral')).toBe(true);
    expect(badge.textContent?.trim()).toBe('30 days left');
    expect(badge.querySelector('ui-icon')).toBeNull();
    expect(badge.hasAttribute('role')).toBe(false);
  });

  it.each(Object.values(BADGE_TONE))('applies the %s tone class only', (tone) => {
    const { fixture, badge, cmp } = setup();
    cmp.tone.set(tone);
    fixture.detectChanges();
    for (const other of Object.values(BADGE_TONE)) {
      expect(badge.classList.contains(`ui-badge--${other}`)).toBe(other === tone);
    }
  });

  it('renders a decorative leading icon when set', () => {
    const { fixture, badge, cmp } = setup();
    cmp.icon.set('clock');
    fixture.detectChanges();
    const icon = badge.querySelector('ui-icon');
    expect(icon).not.toBeNull();
    expect(icon?.classList.contains('ui-badge__icon')).toBe(true);
  });

  it('has no axe violations in any tone, with and without icon', async () => {
    const { fixture, badge, cmp } = setup();
    for (const tone of Object.values(BADGE_TONE)) {
      for (const icon of [undefined, 'clock' as const]) {
        cmp.tone.set(tone);
        cmp.icon.set(icon);
        fixture.detectChanges();
        expect(await axeViolations(badge)).toEqual([]);
      }
    }
  });
});
