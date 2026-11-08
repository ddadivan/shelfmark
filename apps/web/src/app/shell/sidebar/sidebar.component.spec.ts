import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MOCK_ID, MOCK_NAME } from '@shelfmark/contracts/testing';
import axe from 'axe-core';
import { FoldersStore } from '../../stores/folders.store';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { MockFoldersApi } from '../../features/links/mock/mock-folders.api';
import { MockLinksApi } from '../../features/links/mock/mock-links.api';
import { MockTagsApi } from '../../features/links/mock/mock-tags.api';
import { FOLDERS_API } from '../../features/links/models/folders-api.const';
import { LINKS_API } from '../../features/links/models/links-api.const';
import { TAGS_API } from '../../features/links/models/tags-api.const';
import { SidebarComponent } from './sidebar.component';

async function setup(url = '/links') {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([
        { path: 'links', children: [] },
        { path: 'unsorted', children: [] },
        { path: 'favorites', children: [] },
        { path: 'folders/:folderId', children: [] },
      ]),
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
    ],
  });
  await loadEnglish();
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const fixture = TestBed.createComponent(SidebarComponent);
  await fixture.whenStable();
  await vi.waitFor(() => {
    TestBed.tick();
    expect(TestBed.inject(FoldersStore).loaded()).toBe(true);
  });
  await fixture.whenStable();
  return { fixture, router, element: fixture.nativeElement as HTMLElement };
}

function rows(element: HTMLElement): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>('[role="treeitem"]')];
}

function row(element: HTMLElement, name: string): HTMLElement {
  const found = rows(element).find((item) => item.textContent?.includes(name));
  if (!found) {
    throw new Error(`no row ${name}`);
  }
  return found;
}

describe('SidebarComponent', () => {
  it('lists the fixed rows with their counts, then the folders', async () => {
    const { element } = await setup();

    const names = rows(element).map((item) => item.querySelector('.ui-tree__name')?.textContent);
    expect(names.slice(0, 3)).toEqual(['All links', 'Unsorted', 'Favorites']);
    expect(names).toContain(MOCK_NAME.FolderReading);
    const counts = rows(element)
      .slice(0, 3)
      .map((item) => Number(item.querySelector('.ui-tree__count')?.textContent));
    expect(counts.every((count) => count > 0)).toBe(true);
    expect(element.querySelector('.ui-tree__section')?.textContent).toBe('Folders');
  });

  it('marks the row of the current URL', async () => {
    const { element } = await setup('/unsorted');

    expect(row(element, 'Unsorted').getAttribute('aria-current')).toBe('page');
    expect(row(element, 'All links').getAttribute('aria-current')).toBeNull();
  });

  it('opens the folders above the current folder', async () => {
    const { element } = await setup(`/folders/${MOCK_ID.FolderAngular}`);

    expect(row(element, MOCK_NAME.FolderReading).getAttribute('aria-expanded')).toBe('true');
    expect(row(element, MOCK_NAME.FolderAngular).getAttribute('aria-current')).toBe('page');
  });

  it('navigates when a row is chosen', async () => {
    const { element, fixture, router } = await setup();

    row(element, 'Favorites').click();
    await fixture.whenStable();
    expect(router.url).toBe('/favorites');

    row(element, MOCK_NAME.FolderReading).click();
    await fixture.whenStable();
    expect(router.url).toBe(`/folders/${MOCK_ID.FolderReading}`);
  });

  it('offers the folder actions in a menu from the "..." button', async () => {
    const { element, fixture } = await setup();

    element
      .querySelector<HTMLButtonElement>(
        `button[aria-label="Actions for ${MOCK_NAME.FolderReading}"]`,
      )
      ?.click();
    await fixture.whenStable();

    const items = [...document.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    );
    expect(items).toEqual([
      'New subfolder',
      'Add link here',
      'Rename',
      'Move to…',
      'Delete folder…',
    ]);
  });

  it('has a New folder button', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('New folder');
  });

  it('has no axe violations', async () => {
    const { element } = await setup();
    document.body.append(element);

    const { violations } = await axe.run(element, {
      rules: { 'color-contrast': { enabled: false } },
    });
    element.remove();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });
});
