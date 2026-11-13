import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandGroupComponent } from '../command-group/command-group.component';
import { CommandItemComponent } from '../command-item/command-item.component';
import { CommandListComponent } from '../command-list.component';
import type { CommandSelection } from '../models/command-selection.interface';
import { UiCommandListHarness } from './command-list.harness';

const LINKS = ['Signal Forms', 'NgRx SignalStore', 'Signals vs RxJS'] as const;

@Component({
  imports: [CommandListComponent, CommandGroupComponent, CommandItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-command-list
      inputLabel="Search links"
      listLabel="Search results"
      placeholder="Search"
      [busy]="busy()"
      [(query)]="query"
      (selected)="chosen.update((list) => [...list, $event])"
    >
      <span slot="status">{{ matches().length }} results</span>
      @if (matches().length) {
        <ui-command-group heading="Links">
          @for (title of matches(); track title) {
            <ui-command-item [value]="title" [disabled]="title === disabledTitle">
              {{ title }}
              <span slot="meta">youtube.com</span>
            </ui-command-item>
          }
        </ui-command-group>
      }
      <p slot="empty">Nothing found</p>
    </ui-command-list>
  `,
})
class HostComponent {
  readonly query = signal('');
  readonly busy = signal(false);
  readonly disabledTitle = LINKS[2];
  readonly chosen = signal<CommandSelection[]>([]);

  matches(): readonly string[] {
    const query = this.query().toLowerCase();
    return LINKS.filter((title) => title.toLowerCase().includes(query));
  }
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const list = await loader.getHarness(UiCommandListHarness.with({ label: 'Search links' }));
  return { fixture, list, host: fixture.componentInstance };
}

describe('UiCommandListHarness', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the input, the list, groups and status', async () => {
    const { list, host } = await setup();
    expect(await list.getInputLabel()).toBe('Search links');
    expect(await list.getPlaceholder()).toBe('Search');
    expect(await list.getListLabel()).toBe('Search results');
    expect(await list.isOpen()).toBe(true);
    expect(await list.isEmpty()).toBe(false);
    expect(await list.isBusy()).toBe(false);
    host.busy.set(true);
    expect(await list.isBusy()).toBe(true);
    expect(await list.getGroupHeadings()).toEqual(['Links']);
    expect(await list.getStatusText()).toBe('3 results');
    const options = await list.getOptions();
    expect(await Promise.all(options.map((o) => o.getText()))).toEqual(
      LINKS.map((title) => `${title} youtube.com`),
    );
    expect(await options[2]?.isDisabled()).toBe(true);
    expect(await list.getOptions({ disabled: false })).toHaveLength(2);
    expect(await list.getActiveOptionText()).toBe('Signal Forms youtube.com');
  });

  it('types a query, shows the empty state and clears it', async () => {
    const { list, host } = await setup();
    await list.setQuery('ngrx');
    expect(host.query()).toBe('ngrx');
    expect(await list.getQuery()).toBe('ngrx');
    expect(await list.getOptions()).toHaveLength(1);
    await list.setQuery('zzz');
    expect(await list.isEmpty()).toBe(true);
    expect(await list.getOptions()).toEqual([]);
    expect(await list.getStatusText()).toMatch(/^0 results\s*Nothing found$/);
    await list.setQuery('');
    expect(await list.getOptions()).toHaveLength(3);
    expect(await list.isFocused()).toBe(true);
  });

  it('chooses rows by click and by keyboard, in the background with Ctrl', async () => {
    const { list, host } = await setup();
    await list.focus();
    await list.sendKeys(TestKey.DOWN_ARROW);
    expect(await list.getActiveOptionText()).toBe('NgRx SignalStore youtube.com');
    await list.pressEnter();
    await list.pressEnter(true);
    await list.chooseOption({ text: /^Signal Forms/ });
    await list.chooseOption({ text: /^NgRx/ }, true);
    await list.chooseOption({ text: /^Signals vs/ });
    expect(host.chosen()).toEqual([
      { value: LINKS[1], background: false },
      { value: LINKS[1], background: true },
      { value: LINKS[0], background: false },
      { value: LINKS[1], background: true },
    ]);
    await expect(list.chooseOption({ text: 'Nope' })).rejects.toThrow(/no option/);
  });
});
