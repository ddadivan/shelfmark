import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';
import { AutoHeightDirective } from './auto-height.directive';

@Component({
  imports: [AutoHeightDirective],
  template: `<div class="outer" uiAutoHeight><div class="inner">Content</div></div>`,
})
class HostComponent {}

describe('AutoHeightDirective', () => {
  let callback: () => void;
  let height: number;

  beforeEach(() => {
    height = 40;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          callback = cb;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const outer = fixture.nativeElement.querySelector('.outer') as HTMLElement;
    return { outer };
  }

  it('animates from the old height to the new one and releases to auto', async () => {
    const { outer } = await setup();
    height = 120;
    callback();
    expect(outer.style.height).toBe('120px');
    expect(outer.style.transition).toContain('--duration-base');
    expect(outer.style.overflow).toBe('clip');
    outer.dispatchEvent(new Event('transitionend'));
    expect(outer.style.height).toBe('');
    expect(outer.style.transition).toBe('');
    expect(outer.style.overflow).toBe('');
  });

  it('ignores transitions that bubble up from the content', async () => {
    const { outer } = await setup();
    height = 120;
    callback();
    outer.querySelector('.inner')?.dispatchEvent(new Event('transitionend', { bubbles: true }));
    expect(outer.style.height).toBe('120px');
  });

  it('does nothing when the height did not change', async () => {
    const { outer } = await setup();
    callback();
    expect(outer.style.height).toBe('');
  });

  it('jumps under reduced motion', async () => {
    TestBed.inject(ReducedMotion).setAppReduced(true);
    const { outer } = await setup();
    height = 120;
    callback();
    expect(outer.style.height).toBe('');
    expect(outer.style.transition).toBe('');
  });
});
