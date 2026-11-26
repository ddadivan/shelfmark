import { STORAGE_KEY } from '../../../../core/storage/models/storage-key.const';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME } from '@shelfmark/ui';
import { axeViolations } from '../../../../../testing/axe';
import { loadEnglish, provideTranslocoForTest } from '../../../../testing/transloco-testing';
import { ThemeService } from '../../../../core/theme/theme.service';
import { ReaderSettingsService } from '../../../reader/services/reader-settings.service';
import { ReadingSettingsFormComponent } from './reading-settings-form.component';

async function setup(appTheme: string = THEME.Light) {
  const resolved = signal(appTheme);
  TestBed.configureTestingModule({
    providers: [provideTranslocoForTest(), { provide: ThemeService, useValue: { resolved } }],
  });
  await loadEnglish();
  const fixture = TestBed.createComponent(ReadingSettingsFormComponent);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const settings = TestBed.inject(ReaderSettingsService);
  const group = (label: string) => {
    const labelEl = Array.from(host.querySelectorAll('.reading-settings-form__label')).find(
      (el) => el.textContent?.trim() === label,
    );
    return host.querySelector(`[aria-labelledby="${labelEl?.id}"]`) as HTMLElement;
  };
  const radio = (label: string, value: string) =>
    group(label).querySelector(`input[value="${value}"]`) as HTMLInputElement;
  const slider = () => host.querySelector('input[type=range]') as HTMLInputElement;
  const button = (name: string) =>
    host.querySelector(`button[aria-label="${name}"]`) as HTMLButtonElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return { fixture, host, settings, resolved, group, radio, slider, button, settle };
}

describe('ReadingSettingsFormComponent', () => {
  afterEach(() => localStorage.clear());

  it('names every group: four radiogroups and the slider', async () => {
    const { host, group, slider } = await setup();
    for (const label of ['Theme', 'Font', 'Line spacing', 'Line width']) {
      expect(group(label).getAttribute('role')).toBe('radiogroup');
    }
    expect(slider().getAttribute('aria-label')).toBe('Text size');
    expect(slider().getAttribute('aria-valuetext')).toBe('18 px');
    expect([slider().min, slider().max, slider().step, slider().value]).toEqual([
      '14',
      '24',
      '1',
      '18',
    ]);
    expect(host.textContent).toContain('Saved to your account');
    expect(await axeViolations(host)).toEqual([]);
  });

  it('checks the tile of the app theme until a theme is picked', async () => {
    const { radio, resolved, settle, settings } = await setup(THEME.Dark);
    expect(radio('Theme', 'dark').checked).toBe(true);
    resolved.set(THEME.Light);
    await settle();
    expect(radio('Theme', 'light').checked).toBe(true);
    radio('Theme', 'black').click();
    await settle();
    expect(settings.settings().theme).toBe('black');
    expect(radio('Theme', 'black').checked).toBe(true);
  });

  it('sets each font label in its own font and applies every choice at once', async () => {
    const { group, radio, settle, settings } = await setup();
    const labels = Array.from(group('Font').querySelectorAll<HTMLElement>('.ui-seg__label'));
    expect(labels.map((label) => label.style.fontFamily)).toEqual([
      'var(--font-sans)',
      'var(--font-serif)',
      'var(--font-readable)',
    ]);
    radio('Font', 'serif').click();
    radio('Line spacing', 'relaxed').click();
    radio('Line width', 'wide').click();
    await settle();
    expect(settings.settings()).toMatchObject({
      font: 'serif',
      lineSpacing: 'relaxed',
      width: 'wide',
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY.ReaderSettings) ?? '{}')).toMatchObject({
      font: 'serif',
    });
  });

  it('steps the text size with the A buttons and the slider, within 14 to 24', async () => {
    const { host, slider, button, settle, settings } = await setup();
    button('Larger text').click();
    await settle();
    expect(settings.settings().size).toBe(19);
    expect(host.querySelector('.reading-settings-form__value')?.textContent).toBe('19');
    slider().value = '24';
    slider().dispatchEvent(new Event('input'));
    await settle();
    expect(settings.settings().size).toBe(24);
    expect(button('Larger text').getAttribute('aria-disabled')).toBe('true');
    button('Larger text').click();
    button('Smaller text').click();
    await settle();
    expect(settings.settings().size).toBe(23);
  });

  it('resets to the defaults', async () => {
    const { button, settle, settings, radio } = await setup();
    settings.set({ theme: 'sepia', size: 22, width: 'narrow' });
    await settle();
    const reset = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Reset',
    );
    reset?.click();
    await settle();
    expect(settings.settings()).toMatchObject({ theme: null, size: 18, width: 'normal' });
    expect(radio('Theme', 'light').checked).toBe(true);
    expect(button('Smaller text')).not.toBeNull();
  });
});
