import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import {
  CUSTOM_THEME_BACKGROUNDS,
  CUSTOM_THEME_BASE,
  CUSTOM_THEME_DEFAULT,
  MOTION_PREFERENCE,
  type CustomTheme,
} from '@shelfmark/contracts';
import {
  type ColorPickerComponent,
  type SwitchComponent,
  TOAST_KIND,
  ToastService,
  type ToastOptions,
  nearestAccessibleAccent,
  nearestReadableBackground,
} from '@shelfmark/ui';
import { OwnColourActionsService } from '../../../core/colours/own-colour-actions.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { AppearanceSettingsService } from './appearance-settings.service';

const PALE = '#ffff66';
const DEEP = '#1a4d8f';

function setup({ saved = true }: { saved?: boolean } = {}) {
  const customTheme = signal<CustomTheme>({ ...CUSTOM_THEME_DEFAULT });
  const shown: ToastOptions[] = [];
  const setAppearance = vi.fn(() => Promise.resolve(saved));
  const setFolderColours = vi.fn(() => Promise.resolve(saved));
  const addCustomColour = vi.fn(() => Promise.resolve(true));
  const remove = vi.fn(() => Promise.resolve());
  TestBed.configureTestingModule({
    providers: [
      AppearanceSettingsService,
      { provide: ThemeService, useValue: { customTheme } },
      {
        provide: UserSettingsStore,
        useValue: { setAppearance, setFolderColours, addCustomColour },
      },
      { provide: OwnColourActionsService, useValue: { remove } },
      { provide: LocaleService, useValue: { formatNumber: (value: number) => String(value) } },
      { provide: TranslocoService, useValue: { translate: (key: string) => key } },
      {
        provide: ToastService,
        useValue: { show: (options: ToastOptions) => shown.push(options) },
      },
    ],
  });
  const picker = { open: signal(true), clear: vi.fn() };
  return {
    service: TestBed.inject(AppearanceSettingsService),
    customTheme,
    shown,
    setAppearance,
    setFolderColours,
    addCustomColour,
    remove,
    picker,
    pickerRef: picker as unknown as ColorPickerComponent,
  };
}

describe('AppearanceSettingsService', () => {
  it('applies an own accent that keeps 4.5:1, remembers it and closes the picker', () => {
    const { service, setAppearance, addCustomColour, picker, pickerRef } = setup();

    service.pickOwnAccent(DEEP, pickerRef);

    expect(addCustomColour).toHaveBeenCalledWith(DEEP);
    expect(setAppearance).toHaveBeenCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, accent: DEEP },
    });
    expect(service.accentWarning()).toBeNull();
    expect(picker.open()).toBe(false);
    expect(picker.clear).toHaveBeenCalled();
  });

  it('refuses a pale accent with a warning, and "Use" applies the nearest shade', () => {
    const { service, setAppearance, addCustomColour, picker, pickerRef } = setup();
    const { base, background } = CUSTOM_THEME_DEFAULT;

    service.pickOwnAccent(PALE, pickerRef);

    const warning = service.accentWarning();
    expect(warning?.colour).toBe(PALE);
    expect(warning?.shade).toBe(nearestAccessibleAccent(PALE, base, background));
    expect(Number(warning?.ratio)).toBeLessThan(4.5);
    expect(service.pickedColour()).toBe(PALE);
    expect(setAppearance).not.toHaveBeenCalled();
    expect(picker.open()).toBe(true);

    service.useShade(warning?.shade ?? '', pickerRef);
    expect(addCustomColour).toHaveBeenCalledWith(warning?.shade);
    expect(service.accentWarning()).toBeNull();
    expect(picker.open()).toBe(false);
  });

  it('checks an own accent swatch without remembering it again', () => {
    const { service, addCustomColour, setAppearance, pickerRef } = setup();

    service.setAccent(DEEP, pickerRef);

    expect(addCustomColour).not.toHaveBeenCalled();
    expect(setAppearance).toHaveBeenCalledOnce();
  });

  it('refuses an unreadable own background with a warning and applies the shade on "Use"', () => {
    const { service, setAppearance, pickerRef } = setup();

    service.pickOwnBackground('#000000', pickerRef);

    const warning = service.backgroundWarning();
    expect(warning?.shade).toBe(nearestReadableBackground('#000000', CUSTOM_THEME_DEFAULT.base));
    expect(setAppearance).not.toHaveBeenCalled();

    service.useBackgroundShade(warning?.shade ?? '', pickerRef);
    expect(setAppearance).toHaveBeenCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, background: warning?.shade },
    });
    expect(service.backgroundWarning()).toBeNull();
  });

  it('keeps an own background when the base changes and takes the first curated one otherwise', () => {
    const { service, customTheme, setAppearance } = setup();

    service.setBase(CUSTOM_THEME_BASE.Dark);
    expect(setAppearance).toHaveBeenLastCalledWith({
      customTheme: {
        ...CUSTOM_THEME_DEFAULT,
        base: CUSTOM_THEME_BASE.Dark,
        background: CUSTOM_THEME_BACKGROUNDS[CUSTOM_THEME_BASE.Dark][0],
      },
    });

    customTheme.set({ ...CUSTOM_THEME_DEFAULT, background: '#f4efe6' });
    service.setBase(CUSTOM_THEME_BASE.Dark);
    expect(setAppearance).toHaveBeenLastCalledWith({
      customTheme: { ...CUSTOM_THEME_DEFAULT, base: CUSTOM_THEME_BASE.Dark, background: '#f4efe6' },
    });
  });

  it('ignores values outside the lists', () => {
    const { service, setAppearance, pickerRef } = setup();

    for (const set of [
      service.setTheme,
      service.setMotion,
      service.setTextSize,
      service.setFont,
      service.setDensity,
      service.setPreviewImage,
      service.setCorners,
    ]) {
      set.call(service, 'nope');
    }
    service.setAccent('nope', pickerRef);
    service.setBackground('nope', pickerRef);
    service.setBase(CUSTOM_THEME_DEFAULT.base);
    service.pickOwnAccent('nope', pickerRef);
    service.pickOwnBackground('nope', pickerRef);
    service.useShade('nope', pickerRef);
    service.useBackgroundShade('nope', pickerRef);

    expect(setAppearance).not.toHaveBeenCalled();
  });

  it('says so when a save fails and puts a failed switch back', async () => {
    const { service, shown, setFolderColours } = setup({ saved: false });
    const control = { checked: signal(true) };

    service.setMotion(MOTION_PREFERENCE.Reduced);
    await Promise.resolve();
    await service.setFolderColours(true, control as unknown as SwitchComponent);

    expect(setFolderColours).toHaveBeenCalledWith(true);
    expect(control.checked()).toBe(false);
    expect(shown.map((toast) => toast.kind)).toEqual([TOAST_KIND.Danger, TOAST_KIND.Danger]);
    expect(shown[0].title).toBe('settings.appearance.failed');
  });

  it('resets the Custom theme and forgets picks and warnings; removes own colours', () => {
    const { service, setAppearance, remove, pickerRef } = setup();
    service.pickOwnAccent(PALE, pickerRef);

    service.resetCustom();
    service.removeOwnColour(DEEP);

    expect(service.pickedColour()).toBe('');
    expect(service.accentWarning()).toBeNull();
    expect(setAppearance).toHaveBeenCalledWith({ customTheme: { ...CUSTOM_THEME_DEFAULT } });
    expect(remove).toHaveBeenCalledWith(DEEP);
  });
});
