import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { axeViolations } from '../../../../testing/axe';
import { THEME_ATTRIBUTE } from '../../../models/theme/models/theme-attribute.const';
import { READER_THEME } from '../models/reader-theme.const';
import type { ReaderThemeOption } from './models/reader-theme-option.interface';
import { ReaderThemePickerComponent } from './reader-theme-picker.component';

const OPTIONS: ReaderThemeOption[] = [
  { value: READER_THEME.Light, label: 'Light' },
  { value: READER_THEME.Sepia, label: 'Sepia' },
  { value: READER_THEME.Dark, label: 'Dark' },
  { value: READER_THEME.Black, label: 'Black' },
];

@Component({
  imports: [ReaderThemePickerComponent],
  template: `<span id="theme-label">Theme</span>
    <ui-reader-theme-picker
      ariaLabelledby="theme-label"
      [options]="options"
      [(value)]="value"
      (touch)="touched.set(true)"
    />
    <button type="button">after</button>`,
})
class HostComponent {
  readonly options = OPTIONS;
  readonly value = signal<string>(READER_THEME.Dark);
  readonly touched = signal(false);
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const picker = host.querySelector('ui-reader-theme-picker') as HTMLElement;
  const radios = () => Array.from(picker.querySelectorAll<HTMLInputElement>('input[type=radio]'));
  return { fixture, host, picker, radios };
}

describe('ReaderThemePickerComponent', () => {
  it('is a radiogroup named by its label, one native radio per theme', () => {
    const { picker, radios } = setup();
    expect(picker.getAttribute('role')).toBe('radiogroup');
    expect(picker.getAttribute('aria-labelledby')).toBe('theme-label');
    expect(radios().map((radio) => radio.value)).toEqual(['light', 'sepia', 'dark', 'black']);
    expect(new Set(radios().map((radio) => radio.name)).size).toBe(1);
    expect(radios().find((radio) => radio.checked)?.value).toBe('dark');
    expect(radios().map((radio) => radio.closest('label')?.textContent?.trim())).toEqual([
      'AaLight',
      'AaSepia',
      'AaDark',
      'AaBlack',
    ]);
  });

  it('draws every swatch under its own theme tokens', () => {
    const { picker } = setup();
    const swatches = Array.from(picker.querySelectorAll('.ui-reader-theme__swatch'));
    expect(
      swatches.map((s) => [s.getAttribute(THEME_ATTRIBUTE), s.getAttribute('data-reader-theme')]),
    ).toEqual([
      ['light', 'light'],
      ['light', 'sepia'],
      ['dark', 'dark'],
      ['dark', 'black'],
    ]);
    expect(swatches.every((s) => s.closest('[aria-hidden="true"]'))).toBe(true);
  });

  it('chooses a theme and marks the checked tile', () => {
    const { fixture, picker, radios } = setup();
    radios()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('sepia');
    const checked = picker.querySelectorAll('.ui-reader-theme--checked');
    expect(checked).toHaveLength(1);
    expect(checked[0].textContent).toContain('Sepia');
  });

  it('focuses the checked tile and reports focus leaving the group', () => {
    const { fixture, host, radios } = setup();
    const picker = fixture.debugElement.children[1].componentInstance as ReaderThemePickerComponent;
    picker.focus();
    expect(document.activeElement).toBe(radios()[2]);
    radios()[2].dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: radios()[3] }),
    );
    expect(fixture.componentInstance.touched()).toBe(false);
    radios()[2].dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: host.querySelector('button') }),
    );
    expect(fixture.componentInstance.touched()).toBe(true);
  });

  it('has no axe violations', async () => {
    const { host } = setup();
    expect(await axeViolations(host)).toEqual([]);
  });
});
