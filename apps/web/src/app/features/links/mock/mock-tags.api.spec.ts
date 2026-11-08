import { HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_TAG_NAME } from '../models/mock-tag-name.const';
import { MockLibraryData } from './mock-library-data';
import { MockLinksApi } from './mock-links.api';
import { MockTagsApi } from './mock-tags.api';

function create() {
  const injector = Injector.create({ providers: [MockLibraryData] });
  return runInInjectionContext(injector, () => ({
    tags: new MockTagsApi(),
    links: new MockLinksApi(),
    data: injector.get(MockLibraryData),
  }));
}

describe('MockTagsApi', () => {
  it('lists tags with counts derived from the links, most used first', async () => {
    const { tags, data } = create();

    const list = await firstValueFrom(tags.list());

    const counts = list.map((tag) => tag.linkCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    const docs = list.find((tag) => tag.id === MOCK_ID.TagDocs);
    expect(docs?.linkCount).toBe(data.links.filter((l) => l.tags.includes('docs')).length);
  });

  it('creates a tag and refuses a name that exists, ignoring case, with a 409', async () => {
    const { tags } = create();

    const created = await firstValueFrom(tags.create({ name: 'fresh' }));
    expect(created.linkCount).toBe(0);

    const error = await firstValueFrom(tags.create({ name: 'FRESH' })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(409);
  });

  it('fails the special names', async () => {
    const { tags } = create();
    const doomed = await firstValueFrom(tags.create({ name: MOCK_TAG_NAME.DeleteFails }));
    const updatable = await firstValueFrom(tags.create({ name: MOCK_TAG_NAME.UpdateFails }));

    await expect(firstValueFrom(tags.create({ name: MOCK_TAG_NAME.CreateFails }))).rejects.toThrow(
      'Mock: tag create failed',
    );
    await expect(firstValueFrom(tags.remove(doomed.id))).rejects.toThrow('Mock: tag delete failed');
    await expect(firstValueFrom(tags.update(updatable.id, { name: 'x' }))).rejects.toThrow(
      'Mock: tag update failed',
    );
  });

  it('renames a tag in the links, allows a case-only rename and refuses a taken name', async () => {
    const { tags, data } = create();

    await firstValueFrom(tags.update(MOCK_ID.TagDocs, { name: 'Docs' }));
    expect(data.links.some((link) => link.tags.includes('Docs'))).toBe(true);
    expect(data.links.some((link) => link.tags.includes('docs'))).toBe(false);

    const error = await firstValueFrom(tags.update(MOCK_ID.TagDocs, { name: 'RECIPES' })).catch(
      (e: unknown) => e,
    );
    expect((error as HttpErrorResponse).status).toBe(409);
  });

  it('deletes a tag and removes it from the links, which stay', async () => {
    const { tags, data } = create();
    const before = data.links.length;

    await firstValueFrom(tags.remove(MOCK_ID.TagDocs));

    expect(data.links).toHaveLength(before);
    expect(data.links.some((link) => link.tags.includes('docs'))).toBe(false);
    expect(data.tagList.some((tag) => tag.id === MOCK_ID.TagDocs)).toBe(false);
  });

  it('merges into a target: links move, duplicates collapse, the source is gone', async () => {
    const { tags, links, data } = create();
    const saved = await firstValueFrom(
      links.create({ url: 'https://both.example.org/', tags: ['docs', 'recipes'] }),
    );

    const target = await firstValueFrom(tags.merge(MOCK_ID.TagDocs, MOCK_ID.TagRecipes));

    expect(target.id).toBe(MOCK_ID.TagRecipes);
    expect(data.links.find((link) => link.id === saved.id)?.tags).toEqual(['recipes']);
    expect(data.tagList.some((tag) => tag.id === MOCK_ID.TagDocs)).toBe(false);
    expect(target.linkCount).toBe(data.links.filter((l) => l.tags.includes('recipes')).length);
  });

  it('refuses a merge into itself', async () => {
    const { tags } = create();

    await expect(firstValueFrom(tags.merge(MOCK_ID.TagDocs, MOCK_ID.TagDocs))).rejects.toThrow();
  });

  it('adds the tags of a saved link to the list', async () => {
    const { tags, links } = create();

    await firstValueFrom(links.create({ url: 'https://new.example.org/', tags: ['brand-new'] }));

    expect((await firstValueFrom(tags.list())).some((tag) => tag.name === 'brand-new')).toBe(true);
  });
});
