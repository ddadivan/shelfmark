import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss, mediaBlocks, withoutMedia } from '../../../testing/scss';
import { HighlightComponent } from '../highlight/highlight.component';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { CommandGroupComponent } from './command-group/command-group.component';
import { CommandItemComponent } from './command-item/command-item.component';
import { CommandListComponent } from './command-list.component';
import type { CommandSelection } from './models/command-selection.interface';

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected value to be present');
  }
  return value;
}

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
      @if (showRelated()) {
        <ui-command-group
          heading="Related by meaning"
          icon="spark"
          lead="No links with these words"
        >
          <ui-command-item value="r">Zoneless change detection</ui-command-item>
        </ui-command-group>
      }
      @if (showLoose()) {
        <ui-command-item value="loose">Loose item</ui-command-item>
      }
      @for (value of extra(); track value) {
        <ui-command-item [value]="value">{{ value }}</ui-command-item>
      }
      <p slot="empty">Nothing found</p>
      @if (showNote()) {
        <span slot="note">Search by meaning is getting ready</span>
      }
      <span slot="footer"><kbd>↵</kbd> open</span>
    </ui-command-list>
  `,
})
class HostComponent {
  readonly showNote = signal(false);
  readonly query = signal('');
  readonly busy = signal(false);
  readonly showLinks = signal(true);
  readonly showFolders = signal(true);
  readonly showLoose = signal(false);
  readonly showRelated = signal(false);
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

  const input = (): HTMLInputElement => must(el.querySelector<HTMLInputElement>('input'));
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
    const list = must(el.querySelector('[role="listbox"]'));
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

  it('draws a group with an icon as a divider and its lead line outside the name', async () => {
    host.showRelated.set(true);
    await settle(fixture);
    const groups = [...el.querySelectorAll<HTMLElement>('[role="group"]')];
    expect(groups).toHaveLength(3);
    const related = groups[2];
    const heading = el.querySelector(`#${related.getAttribute('aria-labelledby')}`);
    expect(heading?.textContent).toBe('Related by meaning');
    expect(heading?.classList).toContain('ui-command-list__heading--divider');
    expect(heading?.querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
    expect(related.querySelector('.ui-command-list__lead')?.textContent).toBe(
      'No links with these words',
    );
    expect(groups[0].querySelector('.ui-command-list__lead')).toBeNull();
    expect(groups[0].querySelector('.ui-command-list__heading ui-icon')).toBeNull();
    expect(await axeViolations(el)).toEqual([]);
  });

  it('shows the note slot after the list, outside the listbox and the status region', async () => {
    const note = () => el.querySelector('.ui-command-list__note');
    expect(note()?.textContent).toBe('');
    host.showNote.set(true);
    await settle(fixture);
    expect(note()?.textContent).toBe('Search by meaning is getting ready');
    expect(note()?.closest('[role="listbox"], [role="status"]')).toBeNull();
    expect(note()?.previousElementSibling?.getAttribute('role')).toBe('listbox');
    host.showLinks.set(false);
    host.showFolders.set(false);
    await settle(fixture);
    expect(note()?.textContent).toBe('Search by meaning is getting ready');
  });

  it('shows the input-end and footer slots and styles nothing in the empty region', () => {
    expect(el.querySelector('.ui-command-list__field kbd')?.textContent).toBe('Esc');
    expect(el.querySelector('.ui-command-list__footer kbd')?.textContent).toBe('↵');
  });

  it('keeps the status region rendered with the status slot, visible only when empty', async () => {
    const status = (): HTMLElement => must(el.querySelector<HTMLElement>('[role="status"]'));
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

  it('resets the Aria selection once per choice, without a value feedback loop', async () => {
    const list = fixture.debugElement.query(
      (d) => d.componentInstance instanceof CommandListComponent,
    ).componentInstance as CommandListComponent;
    const handler = vi.spyOn(
      list as unknown as { onListValue: (selected: readonly string[]) => void },
      'onListValue',
    );
    options()[1].click();
    await settle(fixture);
    expect(host.chosen()).toEqual([{ value: 'b', background: false }]);
    // The choice and the reset it causes; the empty reset must not reset again (stack overflow).
    expect(handler.mock.calls.length).toBeLessThanOrEqual(2);
    const resets = handler.mock.calls.filter(([selected]) => selected.length === 0);
    expect(resets.length).toBeLessThanOrEqual(1);
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
    const list = must(el.querySelector('[role="listbox"]'));
    expect(list.hasAttribute('aria-busy')).toBe(false);
    host.busy.set(true);
    await settle(fixture);
    expect(list.getAttribute('aria-busy')).toBe('true');
  });

  it('shows the empty slot in a status region only without items', async () => {
    host.showLinks.set(false);
    host.showFolders.set(false);
    await settle(fixture);
    const status = must(el.querySelector('[role="status"]'));
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

  it('renders a decorative Enter cap in every row', () => {
    const caps = el.querySelectorAll('[role="option"] > .ui-command-list__enter');
    expect(caps.length).toBe(el.querySelectorAll('[role="option"]').length);
    expect(caps.length).toBeGreaterThan(0);
    caps.forEach((cap) => {
      expect(cap.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('has no axe violations with results, busy and in the empty state', async () => {
    expect(await axeViolations(el)).toEqual([]);
    host.busy.set(true);
    await settle(fixture);
    expect(await axeViolations(el)).toEqual([]);
  });
});

@Component({
  imports: [CommandListComponent, CommandGroupComponent, CommandItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button id="outside" type="button">Outside</button>
    <ui-command-list
      popup
      inputLabel="Search"
      listLabel="Search results"
      [(query)]="query"
      [(open)]="open"
      (selected)="chosen.update((list) => [...list, $event])"
    >
      <kbd slot="input-end">Ctrl K</kbd>
      <ui-command-group heading="Links">
        <ui-command-item value="a">Alpha</ui-command-item>
        <ui-command-item value="b">Beta</ui-command-item>
      </ui-command-group>
      <p slot="empty">Nothing found</p>
      <span slot="footer"><kbd>↵</kbd> open</span>
    </ui-command-list>
  `,
})
class PopupHostComponent {
  readonly query = signal('');
  readonly open = signal(false);
  readonly chosen = signal<CommandSelection[]>([]);
}

describe('CommandListComponent in popup mode', { timeout: 30_000 }, () => {
  let fixture: ComponentFixture<PopupHostComponent>;
  let host: PopupHostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(PopupHostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    el.remove();
  });

  const input = (): HTMLInputElement => must(el.querySelector<HTMLInputElement>('input'));
  /** Generous: a loaded CI runner is many times slower than a laptop. */
  const PANEL_GONE_TIMEOUT_MS = 15_000;
  const panel = (): HTMLElement | null => document.querySelector('.ui-command-list__panel');
  /** The leave animation and the overlay release take longer on a loaded runner: wait, do not guess. */
  const panelGone = (): Promise<void> =>
    vi.waitFor(
      () => {
        // Zoneless: each poll runs change detection, so the removal is never waiting for a tick.
        TestBed.tick();
        expect(panel()).toBeNull();
      },
      { timeout: PANEL_GONE_TIMEOUT_MS },
    );
  const options = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>('.ui-command-list__panel [role="option"]'),
  ];

  async function type(text: string): Promise<void> {
    input().focus();
    input().value = text;
    input().dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    await settle(fixture);
  }

  async function press(key: string, init: KeyboardEventInit = {}): Promise<KeyboardEvent> {
    input().focus();
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    input().dispatchEvent(event);
    await settle(fixture);
    return event;
  }

  it('is a closed combobox on the field with no panel until there is text', () => {
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();
    expect(el.querySelector('.ui-command-list--popup')).not.toBeNull();
    expect(el.querySelector('.ui-command-list__field kbd')?.textContent).toBe('Ctrl K');
  });

  it('opens the panel on the first character and wires the combobox to it', async () => {
    await type('a');
    expect(host.query()).toBe('a');
    expect(host.open()).toBe(true);
    expect(panel()).not.toBeNull();
    expect(input().getAttribute('aria-expanded')).toBe('true');
    const list = must(document.querySelector('[role="listbox"]'));
    expect(input().getAttribute('aria-controls')).toBe(list.id);
    expect(options()).toHaveLength(2);
    expect(options().map((o) => o.id)).toContain(input().getAttribute('aria-activedescendant'));
    // The panel sits in an overlay pane, not in the host.
    expect(el.contains(panel())).toBe(false);
  });

  it('moves with the arrows and chooses with Enter, then closes and keeps the text', async () => {
    await type('a');
    await press(KEYBOARD_KEY.ArrowDown);
    await press(KEYBOARD_KEY.Enter);
    expect(host.chosen()).toEqual([{ value: 'b', background: false }]);
    expect(host.open()).toBe(false);
    expect(host.query()).toBe('a');
  });

  it('keeps the panel open after a background choice', async () => {
    await type('a');
    await press(KEYBOARD_KEY.Enter, { ctrlKey: true });
    expect(host.chosen()).toEqual([{ value: 'a', background: true }]);
    expect(host.open()).toBe(true);
  });

  it('Esc closes the panel and keeps the text, a second Esc clears it', async () => {
    await type('al');
    const first = await press(KEYBOARD_KEY.Escape);
    expect(first.defaultPrevented).toBe(true);
    expect(host.open()).toBe(false);
    expect(host.query()).toBe('al');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    const second = await press(KEYBOARD_KEY.Escape);
    expect(second.defaultPrevented).toBe(true);
    expect(host.query()).toBe('');
    expect(input().value).toBe('');
    // Nothing left to clear: Esc goes on to whatever is around the field.
    const third = await press(KEYBOARD_KEY.Escape);
    expect(third.defaultPrevented).toBe(false);
  });

  it('ArrowDown reopens a closed panel when there is text, and does nothing without text', async () => {
    await type('a');
    await press(KEYBOARD_KEY.Escape);
    expect(host.open()).toBe(false);
    await press(KEYBOARD_KEY.ArrowDown);
    expect(host.open()).toBe(true);
    await type('');
    await panelGone();
    await press(KEYBOARD_KEY.ArrowDown);
    expect(host.open()).toBe(false);
    await panelGone();
  });

  it('closes when focus leaves the field, keeping the text', async () => {
    await type('a');
    must(el.querySelector<HTMLElement>('#outside')).focus();
    await settle(fixture);
    expect(host.open()).toBe(false);
    expect(host.query()).toBe('a');
    await panelGone();
  });
});

@Component({
  imports: [CommandListComponent, CommandGroupComponent, CommandItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button id="outside" type="button">Outside</button>
    <ui-command-list
      popup
      emptyPanel
      inputLabel="Search"
      listLabel="Recent searches"
      [(query)]="query"
      [(open)]="open"
      (selected)="chosen.update((list) => [...list, $event])"
    >
      @if (query() === '') {
        <ui-command-group heading="Recent searches">
          <ui-command-item value="shoes">shoes</ui-command-item>
          <ui-command-item value="recipes">recipes</ui-command-item>
        </ui-command-group>
      }
    </ui-command-list>
  `,
})
class EmptyPanelHostComponent {
  readonly query = signal('');
  readonly open = signal(false);
  readonly chosen = signal<CommandSelection[]>([]);
}

describe('CommandListComponent in popup mode with emptyPanel', { timeout: 30_000 }, () => {
  let fixture: ComponentFixture<EmptyPanelHostComponent>;
  let host: EmptyPanelHostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(EmptyPanelHostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    el.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.replaceChildren());
  });

  const input = (): HTMLInputElement => {
    const field = el.querySelector<HTMLInputElement>('input');
    if (!field) {
      throw new Error('no input');
    }
    return field;
  };
  const options = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>('.ui-command-list__panel [role="option"]'),
  ];

  it('opens the panel when the empty field takes focus, and chooses with Enter', async () => {
    input().focus();
    await settle(fixture);
    expect(host.open()).toBe(true);
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((option) => option.textContent?.trim())).toEqual(['shoes', 'recipes']);

    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: KEYBOARD_KEY.Enter, bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(host.chosen()).toEqual([{ value: 'shoes', background: false }]);
  });

  it('hides the panel as soon as there is text, and Esc then clears the text', async () => {
    input().focus();
    input().value = 'sh';
    input().dispatchEvent(new InputEvent('input', { bubbles: true, data: 'sh' }));
    await settle(fixture);
    expect(input().getAttribute('aria-expanded')).toBe('false');

    const escape = new KeyboardEvent('keydown', {
      key: KEYBOARD_KEY.Escape,
      bubbles: true,
      cancelable: true,
    });
    input().dispatchEvent(escape);
    await settle(fixture);
    expect(escape.defaultPrevented).toBe(true);
    expect(host.query()).toBe('');
  });
});

@Component({
  imports: [CommandListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-command-list inputLabel="Search" listLabel="Results">
      <span slot="input-lead" class="lead">Work</span>
      <kbd slot="input-end">Ctrl K</kbd>
    </ui-command-list>
  `,
})
class LeadHostComponent {}

describe('CommandListComponent input-lead slot', () => {
  it('puts the lead inside the field box, after the search icon and before the input', async () => {
    const fixture = TestBed.createComponent(LeadHostComponent);
    await settle(fixture);
    const field = (fixture.nativeElement as HTMLElement).querySelector('.ui-command-list__field');
    const children = Array.from(field?.children ?? []);

    expect(children[0]?.classList.contains('ui-command-list__icon')).toBe(true);
    expect(children[1]?.classList.contains('lead')).toBe(true);
    expect(children[2]?.tagName).toBe('INPUT');
    expect(compileScss('lib/components/command-list/command-list.component.scss')).toMatch(
      /\[slot=['"]?input-lead['"]?\]\s*{[^}]*flex:\s*none/,
    );
  });
});

@Component({
  imports: [CommandListComponent, CommandItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-command-list screen inputLabel="Search" listLabel="Results">
      <button slot="input-start" type="button" aria-label="Close search">Back</button>
      <ui-command-item value="a">Alpha</ui-command-item>
    </ui-command-list>
  `,
})
class ScreenHostComponent {}

describe('CommandListComponent screen', () => {
  it('marks the host and puts the input-start slot before the field', async () => {
    const fixture = TestBed.createComponent(ScreenHostComponent);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.ui-command-list--screen')).not.toBeNull();
    const row = el.querySelector('.ui-command-list__field-row');
    expect(row?.firstElementChild?.getAttribute('aria-label')).toBe('Close search');
    expect(row?.querySelector('.ui-command-list__field input')).not.toBeNull();
    expect(await axeViolations(el)).toEqual([]);
  });

  it('draws 56px rows with dividers, a 48px field, and hides the key hints', () => {
    const css = compileScss('lib/components/command-list/command-list-screen.scss');
    expect(css).toMatch(
      /\.ui-command-list--screen \.ui-command-list__option\s*{[^}]*min-height:\s*3\.5rem/,
    );
    expect(css).toMatch(
      /\.ui-command-list--screen \.ui-command-list__field\s*{[^}]*min-height:\s*3rem/,
    );
    expect(css).toMatch(
      /\.ui-command-list__option \+ \.ui-command-list__option\s*{[^}]*border-top/,
    );
    expect(mediaBlocks(css, /pointer:\s*coarse/).join('\n')).toContain('outline: none');
  });
});

describe('CommandListComponent styles', () => {
  const css = compileScss('lib/components/command-list/command-list.component.scss');

  it('draws a 40px leading tile, 10px rows and an Enter cap on the active row only', () => {
    expect(css).toMatch(/\.ui-command-item__leading\s*{[^}]*width:\s*2\.5rem/);
    expect(css).toMatch(/\.ui-command-list__option\s*{[^}]*border-radius:\s*var\(--radius-sm\)/);
    expect(css).toMatch(
      /\.ui-command-list__option\[data-active=(?:'true'|"true"|true)\]\s*{[^}]*var\(--fill\)/,
    );
    expect(css).toMatch(
      /\.ui-command-list__option\[data-active=(?:'true'|"true"|true)\] > \.ui-command-list__enter/,
    );
  });

  it('draws the divider heading with the AI mark and a hairline', () => {
    expect(css).toMatch(
      /\.ui-command-list__heading--divider::after\s*{[^}]*border-top:\s*1px solid var\(--border\)/,
    );
    expect(css).toMatch(/\.ui-command-list__heading-icon\s*{[^}]*color:\s*var\(--ai\)/);
  });

  it('hides an empty note slot', () => {
    const rows = compileScss('lib/components/command-list/command-list-rows.scss');
    expect(rows).toMatch(/\.ui-command-list__note:empty\s*{[^}]*display:\s*none/);
  });

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
