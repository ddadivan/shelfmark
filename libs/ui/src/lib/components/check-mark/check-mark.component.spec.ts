import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { CheckMarkComponent } from './check-mark.component';

function render(inputs: { size?: 16 | 20 | 24; draw?: boolean } = {}) {
  const fixture = TestBed.createComponent(CheckMarkComponent);
  if (inputs.size !== undefined) {
    fixture.componentRef.setInput('size', inputs.size);
  }
  if (inputs.draw !== undefined) {
    fixture.componentRef.setInput('draw', inputs.draw);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CheckMarkComponent', () => {
  it('draws the tick as a stroked path of length 1 and is decorative', () => {
    const host = render();
    const path = host.querySelector('path');
    expect(path?.getAttribute('pathLength')).toBe('1');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds the draw class only with `draw`', () => {
    expect(render().classList.contains('ui-check-mark--draw')).toBe(false);
    expect(render({ draw: true }).classList.contains('ui-check-mark--draw')).toBe(true);
  });

  it('keeps the first value of `draw`: turning it on later does not start the animation late', () => {
    const fixture = TestBed.createComponent(CheckMarkComponent);
    fixture.detectChanges();
    fixture.componentRef.setInput('draw', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains('ui-check-mark--draw')).toBe(false);
  });

  it('takes the icon sizes', () => {
    expect(render({ size: 16 }).classList.contains('ui-check-mark--16')).toBe(true);
    expect(render({ size: 20 }).classList.contains('ui-check-mark--20')).toBe(true);
  });

  it('animates the stroke offset with tokens and shows the tick at once when motion is reduced', () => {
    const css = compileScss('lib/components/check-mark/check-mark.component.scss');
    expect(css).toContain('ui-draw-check var(--duration-base) var(--ease-out)');
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation: none/);
  });

  it('has no accessibility violations', async () => {
    expect(await axeViolations(render({ draw: true }))).toEqual([]);
  });
});
