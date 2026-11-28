import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { AiSettingsStore } from './ai-settings.store';
import { TidyCountStore } from './tidy-count.store';
import { TidyEntryCache } from './tidy-entry-cache.service';

describe('TidyEntryCache', () => {
  const isOn = signal(true);
  const total = signal(0);
  const known = signal(false);

  function setup(stored: string | null): TidyEntryCache {
    TestBed.resetTestingModule();
    if (stored === null) {
      localStorage.removeItem(STORAGE_KEY.TidyEntry);
    } else {
      localStorage.setItem(STORAGE_KEY.TidyEntry, stored);
    }
    isOn.set(true);
    total.set(0);
    known.set(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: AiSettingsStore, useValue: { isOn } },
        { provide: TidyCountStore, useValue: { total, known } },
      ],
    });
    const cache = TestBed.inject(TidyEntryCache);
    TestBed.tick();
    return cache;
  }

  afterAll(() => localStorage.removeItem(STORAGE_KEY.TidyEntry));

  it('holds the slot only when the button showed last time and the answer is out', () => {
    expect(setup('1').reserve()).toBe(true);
    expect(setup('0').reserve()).toBe(false);
    expect(setup(null).reserve()).toBe(false);
    const cache = setup('1');
    known.set(true);
    expect(cache.reserve()).toBe(false);
  });

  it('writes nothing before the answer and then keeps whether the button shows', () => {
    setup('1');
    expect(localStorage.getItem(STORAGE_KEY.TidyEntry)).toBe('1');
    known.set(true);
    total.set(3);
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY.TidyEntry)).toBe('1');
    total.set(0);
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY.TidyEntry)).toBe('0');
    total.set(4);
    isOn.set(false);
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY.TidyEntry)).toBe('0');
  });
});
