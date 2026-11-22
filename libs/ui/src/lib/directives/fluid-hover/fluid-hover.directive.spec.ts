import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';
import { FluidHoverDirective } from './fluid-hover.directive';
import { FLUID_HOVER_CLASS } from './models/fluid-hover.const';

@Component({
  imports: [FluidHoverDirective],
  template: `
    <div id="list" [uiFluidHover]="'.row'">
      <div id="a" class="row">A</div>
      <div id="b" class="row">B</div>
      <div id="off" class="row" aria-disabled="true">Off</div>
      <div id="gap">Gap</div>
    </div>
  `,
})
class HostComponent {}

function rect(top: number, height: number): DOMRect {
  return { left: 0, top, width: 100, height, right: 100, bottom: top + height } as DOMRect;
}

function setup(hover = true) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: hover && query.includes('hover: hover'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const get = (id: string): HTMLElement => root.querySelector(`#${id}`) as HTMLElement;
  get('list').getBoundingClientRect = () => rect(0, 200);
  get('a').getBoundingClientRect = () => rect(0, 40);
  get('b').getBoundingClientRect = () => rect(40, 40);
  const highlight = root.querySelector<HTMLElement>(`.${FLUID_HOVER_CLASS.Highlight}`);
  const over = (id: string, pointerType = 'mouse', buttons = 0): void => {
    get(id).dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType, buttons }));
  };
  return { fixture, get, highlight, over };
}

describe('FluidHoverDirective', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates an aria-hidden highlight and turns the rows own hover off', () => {
    const { get, highlight } = setup();
    expect(highlight?.getAttribute('aria-hidden')).toBe('true');
    expect(get('list').classList).toContain(FLUID_HOVER_CLASS.On);
  });

  it('appears in place on the first row without travelling', () => {
    const { highlight, over } = setup();
    over('b');
    expect(highlight?.style.transform).toBe('translate(0px, 40px)');
    expect(highlight?.style.height).toBe('40px');
    expect(highlight?.classList).toContain(FLUID_HOVER_CLASS.Shown);
    expect(highlight?.classList).toContain(FLUID_HOVER_CLASS.Jump);
  });

  it('glides to the next row, then fades out on leave and appears in place again', () => {
    const { get, highlight, over } = setup();
    over('a');
    over('b');
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Jump);
    expect(highlight?.style.transform).toBe('translate(0px, 40px)');
    get('list').dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Shown);
    over('a');
    expect(highlight?.classList).toContain(FLUID_HOVER_CLASS.Jump);
  });

  it('only fades under reduced motion', () => {
    const { fixture, highlight, over } = setup();
    TestBed.inject(ReducedMotion).setAppReduced(true);
    over('a');
    over('b');
    expect(highlight?.classList).toContain(FLUID_HOVER_CLASS.Jump);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('ignores touch, pressed buttons, disabled rows and non-rows', () => {
    const { highlight, over } = setup();
    over('a', 'touch');
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Shown);
    over('a', 'mouse', 1);
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Shown);
    over('a');
    over('off');
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Shown);
    over('a');
    over('gap');
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Shown);
  });

  it('re-measures the current row when the layout changes', () => {
    const { get, highlight, over } = setup();
    over('b');
    get('b').getBoundingClientRect = () => rect(60, 40);
    window.dispatchEvent(new Event('resize'));
    expect(highlight?.style.transform).toBe('translate(0px, 60px)');
  });

  it('hides when the current row left the DOM', () => {
    const { get, highlight, over } = setup();
    over('b');
    get('b').remove();
    window.dispatchEvent(new Event('resize'));
    expect(highlight?.classList).not.toContain(FLUID_HOVER_CLASS.Shown);
  });

  it('does nothing without hover', () => {
    const { get, highlight } = setup(false);
    expect(highlight).toBeNull();
    expect(get('list').classList).not.toContain(FLUID_HOVER_CLASS.On);
  });

  it('removes the highlight on destroy', () => {
    const { fixture } = setup();
    fixture.destroy();
    expect(document.querySelector(`.${FLUID_HOVER_CLASS.Highlight}`)).toBeNull();
  });
});
