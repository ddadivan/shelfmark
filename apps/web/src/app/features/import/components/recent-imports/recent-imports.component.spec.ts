import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { IMPORT_SOURCE, type ImportSummary } from '@shelfmark/contracts';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { RecentImportsStore } from '../../services/recent-imports.store';
import { RecentImportsComponent } from './recent-imports.component';

function summary(id: string, extra: Partial<ImportSummary> = {}): ImportSummary {
  return {
    id,
    source: IMPORT_SOURCE.Browser,
    fileName: `${id}.html`,
    createdAt: '2026-11-03T12:00:00.000Z',
    finishedAt: '2026-11-03T12:01:00.000Z',
    ai: null,
    targetFolderId: null,
    linksCreated: 212,
    foldersCreated: 9,
    skipped: 14,
    failed: 0,
    ...extra,
  };
}

async function setup(items: ImportSummary[]) {
  const itemsSignal = signal<readonly ImportSummary[]>(items);
  const store = {
    items: itemsSignal,
    undoing: signal<string | null>(null),
    load: vi.fn(async () => undefined),
    undo: vi.fn(async () => true),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: RecentImportsStore, useValue: store },
      { provide: ViewportService, useValue: { compact: signal(false) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(RecentImportsComponent);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { store, itemsSignal, fixture, loader, root: fixture.nativeElement as HTMLElement };
}

describe('RecentImportsComponent', () => {
  it('loads the recent imports when it is created', async () => {
    const { store } = await setup([]);

    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while there are no imports', async () => {
    const { root } = await setup([]);

    expect(root.querySelector('ui-settings-section')).toBeNull();
    expect(root.textContent?.trim()).toBe('');
  });

  it('lists each import with its file name and the line "date · links, folders, skipped"', async () => {
    const { root } = await setup([
      summary('a'),
      summary('b', { linksCreated: 1, foldersCreated: 0, skipped: 0, failed: 3 }),
    ]);
    const text = root.textContent ?? '';

    expect(text).toContain('Recent imports');
    expect(text).toContain('a.html');
    expect(text).toMatch(/Nov 3, 2026 · 212 links, 9 folders, 14 skipped/);
    expect(text).toContain('b.html');
    expect(text).toMatch(/Nov 3, 2026 · 1 link, 3 failed/);
    expect(text).toContain('Undo import is available for 7 days.');
  });

  it('calls the store with the import id and its link count when Undo import is pressed', async () => {
    const { loader, store } = await setup([summary('a'), summary('b', { linksCreated: 7 })]);

    const second = await loader.getHarness(UiButtonHarness.with({ label: 'Undo import: b.html' }));
    await second.click();

    expect(store.undo).toHaveBeenCalledTimes(1);
    expect(store.undo).toHaveBeenCalledWith('b', 7);
  });

  it('gives every undo button the name of its file', async () => {
    const { loader } = await setup([summary('a'), summary('b')]);

    const buttons = await loader.getAllHarnesses(UiButtonHarness);

    expect(await Promise.all(buttons.map((button) => button.getName()))).toEqual([
      'Undo import: a.html',
      'Undo import: b.html',
    ]);
  });

  it('removes the section when the last import goes away', async () => {
    const { itemsSignal, fixture, root } = await setup([summary('a')]);

    itemsSignal.set([]);
    await fixture.whenStable();

    expect(root.querySelector('ui-settings-section')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { root } = await setup([summary('a'), summary('b')]);

    expect(await axeViolations(root)).toEqual([]);
  });
});
