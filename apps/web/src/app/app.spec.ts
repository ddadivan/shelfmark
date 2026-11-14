import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { KEEP_BOOT_SKELETON_DATA } from './core/routing/models/keep-boot-skeleton-data.const';

describe('App', () => {
  it('hosts a router outlet and nothing else', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('router-outlet')).not.toBeNull();
    expect(element.children).toHaveLength(1);
  });

  it('renders the routed page inside the outlet', async () => {
    @Component({ selector: 'app-stub', template: '<p>stub page</p>' })
    class StubPage {}

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', component: StubPage }])],
    }).compileComponents();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');

    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('stub page');
  });

  describe('boot skeleton (#410)', () => {
    afterEach(() => document.querySelector('[data-app-skeleton]')?.remove());

    async function activate(data: Record<string, unknown> | undefined): Promise<void> {
      const skeleton = document.createElement('div');
      skeleton.setAttribute('data-app-skeleton', '');
      document.body.append(skeleton);
      await TestBed.configureTestingModule({
        imports: [App],
        providers: [provideRouter([])],
      }).compileComponents();
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      // What the outlet's `(activate)` calls, outside a change detection run like in the app.
      fixture.componentInstance['renderActivatedPage'](data);
    }

    it('is removed once a page is rendered', async () => {
      await activate({});
      expect(document.querySelector('[data-app-skeleton]')).toBeNull();
    });

    it('stays over a page that only forwards', async () => {
      await activate({ [KEEP_BOOT_SKELETON_DATA]: true });
      expect(document.querySelector('[data-app-skeleton]')).not.toBeNull();
    });
  });
});
