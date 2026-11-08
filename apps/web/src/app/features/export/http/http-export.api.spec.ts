import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { fileNameOf } from '../save-blob';
import { HttpExportApi } from './http-export.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpExportApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpExportApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('revokes the object URL after the save', () => {
    vi.useFakeTimers();
    const { api, http } = setup();
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: revoke }),
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      /* no real download in jsdom */
    });

    api.download(EXPORT_FORMAT.Json, {}).subscribe();
    http.expectOne('/api/export?format=json').flush(new Blob(['{}']));
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:x');
    vi.useRealTimers();
  });

  it('fails on a response without a body and saves nothing', () => {
    const { api, http } = setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    let failed = false;

    api.download(EXPORT_FORMAT.Json, {}).subscribe({ error: () => (failed = true) });
    http.expectOne('/api/export?format=json').flush(null);

    expect(failed).toBe(true);
    expect(click).not.toHaveBeenCalled();
  });

  it('requests the built URL and saves the file under the server file name', () => {
    const { api, http } = setup();
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      /* no real download in jsdom */
    });
    let done = false;

    api.download(EXPORT_FORMAT.Json, { tags: ['a'] }).subscribe(() => (done = true));
    const request = http.expectOne('/api/export?format=json&tag=a');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['{}']), {
      headers: { 'Content-Disposition': 'attachment; filename="backup.json"' },
    });

    expect(done).toBe(true);
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });

  it('fails on a 404 and a 401 without saving anything', () => {
    const { api, http } = setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const statuses: number[] = [];

    for (const status of [404, 401]) {
      api.download(EXPORT_FORMAT.Html, {}).subscribe({
        error: (error: { status: number }) => statuses.push(error.status),
      });
      http
        .expectOne('/api/export?format=html')
        .flush(new Blob(['no']), { status, statusText: 'Nope' });
    }

    expect(statuses).toEqual([404, 401]);
    expect(click).not.toHaveBeenCalled();
  });
});

describe('fileNameOf', () => {
  it('reads the quoted and the bare name', () => {
    expect(fileNameOf('attachment; filename="a.json"', 'f')).toBe('a.json');
    expect(fileNameOf('attachment; filename=b.html', 'f')).toBe('b.html');
  });

  it('removes path separators and falls back', () => {
    expect(fileNameOf('attachment; filename="../x/y.json"', 'f')).toBe('.._x_y.json');
    expect(fileNameOf(null, 'f')).toBe('f');
    expect(fileNameOf('inline', 'f')).toBe('f');
  });

  it('drops control characters', () => {
    expect(fileNameOf('attachment; filename="a\u0000b\u001f.json\u007f"', 'f')).toBe('ab.json');
    expect(fileNameOf('attachment; filename="\u0001\u0002"', 'f')).toBe('f');
  });

  it('falls back for dot-only names', () => {
    expect(fileNameOf('attachment; filename=".."', 'f')).toBe('f');
    expect(fileNameOf('attachment; filename="."', 'f')).toBe('f');
    expect(fileNameOf('attachment; filename="..."', 'f')).toBe('f');
    expect(fileNameOf('attachment; filename=".hidden"', 'f')).toBe('.hidden');
  });
});
