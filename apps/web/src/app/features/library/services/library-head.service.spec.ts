import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import type { LinksScope } from '../../links/models/links-scope.type';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LibraryFilterService } from './library-filter.service';
import { LibraryHeadService } from './library-head.service';

async function setup() {
  TestBed.configureTestingModule({ providers: [provideTranslocoForTest()] });
  await loadEnglish();
  const scope = signal<LinksScope>(LINKS_SCOPE.Favorites);
  const q = signal<unknown>(undefined);
  TestBed.inject(LibraryFilterService).connect({
    scope,
    folderId: signal(undefined),
    tag: signal(undefined),
    q,
    sort: signal(undefined),
    kind: signal(undefined),
  });
  const title = TestBed.inject(Title);
  title.setTitle('Shelfmark');
  const head = TestBed.inject(LibraryHeadService);
  return { head, title, q };
}

describe('LibraryHeadService', () => {
  it('has no breadcrumbs outside a folder', async () => {
    const { head } = await setup();
    TestBed.tick();
    expect(head.crumbs()).toBeNull();
  });

  it('titles the tab after the scope, or the search, and restores the brand', async () => {
    const { title, q } = await setup();
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
    expect(title.getTitle()).toContain('Favorites');
    expect(title.getTitle()).toContain('Shelfmark');

    q.set('signal');
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
    expect(title.getTitle()).toContain('signal');

    TestBed.resetTestingModule();
    expect(title.getTitle()).toBe('Shelfmark');
  });
});
