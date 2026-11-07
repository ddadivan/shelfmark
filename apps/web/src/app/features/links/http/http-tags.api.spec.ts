import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TagResponse } from '@shelfmark/contracts';
import { MOCK_TAGS } from '@shelfmark/contracts/testing';
import { HttpTagsApi } from './http-tags.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpTagsApi), http: TestBed.inject(HttpTestingController) };
}

describe('HttpTagsApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists the tags from the items of the response', () => {
    const { api, http } = setup();
    let result: readonly TagResponse[] | undefined;

    api.list().subscribe((tags) => (result = tags));
    const request = http.expectOne('/api/tags');
    expect(request.request.method).toBe('GET');
    request.flush({ items: MOCK_TAGS });

    expect(result).toEqual(MOCK_TAGS);
  });

  it('creates a tag', () => {
    const { api, http } = setup();

    api.create({ name: 'new-tag' }).subscribe();
    const request = http.expectOne('/api/tags');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'new-tag' });
    request.flush(MOCK_TAGS[0]);
  });

  it('renames a tag', () => {
    const { api, http } = setup();

    api.update(MOCK_TAGS[0].id, { name: 'Docs' }).subscribe();
    const request = http.expectOne(`/api/tags/${MOCK_TAGS[0].id}`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Docs' });
    request.flush(MOCK_TAGS[0]);
  });

  it('deletes a tag', () => {
    const { api, http } = setup();

    api.remove(MOCK_TAGS[0].id).subscribe();
    const request = http.expectOne(`/api/tags/${MOCK_TAGS[0].id}`);

    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('merges a tag into a target on the merge route', () => {
    const { api, http } = setup();
    let result: TagResponse | undefined;

    api.merge(MOCK_TAGS[0].id, MOCK_TAGS[1].id).subscribe((tag) => (result = tag));
    const request = http.expectOne(`/api/tags/${MOCK_TAGS[0].id}/merge`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ targetTagId: MOCK_TAGS[1].id });
    request.flush(MOCK_TAGS[1]);
    expect(result).toEqual(MOCK_TAGS[1]);
  });
});
