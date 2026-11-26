import { STORAGE_KEY } from '../core/storage/models/storage-key.const';
import { TestBed } from '@angular/core/testing';
import { UiStore } from './ui.store';

function create(): InstanceType<typeof UiStore> {
  TestBed.resetTestingModule();
  return TestBed.inject(UiStore);
}

describe('UiStore', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY.Ui));
  afterAll(() => localStorage.removeItem(STORAGE_KEY.Ui));

  it('survives corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY.Ui, '{nope');

    expect(create().singleKeyShortcuts()).toBe(true);
  });

  it('has single-key shortcuts on by default', () => {
    expect(create().singleKeyShortcuts()).toBe(true);
  });

  it('persists turning single-key shortcuts off and on', () => {
    const store = create();
    store.setSingleKeyShortcuts(false);

    const restored = create();

    expect(restored.singleKeyShortcuts()).toBe(false);
    restored.setSingleKeyShortcuts(true);
    expect(create().singleKeyShortcuts()).toBe(true);
  });

  it('ignores the feed view an older version kept here', () => {
    localStorage.setItem(
      STORAGE_KEY.Ui,
      JSON.stringify({ view: 'list', singleKeyShortcuts: false }),
    );

    const store = create();

    expect(store.singleKeyShortcuts()).toBe(false);
    expect('view' in store).toBe(false);
  });

  it('keeps single-key shortcuts on when the stored value is not a boolean', () => {
    localStorage.setItem(
      STORAGE_KEY.Ui,
      JSON.stringify({ view: 'list', singleKeyShortcuts: 'no' }),
    );

    expect(create().singleKeyShortcuts()).toBe(true);
  });
});
