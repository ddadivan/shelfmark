import { TestBed } from '@angular/core/testing';
import { ASK_WIDTH_STORAGE_KEY } from '../models/ask-width-storage-key.const';
import { AskPanelWidth } from './ask-panel-width.service';

describe('AskPanelWidth', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reads, writes and removes the device width', () => {
    localStorage.setItem(ASK_WIDTH_STORAGE_KEY, '600');
    const width = TestBed.inject(AskPanelWidth);
    expect(width.width()).toBe(600);
    width.set(720);
    expect(localStorage.getItem(ASK_WIDTH_STORAGE_KEY)).toBe('720');
    width.set(null);
    expect(localStorage.getItem(ASK_WIDTH_STORAGE_KEY)).toBeNull();
  });

  it('ignores garbage and blocked storage', () => {
    localStorage.setItem(ASK_WIDTH_STORAGE_KEY, 'wide');
    expect(TestBed.inject(AskPanelWidth).width()).toBeNull();
    TestBed.resetTestingModule();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const width = TestBed.inject(AskPanelWidth);
    expect(width.width()).toBeNull();
    width.set(500);
    expect(width.width()).toBe(500);
  });
});
