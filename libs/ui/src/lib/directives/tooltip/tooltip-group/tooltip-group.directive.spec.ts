import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from '../../../services/motion/reduced-motion.service';
import { TooltipDirective } from '../tooltip.directive';
import { TooltipGroupDirective } from './tooltip-group.directive';
import { TooltipGroupState } from './tooltip-group-state';
import { TOOLTIP_GROUP_WARM_MS } from './models/tooltip-group.const';

@Component({
  imports: [TooltipDirective, TooltipGroupDirective],
  template: `
    <div id="group" uiTooltipGroup>
      <button id="one" type="button" uiTooltip="One">1</button>
      <button id="two" type="button" uiTooltip="Two">2</button>
    </div>
    <button id="alone" type="button" uiTooltip="Alone">3</button>
  `,
})
class HostComponent {}

function setup() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  TestBed.tick();
  const root = fixture.nativeElement as HTMLElement;
  const get = (id: string): HTMLElement => root.querySelector(`#${id}`) as HTMLElement;
  const settle = (): void => {
    fixture.detectChanges();
    TestBed.tick();
  };
  const texts = (): string[] =>
    Array.from(document.querySelectorAll('.ui-tooltip')).map((el) => el.textContent.trim());
  return { get, settle, texts };
}

const enter = (el: HTMLElement): void => {
  el.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
};
const leave = (el: HTMLElement, relatedTarget: EventTarget | null = null): void => {
  el.dispatchEvent(new PointerEvent('pointerleave', { relatedTarget }));
};

describe('uiTooltipGroup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => {
      el.remove();
    });
  });

  it('opens a neighbour at once after the first tooltip opened, and the first closes', async () => {
    const { get, settle, texts } = setup();
    enter(get('one'));
    await vi.advanceTimersByTimeAsync(400);
    settle();
    expect(texts()).toEqual(['One']);
    leave(get('one'));
    enter(get('two'));
    settle();
    expect(texts()).toEqual(['Two']);
  });

  it('the first tooltip of a group still waits for the delay', async () => {
    const { get, settle, texts } = setup();
    enter(get('one'));
    await vi.advanceTimersByTimeAsync(399);
    settle();
    expect(texts()).toEqual([]);
  });

  it('stays warm for a moment after the last tooltip closed, then goes cold', async () => {
    const { get, settle, texts } = setup();
    enter(get('one'));
    await vi.advanceTimersByTimeAsync(400);
    leave(get('one'));
    await vi.advanceTimersByTimeAsync(110);
    settle();
    expect(texts()).toEqual([]);
    enter(get('two'));
    settle();
    expect(texts()).toEqual(['Two']);
    leave(get('two'));
    await vi.advanceTimersByTimeAsync(110 + TOOLTIP_GROUP_WARM_MS);
    settle();
    enter(get('one'));
    settle();
    expect(texts()).toEqual([]);
  });

  it('leaving the group closes the open tooltip instantly', async () => {
    const { get, settle, texts } = setup();
    enter(get('one'));
    await vi.advanceTimersByTimeAsync(400);
    settle();
    leave(get('group'));
    settle();
    expect(texts()).toEqual([]);
    enter(get('two'));
    settle();
    expect(texts()).toEqual([]);
  });

  it('moving onto the tooltip panel does not leave the group', async () => {
    const { get, settle, texts } = setup();
    enter(get('one'));
    await vi.advanceTimersByTimeAsync(400);
    settle();
    const hit = document.querySelector('.ui-tooltip-hit') as HTMLElement;
    leave(get('group'), hit);
    settle();
    expect(texts()).toEqual(['One']);
  });

  it('a tooltip outside the group keeps its delay', async () => {
    const { get, settle, texts } = setup();
    enter(get('one'));
    await vi.advanceTimersByTimeAsync(400);
    settle();
    enter(get('alone'));
    settle();
    expect(texts()).toEqual(['One']);
  });

  it('travels from the previous panel and not under reduced motion', async () => {
    const animate = vi.fn();
    Element.prototype.animate = animate;
    const from = { left: 0, top: 0 } as DOMRect;
    const run = async (reduced: boolean): Promise<void> => {
      const { get, settle } = setup();
      TestBed.inject(ReducedMotion).setAppReduced(reduced);
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: Element,
      ) {
        return (this.textContent.trim() === 'Two' ? { left: 40, top: 0 } : from) as DOMRect;
      });
      enter(get('one'));
      await vi.advanceTimersByTimeAsync(400);
      settle();
      leave(get('one'));
      enter(get('two'));
      settle();
      settle();
      vi.restoreAllMocks();
    };
    await run(false);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][0][0].transform).toBe('translate(-40px, 0px)');
    TestBed.resetTestingModule();
    animate.mockClear();
    await run(true);
    expect(animate).not.toHaveBeenCalled();
    delete (Element.prototype as { animate?: unknown }).animate;
  });
});

describe('TooltipGroupState', () => {
  it('remembers the last rect only while warm and ignores a missing rect', () => {
    const state = new TooltipGroupState();
    const member = { closeNow: vi.fn() };
    const other = { closeNow: vi.fn() };
    expect(state.open(member)).toBeNull();
    state.remember(null);
    state.remember({ left: 1 } as DOMRect);
    expect(state.open(other)?.left).toBe(1);
    expect(member.closeNow).toHaveBeenCalled();
    state.leave();
    expect(other.closeNow).toHaveBeenCalled();
    expect(state.isWarm()).toBe(false);
  });
});
