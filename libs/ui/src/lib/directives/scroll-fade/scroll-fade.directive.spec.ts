import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ScrollFadeDirective } from './scroll-fade.directive';

@Component({
  imports: [ScrollFadeDirective],
  template: `<div class="area" uiScrollFade><p>Row</p></div>`,
})
class HostComponent {}

describe('ScrollFadeDirective', () => {
  let resize: () => void;
  let metrics: { scrollTop: number; scrollHeight: number; clientHeight: number };

  beforeEach(() => {
    metrics = { scrollTop: 0, scrollHeight: 500, clientHeight: 200 };
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          resize = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      cb();
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    for (const key of ['scrollTop', 'scrollHeight', 'clientHeight'] as const) {
      vi.spyOn(HTMLElement.prototype, key, 'get').mockImplementation(() => metrics[key]);
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const area = fixture.nativeElement.querySelector('.area') as HTMLElement;
    const scrollTo = (top: number) => {
      metrics.scrollTop = top;
      area.dispatchEvent(new Event('scroll'));
    };
    return { area, scrollTo };
  }

  it('shows only the bottom fade at the start of an overflowing area', async () => {
    const { area } = await setup();
    expect(area.hasAttribute('data-scroll-top')).toBe(false);
    expect(area.hasAttribute('data-scroll-bottom')).toBe(true);
  });

  it('shows both fades in the middle', async () => {
    const { area, scrollTo } = await setup();
    scrollTo(100);
    expect(area.hasAttribute('data-scroll-top')).toBe(true);
    expect(area.hasAttribute('data-scroll-bottom')).toBe(true);
  });

  it('shows only the top fade at the end', async () => {
    const { area, scrollTo } = await setup();
    scrollTo(300);
    expect(area.hasAttribute('data-scroll-top')).toBe(true);
    expect(area.hasAttribute('data-scroll-bottom')).toBe(false);
  });

  it('ignores sub-pixel positions at the edges', async () => {
    const { area, scrollTo } = await setup();
    scrollTo(0.5);
    expect(area.hasAttribute('data-scroll-top')).toBe(false);
    scrollTo(299.5);
    expect(area.hasAttribute('data-scroll-bottom')).toBe(false);
  });

  it('shows no fade when the content does not overflow', async () => {
    metrics.scrollHeight = 200;
    const { area } = await setup();
    expect(area.hasAttribute('data-scroll-top')).toBe(false);
    expect(area.hasAttribute('data-scroll-bottom')).toBe(false);
  });

  it('follows the content size (resize observer)', async () => {
    metrics.scrollHeight = 200;
    const { area } = await setup();
    metrics.scrollHeight = 600;
    resize();
    expect(area.hasAttribute('data-scroll-bottom')).toBe(true);
  });
});
