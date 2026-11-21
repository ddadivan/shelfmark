import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { signal } from '@angular/core';
import { UiButtonHarness } from '@shelfmark/ui/testing';
import { axeViolations } from '../../../../../testing/axe';
import { FoldersStore } from '../../../../stores/folders.store';
import type { FolderNode } from '../../../../stores/models/folder-node.interface';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { LinkPreviewRoute } from '../../services/link-preview-route.service';
import { PreviewRailComponent } from './preview-rail.component';

@Component({ selector: 'app-rail-spec-page', template: '' })
class PageComponent {}

async function setup(folders: readonly FolderNode[] = []) {
  const route = { showSidebar: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([{ path: '**', component: PageComponent }]),
      { provide: LinkPreviewRoute, useValue: route },
      { provide: FoldersStore, useValue: { tree: signal(folders) } },
      { provide: UserSettingsStore, useValue: { shownColour: (colour: string) => colour } },
    ],
  });
  await loadEnglish();
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/links?preview=abc');
  const fixture = TestBed.createComponent(PreviewRailComponent);
  await fixture.whenStable();
  return {
    route,
    router,
    fixture,
    element: fixture.nativeElement as HTMLElement,
    loader: TestbedHarnessEnvironment.loader(fixture),
  };
}

const links = (element: HTMLElement) =>
  [...element.querySelectorAll<HTMLAnchorElement>('a')].map((anchor) => ({
    name: anchor.getAttribute('aria-label') ?? anchor.textContent.trim(),
    href: anchor.getAttribute('href'),
    current: anchor.getAttribute('aria-current'),
  }));

describe('PreviewRailComponent', () => {
  it('is a navigation named Library with home, the fixed entries and Show sidebar', async () => {
    const { element, loader } = await setup();
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Library');
    expect(links(element).map((item) => item.href)).toEqual([
      '/links',
      '/links',
      '/unsorted',
      '/favorites',
      '/recent',
    ]);
    expect(
      links(element)
        .slice(1)
        .map((item) => item.name),
    ).toEqual(['All links', 'Unsorted', 'Favorites', 'Recently opened']);
    expect(await loader.getHarness(UiButtonHarness.with({ name: 'Show sidebar' }))).toBeDefined();
  });

  it('has no axe violations', async () => {
    const { element } = await setup([{ folder: { ...MOCK_FOLDERS[0] }, children: [] }]);
    expect(await axeViolations(element)).toEqual([]);
  });

  it('marks the entry of the page it is on as current, ignoring the query', async () => {
    const { element, router, fixture } = await setup();
    const current = () => links(element).filter((item) => item.current === 'page');
    expect(current().map((item) => item.name)).toEqual(['All links']);

    await router.navigateByUrl('/favorites?preview=abc#x');
    await fixture.whenStable();
    expect(current().map((item) => item.name)).toEqual(['Favorites']);
  });

  it('lists the top-level folders after a separator, and marks the open one', async () => {
    const folder = { ...MOCK_FOLDERS[0] };
    const { element, router, fixture } = await setup([{ folder, children: [] }]);
    const name = `Folder ${folder.name}`;
    const entry = () => links(element).find((item) => item.name === name);
    expect(entry()?.href).toBe(`/folders/${folder.id}`);
    expect(entry()?.current).toBeNull();

    await router.navigateByUrl(`/folders/${folder.id}`);
    await fixture.whenStable();
    expect(entry()?.current).toBe('page');
  });

  it('shows no folder section without folders', async () => {
    const { element } = await setup();
    expect(element.querySelector('.preview-rail__folders')).toBeNull();
  });

  it('asks for the full sidebar with "Show sidebar"', async () => {
    const { route, loader } = await setup();
    await (await loader.getHarness(UiButtonHarness.with({ name: 'Show sidebar' }))).click();
    expect(route.showSidebar).toHaveBeenCalledTimes(1);
  });
});
