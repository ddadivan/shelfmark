import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { ChipComponent } from './chip.component';

@Component({
  imports: [ChipComponent],
  template: `
    <ui-chip
      clickable
      removable
      removeLabel="Remove tag design"
      [menuLabel]="menuLabel()"
      (clicked)="clicks.set(clicks() + 1)"
      (menuRequested)="origins.push($event)"
      >design</ui-chip
    >
  `,
})
class MenuHostComponent {
  readonly menuLabel = signal<string | undefined>('Actions for tag design');
  readonly clicks = signal(0);
  readonly origins: HTMLElement[] = [];
}

function setup() {
  const fixture = TestBed.createComponent(MenuHostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    cmp: fixture.componentInstance,
    menu: () => host.querySelector<HTMLButtonElement>('.ui-chip__menu'),
  };
}

describe('ChipComponent menu button', () => {
  it('renders a named button only when menuLabel is set', () => {
    const { fixture, cmp, menu, host } = setup();
    expect(menu()?.getAttribute('aria-label')).toBe('Actions for tag design');
    expect(menu()?.getAttribute('aria-haspopup')).toBe('menu');
    expect(host.querySelector('ui-chip')?.classList).toContain('ui-chip--menu');
    cmp.menuLabel.set(undefined);
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('emits menuRequested with the button and does not trigger the chip action', () => {
    const { fixture, cmp, menu } = setup();
    menu()?.click();
    fixture.detectChanges();
    expect(cmp.origins).toEqual([menu()]);
    expect(cmp.clicks()).toBe(0);
  });

  it('keeps the focus order body, menu, remove', () => {
    const { host } = setup();
    const order = [...host.querySelectorAll('button')].map((b) => b.className);
    expect(order[0]).toContain('ui-chip__body');
    expect(order[1]).toContain('ui-chip__menu');
    expect(order[2]).toContain('ui-chip__remove');
  });

  it('stays a tab stop so keyboard users reach it', () => {
    const { menu } = setup();
    expect(menu()?.tabIndex).toBe(0);
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
