import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DrawerComponent, LogoComponent } from '@shelfmark/ui';
import { RecentLinksSheetService } from '../../features/links/recent/recent-links-sheet.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MobileNavService } from './mobile-nav.service';

/**
 * Content of the phone drawer (docs/design/screens/MobileMenu): logo and close button, the
 * library sidebar with a "Recently opened" row. No footer: the account menu in the header holds
 * settings, export and sign-out, and the theme lives in Settings. `MobileNavService` opens it.
 */
@Component({
  selector: 'app-mobile-nav',
  imports: [DrawerComponent, LogoComponent, SidebarComponent, TranslocoPipe],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNavComponent {
  private readonly nav = inject(MobileNavService);
  private readonly recent = inject(RecentLinksSheetService);

  /** Slides the drawer out, then opens the recent links as a sheet (focus ends on the menu button). */
  protected async openRecent(): Promise<void> {
    await this.nav.close();
    this.recent.open();
  }
}
