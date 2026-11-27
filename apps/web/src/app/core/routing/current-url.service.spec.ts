import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CurrentUrl } from './current-url.service';

describe('CurrentUrl', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'one', children: [] },
          { path: 'two', children: [] },
        ]),
      ],
    });
  });

  it('follows the router and splits off the path', async () => {
    const router = TestBed.inject(Router);
    const current = TestBed.inject(CurrentUrl);
    expect(current.url()).toBe('/');
    await router.navigateByUrl('/one?x=1#top');
    expect(current.url()).toBe('/one?x=1#top');
    expect(current.path()).toBe('/one');
    await router.navigateByUrl('/two');
    expect(current.url()).toBe('/two');
    expect(current.path()).toBe('/two');
  });
});
