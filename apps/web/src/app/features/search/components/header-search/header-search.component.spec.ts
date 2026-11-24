import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { FeedSearchService } from '../../services/feed-search.service';
import { RecentSearchesService } from '../../services/recent-searches.service';
import { SearchFieldService } from '../../services/search-field.service';
import { HeaderSearchComponent } from './header-search.component';

async function setup(options: { text?: string; recent?: string[]; askOn?: boolean } = {}) {
  const text = signal(options.text ?? '');
  const search = {
    text,
    setText: vi.fn((value: string) => text.set(value)),
    flush: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => {
      text.set('');
      return Promise.resolve();
    }),
  };
  const recent = { items: signal(options.recent ?? []), add: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: FeedSearchService, useValue: search },
      { provide: RecentSearchesService, useValue: recent },
      { provide: AiSettingsStore, useValue: { askOn: signal(options.askOn ?? false) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(HeaderSearchComponent);
  document.body.append(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const input = element.querySelector<HTMLInputElement>('input[role="combobox"]');
  if (!input) {
    throw new Error('no search field');
  }
  return { fixture, search, recent, element, input };
}

function key(target: HTMLElement, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('HeaderSearchComponent (Shelf header search)', () => {
  afterEach(() => {
    document.querySelector('app-header-search')?.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
  });

  it('is a search field with the shortcut hint, which writes the text to the feed search', async () => {
    const { element, input, search, fixture } = await setup();

    expect(input.getAttribute('aria-label')).toBe('Search links, folders and tags');
    expect(element.querySelector('kbd')?.textContent).toMatch(/K$/u);

    input.value = 'angular';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(search.setText).toHaveBeenCalledWith('angular');
  });

  it('shows the text of the feed search and a Clear button that empties it', async () => {
    const { fixture, search, input } = await setup({ text: 'signals' });
    const loader = TestbedHarnessEnvironment.loader(fixture);

    expect(input.value).toBe('signals');
    const clear = await loader.getHarness(UiButtonHarness.with({ label: 'Clear search' }));
    await clear.click();

    expect(search.clear).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
  });

  it('opens Recent searches on focus of the empty field and searches the one chosen', async () => {
    const { fixture, input, search, recent } = await setup({
      recent: ['shoes', 'recipes'],
      askOn: true,
    });

    input.focus();
    await fixture.whenStable();
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options.map((option) => option.textContent?.trim())).toEqual(['shoes', 'recipes']);
    expect(document.body.textContent).toContain('use Ask on the right of the field');

    options[1]?.click();
    await fixture.whenStable();

    expect(search.setText).toHaveBeenCalledWith('recipes');
    expect(recent.add).toHaveBeenCalledWith('recipes');
    expect(search.flush).toHaveBeenCalled();
  });

  it('has no panel while the field has text', async () => {
    const { fixture, input } = await setup({ text: 'angular', recent: ['shoes'] });

    input.focus();
    await fixture.whenStable();

    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('Enter searches now, remembers the text and moves to the first result of the feed', async () => {
    const { input, search, recent } = await setup({ text: 'angular' });
    const card = document.createElement('a');
    card.className = 'ui-card__link';
    card.href = '#';
    document.body.append(card);

    const event = key(input, 'Enter');

    expect(event.defaultPrevented).toBe(true);
    expect(recent.add).toHaveBeenCalledWith('angular');
    await vi.waitFor(() => expect(document.activeElement).toBe(card));
    expect(search.flush).toHaveBeenCalled();
    card.remove();
  });

  it('Esc clears the text', async () => {
    const { input, search, fixture } = await setup({ text: 'angular' });

    input.focus();
    key(input, 'Escape');
    await fixture.whenStable();

    expect(search.setText).toHaveBeenCalledWith('');
  });

  it('remembers the text as a recent search when focus leaves the field', async () => {
    const { input, recent } = await setup({ text: 'jacket' });

    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
    );

    expect(recent.add).toHaveBeenCalledWith('jacket');
  });

  it('registers the field for the shortcut while it is there', async () => {
    const { fixture, input } = await setup();
    const registry = TestBed.inject(SearchFieldService);

    expect(registry.focus()).toBe(true);
    expect(document.activeElement).toBe(input);

    fixture.destroy();
    expect(registry.focus()).toBe(false);
  });
});
