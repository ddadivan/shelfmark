import { TestBed } from '@angular/core/testing';
import { UI_STORAGE_KEY } from './models/ui-storage-key.const';
import { UI_VIEW } from './models/ui-view.const';
import { UiStore } from './ui.store';

function create(): InstanceType<typeof UiStore> {
  TestBed.resetTestingModule();
  return TestBed.inject(UiStore);
}

describe('UiStore', () => {
  beforeEach(() => localStorage.removeItem(UI_STORAGE_KEY));
  afterAll(() => localStorage.removeItem(UI_STORAGE_KEY));

  it('starts with cards and the recent panel visible', () => {
    const store = create();

    expect(store.view()).toBe(UI_VIEW.Cards);
    expect(store.recentVisible()).toBe(true);
  });

  it('persists the view and the panel and restores them', () => {
    const store = create();
    store.setView(UI_VIEW.List);
    store.setRecentVisible(false);

    const restored = create();

    expect(restored.view()).toBe(UI_VIEW.List);
    expect(restored.recentVisible()).toBe(false);
  });

  it('falls back to the defaults for unexpected stored values', () => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ view: 'grid', recentVisible: 'yes' }));

    const store = create();

    expect(store.view()).toBe(UI_VIEW.Cards);
    expect(store.recentVisible()).toBe(true);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(UI_STORAGE_KEY, '{nope');

    expect(create().view()).toBe(UI_VIEW.Cards);
  });
});
