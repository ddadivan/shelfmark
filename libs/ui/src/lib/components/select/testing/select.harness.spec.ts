import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SelectOption } from '../models/select-option.interface';
import { SELECT_FIXTURE_ID } from '../models/select-fixture-id.const';
import { SelectComponent } from '../select.component';
import { UiOptionHarness } from './option.harness';
import { UiSelectHarness } from './select.harness';

const TREE: SelectOption[] = [
  {
    id: SELECT_FIXTURE_ID.Work,
    name: 'Work',
    children: [
      { id: SELECT_FIXTURE_ID.Angular, name: 'Angular' },
      { id: SELECT_FIXTURE_ID.Courses, name: 'Courses' },
    ],
  },
  { id: SELECT_FIXTURE_ID.Clothes, name: 'Clothes' },
];

@Component({
  imports: [SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-select
      label="Folder"
      [options]="options"
      searchable
      emptyLabel="Unsorted"
      searchLabel="Find a folder"
      noResultsLabel="No folders found"
      hint="Where the link goes"
      required
      [error]="error()"
      [(value)]="value"
    />
    <ui-select label="Language" [options]="options" placeholder="Pick one" disabled />
  `,
})
class HostComponent {
  readonly options = TREE;
  readonly error = signal('');
  readonly value = signal<string | null>(SELECT_FIXTURE_ID.Angular);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const select = await loader.getHarness(UiSelectHarness.with({ label: 'Folder' }));
  return { fixture, loader, select, host: fixture.componentInstance };
}

describe('UiSelectHarness', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('finds selects by label and disabled state and reads the field', async () => {
    const { loader, select, host } = await setup();
    expect(await loader.getAllHarnesses(UiSelectHarness)).toHaveLength(2);
    const language = await loader.getHarness(UiSelectHarness.with({ disabled: true }));
    expect(await language.getLabel()).toBe('Language');
    expect(await language.isDisabled()).toBe(true);
    expect(await language.getValueText()).toBe('Pick one');
    expect(await language.isPlaceholderShown()).toBe(true);
    expect(await language.getHint()).toBeNull();
    expect(await select.getValueText()).toBe('Work / Angular');
    expect(await select.isPlaceholderShown()).toBe(false);
    expect(await select.getHint()).toBe('Where the link goes');
    expect(await select.isRequired()).toBe(true);
    expect(await select.isInvalid()).toBe(false);
    expect(await select.getError()).toBe('');
    host.error.set('Choose a folder');
    expect(await select.getError()).toBe('Choose a folder');
    expect(await select.isInvalid()).toBe(true);
  });

  it('opens, lists the options and closes', async () => {
    const { select } = await setup();
    expect(await select.getOptions()).toEqual([]);
    expect(await select.getNoResultsText()).toBe('');
    await select.open();
    expect(await select.isOpen()).toBe(true);
    await select.open();
    const options = await select.getOptions();
    expect(await Promise.all(options.map((o) => o.getText()))).toEqual([
      'Unsorted',
      'Work',
      'Angular',
      'Courses',
      'Clothes',
    ]);
    const angular = await select.getOptions({ name: 'Work / Angular' });
    expect(await angular[0]?.isSelected()).toBe(true);
    expect(await angular[0]?.isDisabled()).toBe(false);
    expect(await options[0]?.isSelected()).toBe(false);
    await select.close();
    expect(await select.isOpen()).toBe(false);
    await select.close();
  });

  it('chooses an option by text or name', async () => {
    const { select, host } = await setup();
    await select.chooseOption({ text: 'Clothes' });
    expect(host.value()).toBe(SELECT_FIXTURE_ID.Clothes);
    expect(await select.getValueText()).toBe('Clothes');
    expect(await select.isOpen()).toBe(false);
    await select.chooseOption({ name: 'Work / Courses' });
    expect(host.value()).toBe(SELECT_FIXTURE_ID.Courses);
    await expect(select.chooseOption({ text: 'Nope' })).rejects.toThrow(/no option/);
  });

  it('searches, shows the no-results text and moves with the keyboard', async () => {
    const { select, host, fixture } = await setup();
    await select.search('cour');
    expect(await Promise.all((await select.getOptions()).map((o) => o.getText()))).toEqual([
      'Work',
      'Courses',
    ]);
    await select.search('zzz');
    expect(await select.getOptions()).toEqual([]);
    expect(await select.getNoResultsText()).toBe('No folders found');
    await select.search('');
    expect(await select.getOptions()).toHaveLength(5);
    await select.close();
    await select.focus();
    expect(await select.isFocused()).toBe(true);
    await select.sendKeys(TestKey.DOWN_ARROW);
    expect(await select.isOpen()).toBe(true);
    const active = [];
    for (const option of await select.getOptions()) {
      if (await option.isActive()) {
        active.push(await option.getText());
      }
    }
    expect(active).toHaveLength(1);
    const fromRoot = await TestbedHarnessEnvironment.documentRootLoader(fixture).getAllHarnesses(
      UiOptionHarness.with({ text: 'Clothes' }),
    );
    expect(fromRoot).toHaveLength(1);
    await select.blur();
    expect(host.value()).toBe(SELECT_FIXTURE_ID.Angular);
  });
});
