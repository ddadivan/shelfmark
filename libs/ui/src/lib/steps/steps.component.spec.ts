import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { StepsComponent } from './steps.component';

@Component({
  imports: [StepsComponent],
  template: `<ui-steps [count]="count()" [current]="current()" [label]="label()" />`,
})
class HostComponent {
  readonly count = signal(3);
  readonly current = signal(1);
  readonly label = signal('Step 1 of 3');
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  const dots = () => Array.from(host.querySelectorAll('.ui-steps__dot'));
  return { host, update, dots };
}

describe('StepsComponent', () => {
  it('renders count dots with the first one current', () => {
    const { dots } = setup();
    expect(dots()).toHaveLength(3);
    expect(dots().map((d) => d.classList.contains('ui-steps__dot--current'))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('moves the current dot', () => {
    const { dots, update } = setup();
    update((c) => {
      c.current.set(3);
      c.label.set('Step 3 of 3');
    });
    expect(dots()[2].classList.contains('ui-steps__dot--current')).toBe(true);
  });

  it('follows count changes and clamps negative counts', () => {
    const { dots, update } = setup();
    update((c) => c.count.set(5));
    expect(dots()).toHaveLength(5);
    update((c) => c.count.set(-1));
    expect(dots()).toHaveLength(0);
  });

  it('is an image named by the label; no live region, dots are hidden', () => {
    const { host, update } = setup();
    const steps = host.querySelector('ui-steps') as HTMLElement;
    expect(steps.getAttribute('role')).toBe('img');
    expect(steps.getAttribute('aria-label')).toBe('Step 1 of 3');
    expect(host.querySelector('[aria-live]')).toBeNull();
    expect(host.querySelector('.ui-steps__label')).toBeNull();
    expect(host.querySelector('.ui-steps__dots')?.getAttribute('aria-hidden')).toBe('true');
    update((c) => c.label.set('Step 2 of 3'));
    expect(steps.getAttribute('aria-label')).toBe('Step 2 of 3');
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
