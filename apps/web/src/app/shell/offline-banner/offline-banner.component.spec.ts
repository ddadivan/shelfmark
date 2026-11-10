import { createTranslated } from '../../../testing/create-translated';
import { OnlineService } from '../../core/network/online.service';
import { TestBed } from '@angular/core/testing';
import { OfflineBannerComponent } from './offline-banner.component';

describe('OfflineBannerComponent', () => {
  it('shows a polite warning only while offline', async () => {
    const fixture = await createTranslated(OfflineBannerComponent);
    const element = fixture.nativeElement as HTMLElement;
    TestBed.inject(OnlineService);
    expect(element.querySelector('ui-notice')).toBeNull();

    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    const notice = element.querySelector('ui-notice');
    expect(notice?.getAttribute('role')).toBe('status');
    expect(notice?.textContent).toContain("You're offline");

    window.dispatchEvent(new Event('online'));
    await fixture.whenStable();
    expect(element.querySelector('ui-notice')).toBeNull();
  });
});
