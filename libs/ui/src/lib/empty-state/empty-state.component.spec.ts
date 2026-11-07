import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { ButtonComponent } from '../button/button.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { IllustrationMotion } from '../illustration/models/illustration-motion.type';
import type { IllustrationName } from '../illustration/models/illustration-name.type';
import { EmptyStateComponent } from './empty-state.component';
import type { HeadingLevel } from '../heading';
import { ILLUSTRATION_MOTION } from '../illustration/models/illustration-motion.const';

@Component({
  imports: [EmptyStateComponent, ButtonComponent],
  template: `
    <ui-empty-state
      [heading]="heading()"
      [text]="text()"
      [icon]="icon()"
      [illustration]="illustration()"
      [illustrationMotion]="motion()"
      [headingLevel]="level()"
    >
      @if (withAction()) {
        <ui-button variant="primary" (click)="clicks.set(clicks() + 1)">Add link</ui-button>
      }
    </ui-empty-state>
  `,
})
class HostComponent {
  readonly heading = signal('Your links will appear here');
  readonly text = signal<string | undefined>('Paste a link to get started.');
  readonly icon = signal<IconName | undefined>('bookmark');
  readonly illustration = signal<IllustrationName | undefined>(undefined);
  readonly motion = signal<IllustrationMotion | undefined>(undefined);
  readonly level = signal<HeadingLevel>(2);
  readonly withAction = signal(true);
  readonly clicks = signal(0);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  return { fixture, host, update };
}

describe('EmptyStateComponent', () => {
  it('renders the icon tile, heading, text and the projected action', () => {
    const { host, fixture } = setup();
    expect(host.querySelector('.ui-empty-state__art ui-icon')).not.toBeNull();
    expect(host.querySelector('ui-illustration')).toBeNull();
    expect(host.querySelector('h2')?.textContent).toBe('Your links will appear here');
    expect(host.querySelector('p')?.textContent).toBe('Paste a link to get started.');
    host.querySelector('button')?.click();
    expect(fixture.componentInstance.clicks()).toBe(1);
  });

  it('shows the illustration instead of the icon, decorative, with motion passed through', () => {
    const { host, update } = setup();
    update((c) => {
      c.illustration.set('empty-folder');
      c.motion.set(ILLUSTRATION_MOTION.None);
    });
    const scene = host.querySelector('ui-illustration');
    expect(scene).not.toBeNull();
    expect(scene?.getAttribute('aria-hidden')).toBe('true');
    expect(scene?.classList.contains('ui-illustration--none')).toBe(true);
    expect(host.querySelector('.ui-empty-state__art')).toBeNull();
  });

  it('plays the scene default when no motion is given', () => {
    const { host, update } = setup();
    update((c) => c.illustration.set('not-found'));
    expect(host.querySelector('ui-illustration')?.classList.contains('ui-illustration--once')).toBe(
      true,
    );
  });

  it('works without icon, illustration, text and action', () => {
    const { host, update } = setup();
    update((c) => {
      c.icon.set(undefined);
      c.text.set(undefined);
      c.withAction.set(false);
    });
    expect(host.querySelector('.ui-empty-state__art')).toBeNull();
    expect(host.querySelector('ui-illustration')).toBeNull();
    expect(host.querySelector('p')).toBeNull();
    expect(host.querySelector('button')).toBeNull();
    expect(host.querySelector('h2')).not.toBeNull();
  });

  it.each<HeadingLevel>([1, 2, 3, 4, 5, 6])('renders the heading as h%i', (level) => {
    const { host, update } = setup();
    update((c) => c.level.set(level));
    expect(host.querySelectorAll('h1, h2, h3, h4, h5, h6')).toHaveLength(1);
    expect(host.querySelector(`h${level}`)?.textContent).toBe('Your links will appear here');
  });

  it('does not put a title attribute on the host', () => {
    const { host } = setup();
    expect(host.querySelector('ui-empty-state')?.hasAttribute('title')).toBe(false);
  });

  it('has no axe violations with an icon or an illustration', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.illustration.set('empty-feed'));
    expect(await axeViolations(host)).toEqual([]);
  });
});
