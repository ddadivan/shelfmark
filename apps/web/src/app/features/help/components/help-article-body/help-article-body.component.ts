import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NOTICE_KIND, NoticeComponent } from '@shelfmark/ui';
import { ThemeService } from '../../../../core/theme/theme.service';
import { HELP_MEDIA } from '../../models/help-media.const';
import { helpImageSrc } from '../../utils/help-image-src';
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
    NgOptimizedImage,
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
  protected readonly HELP_MEDIA = HELP_MEDIA;

  private readonly theme = inject(ThemeService);

  readonly article = input.required<HelpArticle>();

  /** The full translation key of a block key of this article. */
  protected key(rel: string): string {
    return `help.articles.${this.article().id}.${rel}`;
  }

  /** The screenshot file of a slug for the theme the page is drawn on. */
  protected imageSrc(slug: string): string {
    return helpImageSrc(slug, this.theme.resolved());
  }
}
