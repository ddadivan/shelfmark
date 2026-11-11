import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../testing/axe';
import { compileScss, mediaBlocks } from '../../testing/scss';
import { KEYBOARD_KEY } from '../keyboard';
import { BulkBarComponent } from './bulk-bar.component';
import type { BulkBarAction } from './models/bulk-bar-action.interface';
import { BULK_BAR_LAYOUT } from './models/bulk-bar-layout.const';
import type { BulkBarLayout } from './models/bulk-bar-layout.type';

const ACTIONS: BulkBarAction[] = [
  { id: 'move', label: 'Move', icon: 'folder-move' },
  { id: 'tags', label: 'Tags', icon: 'tag' },
  { id: 'favorite', label: 'Favorite', icon: 'star', pressed: false },
  { id: 'open', label: 'Open all', icon: 'external', disabled: true },
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
];

@Component({
  imports: [BulkBarComponent],
  template: `
    <ui-bulk-bar
      ariaLabel="Actions for 3 selected links"
      [actions]="actions()"
      [layout]="layout()"
      (action)="pressed.set($event)"
    />
  `,
})
class HostComponent {
  readonly actions = signal<BulkBarAction[]>(ACTIONS);
  readonly layout = signal<BulkBarLayout>(BULK_BAR_LAYOUT.Inline);
  readonly pressed = signal<string | null>(null);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const update = (apply: (c: HostComponent) => void) => {
    apply(fixture.componentInstance);
    fixture.detectChanges();
  };
  const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('.ui-bulk-bar__action')];
  return { fixture, host, update, buttons, cmp: fixture.componentInstance };
}

describe('BulkBarComponent', () => {
  it('is a named toolbar with one button per action', () => {
    const { host, buttons } = setup();
    const bar = host.querySelector('[role="toolbar"]');
    expect(bar?.getAttribute('aria-label')).toBe('Actions for 3 selected links');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual([
      'Move',
      'Tags',
      'Favorite',
      'Open all',
      'Delete',
    ]);
    expect(buttons().every((b) => b.type === 'button')).toBe(true);
  });

  it('emits the id of the pressed action and blocks disabled ones', () => {
    const { buttons, cmp, fixture } = setup();
    buttons()[1]?.click();
    expect(cmp.pressed()).toBe('tags');
    buttons()[3]?.click();
    fixture.detectChanges();
    expect(cmp.pressed()).toBe('tags');
    expect(buttons()[3]?.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks danger actions, puts a divider before the first of them inline and sets aria-pressed', () => {
    const { host, buttons, update } = setup();
    expect(buttons()[4]?.classList.contains('ui-bulk-bar__action--danger')).toBe(true);
    const divider = host.querySelector('.ui-bulk-bar__divider');
    expect(divider?.getAttribute('aria-hidden')).toBe('true');
    expect(divider?.nextElementSibling).toBe(buttons()[4]);
    expect(buttons()[2]?.getAttribute('aria-pressed')).toBe('false');
    expect(buttons()[0]?.hasAttribute('aria-pressed')).toBe(false);
    update((c) =>
      c.actions.set(ACTIONS.map((a) => (a.id === 'favorite' ? { ...a, pressed: true } : a))),
    );
    expect(buttons()[2]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('has no divider when the danger action leads or in the stacked layout', () => {
    const { host, update } = setup();
    update((c) => c.layout.set(BULK_BAR_LAYOUT.Stacked));
    expect(host.querySelector('.ui-bulk-bar__divider')).toBeNull();
    expect(host.querySelector('ui-bulk-bar')?.classList.contains('ui-bulk-bar--stacked')).toBe(
      true,
    );
    update((c) => {
      c.layout.set(BULK_BAR_LAYOUT.Inline);
      c.actions.set([{ id: 'delete', label: 'Delete', icon: 'trash', danger: true }]);
    });
    expect(host.querySelector('.ui-bulk-bar__divider')).toBeNull();
  });

  it('is one tab stop; arrows, Home and End move between the actions', async () => {
    const { buttons, fixture } = setup();
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    await fixture.whenStable();
    const all = buttons();
    expect(all.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    const press = async (target: Element | null, name: string) => {
      target?.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    all[0]?.focus();
    await press(all[0] ?? null, KEYBOARD_KEY.ArrowRight);
    expect(document.activeElement).toBe(all[1]);
    await press(document.activeElement, KEYBOARD_KEY.End);
    expect(document.activeElement).toBe(all.at(-1));
    await press(document.activeElement, KEYBOARD_KEY.Home);
    expect(document.activeElement).toBe(all[0]);
    (fixture.nativeElement as HTMLElement).remove();
  });

  it('has no axe violations in both layouts', async () => {
    const { host, update } = setup();
    expect(await axeViolations(host)).toEqual([]);
    update((c) => c.layout.set(BULK_BAR_LAYOUT.Stacked));
    expect(await axeViolations(host)).toEqual([]);
  });

  it('is glass, hovers only on hover pointers, grows on coarse pointers and animates like a toast', () => {
    const css = compileScss('lib/bulk-bar/bulk-bar.component.scss');
    expect(css).toContain('var(--glass)');
    const hoverBlocks = mediaBlocks(css, /\(hover: ?hover\)/).join('\n');
    expect(hoverBlocks).toContain('background: var(--surface-hover)');
    const coarseBlocks = mediaBlocks(css, /\(pointer: ?coarse\)/).join('\n');
    expect(coarseBlocks).toContain('min-block-size: 2.75rem');
    expect(css).toContain('ui-toast-in');
    expect(css).toContain('ui-toast-out');
  });
});
