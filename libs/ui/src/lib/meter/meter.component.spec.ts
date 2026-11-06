import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../testing/axe';
import { MeterComponent } from './meter.component';

function setup(value: unknown, label = 'Export progress') {
  const fixture = TestBed.createComponent(MeterComponent);
  fixture.componentRef.setInput('label', label);
  fixture.componentRef.setInput('value', value);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    bar: host.querySelector('[role="progressbar"]') as HTMLElement,
    fill: host.querySelector('.ui-meter__fill') as HTMLElement,
  };
}

describe('MeterComponent', () => {
  it('is a progressbar with the value, range and accessible name', () => {
    const { bar, fill } = setup(64);
    expect(bar.getAttribute('aria-valuenow')).toBe('64');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-label')).toBe('Export progress');
    expect(fill.style.width).toBe('64%');
  });

  it('updates the fill and aria-valuenow when the value changes', () => {
    const { fixture, bar, fill } = setup(10);
    fixture.componentRef.setInput('value', 90);
    fixture.detectChanges();
    expect(bar.getAttribute('aria-valuenow')).toBe('90');
    expect(fill.style.width).toBe('90%');
  });

  it.each([
    [-20, '0'],
    [150, '100'],
    [Number.NaN, '0'],
    ['42', '42'],
    [undefined, '0'],
  ])('keeps %s inside 0 to 100 (%s)', (value, expected) => {
    const { bar } = setup(value);
    expect(bar.getAttribute('aria-valuenow')).toBe(expected);
  });

  it('takes the label from the input', () => {
    const { bar } = setup(5, 'Preparing export');
    expect(bar.getAttribute('aria-label')).toBe('Preparing export');
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(setup(64).host)).toEqual([]);
  });
});
