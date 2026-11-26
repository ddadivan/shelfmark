import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { TestBed } from '@angular/core/testing';
import {
  READER_PREFERENCES_DEFAULT,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import { ReaderSettingsService } from './reader-settings.service';

describe('ReaderSettingsService', () => {
  afterEach(() => localStorage.clear());

  it('starts from the stored settings and keeps every change', () => {
    localStorage.setItem(STORAGE_KEY.ReaderSettings, JSON.stringify({ font: 'serif' }));
    const service = TestBed.inject(ReaderSettingsService);
    expect(service.settings().font).toBe('serif');

    service.set({ theme: 'sepia' });
    expect(service.settings()).toEqual({
      theme: 'sepia',
      font: 'serif',
      size: 18,
      lineSpacing: 'normal',
      width: 'normal',
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY.ReaderSettings) ?? '{}')).toMatchObject({
      theme: 'sepia',
    });
  });

  it('steps the text size by 1px and stays between 14 and 24', () => {
    const service = TestBed.inject(ReaderSettingsService);
    service.stepSize(1);
    expect(service.settings().size).toBe(19);
    service.set({ size: 24 });
    service.stepSize(1);
    expect(service.settings().size).toBe(24);
    service.set({ size: 3 });
    expect(service.settings().size).toBe(14);
    service.stepSize(-1);
    expect(service.settings().size).toBe(14);
  });

  it('resets to the defaults, so the theme follows the app again', () => {
    const service = TestBed.inject(ReaderSettingsService);
    service.set({ theme: 'black', size: 22, lineSpacing: 'relaxed', width: 'wide' });
    service.reset();
    expect(service.settings()).toEqual(READER_SETTINGS_DEFAULT);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY.ReaderSettings) ?? '{}')).toMatchObject({
      theme: null,
      size: 18,
    });
  });

  it('carries over the first version of the settings', () => {
    localStorage.setItem(
      STORAGE_KEY.ReaderSettings,
      JSON.stringify({ size: 'l', font: 'readable', width: 'narrow', tone: 'sepia' }),
    );
    const service = TestBed.inject(ReaderSettingsService);
    expect(service.settings()).toEqual({
      theme: 'sepia',
      font: 'readable',
      size: 20,
      lineSpacing: 'normal',
      width: 'normal',
    });
  });

  it('keeps a change for the page when storage refuses it', () => {
    const service = TestBed.inject(ReaderSettingsService);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    service.set({ size: 20 });
    expect(service.settings().size).toBe(20);
    spy.mockRestore();
  });

  describe('on the account', () => {
    const update = vi.fn<(request: UpdateUserSettingsRequest) => unknown>();
    const account = (change: Partial<UserSettingsResponse> = {}): UserSettingsResponse =>
      ({ ...MOCK_APPEARANCE_DEFAULTS, ...change }) as UserSettingsResponse;

    beforeEach(() => {
      vi.useFakeTimers();
      update.mockReset();
      update.mockReturnValue(of(account()));
      TestBed.configureTestingModule({
        providers: [{ provide: USER_SETTINGS_API, useValue: { get: vi.fn(), update } }],
      });
    });

    afterEach(() => vi.useRealTimers());

    it('saves changes together after a short pause, only the fields changed', () => {
      const service = TestBed.inject(ReaderSettingsService);
      service.stepSize(1);
      service.stepSize(1);
      service.set({ theme: 'sepia' });
      expect(update).not.toHaveBeenCalled();
      vi.advanceTimersByTime(600);
      expect(update).toHaveBeenCalledExactlyOnceWith({ readerSize: 20, readerTheme: 'sepia' });
    });

    it('keeps a failed change and sends it again with the next one', async () => {
      update.mockReturnValueOnce(throwError(() => new Error('offline')));
      const service = TestBed.inject(ReaderSettingsService);
      service.set({ font: 'serif' });
      await vi.advanceTimersByTimeAsync(600);
      service.set({ width: 'wide' });
      await vi.advanceTimersByTimeAsync(600);
      expect(update).toHaveBeenLastCalledWith({ readerFont: 'serif', readerLineWidth: 'wide' });
      expect(service.settings().font).toBe('serif');
    });

    it('takes the account settings once saved there', () => {
      localStorage.setItem(STORAGE_KEY.ReaderSettings, JSON.stringify({ font: 'serif' }));
      const service = TestBed.inject(ReaderSettingsService);
      service.adopt(
        account({
          readerSaved: true,
          readerFont: 'readable',
          readerSize: 22,
          readerTheme: 'black',
        }),
        service.editToken(),
      );
      expect(service.settings()).toEqual({
        theme: 'black',
        font: 'readable',
        size: 22,
        lineSpacing: 'normal',
        width: 'normal',
      });
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY.ReaderSettings) ?? '{}')).toMatchObject({
        font: 'readable',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('keeps a change made while the account answer was on its way', () => {
      const service = TestBed.inject(ReaderSettingsService);
      const token = service.editToken();
      service.set({ size: 16 });
      service.adopt(account({ readerSaved: true, readerSize: 22 }), token);
      expect(service.settings().size).toBe(16);
    });

    it('saves the settings of this browser once when the account has none', () => {
      localStorage.setItem(STORAGE_KEY.ReaderSettings, JSON.stringify({ font: 'serif' }));
      const service = TestBed.inject(ReaderSettingsService);
      service.adopt(account({ readerSaved: false }), service.editToken());
      expect(update).toHaveBeenCalledExactlyOnceWith({
        ...READER_PREFERENCES_DEFAULT,
        readerFont: 'serif',
      });
    });

    it('writes nothing when neither the account nor this browser has settings', () => {
      const service = TestBed.inject(ReaderSettingsService);
      service.adopt(account(), service.editToken());
      expect(update).not.toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEY.ReaderSettings)).toBeNull();
    });

    it('sends a waiting change before the session ends and forgets it after', async () => {
      const service = TestBed.inject(ReaderSettingsService);
      const scope = TestBed.inject(SessionScope);
      service.set({ lineSpacing: 'relaxed' });
      await scope.flush();
      expect(update).toHaveBeenCalledExactlyOnceWith({ readerLineSpacing: 'relaxed' });
      service.set({ width: 'narrow' });
      scope.end();
      await vi.advanceTimersByTimeAsync(600);
      expect(update).toHaveBeenCalledTimes(1);
    });
  });
});
