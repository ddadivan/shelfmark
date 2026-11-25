import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '@shelfmark/ui';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { APP_PATH } from '../../../../models/app-path.const';
import type { HelpCategory } from '../../models/help-category.interface';

/** How many articles a topic card lists; the count line says how many the topic has. */
const SHOWN = 3;

/** A topic of the help home (Shelf 17-help `.cat`): glyph, name, one line, three articles, the count. */
@Component({
  selector: 'app-help-topic-card',
  imports: [IconComponent, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-topic-card.component.html',
  styleUrl: './help-topic-card.component.scss',
})
export class HelpTopicCardComponent {
  protected readonly helpPath = `/${APP_PATH.Help}`;

  readonly category = input.required<HelpCategory>();

  protected readonly shown = computed(() => this.category().articles.slice(0, SHOWN));
  protected readonly countKey = computed(() =>
    pluralKey('help.articleCount', this.category().articles.length),
  );
}
