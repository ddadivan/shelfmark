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

  it('starts with cards', () => {
    const store = create();

    expect(store.view()).toBe(UI_VIEW.Cards);
  });

  it('persists the view and restores it', () => {
    const store = create();
    store.setView(UI_VIEW.List);

    const restored = create();

    expect(restored.view()).toBe(UI_VIEW.List);
  });

  it('falls back to the default for an unexpected view and ignores the old panel flag', () => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ view: 'grid', recentVisible: true }));

    const store = create();

    expect(store.view()).toBe(UI_VIEW.Cards);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(UI_STORAGE_KEY, '{nope');

    expect(create().view()).toBe(UI_VIEW.Cards);
  });

  it('has single-key shortcuts on by default', () => {
    expect(create().singleKeyShortcuts()).toBe(true);
  });

  it('persists turning single-key shortcuts off, next to the view', () => {
    const store = create();
    store.setView(UI_VIEW.List);
    store.setSingleKeyShortcuts(false);

    const restored = create();

    expect(restored.singleKeyShortcuts()).toBe(false);
    expect(restored.view()).toBe(UI_VIEW.List);
    restored.setSingleKeyShortcuts(true);
    expect(create().singleKeyShortcuts()).toBe(true);
  });

  it('keeps single-key shortcuts on when the stored value is not a boolean', () => {
    localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({ view: 'list', singleKeyShortcuts: 'no' }),
    );

    expect(create().singleKeyShortcuts()).toBe(true);
  });
});
