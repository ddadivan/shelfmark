import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { FolderResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { of } from 'rxjs';
import { FOLDERS_API } from '../links/models/folders-api.const';
import { LINKS_API } from '../links/models/links-api.const';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { UI_STORAGE_KEY } from '../../stores/models/ui-storage-key.const';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import LibraryPage from './library.page';

const BASE: FolderResponse = { ...MOCK_FOLDERS[0], parentId: null, linkCount: 0 };
const ROOT: FolderResponse = { ...BASE, id: 'f1', name: 'Work', linkCount: 3 };
const ANGULAR: FolderResponse = {
  ...BASE,
  id: 'f2',
  name: 'Angular',
  parentId: 'f1',
  linkCount: 12,
};
const COURSES: FolderResponse = {
  ...BASE,
  id: 'f3',
  name: 'Courses',
  parentId: 'f1',
  linkCount: 1,
};
const SIGNALS: FolderResponse = {
  ...BASE,
  id: 'f4',
  name: 'Signals',
  parentId: 'f2',
  linkCount: 2,
};
const OTHER: FolderResponse = { ...BASE, id: 'f5', name: 'Clothes', linkCount: 5 };

async function setup(folderId: string, inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      {
        provide: LINKS_API,
        useValue: {
          list: () => of({ items: [{ ...MOCK_LINKS[0], id: 'id-1' }], nextCursor: null }),
          recent: () => of({ items: [] }),
        },
      },
      {
        provide: FOLDERS_API,
        useValue: {
          list: () =>
            of({ items: [ROOT, COURSES, ANGULAR, SIGNALS, OTHER], counts: MOCK_LIBRARY_COUNTS }),
        },
      },
      { provide: DialogService, useValue: { confirm: vi.fn(() => Promise.resolve(false)) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(LibraryPage);
  fixture.componentRef.setInput('scope', LINKS_SCOPE.Folder);
  fixture.componentRef.setInput('folderId', folderId);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('LibraryPage subfolders', () => {
  beforeEach(() => localStorage.removeItem(UI_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(UI_STORAGE_KEY));

  it('lists the direct subfolders first, by name, as links into the folders', async () => {
    const { element } = await setup('f1');

    const tiles = [...element.querySelectorAll<HTMLAnchorElement>('app-folder-tile a')];
    expect(tiles.map((a) => a.getAttribute('href'))).toEqual(['/folders/f2', '/folders/f3']);
    expect(tiles[0].getAttribute('aria-label')).toBe('Open folder Angular, 12 links, 1 subfolder');
    expect(tiles[1].getAttribute('aria-label')).toBe('Open folder Courses, 1 link');
    expect(tiles[0].textContent).toContain('12 links, 1 subfolder');
    expect(tiles[1].textContent).toContain('1 link');
    expect(tiles[1].textContent).not.toContain('subfolder');
    const folders = element.querySelector('.library__folders');
    const cards = element.querySelector('app-link-card');
    expect(folders).not.toBeNull();
    expect(cards).not.toBeNull();
    expect(folders?.compareDocumentPosition(cards as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows rows in the list view', async () => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ view: UI_VIEW.List }));
    const { element } = await setup('f1');

    expect(element.querySelector('.library__folders--rows')).not.toBeNull();
    expect(element.querySelector('app-folder-tile.folder-tile--row')).not.toBeNull();
  });

  it('shows none for a folder without subfolders', async () => {
    const { element } = await setup('f3');

    expect(element.querySelector('app-folder-tile')).toBeNull();
  });

  it('hides them while a search is on', async () => {
    const { element } = await setup('f1', { q: 'signal' });

    expect(element.querySelector('app-folder-tile')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { element } = await setup('f1');
    document.body.append(element);
    const result = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
    element.remove();
    expect(result.violations).toEqual([]);
  });
});
