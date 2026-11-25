import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { APP_PATH } from '../../../../models/app-path.const';
import { HELP_CATEGORIES } from '../../models/help-categories.const';

/** The topics of the Help center with their articles (Shelf 17-help `.nav`); the open one is marked. */
@Component({
  selector: 'app-help-nav',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-nav.component.html',
  styleUrl: './help-nav.component.scss',
})
export class HelpNavComponent {
  protected readonly categories = HELP_CATEGORIES;
  protected readonly helpPath = `/${APP_PATH.Help}`;

  /** The id of the article being read. */
  readonly currentId = input<string>();
}
