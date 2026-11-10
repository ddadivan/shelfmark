import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  TRASH_ITEM_KIND,
  type ListTrashResponse,
  type TrashActionResponse,
  type TrashItemRef,
} from '@shelfmark/contracts';
import { SKIP_ERROR_TOAST } from '../../../core/api/models/skip-error-toast.const';
import { HttpTrashApi } from './http-trash.api';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { api: TestBed.inject(HttpTrashApi), http: TestBed.inject(HttpTestingController) };
}

const REFS: TrashItemRef[] = [
  { kind: TRASH_ITEM_KIND.Link, id: 'l1' },
  { kind: TRASH_ITEM_KIND.Folder, id: 'f1' },
];

describe('HttpTrashApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lists with GET /api/trash', () => {
    const { api, http } = setup();
    let response: ListTrashResponse | undefined;
    api.list().subscribe((value) => (response = value));
    const request = http.expectOne('/api/trash');
    expect(request.request.method).toBe('GET');
    const body: ListTrashResponse = { items: [], total: 0, retentionDays: 30 };
    request.flush(body);
    expect(response).toEqual(body);
  });

  it('restores with POST /api/trash/restore and the refs as the body', () => {
    const { api, http } = setup();
    let response: TrashActionResponse | undefined;
    api.restore(REFS).subscribe((value) => (response = value));
    const request = http.expectOne('/api/trash/restore');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ items: REFS });
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush({ count: 2 });
    expect(response).toEqual({ count: 2 });
  });

  it('deletes for good with POST /api/trash/delete', () => {
    const { api, http } = setup();
    api.deleteForever(REFS).subscribe();
    const request = http.expectOne('/api/trash/delete');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ items: REFS });
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush({ count: 2 });
  });

  it('empties with DELETE /api/trash', () => {
    const { api, http } = setup();
    api.empty().subscribe();
    const request = http.expectOne('/api/trash');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.context.get(SKIP_ERROR_TOAST)).toBe(true);
    request.flush({ count: 5 });
  });
});
