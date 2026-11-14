import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { EmojiPickerComponent } from '../emoji-picker.component';
import type { EmojiPickerItem } from '../models/emoji-picker-item.interface';
import { UiEmojiPickerHarness } from './emoji-picker.harness';

@Component({
  imports: [EmojiPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-emoji-picker
      label="Emoji"
      placeholder="Choose an emoji"
      searchLabel="Search emoji"
      categoriesLabel="Categories"
      ownLabel="Yours"
      resultsLabel="Results"
      noResultsLabel="No emoji found"
      [categories]="categories"
      [own]="own()"
      [(value)]="value"
      (removed)="removed.set($event)"
    />
    <ui-emoji-picker label="Other" searchLabel="Search" categoriesLabel="Categories" disabled />
  `,
})
class HostComponent {
  readonly categories = [
    { id: 'food', label: 'Food', items: [{ emoji: '🍕', name: 'pizza', keywords: ['cheese'] }] },
    { id: 'animals', label: 'Animals', items: [{ emoji: '🐶', name: 'dog face' }] },
  ];
  readonly own = signal<EmojiPickerItem[]>([{ emoji: '🦩', name: '🦩', removeLabel: 'Remove 🦩' }]);
  readonly value = signal('');
  readonly removed = signal('');
}

describe('UiEmojiPickerHarness', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.replaceChildren());
  });

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const picker = await loader.getHarness(UiEmojiPickerHarness.with({ label: 'Emoji' }));
    return { fixture, loader, picker, host: fixture.componentInstance };
  }

  it('filters by label and value and reads the field', async () => {
    const { loader, picker } = await setup();
    expect(await loader.getAllHarnesses(UiEmojiPickerHarness)).toHaveLength(2);
    expect(await picker.getLabel()).toBe('Emoji');
    expect(await picker.getPlaceholder()).toBe('Choose an emoji');
    expect(await picker.getValue()).toBe('');
    expect(await picker.getError()).toBe('');
    expect(await picker.isDisabled()).toBe(false);
    const other = await loader.getHarness(UiEmojiPickerHarness.with({ label: 'Other' }));
    expect(await other.isDisabled()).toBe(true);
    await picker.setValue('🦩');
    expect(await loader.getAllHarnesses(UiEmojiPickerHarness.with({ value: '🦩' }))).toHaveLength(
      1,
    );
  });

  it('opens, reads sections and categories, chooses and closes', async () => {
    const { picker, host } = await setup();
    expect(await picker.getSections()).toEqual([]);
    expect(await picker.getEmojiNames()).toEqual([]);
    await picker.open();
    expect(await picker.isOpen()).toBe(true);
    expect(await picker.getCategories()).toEqual(['Food', 'Animals']);
    expect(await picker.getSections()).toEqual(['Yours', 'Food']);
    expect(await picker.getEmojiNames('Food')).toEqual(['pizza']);
    expect(await picker.getEmojiNames('Missing')).toEqual([]);
    expect(await picker.getRemovableNames()).toEqual(['🦩']);
    await picker.selectCategory('Animals');
    expect(await picker.getEmojiNames('Animals')).toEqual(['dog face']);
    await picker.choose('dog face');
    expect(host.value()).toBe('🐶');
    expect(await picker.isOpen()).toBe(false);
    expect(await picker.isFocused()).toBe(true);
    await picker.open();
    await picker.close();
    expect(await picker.isOpen()).toBe(false);
    await picker.close();
  });

  it('searches, reports no results and removes an own emoji', async () => {
    const { picker, host } = await setup();
    await picker.search('chee');
    expect(await picker.getSections()).toEqual(['Results']);
    expect(await picker.getEmojiNames()).toEqual(['pizza']);
    expect(await picker.getNoResultsText()).toBe('');
    await picker.search('zebra');
    expect(await picker.getNoResultsText()).toBe('No emoji found');
    await expect(picker.choose('pizza')).rejects.toThrow('no emoji named "pizza"');
    await picker.search('');
    await picker.remove('🦩');
    expect(host.removed()).toBe('🦩');
    await picker.close();
    expect(await picker.getNoResultsText()).toBe('');
    await expect(picker.selectCategory('Food')).rejects.toThrow('the panel is closed');
  });
});
