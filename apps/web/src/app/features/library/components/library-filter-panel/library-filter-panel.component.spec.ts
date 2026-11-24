import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { type NavigationExtras, Router } from '@angular/router';
import { UiPopoverHarness } from '@shelfmark/ui/testing';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { TAGS_API } from '../../../links/models/tags-api.const';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import type { LinksScope } from '../../../links/models/links-scope.type';
import { LibraryFilterService } from '../../services/library-filter.service';
import { provideLibraryPage } from '../../services/provide-library-page';
import { LibraryFilterPanelComponent } from './library-filter-panel.component';

@Component({
  imports: [LibraryFilterPanelComponent],
  template: `<button type="button" #anchor>More</button><app-library-filter-panel />`,
})
class HostComponent {
  readonly panel = viewChild.required(LibraryFilterPanelComponent);
}

const TAGS = [
  { id: 't1', name: 'docs', linkCount: 4, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 't2', name: 'video', linkCount: 2, createdAt: '2026-01-01T00:00:00.000Z' },
];

async function setup(scopeValue: LinksScope = LINKS_SCOPE.All) {
  const router = {
    navigate: vi.fn((_commands: readonly unknown[], _extras?: NavigationExtras) =>
      Promise.resolve(true),
    ),
  };
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      ...provideLibraryPage(),
      provideTranslocoForTest(),
      { provide: Router, useValue: router },
      { provide: TAGS_API, useValue: { list: () => of(TAGS) } },
    ],
  });
  await loadEnglish();
  const kind = signal<unknown>(undefined);
  const saved = signal<unknown>(undefined);
  TestBed.inject(LibraryFilterService).connect({
    scope: signal(scopeValue),
    folderId: signal(undefined),
    tag: signal(undefined),
    q: signal(undefined),
    sort: signal(undefined),
    kind,
    saved,
    fav: signal(undefined),
  });
  const fixture = TestBed.createComponent(HostComponent);
  document.body.append(fixture.nativeElement as HTMLElement);
  await fixture.whenStable();
  const anchor = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLElement;
  fixture.componentInstance.panel().open(anchor);
  await fixture.whenStable();
  const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  const dialog = () => document.querySelector('ui-popover.filter-panel') as HTMLElement;
  const buttons = () => [...dialog().querySelectorAll('button')];
  const last = () => router.navigate.mock.lastCall?.[1]?.queryParams;
  return { fixture, loader, dialog, buttons, last, kind, saved };
}

describe('LibraryFilterPanelComponent', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
    document.body.innerHTML = '';
  });

  it('opens as the "Filter" dialog with Type, Saved, Tags and Only favorites', async () => {
    const { loader, dialog, buttons } = await setup();
    const popover = await loader.getHarness(UiPopoverHarness);
    expect(await popover.isOpen()).toBe(true);
    expect(await popover.getHeading()).toBe('Filter');
    const names = buttons().map((button) => button.textContent.trim());
    expect(names).toContain('Videos');
    expect(names).not.toContain('Other');
    expect(names).toContain('#docs');
    expect(dialog().querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(dialog().querySelector('[role="switch"]')?.getAttribute('aria-label')).toBe(
      'Only favorites',
    );
    expect(await axeViolations(dialog())).toEqual([]);
  });

  it('a kind, a tag, Saved and Only favorites go straight into the URL', async () => {
    const { fixture, buttons, dialog, last, kind } = await setup();
    buttons()
      .find((button) => button.textContent.trim() === 'Videos')
      ?.click();
    expect(last()).toEqual({ kind: 'video' });
    kind.set('video');
    await fixture.whenStable();
    const videos = buttons().find((button) => button.textContent.trim() === 'Videos');
    expect(videos?.getAttribute('aria-pressed')).toBe('true');

    buttons()
      .find((button) => button.textContent.trim() === '#docs')
      ?.click();
    expect(last()).toEqual({ tag: ['docs'] });

    const week = dialog().querySelector<HTMLInputElement>('input[type="radio"][value="week"]');
    week?.click();
    expect(last()).toEqual({ saved: 'week' });

    dialog().querySelector<HTMLButtonElement>('[role="switch"]')?.click();
    expect(last()).toEqual({ fav: '1' });
  });

  it('has no Only favorites switch on the Favorites feed', async () => {
    const { dialog } = await setup(LINKS_SCOPE.Favorites);
    expect(dialog().querySelector('[role="switch"]')).toBeNull();
  });
});
