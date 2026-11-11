import { LINK_KIND, LINK_SORT_FIELD } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { buildExportUrl, exportScopeOf } from '../export/export-url';
import { isLinkKind, parseLinkKind } from './link-kind';
import { inFilter, linksQuery } from './links-filter';
import { MockLibraryData } from './mock/mock-library-data';
import { MockLinksApi } from './mock/mock-links.api';
import { LINKS_SCOPE } from './models/links-scope.const';

describe('link kind', () => {
  it('parses ?kind= and drops anything else', () => {
    expect(parseLinkKind(LINK_KIND.Video)).toBe(LINK_KIND.Video);
    expect(parseLinkKind('podcast')).toBeUndefined();
    expect(parseLinkKind([LINK_KIND.Video])).toBeUndefined();
    expect(parseLinkKind(undefined)).toBeUndefined();
    expect(isLinkKind(LINK_KIND.Other)).toBe(true);
    expect(isLinkKind(3)).toBe(false);
  });

  it('is part of the list query, the in-feed check and the export', () => {
    const filter = { scope: LINKS_SCOPE.All, kind: LINK_KIND.Article } as const;
    expect(linksQuery(filter)).toEqual({ kind: LINK_KIND.Article });
    expect(inFilter(filter, { ...MOCK_LINKS[0], kind: LINK_KIND.Article })).toBe(true);
    expect(inFilter(filter, { ...MOCK_LINKS[0], kind: LINK_KIND.Video })).toBe(false);
    const scope = exportScopeOf(filter);
    expect(scope).toEqual({ kind: LINK_KIND.Article });
    expect(buildExportUrl('/api', 'json', scope ?? {})).toBe(
      '/api/export?format=json&kind=article',
    );
  });

  it('the mock API derives, recomputes and filters by kind like the server', async () => {
    const api = runInInjectionContext(
      Injector.create({ providers: [MockLibraryData] }),
      () => new MockLinksApi(),
    );
    expect((await firstValueFrom(api.preview('https://youtu.be/x'))).preview.kind).toBe(
      LINK_KIND.Video,
    );
    const shop = await firstValueFrom(
      api.create({ url: 'https://www.etsy.com/l/1', title: 'Mug' }),
    );
    expect(shop.kind).toBe(LINK_KIND.Shopping);
    const chosen = await firstValueFrom(
      api.create({ url: 'https://example.com/a', title: 'A', kind: LINK_KIND.Article }),
    );
    expect(chosen.kind).toBe(LINK_KIND.Article);
    const moved = await firstValueFrom(api.update(chosen.id, { url: 'https://vimeo.com/1' }));
    expect(moved.kind).toBe(LINK_KIND.Video);
    const kept = await firstValueFrom(api.update(chosen.id, { title: 'B' }));
    expect(kept.kind).toBe(LINK_KIND.Video);
    const set = await firstValueFrom(api.update(chosen.id, { kind: LINK_KIND.Other }));
    expect(set.kind).toBe(LINK_KIND.Other);

    const videos = await firstValueFrom(
      api.list({ kind: LINK_KIND.Video, limit: 100, sort: LINK_SORT_FIELD.Title }),
    );
    expect(videos.items.length).toBeGreaterThan(0);
    expect(videos.items.every((link) => link.kind === LINK_KIND.Video)).toBe(true);
  });
});
