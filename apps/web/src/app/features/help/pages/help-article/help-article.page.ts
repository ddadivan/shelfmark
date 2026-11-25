import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BreadcrumbsComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  EmptyStateComponent,
  type BreadcrumbItem,
} from '@shelfmark/ui';
import { map } from 'rxjs';
import { LocaleDatePipe } from '../../../../core/i18n/locale-date.pipe';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { APP_PATH } from '../../../../models/app-path.const';
import { HelpArticleBodyComponent } from '../../components/help-article-body/help-article-body.component';
import { HelpFeedbackComponent } from '../../components/help-feedback/help-feedback.component';
import { HelpHeaderComponent } from '../../components/help-header/help-header.component';
import { HelpNavComponent } from '../../components/help-nav/help-nav.component';
import { HelpTocComponent } from '../../components/help-toc/help-toc.component';
import { HelpActionsService } from '../../services/help-actions.service';
import { HelpTextService } from '../../services/help-text.service';
import { findHelpArticle, helpArticleNeighbours } from '../../utils/find-help-article';
import { followHelpTitle } from '../../utils/follow-help-title';

/**
 * One help article (`/help/:articleId`, Shelf 17-help "Article"): the topics on the left, the
 * article in the middle (crumbs, title, lead, read time, sections, related articles, "Was this
 * helpful?", previous / next) and "On this page" on the right. Below 68.75em "On this page"
 * leaves; below 53.75em the topics become a button above the article. An id that does not exist
 * shows "Article not found" with the way back.
 */
@Component({
  selector: 'app-help-article-page',
  imports: [
    BreadcrumbsComponent,
    ButtonComponent,
    EmptyStateComponent,
    HelpArticleBodyComponent,
    HelpFeedbackComponent,
    HelpHeaderComponent,
    HelpNavComponent,
    HelpTocComponent,
    LocaleDatePipe,
    RouterLink,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-article.page.html',
  styleUrl: './help-article.page.scss',
  host: { '(window:scroll)': 'trackSection()' },
})
export default class HelpArticlePage {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly helpPath = `/${APP_PATH.Help}`;

  private readonly router = inject(Router);
  private readonly text = inject(HelpTextService);
  private readonly actions = inject(HelpActionsService);

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

  /** The topics button of the narrow layout. */
  protected readonly topicsOpen = signal(false);
  /** The section in view (the "On this page" mark). */
  protected readonly activeSection = signal<string | undefined>(undefined);

  protected readonly mobileLabel = computed(() => {
    const article = this.article();
    return article
      ? `${this.text.translate(`help.categories.${article.category}.title`)} › ${this.text.text(article.id, 'title')}`
      : '';
  });

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
      if (heading && heading.getBoundingClientRect().top <= 120) {
        current = section.id;
      }
    }
    this.activeSection.set(current);
  }
}
