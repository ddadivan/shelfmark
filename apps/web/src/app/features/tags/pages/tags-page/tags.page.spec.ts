import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { MockLinksApi } from '../../../links/mock/mock-links.api';
import { MockTagsApi } from '../../../links/mock/mock-tags.api';
import { LINKS_API } from '../../../links/models/links-api.const';
import { TAGS_API } from '../../../links/models/tags-api.const';
import TagsPage from './tags.page';

async function setup(phone: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([{ path: 'links', children: [] }]),
      { provide: LINKS_API, useClass: MockLinksApi },
      { provide: TAGS_API, useClass: MockTagsApi },
      { provide: ViewportService, useValue: { phone: signal(phone), compact: signal(phone) } },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(TagsPage);
  await vi.waitFor(() => {
    TestBed.tick();
    expect(fixture.nativeElement.querySelector('ui-chip')).not.toBeNull();
  });
  return fixture.nativeElement as HTMLElement;
}

describe('TagsPage', () => {
  it('shows the tags with "Tags" as the page title and a "New tag" button', async () => {
    const element = await setup(true);

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Tags');
    expect(element.querySelector('button[aria-label="New tag"]')).not.toBeNull();
    expect(element.querySelectorAll('ui-chip').length).toBeGreaterThan(0);
  });

  it('leaves for All links when the viewport is not a phone', async () => {
    await setup(false);
    const router = TestBed.inject(Router);

    await vi.waitFor(() => expect(router.url).toBe('/links'));
  });
});
