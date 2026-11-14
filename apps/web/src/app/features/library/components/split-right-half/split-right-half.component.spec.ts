import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import type { LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { LinkDragService } from '../../../links/services/link-drag.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LibraryDragService } from '../../services/library-drag.service';
import { SplitFeedStore } from '../../services/split-feed.store';
import { SplitViewService } from '../../services/split-view.service';
import type { SplitTarget } from '../../models/split-target.type';
import { SplitRightHalfComponent } from './split-right-half.component';

const link = (n: number): LinkResponse => ({
  ...MOCK_LINKS[0],
  id: `id-${n}`,
  title: `Link ${n}`,
  url: `https://site${n}.example.com/a`,
});

async function setup(...given: [SplitTarget?]) {
  const rightTarget = signal<SplitTarget>(given.length > 0 ? given[0] : 'f1');
  const entities = signal<LinkResponse[]>([link(1), link(2)]);
  const treeTarget = signal<string | null>(null);
  const feed = {
    entities,
    target: signal<SplitTarget>(rightTarget()),
    count: () => entities().length,
    loaded: signal(true),
    error: signal(false),
    hasMore: signal(false),
    loadingMore: signal(false),
    loadMoreFailed: signal(false),
    show: vi.fn(),
    loadMore: vi.fn(),
  };
  const split = {
    rightTarget,
    resolving: signal(false),
    rightDropValue: () => (rightTarget() === undefined ? null : (rightTarget() ?? 'unsorted')),
    rightLabel: () => 'Clothes',
    rightValue: rightTarget,
    rightTile: () => ({ colour: 'rose', icon: 'folder' }),
    rightOptions: () => [{ id: 'f1', name: 'Clothes' }],
    rightCurrentIds: () => [],
    takePickerFocus: () => false,
    close: vi.fn(() => Promise.resolve()),
    chooseRight: vi.fn(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: SplitViewService, useValue: split },
      { provide: SplitFeedStore, useValue: feed },
      { provide: LinkDragService, useValue: { treeTargetId: treeTarget, grab: vi.fn() } },
      {
        provide: LibraryDragService,
        useValue: {
          DRAG_START_DELAY: { touch: 150, mouse: 0 },
          dropsOn: (value: string | null) => value !== null && value === treeTarget(),
          dragLabelKey: () => 'links.drag.move',
          dragCount: () => 1,
        },
      },
      { provide: LinkActionsService, useValue: { open: vi.fn() } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(SplitRightHalfComponent);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const loader = TestbedHarnessEnvironment.loader(fixture);
  return { fixture, element, loader, feed, split, rightTarget, treeTarget, entities };
}

describe('SplitRightHalfComponent', () => {
  it('asks for a folder while there is no target, with the close button', async () => {
    const { element, loader, split } = await setup(undefined);

    expect(element.textContent).toContain('Choose a folder to move links into');
    expect(element.querySelector('ui-picker-list')).not.toBeNull();
    expect(element.querySelector('app-link-card')).toBeNull();

    const close = await loader.getHarness(UiButtonHarness.with({ label: 'Close side by side' }));
    await close.click();
    expect(split.close).toHaveBeenCalled();
  });

  it('shows the folder menu, the count and read-only cards', async () => {
    const { element } = await setup();

    expect(element.querySelector('ui-picker-menu')).not.toBeNull();
    expect(element.textContent).toContain('2 links');
    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
    expect(element.querySelector('input[type="checkbox"]')).toBeNull();
    expect(element.querySelector('section')?.getAttribute('aria-label')).toBe('Right: Clothes');
    expect(element.querySelector('section')?.getAttribute('data-link-drop-folder')).toBe('f1');
  });

  it('says what to do when the folder is empty', async () => {
    const { element, fixture, entities } = await setup();

    entities.set([]);
    await fixture.whenStable();

    expect(element.textContent).toContain('Drag links here from the left.');
    expect(element.querySelector('app-link-card')).toBeNull();
  });

  it('shows a skeleton while the folders resolve', async () => {
    const { element, fixture, split } = await setup('f1');

    split.resolving.set(true);
    await fixture.whenStable();

    expect(element.querySelector('ui-skeleton')).not.toBeNull();
    expect(element.querySelector('ui-picker-menu')).toBeNull();
    expect(element.querySelector('ui-picker-list')).toBeNull();
  });

  it('shows a skeleton, not the cards of the folder before, until the feed follows the target', async () => {
    const { element, fixture, rightTarget, feed } = await setup();
    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);

    feed.target.set('f1');
    rightTarget.set('f2');
    await fixture.whenStable();

    expect(element.querySelector('app-link-card')).toBeNull();
    expect(element.querySelector('ui-skeleton')).not.toBeNull();

    feed.target.set('f2');
    await fixture.whenStable();
    expect(element.querySelectorAll('app-link-card')).toHaveLength(2);
  });

  it('retries a failed first load', async () => {
    const { fixture, loader, feed, entities } = await setup();
    entities.set([]);
    feed.error.set(true);
    await fixture.whenStable();

    const retry = await loader.getHarness(UiButtonHarness.with({ text: 'Try again' }));
    await retry.click();

    expect(feed.show).toHaveBeenCalledWith('f1');
  });

  it('loads more on request when a next page exists', async () => {
    const { fixture, loader, feed } = await setup();
    feed.hasMore.set(true);
    await fixture.whenStable();

    const more = await loader.getHarness(UiButtonHarness.with({ text: 'Load more' }));
    await more.click();

    expect(feed.loadMore).toHaveBeenCalled();
  });

  it('shows the accent ring and "Move here" only while a drag is over the half', async () => {
    const { element, fixture, treeTarget } = await setup();
    expect(element.querySelector('.split-right--target')).toBeNull();
    expect(element.querySelector('ui-badge')).toBeNull();

    treeTarget.set('f1');
    await fixture.whenStable();

    expect(element.querySelector('.split-right--target')).not.toBeNull();
    expect(element.querySelector('ui-badge')?.textContent).toContain('Move here');
  });

  it('takes Unsorted as a drop target by its token', async () => {
    const { element, fixture, treeTarget } = await setup(null);
    expect(element.querySelector('section')?.getAttribute('data-link-drop-folder')).toBe(
      'unsorted',
    );

    treeTarget.set('unsorted');
    await fixture.whenStable();

    expect(element.querySelector('.split-right--target')).not.toBeNull();
  });
});
