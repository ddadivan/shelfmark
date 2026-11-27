import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiInViewDirective } from './in-view.directive';

@Component({
  imports: [UiInViewDirective],
  template: `<div
    uiInView
    uiInViewRoot="scroll-parent"
    uiInViewMargin="0px 0px 320px 0px"
    #v="uiInView"
    [uiInViewRecheck]="token()"
    (entered)="count = count + 1"
  >
    {{ v.inView() }}
  </div>`,
})
class HostComponent {
  count = 0;
  readonly token = signal(0);
}

class FakeObserver {
  static instances: FakeObserver[] = [];
  disconnected = false;
  constructor(
    readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void,
    readonly options?: IntersectionObserverInit,
  ) {
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

describe('UiInViewDirective', () => {
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
    expect(observer.options?.rootMargin).toBe('0px 0px 320px 0px');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('true');
    observer.callback([{ isIntersecting: true }, { isIntersecting: false }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('false');
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

  it('uses the page as root without a scrolling ancestor and the scroll area when there is one', async () => {
    const plain = TestBed.createComponent(HostComponent);
    await plain.whenStable();
    expect(FakeObserver.instances[0].options?.root).toBeNull();
    plain.destroy();

    const scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    document.body.append(scroller);
    const fixture = TestBed.createComponent(HostComponent);
    scroller.append(fixture.nativeElement);
    fixture.componentInstance.token.set(1);
    await fixture.whenStable();

    const observer = FakeObserver.instances.at(-1);
    expect(observer?.options?.root).toBe(scroller);
    fixture.destroy();
    scroller.remove();
  });

  it('keeps the observer while its options stay the same and rebuilds when they change', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    fixture.componentInstance.token.set(1);
    await fixture.whenStable();
    expect(FakeObserver.instances.length).toBe(1);
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
