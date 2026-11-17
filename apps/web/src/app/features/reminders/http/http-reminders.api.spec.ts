import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { REMINDER_ENDPOINT } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { HttpRemindersApi } from './http-reminders.api';

describe('HttpRemindersApi', () => {
  let api: HttpRemindersApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HttpRemindersApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the list and the count', async () => {
    const list = firstValueFrom(api.list());
    http.expectOne({ method: 'GET', url: REMINDER_ENDPOINT.Base }).flush({ due: [], upcoming: [] });
    expect(await list).toEqual({ due: [], upcoming: [] });
    const count = firstValueFrom(api.count());
    http.expectOne({ method: 'GET', url: REMINDER_ENDPOINT.Count }).flush({ due: 2 });
    expect(await count).toEqual({ due: 2 });
  });

  it('sets, clears and sets several with the contract bodies', async () => {
    const set = firstValueFrom(api.set('a/b', '2026-11-16T09:00:00.000Z'));
    const put = http.expectOne({ method: 'PUT', url: `${REMINDER_ENDPOINT.Base}/a%2Fb` });
    expect(put.request.body).toEqual({ remindAt: '2026-11-16T09:00:00.000Z' });
    put.flush({ id: 'a/b' });
    await set;

    const clear = firstValueFrom(api.clear('x'));
    http.expectOne({ method: 'DELETE', url: `${REMINDER_ENDPOINT.Base}/x` }).flush(null);
    await clear;

    const many = firstValueFrom(api.setMany({ ids: ['x', 'y'], remindAt: null }));
    const post = http.expectOne({ method: 'POST', url: REMINDER_ENDPOINT.Batch });
    expect(post.request.body).toEqual({ ids: ['x', 'y'], remindAt: null });
    post.flush({ updated: 2, links: [] });
    expect(await many).toEqual({ updated: 2, links: [] });
  });
});
