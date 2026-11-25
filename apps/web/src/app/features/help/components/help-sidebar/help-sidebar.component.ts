import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent, ScrollFadeDirective, TreeComponent, type UiTreeNode } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { HELP_CATEGORIES } from '../../models/help-categories.const';
import { HelpNavigationService } from '../../services/help-navigation.service';
import { HelpTextService } from '../../services/help-text.service';

/**
 * The Help center's sidebar (Shelf sidebar look, 17-help): the logo with a quiet "Help" tag, then
 * the topics with their articles as rows of the app sidebar (`ui-tree`: 36px, radius 10, the open
 * article `surface-pressed`). Its middle scrolls on its own. It fills the 240px sidebar from 64em
 * and the drawer below.
 */
@Component({
  selector: 'app-help-sidebar',
  imports: [LogoComponent, ScrollFadeDirective, RouterLink, TranslocoPipe, TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-sidebar.component.html',
  styleUrl: './help-sidebar.component.scss',
})
export class HelpSidebarComponent {
  protected readonly helpPath = `/${APP_PATH.Help}`;

  private readonly text = inject(HelpTextService);
  private readonly navigation = inject(HelpNavigationService);
  private readonly router = inject(Router);

  /** The id of the article being read. */
  readonly currentId = input<string | null>(null);

  protected readonly groups = computed(() =>
    HELP_CATEGORIES.map((category) => ({
      id: category.id,
      title: this.text.translate(`help.categories.${category.id}.title`),
      nodes: category.articles.map<UiTreeNode>((id) => ({
        id,
        name: this.text.text(id, 'title'),
      })),
    })),
  );

  protected open(node: UiTreeNode): void {
    void this.router.navigateByUrl(this.navigation.articleUrl(node.id));
  }
}
