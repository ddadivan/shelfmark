import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../testing/scss';
import { HighlightComponent } from '../highlight/highlight.component';
import { KEYBOARD_KEY } from '../keyboard';
import { CommandGroupComponent } from './command-group.component';
import { CommandItemComponent } from './command-item.component';
import { CommandListComponent } from './command-list.component';
import type { CommandSelection } from './models/command-selection.interface';

@Component({
  imports: [CommandListComponent, CommandGroupComponent, CommandItemComponent, HighlightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-command-list
      inputLabel="Search links, folders and tags"
      listLabel="Search results"
      placeholder="Search"
      [busy]="busy()"
      [(query)]="query"
      (selected)="chosen.update((list) => [...list, $event])"
    >
      <kbd slot="input-end">Esc</kbd>
      <span slot="status">{{ count() }} results</span>
      @if (showLinks()) {
        <ui-command-group heading="3 links">
          <ui-command-item value="a">
            <ui-highlight [text]="'Signal Forms'" [query]="query()" />
            <span slot="meta">youtube.com</span>
          </ui-command-item>
          <ui-command-item value="b">NgRx SignalStore</ui-command-item>
          <ui-command-item value="c" [disabled]="lastDisabled()">Signals vs RxJS</ui-command-item>
        </ui-command-group>
      }
      @if (showFolders()) {
        <ui-command-group heading="Folders and tags">
          <ui-command-item value="f">
            <span slot="leading">F</span>
            Work / Angular
            <span slot="trailing">5</span>
          </ui-command-item>
        </ui-command-group>
      }
      @if (showLoose()) {
        <ui-command-item value="loose">Loose item</ui-command-item>
      }
      @for (value of extra(); track value) {
        <ui-command-item [value]="value">{{ value }}</ui-command-item>
      }
      <p slot="empty">Nothing found</p>
      <span slot="footer"><kbd>↵</kbd> open</span>
    </ui-command-list>
  `,
})
class HostComponent {
  readonly query = signal('');
  readonly busy = signal(false);
  readonly showLinks = signal(true);
  readonly showFolders = signal(true);
  readonly showLoose = signal(false);
  readonly extra = signal<string[]>([]);
  readonly count = signal(4);
  readonly lastDisabled = signal(false);
  readonly chosen = signal<CommandSelection[]>([]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    TestBed.tick();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('CommandListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    await settle(fixture);
  });

  const input = (): HTMLInputElement => el.querySelector<HTMLInputElement>('input')!;
  const options = (): HTMLElement[] => [...el.querySelectorAll<HTMLElement>('[role="option"]')];
  const activeValue = (): string | undefined => {
    const id = input().getAttribute('aria-activedescendant');
    return options()
      .find((o) => o.id === id)
      ?.querySelector('.ui-command-item__title')
      ?.textContent?.trim()
      .split(/\s+/)[0];
  };

  async function press(key: string, init: KeyboardEventInit = {}): Promise<void> {
    input().focus();
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    await settle(fixture);
  }

  it('wires the input as a combobox that owns the active option', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-label')).toBe('Search links, folders and tags');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    const list = el.querySelector('[role="listbox"]')!;
    expect(input().getAttribute('aria-controls')).toBe(list.id);
    expect(options()).toHaveLength(4);
    expect(options().map((o) => o.id)).toContain(input().getAttribute('aria-activedescendant'));
    expect(list.getAttribute('aria-label')).toBe('Search results');
  });

  it('renders groups with a heading that names them and the row slots', () => {
    const groups = [...el.querySelectorAll<HTMLElement>('[role="group"]')];
    expect(groups).toHaveLength(2);
    const heading = el.querySelector(`#${groups[0].getAttribute('aria-labelledby')}`);
    expect(heading?.textContent).toBe('3 links');
    expect(groups[0].querySelectorAll('[role="option"]')).toHaveLength(3);
    expect(options()[0].querySelector('.ui-command-item__meta')?.textContent).toBe('youtube.com');
    expect(options()[3].querySelector('.ui-command-item__leading')?.textContent).toBe('F');
    expect(options()[3].querySelector('.ui-command-item__trailing')?.textContent).toBe('5');
    expect(options()[0].querySelector('mark')).toBeNull();
  });

  it('shows the input-end and footer slots and styles nothing in the empty region', () => {
    expect(el.querySelector('.ui-command-list__field kbd')?.textContent).toBe('Esc');
    expect(el.querySelector('.ui-command-list__footer kbd')?.textContent).toBe('↵');
  });

  it('keeps the status region rendered with the status slot, visible only when empty', async () => {
    const status = (): HTMLElement => el.querySelector<HTMLElement>('[role="status"]')!;
    expect(status().textContent?.trim()).toBe('4 results');
    expect(status().classList.contains('ui-command-list__status--empty')).toBe(false);
    host.count.set(2);
    await settle(fixture);
    expect(status().textContent?.trim()).toBe('2 results');
    host.showLinks.set(false);
    host.showFolders.set(false);
    await settle(fixture);
    expect(el.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(status().classList.contains('ui-command-list__status--empty')).toBe(true);
    expect(status().textContent).toContain('Nothing found');
    host.showLoose.set(true);
    await settle(fixture);
    expect(el.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(status().classList.contains('ui-command-list__status--empty')).toBe(false);
    expect(status().textContent).not.toContain('Nothing found');
  });

  it('points aria-activedescendant at an existing row only', async () => {
    const exists = (): boolean =>
      options().some((o) => o.id === input().getAttribute('aria-activedescendant'));
    expect(exists()).toBe(true);
    host.showLinks.set(false);
    host.showFolders.set(false);
    await settle(fixture);
    expect(options()).toHaveLength(0);
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
    host.extra.set(['x']);
    await settle(fixture);
    expect(exists()).toBe(true);
  });

  it('moves the active row to the first enabled one when the active row is deleted', async () => {
    host.showLinks.set(false);
    host.extra.set(['x', 'y']);
    await settle(fixture);
    await press(KEYBOARD_KEY.End);
    expect(activeValue()).toBe('y');
    host.extra.set(['x']);
    await settle(fixture);
    expect(activeValue()).toBe('Work');
    await press(KEYBOARD_KEY.Enter);
    expect(host.chosen()).toEqual([{ value: 'f', background: false }]);
  });

  it('resets to the top when results arrive after the query, once', async () => {
    host.query.set('ng');
    await settle(fixture);
    await press(KEYBOARD_KEY.ArrowDown);
    expect(activeValue()).toBe('NgRx');
    host.extra.set(['x']);
    await settle(fixture);
    expect(activeValue()).toBe('Signal');
    await press(KEYBOARD_KEY.ArrowDown);
    host.extra.set(['x', 'y']);
    await settle(fixture);
    expect(activeValue()).toBe('NgRx');
  });

  it('selects the highlighted row after its predecessor was removed', async () => {
    host.extra.set(['x', 'y']);
    await settle(fixture);
    await press(KEYBOARD_KEY.End);
    host.extra.set(['y']);
    await settle(fixture);
    expect(activeValue()).toBe('y');
    await press(KEYBOARD_KEY.Enter);
    expect(host.chosen().map((c) => c.value)).toEqual(['y']);
  });

  it('starts at the first row again when the query changes', async () => {
    await press(KEYBOARD_KEY.ArrowDown);
    expect(activeValue()).toBe('NgRx');
    host.query.set('ng');
    await settle(fixture);
    expect(activeValue()).toBe('Signal');
    await press(KEYBOARD_KEY.Enter);
    expect(host.chosen().map((c) => c.value)).toEqual(['a']);
  });

  it('moves off a row that became disabled', async () => {
    await press(KEYBOARD_KEY.ArrowUp);
    await press(KEYBOARD_KEY.ArrowUp);
    expect(activeValue()).toBe('Signals');
    host.lastDisabled.set(true);
    await settle(fixture);
    expect(activeValue()).toBe('Signal');
  });

  it('moves with the arrows, wraps around and jumps with Home and End', async () => {
    expect(activeValue()).toBe('Signal');
    await press(KEYBOARD_KEY.ArrowDown);
    expect(activeValue()).toBe('NgRx');
    await press(KEYBOARD_KEY.ArrowUp);
    await press(KEYBOARD_KEY.ArrowUp);
    expect(activeValue()).toBe('Work');
    await press(KEYBOARD_KEY.ArrowDown);
    expect(activeValue()).toBe('Signal');
    await press(KEYBOARD_KEY.End);
    expect(activeValue()).toBe('Work');
    await press(KEYBOARD_KEY.Home);
    expect(activeValue()).toBe('Signal');
  });

  it('emits selected on Enter and again for the same row', async () => {
    await press(KEYBOARD_KEY.ArrowDown);
    await press(KEYBOARD_KEY.Enter);
    await press(KEYBOARD_KEY.Enter);
    expect(host.chosen()).toEqual([
      { value: 'b', background: false },
      { value: 'b', background: false },
    ]);
  });

  it('emits background for Ctrl+Enter and Cmd+Enter', async () => {
    await press(KEYBOARD_KEY.Enter, { ctrlKey: true });
    await press(KEYBOARD_KEY.Enter, { metaKey: true });
    expect(host.chosen()).toEqual([
      { value: 'a', background: true },
      { value: 'a', background: true },
    ]);
  });

  it('chooses with a click and reports the modifier', async () => {
    options()[1].click();
    options()[2].dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));
    await settle(fixture);
    expect(host.chosen()).toEqual([
      { value: 'b', background: false },
      { value: 'c', background: true },
    ]);
  });

  it('does not choose a disabled item and skips it with the arrows', async () => {
    host.lastDisabled.set(true);
    await settle(fixture);
    expect(options()[2].getAttribute('aria-disabled')).toBe('true');
    options()[2].click();
    await settle(fixture);
    expect(host.chosen()).toEqual([]);
    await press(KEYBOARD_KEY.ArrowUp);
    expect(activeValue()).toBe('Work');
  });

  it('ignores Enter while composing and when nothing is active', async () => {
    await press(KEYBOARD_KEY.Enter, { isComposing: true });
    await press(KEYBOARD_KEY.Enter, { keyCode: 229 });
    expect(host.chosen()).toEqual([]);
    // Negative control: the same Enter without the IME key code chooses.
    await press(KEYBOARD_KEY.Enter, { keyCode: 13 });
    expect(host.chosen()).toEqual([{ value: 'a', background: false }]);
    host.chosen.set([]);
    host.showLinks.set(false);
    host.showFolders.set(false);
    await settle(fixture);
    await press(KEYBOARD_KEY.Enter);
    expect(host.chosen()).toEqual([]);
  });

  it('writes the typed text to the query model and shows it', async () => {
    input().value = 'sig';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(host.query()).toBe('sig');
    expect(options()[0].querySelector('mark')?.textContent).toBe('Sig');
    host.query.set('forms');
    await settle(fixture);
    expect(input().value).toBe('forms');
  });

  it('marks the list busy', async () => {
    const list = el.querySelector('[role="listbox"]')!;
    expect(list.hasAttribute('aria-busy')).toBe(false);
    host.busy.set(true);
    await settle(fixture);
    expect(list.getAttribute('aria-busy')).toBe('true');
  });

  it('shows the empty slot in a status region only without items', async () => {
    host.showLinks.set(false);
    host.showFolders.set(false);
    await settle(fixture);
    const status = el.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('Nothing found');
    expect(el.querySelector('[role="listbox"]')?.hasAttribute('hidden')).toBe(true);
    expect(await axeViolations(el)).toEqual([]);
    host.showLoose.set(true);
    await settle(fixture);
    expect(status.textContent).not.toContain('Nothing found');
    expect(el.querySelector('[role="listbox"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('renders items outside a group without a group role', async () => {
    host.showLinks.set(false);
    host.showFolders.set(false);
    host.showLoose.set(true);
    await settle(fixture);
    expect(el.querySelector('[role="group"]')).toBeNull();
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Loose item']);
  });

  it('merges neighbouring items of one group and splits by group', async () => {
    host.showLoose.set(true);
    await settle(fixture);
    expect(el.querySelectorAll('[role="group"]')).toHaveLength(2);
    expect(options()).toHaveLength(5);
  });

  it('does not keep Aria selection and keeps focus in the input on a press', async () => {
    input().focus();
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    options()[0].dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    options()[0].click();
    await settle(fixture);
    expect(el.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
    expect(document.activeElement).toBe(input());
  });

  it('focuses the input through focus()', () => {
    const list = fixture.debugElement.children[0].componentInstance as CommandListComponent;
    list.focus();
    expect(document.activeElement).toBe(input());
  });

  it('has no axe violations with results, busy and in the empty state', async () => {
    expect(await axeViolations(el)).toEqual([]);
    host.busy.set(true);
    await settle(fixture);
    expect(await axeViolations(el)).toEqual([]);
  });
});

describe('CommandListComponent styles', () => {
  const css = compileScss('lib/command-list/command-list.component.scss');

  it('uses 44px targets on coarse pointers', () => {
    const touch = mediaBlocks(css, /pointer:\s*coarse/).join('\n');
    expect(touch).toContain('.ui-command-list__option');
    expect(touch).toMatch(/min-height:\s*2\.75rem/);
  });

  it('applies hover only on hover devices', () => {
    expect(withoutMedia(css, /hover:\s*hover/)).not.toContain(':hover');
    expect(mediaBlocks(css, /hover:\s*hover/).join('\n')).toContain(':hover');
  });

  it('removes the transition under reduced motion', () => {
    const reduced = mediaBlocks(css, /prefers-reduced-motion:\s*reduce/).join('\n');
    expect(reduced).toContain('transition: none');
  });
});
