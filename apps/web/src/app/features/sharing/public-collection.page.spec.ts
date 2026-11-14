import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PublicCollectionResponse } from '@shelfmark/contracts';
import { of, throwError, type Observable } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { axeViolations } from '../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../testing/transloco-testing';
import { SHARES_API } from './models/shares-api.const';
import PublicCollectionPage from './public-collection.page';

const TOKEN = 'sampleToken-sampleToke';
const RESPONSE: PublicCollectionResponse = {
  ownerName: 'Ada',
  name: 'Recipes',
  linkCount: 3,
  updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  subfolders: [{ id: 'sub', name: 'Baking', linkCount: 1 }],
  items: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      url: 'https://ramen.example/best',
      title: 'The best weeknight ramen',
      note: 'Why I saved it',
      faviconUrl: null,
      imageUrl: null,
    },
  ],
  page: 1,
  hasMore: false,
};

async function setup(
  collection: () => Observable<PublicCollectionResponse> = () => of(RESPONSE),
  user: { name: string } | null = null,
) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      provideRouter([]),
      { provide: SHARES_API, useValue: { collection: vi.fn(collection) } },
      {
        provide: AuthStore,
        useValue: { user: signal(user), ensureLoaded: () => Promise.resolve() },
      },
    ],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(PublicCollectionPage);
  fixture.componentRef.setInput('token', TOKEN);
  await fixture.whenStable();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Loading the collection');
  });
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('PublicCollectionPage', () => {
  afterEach(() => document.head.querySelector('meta[name="robots"]')?.remove());

  it('shows the collection read-only for a guest, with noindex', async () => {
    const { host, fixture } = await setup();

    expect(host.querySelector('h1')?.textContent).toContain('Recipes');
    expect(host.textContent).toContain('Shared by Ada');
    const meta = [...host.querySelectorAll('.collection__meta span')].map((s) =>
      s.textContent?.trim(),
    );
    expect(meta).toEqual(['3 links', 'Updated 2 days ago']);
    expect(host.querySelectorAll('app-link-card')).toHaveLength(1);
    expect(host.textContent).toContain('Why I saved it');
    expect(host.querySelector('button[aria-label^="Actions for"]')).toBeNull();
    expect(host.querySelector('[aria-pressed][aria-label^="Favorite"]')).toBeNull();
    expect(host.textContent).toContain('Sign in');
    expect(host.textContent).toContain('Keep your own links like this');
    expect(host.textContent).toContain('Made with Shelfmark');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
    expect(await axeViolations(host)).toEqual([]);

    fixture.destroy();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('offers the way back to a signed-in person and no invitation', async () => {
    const { host } = await setup(undefined, { name: 'Bob' });
    expect(host.textContent).toContain('Back to my shelf');
    expect(host.textContent).not.toContain('Keep your own links like this');
  });

  it('filters by a subfolder chip', async () => {
    const { host, fixture } = await setup();
    const chips = [...host.querySelectorAll<HTMLButtonElement>('[role="group"] button')];
    expect(chips.map((chip) => chip.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 3',
      'Baking 1',
    ]);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    chips[1].click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      const pressed = host.querySelector('[role="group"] button[aria-pressed="true"]');
      expect(pressed?.textContent).toContain('Baking');
    });
  });

  it('shows the not-found state for an unknown or turned-off link', async () => {
    const { host } = await setup(() => throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(host.querySelector('h1')?.textContent).toContain("This collection isn't available");
    expect(await axeViolations(host)).toEqual([]);
  });

  it('shows the empty state and a retry for other failures', async () => {
    const empty = await setup(() => of({ ...RESPONSE, items: [], linkCount: 0, subfolders: [] }));
    expect(empty.host.textContent).toContain('No links here yet');

    TestBed.resetTestingModule();
    const broken = await setup(() => throwError(() => new HttpErrorResponse({ status: 503 })));
    expect(broken.host.textContent).toContain("Couldn't load the collection.");
    expect(broken.host.textContent).toContain('Try again');
  });
});
