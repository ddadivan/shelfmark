import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { FolderResponse, SavedViewResponse, TagResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { FoldersStore } from '../../../../stores/folders.store';
import { SavedViewsStore } from '../../../../stores/saved-views.store';
import { TagsStore } from '../../../../stores/tags.store';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import { TagActionsService } from '../../../tags/services/tag-actions.service';
import { SavedViewActionsService } from '../../../views/services/saved-view-actions.service';
import { SearchGoToComponent } from './search-go-to.component';

const FOLDER: FolderResponse = { ...MOCK_FOLDERS[0], id: 'f1', name: 'Angular', linkCount: 2 };
const TAG = { id: 't1', name: 'angular', linkCount: 1 } as TagResponse;
const VIEW = { id: 'v1', name: 'Angular videos', count: 4, available: true } as SavedViewResponse;

async function setup(query: string) {
  const tags = { showLinks: vi.fn(() => Promise.resolve()) };
  const views = { apply: vi.fn(() => Promise.resolve()) };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      {
        provide: FoldersStore,
        useValue: { entities: signal([FOLDER]), pathTo: () => [FOLDER], load: vi.fn() },
      },
      { provide: TagsStore, useValue: { entities: signal([TAG]), load: vi.fn() } },
      { provide: SavedViewsStore, useValue: { items: signal([VIEW]) } },
      { provide: TagActionsService, useValue: tags },
      { provide: SavedViewActionsService, useValue: views },
    ],
  });
  await loadEnglish();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SearchGoToComponent);
  fixture.componentRef.setInput('query', query);
  fixture.componentRef.setInput('filter', { scope: LINKS_SCOPE.All, q: query });
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const buttons = (): HTMLButtonElement[] => [...element.querySelectorAll('button')];
  return { element, buttons, navigate, tags, views };
}

describe('SearchGoToComponent', () => {
  it('lists the folders, tags and views whose name has the words, as named chips', async () => {
    const { element, buttons } = await setup('angular');

    expect(element.textContent).toContain('Go to');
    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Open folder Angular, 2',
      'Show links tagged angular, 1',
      'Open view Angular videos, 4',
    ]);
    expect(element.classList).toContain('search-go-to--shown');
    expect(await axeViolations(element)).toEqual([]);
  });

  it('opens the folder, the tag and the view, leaving the search', async () => {
    const { buttons, navigate, tags, views } = await setup('angular');

    buttons()[0]?.click();
    buttons()[1]?.click();
    buttons()[2]?.click();

    expect(navigate).toHaveBeenCalledWith(['/', 'folders', 'f1']);
    expect(tags.showLinks).toHaveBeenCalledWith('angular');
    expect(views.apply).toHaveBeenCalledWith(VIEW, { scope: LINKS_SCOPE.All, q: undefined });
  });

  it('renders nothing when nothing matches', async () => {
    const { element, buttons } = await setup('sofa');

    expect(buttons()).toHaveLength(0);
    expect(element.textContent?.trim()).toBe('');
    expect(element.classList).not.toContain('search-go-to--shown');
  });
});
