import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { adminApiStub } from '../../../testing/admin-api-stub';
import { adminOnly } from './admin.guard';
import { ADMIN_API } from './models/admin-api.const';

function setup(admin: boolean) {
  const api = adminApiStub(admin);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'links', children: [] },
        { path: 'admin', canActivate: [adminOnly], children: [{ path: 'feedback', children: [] }] },
      ]),
      { provide: ADMIN_API, useValue: api },
    ],
  });
  return { api, router: TestBed.inject(Router) };
}

describe('adminOnly', () => {
  it('lets the author in', async () => {
    const { router } = setup(true);

    await router.navigateByUrl('/admin/feedback');

    expect(router.url).toBe('/admin/feedback');
  });

  it('sends everyone else to the links', async () => {
    const { router } = setup(false);

    await router.navigateByUrl('/admin/feedback');

    expect(router.url).toBe('/links');
  });

  it('asks the status only once for several visits', async () => {
    const { api, router } = setup(true);

    await router.navigateByUrl('/admin/feedback');
    await router.navigateByUrl('/links');
    await router.navigateByUrl('/admin/feedback');

    expect(api.isAdmin).toHaveBeenCalledTimes(1);
  });
});
