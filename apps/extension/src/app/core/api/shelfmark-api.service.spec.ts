import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SHELFMARK_ORIGIN } from '../config/shelfmark-origin.const';
import { ShelfmarkApiService } from './shelfmark-api.service';

describe('ShelfmarkApiService', () => {
  let api: ShelfmarkApiService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ShelfmarkApiService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it.each([
    ['session', '/api/auth/get-session'],
    ['folders', '/api/folders'],
    ['tags', '/api/tags'],
    ['rules', '/api/rules'],
  ] as const)('GETs %s from the Shelfmark origin', async (call, path) => {
    const result = api[call]();
    const request = backend.expectOne(`${SHELFMARK_ORIGIN}${path}`);
    expect(request.request.method).toBe('GET');
    request.flush({ ok: true });
    expect(await result).toEqual({ ok: true });
  });

  it('POSTs the lookup body', async () => {
    const result = api.lookup({ url: 'https://a.test/' });
    const request = backend.expectOne(`${SHELFMARK_ORIGIN}/api/links/lookup`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ url: 'https://a.test/' });
    request.flush({ link: null });
    expect(await result).toEqual({ link: null });
  });

  it('POSTs the create body to /api/links', async () => {
    const body = { url: 'https://a.test/', idempotencyKey: 'k' };
    const result = api.create(body);
    const request = backend.expectOne(`${SHELFMARK_ORIGIN}/api/links`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ id: '1' });
    expect(await result).toEqual({ id: '1' });
  });
});
