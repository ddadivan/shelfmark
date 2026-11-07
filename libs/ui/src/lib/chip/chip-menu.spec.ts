import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../testing/scss';
import { KEYBOARD_KEY } from '../keyboard';
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

  it('does not remove the chip on Delete or Backspace from the menu button', () => {
    const { fixture, host, menu } = setup();
    let removals = 0;
    fixture.debugElement.children[0].componentInstance.removed.subscribe(() => (removals += 1));
    for (const key of [KEYBOARD_KEY.Delete, KEYBOARD_KEY.Backspace]) {
      menu()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    expect(removals).toBe(0);
    // The same keys still remove from the body.
    host
      .querySelector('.ui-chip__body')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Delete, bubbles: true, cancelable: true }),
      );
    expect(removals).toBe(1);
  });

  describe('styles', () => {
    const css = compileScss('lib/chip/chip.component.scss');
    const HOVER_ONLY = /hover:\s*hover/;

    it('clips the button (no opacity) only under (hover: hover)', () => {
      const outside = withoutMedia(css, HOVER_ONLY);
      expect(outside).not.toMatch(/\.ui-chip__menu\s*{[^}]*clip-path/);
      expect(outside).not.toMatch(/\.ui-chip__menu\s*{[^}]*opacity/);
      const hover = mediaBlocks(css, HOVER_ONLY).join('\n');
      expect(hover).toMatch(/\.ui-chip__menu\s*{[^}]*clip-path: inset\(50%\)/);
      expect(hover).toMatch(/\.ui-chip__menu\s*{[^}]*pointer-events: none/);
      expect(css).not.toMatch(/\.ui-chip__menu\s*{[^}]*visibility/);
    });

    it('reveals it on hover, focus-within and focus-visible', () => {
      const hover = mediaBlocks(css, HOVER_ONLY).join('\n');
      const reveal =
        /([^{}]*\.ui-chip__menu[^{}]*)\{[^}]*pointer-events: auto[^}]*clip-path: none/.exec(
          hover,
        )?.[1] ?? '';
      expect(reveal).toContain('.ui-chip--menu:hover');
      expect(reveal).toContain('.ui-chip--menu:focus-within');
      expect(reveal).toContain(':focus-visible');
    });

    it('never clips the button on touch (no rule outside (hover: hover))', () => {
      expect(withoutMedia(css, HOVER_ONLY)).not.toContain('clip-path');
    });

    it('keeps the menu and remove hit areas from overlapping', () => {
      // Menu: inline-end inset 0 (top right bottom left). Remove next to a menu: inline-start 0.
      expect(css).toMatch(/\.ui-chip__menu::after\s*{[^}]*inset: [^;]* 0 [^;]*;/);
      const removeAfter = /\.ui-chip--menu\) \.ui-chip__remove::after\s*{[^}]*inset: ([^;]*);/.exec(
        css,
      )?.[1];
      expect(removeAfter?.split(' ').at(-1)).toBe('0');
      const coarse = mediaBlocks(css, /pointer:\s*coarse/).join('\n');
      expect(coarse).toMatch(/\.ui-chip--menu\) \.ui-chip__remove::after\s*{[^}]*inset: [^;]* 0;/);
      expect(coarse).toMatch(/\.ui-chip__menu::after\s*{[^}]*inset: [^;]* 0 [^;]*;/);
    });
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
