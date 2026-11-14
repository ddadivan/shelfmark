import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TagSuggestion } from '../models/tag-suggestion.interface';
import { TagInputComponent } from '../tag-input.component';
import { UiTagInputHarness } from './tag-input.harness';

const SUGGESTIONS: TagSuggestion[] = [
  { name: 'signals', countLabel: '12 links' },
  { name: 'angular', countLabel: '8 links' },
  { name: 'design' },
];

@Component({
  imports: [TagInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-tag-input
      label="Tags"
      placeholder="Add tag"
      maxTagsLabel="Up to 3 tags"
      createLabel="Create tag “{name}”"
      removeLabel="Remove tag {name}"
      addedLabel="Tag {name} added"
      removedLabel="Tag {name} removed"
      listLabel="Tag suggestions"
      [suggestions]="suggestions"
      [maxTags]="3"
      [error]="error()"
      [(value)]="value"
    />
    <ui-tag-input label="Locked" disabled />
  `,
})
class HostComponent {
  readonly suggestions = SUGGESTIONS;
  readonly error = signal('');
  readonly value = signal<string[]>(['angular']);
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const tags = await loader.getHarness(UiTagInputHarness.with({ label: 'Tags' }));
  return { fixture, loader, tags, host: fixture.componentInstance };
}

describe('UiTagInputHarness', () => {
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

  it('finds tag inputs by label and disabled state and reads the field', async () => {
    const { loader, tags, host } = await setup();
    expect(await loader.getAllHarnesses(UiTagInputHarness)).toHaveLength(2);
    const locked = await loader.getHarness(UiTagInputHarness.with({ disabled: true }));
    expect(await locked.getLabel()).toBe('Locked');
    expect(await locked.isDisabled()).toBe(true);
    expect(await tags.getTags()).toEqual(['angular']);
    expect(await tags.getRemoveLabels()).toEqual(['Remove tag angular']);
    expect(await tags.getPlaceholder()).toBe('Add tag');
    expect(await tags.getQuery()).toBe('');
    expect(await tags.isAtLimit()).toBe(false);
    expect(await tags.isInvalid()).toBe(false);
    expect(await tags.getError()).toBe('');
    host.error.set('Too many');
    expect(await tags.getError()).toBe('Too many');
    expect(await tags.isInvalid()).toBe(true);
  });

  it('adds tags by typing, from a suggestion and by Enter, up to the limit', async () => {
    const { tags, host } = await setup();
    await tags.type('sig');
    expect(await tags.isOpen()).toBe(true);
    expect(await tags.getQuery()).toBe('sig');
    const rows = await tags.getSuggestions();
    expect(await Promise.all(rows.map((row) => row.getName()))).toContain('signals, 12 links');
    await tags.chooseSuggestion({ text: /^signals/ });
    expect(host.value()).toEqual(['angular', 'signals']);
    expect(await tags.getAnnouncement()).toBe('Tag signals added');
    await tags.addTag('Courses');
    expect(await tags.getTags()).toEqual(['angular', 'signals', 'Courses']);
    expect(await tags.isAtLimit()).toBe(true);
    expect(await tags.getPlaceholder()).toBe('Up to 3 tags');
    expect(await tags.getSuggestions()).toEqual([]);
    await expect(tags.chooseSuggestion({ text: 'design' })).rejects.toThrow(/no suggestion/);
  });

  it('removes tags with the chip button and with Backspace', async () => {
    const { tags, host } = await setup();
    host.value.set(['angular', 'design', 'signals']);
    await tags.removeTag('design');
    expect(await tags.getTags()).toEqual(['angular', 'signals']);
    expect(await tags.getAnnouncement()).toBe('Tag design removed');
    await tags.focus();
    expect(await tags.isFocused()).toBe(true);
    await tags.sendKeys(TestKey.BACKSPACE);
    expect(host.value()).toEqual(['angular']);
    await tags.blur();
    await expect(tags.removeTag('nope')).rejects.toThrow(/no tag/);
  });
});
