import { TestBed } from '@angular/core/testing';
import { OnlineService } from './online.service';

describe('OnlineService', () => {
  it('follows the online and offline events', () => {
    const service = TestBed.inject(OnlineService);
    expect(service.online()).toBe(true);

    window.dispatchEvent(new Event('offline'));
    expect(service.online()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(service.online()).toBe(true);
  });
});
