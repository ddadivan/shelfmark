import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InViewDirective } from './in-view.directive';

@Component({
  imports: [InViewDirective],
  template: '<div appInView [appInViewRecheck]="token()" (entered)="count = count + 1"></div>',
})
class HostComponent {
  count = 0;
  readonly token = signal(0);
}

class FakeObserver {
  static instances: FakeObserver[] = [];
  disconnected = false;
  constructor(readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    FakeObserver.instances.push(this);
  }
  observed = 0;
  observe(): void {
    this.observed++;
  }
  unobserve(): void {
    // The fake is driven by the test.
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

describe('InViewDirective', () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('emits when the host enters the viewport, not when it leaves', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [observer] = FakeObserver.instances;

    observer.callback([{ isIntersecting: false }]);
    expect(fixture.componentInstance.count).toBe(0);
    observer.callback([{ isIntersecting: true }]);
    expect(fixture.componentInstance.count).toBe(1);
  });

  it('observes the host again when the recheck value changes', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [observer] = FakeObserver.instances;
    expect(observer.observed).toBe(1);

    fixture.componentInstance.token.set(1);
    await fixture.whenStable();

    expect(observer.observed).toBe(2);
  });

  it('disconnects on destroy', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    fixture.destroy();

    expect(FakeObserver.instances[0].disconnected).toBe(true);
  });

  it('does nothing without IntersectionObserver', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();

    expect(fixture.componentInstance.count).toBe(0);
  });
});
