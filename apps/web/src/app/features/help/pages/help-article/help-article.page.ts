import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BreadcrumbsComponent,
  BUTTON_VARIANT,
  ButtonComponent,
  EmptyStateComponent,
  LinkTileComponent,
  type BreadcrumbItem,
} from '@shelfmark/ui';
import { map } from 'rxjs';
import { LocaleDatePipe } from '../../../../core/i18n/locale-date.pipe';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { APP_PATH } from '../../../../models/app-path.const';
import { HelpArticleBodyComponent } from '../../components/help-article-body/help-article-body.component';
import { HelpFeedbackComponent } from '../../components/help-feedback/help-feedback.component';
import { HelpShellComponent } from '../../components/help-shell/help-shell.component';
import { HelpTocComponent } from '../../components/help-toc/help-toc.component';
import { HelpActionsService } from '../../services/help-actions.service';
import { HelpNavigationService } from '../../services/help-navigation.service';
import { HelpTextService } from '../../services/help-text.service';
import { findHelpArticle, helpArticleNeighbours } from '../../utils/find-help-article';
import { followHelpTitle } from '../../utils/follow-help-title';

/**
 * One help article (`/help/:articleId`, Shelf 17-help "Article") in the help shell (topics
 * sidebar): the article column (crumbs, title, lead, read time, sections, related articles, "Was
 * this helpful?", previous / next) and "On this page" pinned at the right edge from 75em. An id
 * that does not exist shows "Article not found" with the way back.
 */
@Component({
  selector: 'app-help-article-page',
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    EmptyStateComponent,
    HelpArticleBodyComponent,
    HelpFeedbackComponent,
    HelpShellComponent,
    HelpTocComponent,
    LinkTileComponent,
    LocaleDatePipe,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-article.page.html',
  styleUrl: './help-article.page.scss',
})
export default class HelpArticlePage {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly helpPath = `/${APP_PATH.Help}`;

  private readonly router = inject(Router);
  private readonly text = inject(HelpTextService);
  private readonly actions = inject(HelpActionsService);
  protected readonly navigation = inject(HelpNavigationService);

  private readonly articleId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('articleId'))),
    { initialValue: null },
  );

  protected readonly article = computed(() => findHelpArticle(this.articleId()));
  protected readonly neighbours = computed(() => {
    const article = this.article();
    return article ? helpArticleNeighbours(article.id) : undefined;
  });
  protected readonly related = computed(() =>
    (this.article()?.related ?? []).flatMap((id) => {
      const found = findHelpArticle(id);
      return found ? [found] : [];
    }),
  );
  protected readonly crumbs = computed<readonly BreadcrumbItem[]>(() => {
    const article = this.article();
    if (!article) {
      return [];
    }
    return [
      { label: this.text.translate('help.title'), href: this.helpPath },
      { label: this.text.translate(`help.categories.${article.category}.title`) },
    ];
  });
  protected readonly minutesKey = computed(() =>
    pluralKey('help.minutes', this.article()?.minutes ?? 1),
  );

  /** The section in view (the "On this page" mark). */
  protected readonly activeSection = signal<string | undefined>(undefined);

  constructor() {
    followHelpTitle(
      computed(() => {
        const article = this.article();
        return article
          ? this.text.text(article.id, 'title')
          : this.text.translate('help.notFound.title');
      }),
    );
  }

  protected openSearch(): void {
    void this.router.navigate([this.helpPath], { queryParams: { q: '' } });
  }

  protected sendFeedback(): void {
    this.actions.sendFeedback();
  }

  protected scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
    this.activeSection.set(id);
  }

  /** The last section whose heading has passed under the sticky header. */
  protected trackSection(): void {
    const sections = this.article()?.sections ?? [];
    let current = sections[0]?.id;
    for (const section of sections) {
      const heading = document.getElementById(section.id);
      if (heading && heading.getBoundingClientRect().top <= 140) {
        current = section.id;
      }
    }
    this.activeSection.set(current);
  }
}
