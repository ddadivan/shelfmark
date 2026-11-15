import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { DatePickerComponent } from '../date-picker.component';
import { UiDatePickerHarness } from './date-picker.harness';

@Component({
  imports: [DatePickerComponent],
  template: `<ui-date-picker
    [(date)]="date"
    min="2026-11-09"
    today="2026-11-09"
    locale="en-GB"
    previousMonthLabel="Previous month"
    nextMonthLabel="Next month"
  />`,
})
class HostComponent {
  readonly date = signal<string | null>(null);
}

describe('UiDatePickerHarness', () => {
  it('reads the month and the picked day, picks a day and changes the month', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const picker = await TestbedHarnessEnvironment.loader(fixture).getHarness(UiDatePickerHarness);

    expect(await picker.getMonthTitle()).toBe('November 2026');
    expect(await picker.getSelectedDay()).toBeNull();
    expect(await picker.isDayDisabled('2026-11-08')).toBe(true);
    await picker.selectDay('2026-11-20');
    expect(fixture.componentInstance.date()).toBe('2026-11-20');
    expect(await picker.getSelectedDay()).toBe('2026-11-20');
    await picker.shiftMonth(1);
    expect(await picker.getMonthTitle()).toBe('December 2026');
    await picker.shiftMonth(-1);
    expect(await picker.getMonthTitle()).toBe('November 2026');
  });
});
