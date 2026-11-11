import { HttpErrorResponse } from '@angular/common/http';
import { LINK_KIND, type LinkPreviewResponse } from '@shelfmark/contracts';
import { Subject, throwError, type Observable } from 'rxjs';
import { loadPreviews } from './load-previews';
import type { PastePreviewResult } from './models/paste-preview-result.interface';

function response(url: string): LinkPreviewResponse {
  return {
    preview: {
      kind: LINK_KIND.Other,
      url,
      title: `Title of ${url}`,
      description: null,
      imageUrl: null,
      faviconUrl: null,
    },
    duplicate: null,
    fetched: true,
  };
}

const URLS = ['https://a.example/1', 'https://b.example/2', 'https://c.example/3'];

describe('loadPreviews', () => {
  it('asks at most `concurrency` previews at a time and starts the next as one answers', () => {
    const pending = new Map<string, Subject<LinkPreviewResponse>>();
    const fetch = vi.fn((url: string): Observable<LinkPreviewResponse> => {
      const subject = new Subject<LinkPreviewResponse>();
      pending.set(url, subject);
      return subject;
    });
    const results: PastePreviewResult[] = [];

    loadPreviews([...URLS, 'https://d.example/4'], fetch, 2).subscribe((result) =>
      results.push(result),
    );

    expect(fetch.mock.calls.map(([url]) => url)).toEqual(URLS.slice(0, 2));
    pending.get(URLS[1])?.next(response(URLS[1]));
    pending.get(URLS[1])?.complete();

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenLastCalledWith(URLS[2]);
    expect(results).toEqual([{ url: URLS[1], response: response(URLS[1]), stopped: false }]);
  });

  it('turns a failed preview into `null` and goes on', () => {
    const results: PastePreviewResult[] = [];
    const fetch = (url: string): Observable<LinkPreviewResponse> =>
      url === URLS[0]
        ? throwError(() => new HttpErrorResponse({ status: 502 }))
        : new Subject<LinkPreviewResponse>();

    loadPreviews(URLS, fetch, 1).subscribe((result) => results.push(result));

    expect(results).toEqual([{ url: URLS[0], response: null, stopped: false }]);
  });

  it('stops asking after a 429: the rest of the paste is not requested', () => {
    const results: PastePreviewResult[] = [];
    const fetch = vi.fn((): Observable<LinkPreviewResponse> =>
      throwError(() => new HttpErrorResponse({ status: 429 })),
    );

    loadPreviews(URLS, fetch, 1).subscribe((result) => results.push(result));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ url: URLS[0], response: null, stopped: true }]);
  });

  it('uses three at a time by default', () => {
    const fetch = vi.fn((): Observable<LinkPreviewResponse> => new Subject<LinkPreviewResponse>());

    loadPreviews([...URLS, 'https://d.example/4', 'https://e.example/5'], fetch).subscribe();

    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
