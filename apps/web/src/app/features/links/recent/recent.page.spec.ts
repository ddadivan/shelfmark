import { TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { AppTranslocoLoader } from '../../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../../core/i18n/transloco.config';
import { LinksStore } from '../../../stores/links.store';
import { LinkActionsService } from '../link-actions.service';
import RecentPage from './recent.page';

describe('RecentPage', () => {
  it('has a level-one heading and the recent list without a second title', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        {
          provide: LinksStore,
          useValue: { recentLoaded: () => true, recent: () => [], loadRecent: vi.fn() },
        },
        { provide: LinkActionsService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(RecentPage);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('Recently opened');
    expect(root.querySelector('h2')).toBeNull();
    expect(root.querySelector('.recent__empty')).not.toBeNull();
  });
});
