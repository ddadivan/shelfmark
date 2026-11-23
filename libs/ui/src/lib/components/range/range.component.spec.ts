import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { disabled, form, FormField, max, min } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { compileScss } from '../../../testing/scss';
import { RangeComponent } from './range.component';
import { UiRangeHarness } from './testing/range.harness';

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(RangeComponent);
  fixture.componentRef.setInput('label', 'Grid size');
  fixture.componentRef.setInput('min', 1);
  fixture.componentRef.setInput('max', 6);
  fixture.componentRef.setInput('value', 3);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const input = () => host.querySelector('input') as HTMLInputElement;
  return { fixture, host, input };
}

@Component({
  imports: [RangeComponent, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-range label="Size" [formField]="f.size" />`,
})
class FormHostComponent {
  readonly model = signal({ size: 2 });
  readonly lock = signal(false);
  readonly f = form(this.model, (p) => {
    min(p.size, 1);
    max(p.size, 6);
    disabled(p.size, () => this.lock());
  });
}

describe('RangeComponent', () => {
  it('renders a native range input with min, max, step, value and a name', () => {
    const { input } = setup({ step: 1 });
    expect(input().type).toBe('range');
    expect(input().min).toBe('1');
    expect(input().max).toBe('6');
    expect(input().step).toBe('1');
    expect(input().value).toBe('3');
    expect(input().getAttribute('aria-label')).toBe('Grid size');
    expect(input().getAttribute('aria-valuetext')).toBeNull();
  });

  it('writes the value back on input and keeps the model in sync', () => {
    const { fixture, input } = setup();
    input().value = '5';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(5);
    fixture.componentRef.setInput('value', 2);
    fixture.detectChanges();
    expect(input().value).toBe('2');
  });

  it('takes valueText as a string or a function of the value', () => {
    const { fixture, input } = setup({ valueText: 'three of six' });
    expect(input().getAttribute('aria-valuetext')).toBe('three of six');
    fixture.componentRef.setInput('valueText', (v: number) => `${v} of 6`);
    fixture.detectChanges();
    expect(input().getAttribute('aria-valuetext')).toBe('3 of 6');
  });

  it('sets the filled share as a custom property (CSSOM, no style attribute text)', () => {
    const { fixture, input } = setup();
    expect(input().style.getPropertyValue('--ui-range-ratio')).toBe('0.4');
    fixture.componentRef.setInput('value', 6);
    fixture.detectChanges();
    expect(input().style.getPropertyValue('--ui-range-ratio')).toBe('1');
    fixture.componentRef.setInput('max', 1);
    fixture.detectChanges();
    expect(input().style.getPropertyValue('--ui-range-ratio')).toBe('0');
  });

  it('can be disabled, focused and emits touch on blur', () => {
    const { fixture, host, input } = setup({ disabled: true });
    expect(input().disabled).toBe(true);
    expect(host.firstElementChild).toBe(input());
    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    let touched = 0;
    fixture.componentInstance.touch.subscribe(() => touched++);
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(input());
    input().dispatchEvent(new Event('blur'));
    expect(touched).toBe(1);
  });

  it('works as a Signal Forms control and follows the disabled state', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('2');
    input.value = '4';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.model().size).toBe(4);
    fixture.componentInstance.lock.set(true);
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
  });

  it('has the harness read and set the value', async () => {
    const fixture = TestBed.createComponent(FormHostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const range = await loader.getHarness(UiRangeHarness.with({ label: 'Size' }));
    expect(await range.getLabel()).toBe('Size');
    expect(await range.getMin()).toBe(1);
    expect(await range.getMax()).toBe(6);
    expect(await range.getValue()).toBe(2);
    expect(await range.getValueText()).toBeNull();
    expect(await range.isDisabled()).toBe(false);
    await range.setValue(5);
    expect(await range.getValue()).toBe(5);
    expect(fixture.componentInstance.model().size).toBe(5);
  });

  it('has no axe violations', async () => {
    const { host } = setup({ valueText: '3 of 6' });
    expect(await axeViolations(host)).toEqual([]);
  });

  it('draws the Shelf track and thumb from tokens', () => {
    const css = compileScss('lib/components/range/range.component.scss');
    expect(css).toContain('var(--toggle-off)');
    expect(css).toContain('var(--accent)');
    expect(css).toContain('::-webkit-slider-thumb');
    expect(css).toContain('::-moz-range-thumb');
    expect(css).toContain('0 0 0 2px var(--surface)');
  });
});
