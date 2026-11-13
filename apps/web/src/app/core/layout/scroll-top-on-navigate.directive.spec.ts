import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ScrollTopOnNavigateDirective } from './scroll-top-on-navigate.directive';

@Component({ template: '' })
class EmptyPage {}

@Component({
  imports: [ScrollTopOnNavigateDirective],
  template: '<div appScrollTopOnNavigate></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {}

describe('ScrollTopOnNavigateDirective', () => {
  async function setup(): Promise<{ area: HTMLElement; router: Router }> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'links', component: EmptyPage },
          { path: 'tags', component: EmptyPage },
        ]),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/links');
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector('div') as HTMLElement;
    return { area, router };
  }

  it('scrolls the host to the top on another page', async () => {
    const { area, router } = await setup();
    area.scrollTop = 120;
    const writes: number[] = [];
    Object.defineProperty(area, 'scrollTop', {
      configurable: true,
      get: () => writes.at(-1) ?? 120,
      set: (value: number) => writes.push(value),
    });

    await router.navigateByUrl('/tags');

    expect(writes).toEqual([0]);
  });

  it('keeps the position when only the query changes', async () => {
    const { area, router } = await setup();
    const writes: number[] = [];
    Object.defineProperty(area, 'scrollTop', {
      configurable: true,
      get: () => 120,
      set: (value: number) => writes.push(value),
    });

    await router.navigateByUrl('/links?sort=oldest');

    expect(writes).toEqual([]);
  });
});
