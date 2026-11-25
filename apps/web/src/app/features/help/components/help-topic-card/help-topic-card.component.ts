import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FOLDER_ICON_SIZE,
  FolderIconComponent,
  PanelComponent,
  TreeComponent,
  type UiTreeNode,
} from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import type { HelpCategory } from '../../models/help-category.interface';
import { HelpNavigationService } from '../../services/help-navigation.service';
import { HelpTextService } from '../../services/help-text.service';

/** How many articles a topic card lists; the count line says how many the topic has. */
const SHOWN = 3;

/**
 * A topic of the help home (Shelf 17-help `.cat`): a `ui-panel` with the topic's glyph tile, name,
 * one line, three article rows (`ui-tree`, the app sidebar's rows) and the article count.
 */
@Component({
  selector: 'app-help-topic-card',
  imports: [FolderIconComponent, PanelComponent, TranslocoPipe, TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-topic-card.component.html',
  styleUrl: './help-topic-card.component.scss',
})
export class HelpTopicCardComponent {
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;

  private readonly router = inject(Router);
  private readonly navigation = inject(HelpNavigationService);
  private readonly text = inject(HelpTextService);

  readonly category = input.required<HelpCategory>();

  protected readonly rows = computed<UiTreeNode[]>(() =>
    this.category()
      .articles.slice(0, SHOWN)
      .map((id) => ({ id, name: this.text.text(id, 'title') })),
  );
  protected readonly title = computed(() =>
    this.text.translate(`help.categories.${this.category().id}.title`),
  );
  protected readonly countKey = computed(() =>
    pluralKey('help.articleCount', this.category().articles.length),
  );

  protected open(node: UiTreeNode): void {
    void this.router.navigateByUrl(this.navigation.articleUrl(node.id));
  }
}
