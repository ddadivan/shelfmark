import { STORAGE_KEY } from '../../../../core/storage/models/storage-key.const';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Router } from '@angular/router';
import { LIBRARY_VIEW } from '@shelfmark/contracts';
import { UiViewMenuHarness } from '@shelfmark/ui/testing';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import type { LinksScope } from '../../../links/models/links-scope.type';
import { GRID_STEP_DEFAULT } from '../../models/grid-step-default.const';
import { ThemeService } from '../../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { LibraryFilterService } from '../../services/library-filter.service';
import { FeedMemoryService } from '../../services/feed-memory.service';
import { provideLibraryPage } from '../../services/provide-library-page';
import { LibraryViewMenuComponent } from './library-view-menu.component';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      ...provideLibraryPage(),
      { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
    ],
  });
  await loadEnglish();
  const filters = TestBed.inject(LibraryFilterService);
  const scope = signal<LinksScope>(LINKS_SCOPE.All);
  filters.connect({
    scope,
    folderId: signal<string | undefined>(undefined),
    tag: signal(undefined),
    q: signal(undefined),
    sort: signal(undefined),
    kind: signal(undefined),
  });
  const fixture = TestBed.createComponent(LibraryViewMenuComponent);
  await fixture.whenStable();
  const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiViewMenuHarness);
  return { fixture, filters, menu };
}

describe('LibraryViewMenuComponent', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY.FeedMemory));
  afterAll(() => localStorage.removeItem(STORAGE_KEY.FeedMemory));

  it('is the "View" button with the default step and Show site and the five fields switched on', async () => {
    const { menu } = await setup();

    expect(await menu.getLabel()).toBe('View');
    expect(await menu.getStep()).toBe(GRID_STEP_DEFAULT);
    expect(await menu.getStepText()).toBe(`${GRID_STEP_DEFAULT} / 6`);
    expect(await menu.getFields()).toEqual([
      { label: 'Show site', checked: true },
      { label: 'Note', checked: true },
      { label: 'Hashtags', checked: true },
      { label: 'Folder', checked: true },
      { label: 'Date', checked: true },
      { label: 'Description', checked: true },
    ]);
  });

  it('remembers a dragged Grid size for the feed', async () => {
    const { menu, filters } = await setup();

    await menu.setStep(2);

    expect(filters.gridStep()).toBe(2);
    expect(TestBed.inject(FeedMemoryService).grid('all')).toBe(2);
    expect(await menu.getStepText()).toBe('2 / 6');
  });

  it('turns a card field off and on from its switch', async () => {
    const { menu, filters } = await setup();

    await menu.toggleField('Hashtags');
    expect(filters.fieldShown('tags')).toBe(false);
    expect(filters.fieldShown('note')).toBe(true);
    expect((await menu.getFields()).find((field) => field.label === 'Hashtags')?.checked).toBe(
      false,
    );

    await menu.toggleField('Hashtags');
    expect(filters.fieldShown('tags')).toBe(true);
  });

  it('sets the preview image size and Show site on the layout and the account', async () => {
    const { fixture, menu } = await setup();
    const theme = TestBed.inject(ThemeService);
    const settings = TestBed.inject(UserSettingsStore);
    const save = vi.spyOn(settings, 'setAppearance').mockResolvedValue(true);

    await menu.open();
    const radio = (label: string) =>
      document.querySelector<HTMLInputElement>(
        `.ui-view-menu__choice input[type="radio"][aria-label="${label}"], .ui-view-menu__choice label:has(input) input`,
      );
    expect(radio('Large')).not.toBeNull();
    const labels = [...document.querySelectorAll('.ui-view-menu__choice label')];
    expect(labels.map((el) => el.textContent?.trim())).toEqual(['Large', 'Small', 'Off']);
    (labels[2]?.querySelector('input') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith({ cardPreview: 'off' });

    await menu.toggleField('Show site');
    expect(save).toHaveBeenCalledWith({ cardSite: false });
    expect(theme.layout().cardSite).toBeTypeOf('boolean');
  });

  it('turns the Grid size slider off in the List and Headlines views only', async () => {
    const { menu } = await setup();
    expect(await menu.isGridDisabled()).toBe(false);

    TestBed.inject(FeedMemoryService).remember('all', { view: LIBRARY_VIEW.List });
    TestBed.tick();
    expect(await menu.isGridDisabled()).toBe(true);

    TestBed.inject(FeedMemoryService).remember('all', { view: LIBRARY_VIEW.Headlines });
    TestBed.tick();
    expect(await menu.isGridDisabled()).toBe(true);

    TestBed.inject(FeedMemoryService).remember('all', { view: LIBRARY_VIEW.Masonry });
    TestBed.tick();
    expect(await menu.isGridDisabled()).toBe(false);
  });
});
