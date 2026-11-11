import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpSharesApi } from './http-shares.api';

const FOLDER = '00000000-0000-4000-8000-000000000101';
const TOKEN = 'sampleToken-sampleToke';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpSharesApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpSharesApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('talks to the owner routes of a folder', () => {
    const { api, http } = setup();
    const url = `/api/folders/${FOLDER}/share`;

    api.get(FOLDER).subscribe();
    expect(http.expectOne(url).request.method).toBe('GET');

    api.enable(FOLDER).subscribe();
    const enable = http.expectOne(url);
    expect(enable.request.method).toBe('POST');
    enable.flush({});

    api.setShowNotes(FOLDER, true).subscribe();
    const patch = http.expectOne(url);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ showNotes: true });
    patch.flush({});

    api.reset(FOLDER).subscribe();
    expect(http.expectOne(`${url}/reset`).request.method).toBe('POST');

    api.disable(FOLDER).subscribe();
    expect(http.expectOne(url).request.method).toBe('DELETE');
  });

  it('reads a public collection with the filter and page', () => {
    const { api, http } = setup();

    api.collection(TOKEN, {}).subscribe();
    http.expectOne(`/api/public/collections/${TOKEN}`);

    api.collection(TOKEN, { folder: FOLDER, page: 2 }).subscribe();
    const request = http.expectOne(
      (req) => req.url === `/api/public/collections/${TOKEN}` && req.params.has('page'),
    );
    expect(request.request.params.get('folder')).toBe(FOLDER);
    expect(request.request.params.get('page')).toBe('2');
  });
});
