import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService, type ToastOptions } from '@shelfmark/ui';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { OwnColourActionsService } from './own-colour-actions.service';

function setup(removed = true) {
  const shown: ToastOptions[] = [];
  const removeCustomColour = vi.fn(() => Promise.resolve(removed));
  const addCustomColour = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: UserSettingsStore, useValue: { removeCustomColour, addCustomColour } },
      {
        provide: ToastService,
        useValue: {
          show: (options: ToastOptions) => {
            shown.push(options);
            return { dismiss: () => undefined, closed: new Promise<never>(() => undefined) };
          },
        },
      },
      {
        provide: TranslocoService,
        useValue: {
          translate: (key: string, params?: Record<string, string>) =>
            params?.['colour'] ? `${key}|${params['colour']}` : key,
        },
      },
    ],
  });
  return {
    shown,
    removeCustomColour,
    addCustomColour,
    service: TestBed.inject(OwnColourActionsService),
  };
}

describe('OwnColourActionsService (#350)', () => {
  it('drops the swatch from the saved colours and offers an Undo that puts it back', async () => {
    const { service, shown, removeCustomColour, addCustomColour } = setup();

    await service.remove('#a33a5b');

    expect(removeCustomColour).toHaveBeenCalledWith('#a33a5b');
    expect(shown).toHaveLength(1);
    expect(shown[0].kind).toBe(TOAST_KIND.Info);
    expect(shown[0].title).toBe('settings.appearance.custom.own.removed');
    expect(shown[0].detail).toBe('#a33a5b');
    expect(shown[0].action?.label).toBe('settings.appearance.custom.own.undo');

    shown[0].action?.run();
    expect(addCustomColour).toHaveBeenCalledWith('#a33a5b');
  });

  it('says so when the colour could not be removed, and offers no Undo', async () => {
    const { service, shown } = setup(false);

    await service.remove('#a33a5b');

    expect(shown).toHaveLength(1);
    expect(shown[0].kind).toBe(TOAST_KIND.Danger);
    expect(shown[0].action).toBeUndefined();
  });

  it('ignores something that is not an own colour', async () => {
    const { service, shown, removeCustomColour } = setup();

    await service.remove('ocean');

    expect(removeCustomColour).not.toHaveBeenCalled();
    expect(shown).toEqual([]);
  });

  it('names the remove action of a swatch with its colour', () => {
    expect(setup().service.removeLabel('#23716c')).toBe(
      'settings.appearance.custom.own.remove|#23716c',
    );
  });
});
