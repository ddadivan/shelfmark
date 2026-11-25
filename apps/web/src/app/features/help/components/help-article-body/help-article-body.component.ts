import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent, NOTICE_KIND, NoticeComponent } from '@shelfmark/ui';
import { HELP_BLOCK } from '../../models/help-block-kind.const';
import type { HelpArticle } from '../../models/help-article.interface';
import { HelpRuleMockComponent } from '../help-rule-mock/help-rule-mock.component';
import { HelpTextComponent } from '../help-text/help-text.component';

/** The sections of an article: an `h2` per section, then its paragraphs, steps, tips and notes. */
@Component({
  selector: 'app-help-article-body',
  imports: [
    HelpRuleMockComponent,
    HelpTextComponent,
    IconComponent,
    NoticeComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-article-body.component.html',
  styleUrl: './help-article-body.component.scss',
})
export class HelpArticleBodyComponent {
  protected readonly HELP_BLOCK = HELP_BLOCK;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  readonly article = input.required<HelpArticle>();

  /** The full translation key of a block key of this article. */
  protected key(rel: string): string {
    return `help.articles.${this.article().id}.${rel}`;
  }
}
