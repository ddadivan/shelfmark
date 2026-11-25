import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DrawerService } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { HelpDrawerComponent } from '../help-drawer/help-drawer.component';
import { HelpHeaderComponent } from '../help-header/help-header.component';
import { HelpSidebarComponent } from '../help-sidebar/help-sidebar.component';

/**
 * The frame of every Help page, laid out like the app shell (Shelf 17-help): a full-height sidebar
 * on the left (the topics, from 64em) and the main area filling the rest with its top bar (menu
 * button below 64em, search, theme, back to the shelf) over its own scroll. The page content is
 * projected into the scroll area; it scrolls back to the top when `resetKey` changes. Below 64em the
 * sidebar is a drawer opened from the top bar.
 */
@Component({
  selector: 'app-help-shell',
  imports: [HelpHeaderComponent, HelpSidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-shell.component.html',
  styleUrl: './help-shell.component.scss',
})
export class HelpShellComponent {
  protected readonly viewport = inject(ViewportService);
  private readonly drawers = inject(DrawerService);
  private readonly transloco = inject(TranslocoService);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  /** The id of the article being read (marks it in the sidebar). */
  readonly currentId = input<string | null>(null);
  /** The page changed (another article): the main area scrolls to the top. */
  readonly resetKey = input<string | null>(null);

  /** The search pill or Ctrl / Cmd K. */
  readonly searchRequested = output<void>();
  /** The main area scrolled. */
  readonly scrolled = output<void>();

  constructor() {
    effect(() => {
      this.resetKey();
      this.scroller().nativeElement.scrollTop = 0;
    });
  }

  protected openMenu(): void {
    this.drawers.open(HelpDrawerComponent, { ariaLabel: this.transloco.translate('help.nav') });
  }
}
