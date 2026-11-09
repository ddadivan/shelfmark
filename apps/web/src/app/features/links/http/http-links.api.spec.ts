import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  LINK_SORT_FIELD,
  SORT_ORDER,
  type LinkResponse,
  type ListLinksResponse,
} from '@shelfmark/contracts';
import {
  MOCK_LINKS,
  MOCK_LINKS_PAGE,
  MOCK_LINK_PREVIEW_DUPLICATE,
} from '@shelfmark/contracts/testing';
import { HttpLinksApi } from './http-links.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpLinksApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpLinksApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists with repeated tag, booleans as text and no undefined values', () => {
    const { api, http } = setup();
    let page: ListLinksResponse | undefined;

    api
      .list({
        tag: ['a', 'b'],
        favorite: true,
        unsorted: false,
        q: undefined,
        sort: LINK_SORT_FIELD.CreatedAt,
        order: SORT_ORDER.Asc,
        limit: 20,
        cursor: 'c1',
      })
      .subscribe((response) => (page = response));
    const request = http.expectOne((req) => req.url === '/api/links');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.getAll('tag')).toEqual(['a', 'b']);
    expect(request.request.params.get('favorite')).toBe('true');
    expect(request.request.params.get('unsorted')).toBe('false');
    expect(request.request.params.has('q')).toBe(false);
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('cursor')).toBe('c1');
    request.flush(MOCK_LINKS_PAGE);

    expect(page).toEqual(MOCK_LINKS_PAGE);
  });

  it('lists without a query string by default', () => {
    const { api, http } = setup();

    api.list().subscribe();

    const request = http.expectOne('/api/links');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(MOCK_LINKS_PAGE);
  });

  it('asks for the recent links with an optional limit', () => {
    const { api, http } = setup();

    api.recent({ limit: 5 }).subscribe();
    const request = http.expectOne((req) => req.url === '/api/links/recent');
    expect(request.request.params.get('limit')).toBe('5');
    request.flush({ items: [] });

    api.recent().subscribe();
    http.expectOne('/api/links/recent').flush({ items: [] });
  });

  it('posts the URL to preview', () => {
    const { api, http } = setup();

    api.preview('https://angular.dev/overview').subscribe();
    const request = http.expectOne('/api/links/preview');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url: 'https://angular.dev/overview' });
    request.flush(MOCK_LINK_PREVIEW_DUPLICATE);
  });

  it.each([
    ['201 for a new link', 201, 'Created'],
    ['200 for an idempotent replay', 200, 'OK'],
  ])('resolves the link on %s', (_name, status, statusText) => {
    const { api, http } = setup();
    let link: LinkResponse | undefined;

    api
      .create({ url: 'https://example.org', idempotencyKey: 'k' })
      .subscribe((created) => (link = created));
    const request = http.expectOne('/api/links');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url: 'https://example.org', idempotencyKey: 'k' });
    request.flush(MOCK_LINKS[0], { status, statusText });

    expect(link).toEqual(MOCK_LINKS[0]);
  });

  it('gets a link by its encoded id', () => {
    const { api, http } = setup();
    const id = 'a/b c';
    const encoded = '/api/links/a%2Fb%20c';

    api.get(id).subscribe();
    const request = http.expectOne(encoded);
    expect(request.request.method).toBe('GET');
    request.flush(MOCK_LINKS[0]);
  });

  it('patches, opens and deletes through the id routes', () => {
    const { api, http } = setup();
    const id = 'a/b c';
    const encoded = '/api/links/a%2Fb%20c';

    api.update(id, { title: 'T' }).subscribe();
    const patch = http.expectOne(encoded);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ title: 'T' });
    patch.flush(MOCK_LINKS[0]);

    api.open(id).subscribe();
    const open = http.expectOne(`${encoded}/open`);
    expect(open.request.method).toBe('POST');
    open.flush(MOCK_LINKS[0]);

    api.captureImages(id).subscribe();
    const capture = http.expectOne(`${encoded}/images/capture`);
    expect(capture.request.method).toBe('POST');
    expect(capture.request.body).toEqual({});
    capture.flush(MOCK_LINKS[0]);

    api.remove(id).subscribe();
    const remove = http.expectOne(encoded);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });
});
