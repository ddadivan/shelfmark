import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../../testing/axe';
import { BarChartComponent } from './bar-chart.component';
import type { BarChartBar } from './models/bar-chart-bar.interface';
import { UiBarChartHarness } from './testing/bar-chart.harness';

const BARS: BarChartBar[] = [
  { label: '1', value: 2, description: '1 Nov: 2 sign-ups' },
  { label: '2', value: 0 },
  { label: '3', value: 4, description: '3 Nov: 4 sign-ups' },
  { label: '4', value: 1 },
];

function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(BarChartComponent);
  const values = {
    bars: BARS,
    label: 'Sign-ups, last 4 days',
    labelHeader: 'Day',
    valueHeader: 'Sign-ups',
    ...inputs,
  };
  for (const [key, value] of Object.entries(values)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    harness: () => TestbedHarnessEnvironment.harnessForFixture(fixture, UiBarChartHarness),
    bars: () => [...host.querySelectorAll<SVGRectElement>('.ui-bar-chart__bar')],
    ticks: () =>
      [...host.querySelectorAll('.ui-bar-chart__tick')].map((tick) => tick.textContent?.trim()),
  };
}

describe('BarChartComponent', () => {
  it('is an image named by the label and the summary', async () => {
    const { harness } = setup({ summary: '7 in all' });
    expect(await (await harness()).getAccessibleName()).toBe('Sign-ups, last 4 days. 7 in all');
    const plain = setup();
    expect(await (await plain.harness()).getAccessibleName()).toBe('Sign-ups, last 4 days');
  });

  it('lists every value in the hidden data table with its description', async () => {
    const harness = await setup().harness();
    expect(await harness.getLabel()).toBe('Sign-ups, last 4 days');
    expect(await harness.getRows()).toEqual([
      { text: '1 Nov: 2 sign-ups', value: 2 },
      { text: '2: 0', value: 0 },
      { text: '3 Nov: 4 sign-ups', value: 4 },
      { text: '4: 1', value: 1 },
    ]);
  });

  it('scales the bars to the largest value and shows it on top', () => {
    const { bars, host } = setup();
    expect(bars().map((bar) => bar.style.transform)).toEqual([
      'scaleY(0.5)',
      'scaleY(0)',
      'scaleY(1)',
      'scaleY(0.25)',
    ]);
    expect(host.querySelector('.ui-bar-chart__max')?.textContent?.trim()).toBe('4');
    expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 40 100');
  });

  it('draws nothing above the baseline when every value is zero or invalid', () => {
    const { bars } = setup({
      bars: [
        { label: 'a', value: 0 },
        { label: 'b', value: Number.NaN },
        { label: 'c', value: -3 },
      ],
    });
    expect(bars().every((bar) => bar.style.transform === 'scaleY(0)')).toBe(true);
  });

  it('shows every n-th axis text counted from the last bar', () => {
    const { ticks, fixture } = setup({ labelEvery: 2 });
    expect(ticks()).toEqual(['', '2', '', '4']);
    fixture.componentRef.setInput('labelEvery', 0);
    fixture.detectChanges();
    expect(ticks()).toEqual(['1', '2', '3', '4']);
  });

  it('updates the bars when the data changes', () => {
    const { fixture, bars } = setup();
    fixture.componentRef.setInput('bars', [{ label: 'x', value: 3 }]);
    fixture.detectChanges();
    expect(bars()).toHaveLength(1);
    expect(bars()[0].style.transform).toBe('scaleY(1)');
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(setup({ summary: '7 in all' }).host)).toEqual([]);
  });
});
