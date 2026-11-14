import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { TagsStore } from '../../../stores/tags.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { LINKS_API } from '../../links/models/links-api.const';
import { TAGS_API } from '../../links/models/tags-api.const';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTagsApi } from '../../links/mock/mock-tags.api';
import { TagMenuService } from './tag-menu.service';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([{ path: 'links', children: [] }]),
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      TagMenuService,
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(TagsStore);
  await store.load();
  const tag = store.entityMap()[MOCK_ID.TagDocs];
  if (!tag) {
    throw new Error('no docs tag');
  }
  return { menu: TestBed.inject(TagMenuService), tag, router: TestBed.inject(Router) };
}

describe('TagMenuService', () => {
  it('has no tag, label or summary until a menu is opened', async () => {
    const { menu } = await setup();

    expect(menu.tag()).toBeUndefined();
    expect(menu.label()).toBeUndefined();
    expect(menu.summary()).toBe('');
  });

  it('names the tag of the open menu', async () => {
    const { menu, tag } = await setup();

    menu.open(tag);

    expect(menu.tag()).toEqual(tag);
    expect(menu.label()).toContain(tag.name);
    expect(menu.summary()).toContain(tag.name);
  });

  it('keeps the tag after the menu closes, so a chosen item still has its target', async () => {
    const { menu, tag, router } = await setup();
    menu.open(tag);

    menu.closed();
    menu.show();
    await vi.waitFor(() => expect(router.url).toContain('/links?tag='));

    expect(menu.tag()).toEqual(tag);
  });
});
