import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DrawerComponent, LogoComponent } from '@shelfmark/ui';
import { SidebarComponent } from '../sidebar/sidebar.component';

/**
 * Content of the phone drawer (docs/design/screens/MobileMenu): logo and close button, the
 * library sidebar (its "Recently opened" row opens the page). No footer: the account menu in the header holds
 * settings, export and sign-out, and the theme lives in Settings. `MobileNavService` opens it.
 */
@Component({
  selector: 'app-mobile-nav',
  imports: [DrawerComponent, LogoComponent, SidebarComponent, TranslocoPipe],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNavComponent {}
