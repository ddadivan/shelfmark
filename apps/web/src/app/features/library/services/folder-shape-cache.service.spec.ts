import { TestBed } from '@angular/core/testing';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { FolderShapeCache } from './folder-shape-cache.service';

describe('FolderShapeCache', () => {
  function setup(stored?: unknown): FolderShapeCache {
    TestBed.resetTestingModule();
    localStorage.removeItem(STORAGE_KEY.FolderShape);
    if (stored !== undefined) {
      localStorage.setItem(STORAGE_KEY.FolderShape, JSON.stringify(stored));
    }
    return TestBed.inject(FolderShapeCache);
  }
  const stored = (): unknown => JSON.parse(localStorage.getItem(STORAGE_KEY.FolderShape) ?? 'null');

  afterAll(() => localStorage.removeItem(STORAGE_KEY.FolderShape));

  it('knows nothing at first and keeps what a folder page showed', () => {
    const cache = setup();
    expect(cache.subfolders('f1')).toBe(0);
    cache.remember('f1', 3);
    expect(cache.subfolders('f1')).toBe(3);
    expect(stored()).toEqual({ f1: 3 });
    expect(setup(stored()).subfolders('f1')).toBe(3);
  });

  it('drops a folder that has no subfolders any more and caps what a page holds', () => {
    const cache = setup({ f1: 3, f2: 30 });
    cache.remember('f1', 0);
    expect(stored()).toEqual({ f2: 30 });
    expect(cache.subfolders('f2')).toBe(9);
  });

  it('keeps only the latest folders', () => {
    const cache = setup();
    for (let index = 0; index < 45; index++) {
      cache.remember(`f${index}`, 1);
    }
    const keys = Object.keys(stored() as Record<string, number>);
    expect(keys).toHaveLength(40);
    expect(keys).not.toContain('f0');
    expect(keys).toContain('f44');
  });

  it('ignores garbage in the storage', () => {
    expect(setup([1, 2]).subfolders('0')).toBe(0);
    expect(setup({ f1: 'x', f2: -1, f3: 1.5 }).subfolders('f1')).toBe(0);
    expect(setup('text').subfolders('f1')).toBe(0);
  });
});
