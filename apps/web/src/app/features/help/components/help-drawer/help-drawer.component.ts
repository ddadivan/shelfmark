import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { DrawerComponent, UiDialogRef } from '@shelfmark/ui';
import { filter } from 'rxjs';
import { CurrentUrl } from '../../../../core/routing/current-url.service';
import { HelpSidebarComponent } from '../help-sidebar/help-sidebar.component';

/**
 * The Help sidebar as a drawer (below 64em, opened from the menu button of the top bar): the same
 * topics and articles, closing itself once an article has opened.
 */
@Component({
  selector: 'app-help-drawer',
  imports: [DrawerComponent, HelpSidebarComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-drawer.component.html',
  styleUrl: './help-drawer.component.scss',
})
export class HelpDrawerComponent {
  private readonly ref = inject<UiDialogRef<unknown>>(UiDialogRef);
  private readonly router = inject(Router);
  private readonly currentUrl = inject(CurrentUrl);

  /** The article being read, followed while the drawer is open. */
  protected readonly currentId = computed(() => this.articleIdOf(this.currentUrl.url()));

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.ref.close());
  }

  private articleIdOf(url: string): string | null {
    const match = /^\/help\/([^/?#]+)/.exec(url);
    return match?.[1] ?? null;
  }
}
