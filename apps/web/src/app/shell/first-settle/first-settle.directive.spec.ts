import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterOutlet } from '@angular/router';
import { ReducedMotion } from '@shelfmark/ui';
import { FirstSettleDirective } from './first-settle.directive';
import { FIRST_SETTLE } from './models/first-settle.const';

@Component({
  imports: [FirstSettleDirective, RouterOutlet],
  template: `<main appFirstSettle>
    <router-outlet />
    @if (page()) {
      <section>page</section>
    }
  </main>`,
})
class HostComponent {
  readonly page = signal(false);
}

function setup(reduced: boolean, page = false) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  TestBed.inject(ReducedMotion).setAppReduced(reduced);
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.page.set(page);
  fixture.detectChanges();
  const main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
  return { fixture, main };
}

/** Lets the MutationObserver callback run. */
const settleObservers = (): Promise<void> => Promise.resolve();

describe('FirstSettleDirective', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the class until the first page has had time to settle, then lets go for good', async () => {
    vi.useFakeTimers();
    const { fixture, main } = setup(false);
    expect(main.classList).toContain(FIRST_SETTLE.Class);
    vi.advanceTimersByTime(FIRST_SETTLE.HoldMs);
    // No page yet (a lazy route): still waiting.
    expect(main.classList).toContain(FIRST_SETTLE.Class);
    fixture.componentInstance.page.set(true);
    fixture.detectChanges();
    await settleObservers();
    vi.advanceTimersByTime(FIRST_SETTLE.HoldMs - 1);
    expect(main.classList).toContain(FIRST_SETTLE.Class);
    vi.advanceTimersByTime(1);
    expect(main.classList).not.toContain(FIRST_SETTLE.Class);
    fixture.componentInstance.page.set(false);
    fixture.detectChanges();
    fixture.componentInstance.page.set(true);
    fixture.detectChanges();
    await settleObservers();
    expect(main.classList).not.toContain(FIRST_SETTLE.Class);
  });

  it('starts the hold as soon as the page is rendered with the shell', async () => {
    vi.useFakeTimers();
    const { main } = setup(false, true);
    await settleObservers();
    vi.advanceTimersByTime(FIRST_SETTLE.HoldMs);
    expect(main.classList).not.toContain(FIRST_SETTLE.Class);
  });

  it('lets go after the longest wait without a page', () => {
    vi.useFakeTimers();
    const { main } = setup(false);
    vi.advanceTimersByTime(FIRST_SETTLE.MaxMs);
    expect(main.classList).not.toContain(FIRST_SETTLE.Class);
  });

  it('does nothing under reduced motion', () => {
    const { main } = setup(true);
    expect(main.classList).not.toContain(FIRST_SETTLE.Class);
  });

  it('clears its timer when destroyed', () => {
    vi.useFakeTimers();
    const { fixture } = setup(false);
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
