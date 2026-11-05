import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';

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
});
