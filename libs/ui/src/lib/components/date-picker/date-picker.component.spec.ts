import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { axeViolations } from '../../../testing/axe';
import { DatePickerComponent } from './date-picker.component';

@Component({
  imports: [DatePickerComponent],
  template: `<ui-date-picker
    [(date)]="date"
    [min]="min()"
    locale="en-GB"
    [firstDay]="1"
    today="2026-11-09"
    previousMonthLabel="Previous month"
    nextMonthLabel="Next month"
  />`,
})
class HostComponent {
  readonly date = signal<string | null>('2026-11-14');
  readonly min = signal<string | null>('2026-11-09');
}

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let element: HTMLElement;

  const day = (iso: string) =>
    element.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`) as HTMLButtonElement;
  const title = () => element.querySelector('.ui-date-picker__title')?.textContent?.trim();
  const key = async (target: HTMLElement, name: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    document.body.append(element);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => element.remove());

  it('shows the month of the picked day with weekday headers from the first day', () => {
    expect(title()).toBe('November 2026');
    const headers = [...element.querySelectorAll('th')].map((th) => th.getAttribute('abbr'));
    expect(headers[0]).toBe('Monday');
    expect(headers).toHaveLength(7);
  });

  it('marks the picked day, today and the days before the minimum', () => {
    expect(day('2026-11-14').getAttribute('aria-pressed')).toBe('true');
    expect(day('2026-11-14').classList).toContain('ui-date-picker__day--on');
    expect(day('2026-11-09').getAttribute('aria-current')).toBe('date');
    expect(day('2026-11-08').disabled).toBe(true);
    expect(day('2026-11-14').tabIndex).toBe(0);
    expect(day('2026-11-15').tabIndex).toBe(-1);
    expect(day('2026-11-14').getAttribute('aria-label')).toMatch(/^Saturday,? 14 November 2026$/);
  });

  it('picks a day on click and ignores a disabled one', () => {
    day('2026-11-20').click();
    expect(host.date()).toBe('2026-11-20');
    day('2026-11-08').click();
    expect(host.date()).toBe('2026-11-20');
  });

  it('moves the focus with the arrow keys, Home, End and the page keys', async () => {
    day('2026-11-14').focus();
    await key(day('2026-11-14'), 'ArrowRight');
    expect(document.activeElement).toBe(day('2026-11-15'));
    await key(day('2026-11-15'), 'ArrowDown');
    expect(document.activeElement).toBe(day('2026-11-22'));
    await key(day('2026-11-22'), 'Home');
    expect(document.activeElement).toBe(day('2026-11-16'));
    await key(day('2026-11-16'), 'End');
    expect(document.activeElement).toBe(day('2026-11-22'));
    await key(day('2026-11-22'), 'PageDown');
    expect(title()).toBe('December 2026');
    expect(document.activeElement).toBe(day('2026-12-22'));
    await key(day('2026-12-22'), 'ArrowUp');
    expect(document.activeElement).toBe(day('2026-12-15'));
    await key(day('2026-12-15'), 'Tab');
    expect(host.date()).toBe('2026-11-14');
  });

  it('never moves before the minimum and disables the month before it', async () => {
    const previous = element.querySelector<HTMLButtonElement>(
      '[aria-label="Previous month"] button, button[aria-label="Previous month"]',
    );
    expect(previous?.disabled).toBe(true);
    await key(day('2026-11-14'), 'PageUp');
    expect(title()).toBe('November 2026');
    expect(day('2026-11-09').tabIndex).toBe(0);
  });

  it('changes the month with the arrows of the header', async () => {
    const next = element.querySelector<HTMLButtonElement>('button[aria-label="Next month"]');
    next?.click();
    fixture.detectChanges();
    expect(title()).toBe('December 2026');
    const previous = element.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous month"]',
    );
    previous?.click();
    fixture.detectChanges();
    expect(title()).toBe('November 2026');
  });

  it('starts on today when nothing is picked and there is no minimum', async () => {
    host.date.set(null);
    host.min.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(day('2026-11-09').tabIndex).toBe(0);
    expect(element.querySelector('[aria-pressed="true"]')).toBeNull();
  });

  it('has no axe violations', async () => {
    expect(await axeViolations(element)).toEqual([]);
  });
});
