import { TestBed } from '@angular/core/testing';
import { SearchFieldService } from './search-field.service';

describe('SearchFieldService', () => {
  it('has nothing to focus until a field registers', () => {
    expect(TestBed.inject(SearchFieldService).focus()).toBe(false);
  });

  it('focuses the registered field and forgets it when it unregisters', () => {
    const service = TestBed.inject(SearchFieldService);
    const focus = vi.fn(() => true);
    const unregister = service.register(focus);

    expect(service.focus()).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);

    unregister();
    expect(service.focus()).toBe(false);
  });

  it('keeps a newer field when an older one unregisters late', () => {
    const service = TestBed.inject(SearchFieldService);
    const older = service.register(() => true);
    const newer = vi.fn(() => true);
    service.register(newer);

    older();

    expect(service.focus()).toBe(true);
    expect(newer).toHaveBeenCalledTimes(1);
  });
});
