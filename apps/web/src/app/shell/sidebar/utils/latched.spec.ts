import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { latched } from './latched';

describe('latched', () => {
  it('stays true once the source was true', () => {
    TestBed.runInInjectionContext(() => {
      const source = signal(false);
      const ready = latched(() => source());
      expect(ready()).toBe(false);
      source.set(true);
      expect(ready()).toBe(true);
      source.set(false);
      expect(ready()).toBe(true);
    });
  });
});
