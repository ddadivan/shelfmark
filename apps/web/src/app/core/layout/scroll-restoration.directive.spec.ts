import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { RESTORE_SCROLL_TIMEOUT_MS } from './models/restore-scroll-timeout-ms.const';
import { ScrollRestorationDirective } from './scroll-restoration.directive';

@Component({ template: '' })
class EmptyPage {}

@Component({
  imports: [ScrollRestorationDirective],
  template: '<div appScrollRestoration><p></p></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {}

interface Area {
  readonly area: HTMLElement;
  readonly router: Router;
  readonly location: Location;
  /** Every value written to `scrollTop`. */
  readonly writes: number[];
  /** Sets the position as the user would (not counted as a write). */
  scrollTo(top: number): void;
  /** Sets how far the area can scroll (`scrollHeight - clientHeight`). */
  setRoom(room: number): void;
}

async function setup(): Promise<Area> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'links', component: EmptyPage },
        { path: 'tags', component: EmptyPage },
      ]),
      provideLocationMocks(),
    ],
  });
  const router = TestBed.inject(Router);
  // Starts the router's listener for Back / Forward (the app does this at boot).
  router.initialNavigation();
  await router.navigateByUrl('/links');
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const area = fixture.nativeElement.querySelector('div') as HTMLElement;
  const writes: number[] = [];
  let top = 0;
  let room = 10_000;
  Object.defineProperty(area, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      writes.push(value);
      top = Math.min(value, room);
    },
  });
  Object.defineProperty(area, 'scrollHeight', { configurable: true, get: () => room });
  Object.defineProperty(area, 'clientHeight', { configurable: true, get: () => 0 });
  return {
    area,
    router,
    location: TestBed.inject(Location),
    writes,
    scrollTo: (value) => {
      top = value;
    },
    setRoom: (value) => {
      room = value;
    },
  };
}

/** Goes back in history and waits until the router has landed and the page rendered. */
async function back(location: Location, router: Router): Promise<void> {
  const landed = firstValueFrom(router.events.pipe(filter((e) => e instanceof NavigationEnd)));
  location.back();
  await landed;
  TestBed.tick();
}

describe('ScrollRestorationDirective', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('scrolls the host to the top on another page', async () => {
    const { router, writes, scrollTo } = await setup();
    scrollTo(120);

    await router.navigateByUrl('/tags');

    expect(writes).toEqual([0]);
  });

  it('starts a new query at the top too, like the router did for the page', async () => {
    const { router, writes, scrollTo } = await setup();
    scrollTo(120);

    await router.navigateByUrl('/links?sort=oldest');

    expect(writes).toEqual([0]);
  });

  it('keeps the position when only the fragment changes', async () => {
    const { router, writes, scrollTo } = await setup();
    scrollTo(120);

    await router.navigateByUrl('/links#your-data');

    expect(writes).toEqual([]);
  });

  it('puts the position back on Back, and the other page on Forward', async () => {
    const { router, location, area, writes, scrollTo } = await setup();
    scrollTo(640);
    await router.navigateByUrl('/tags');
    expect(area.scrollTop).toBe(0);
    scrollTo(80);

    await back(location, router);
    expect(writes.at(-1)).toBe(640);
    expect(area.scrollTop).toBe(640);

    const landed = firstValueFrom(router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    location.forward();
    await landed;
    TestBed.tick();
    expect(area.scrollTop).toBe(80);
  });

  it('restores a sort change on Back too', async () => {
    const { router, location, area, scrollTo } = await setup();
    scrollTo(300);
    await router.navigateByUrl('/links?sort=oldest');
    expect(area.scrollTop).toBe(0);

    await back(location, router);

    expect(area.scrollTop).toBe(300);
  });

  it('keeps trying while the page grows into the stored position', async () => {
    const { router, location, area, setRoom, scrollTo } = await setup();
    scrollTo(900);
    await router.navigateByUrl('/tags');
    setRoom(200);

    await back(location, router);
    expect(area.scrollTop).toBe(200);

    // The list arrives: the area grows and the next mutation scrolls the rest of the way.
    setRoom(2000);
    area.querySelector('p')?.append(document.createElement('span'));
    await vi.waitFor(() => {
      expect(area.scrollTop).toBe(900);
    });
  });

  it('stops trying once the user scrolls', async () => {
    const { router, location, area, setRoom, scrollTo, writes } = await setup();
    scrollTo(900);
    await router.navigateByUrl('/tags');
    setRoom(200);

    await back(location, router);
    area.dispatchEvent(new Event('wheel'));
    const count = writes.length;
    setRoom(2000);
    area.querySelector('p')?.append(document.createElement('span'));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(writes).toHaveLength(count);
  });

  it('gives up after the timeout', async () => {
    const { router, location, area, setRoom, scrollTo, writes } = await setup();
    scrollTo(900);
    await router.navigateByUrl('/tags');
    setRoom(200);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    const landed = back(location, router);
    await vi.advanceTimersByTimeAsync(0);
    await landed;
    await vi.advanceTimersByTimeAsync(RESTORE_SCROLL_TIMEOUT_MS + 1);
    const count = writes.length;
    setRoom(2000);
    area.querySelector('p')?.append(document.createElement('span'));
    await Promise.resolve();

    expect(writes).toHaveLength(count);
  });
});
