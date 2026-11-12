import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HISTORY_HEADING_LEVEL } from '../models/history-heading-level.const';
import type { HistoryHeadingLevel } from '../models/history-heading-level.type';

let nextGroupId = 0;

/**
 * One day of "Recently opened" or Trash: a title ("Today", "Yesterday", ...) above a card that
 * holds `ui-history-row`s separated by lines. The title is already translated. The group is named
 * by it and its rows form a list. `headingLevel` is 2 on a page and 3 inside a sheet.
 */
@Component({
  selector: 'ui-history-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-history-group',
    role: 'group',
    '[attr.aria-labelledby]': 'titleId',
    // `title` is an input: keep the browser from showing it as a native tooltip.
    '[attr.title]': 'null',
  },
  templateUrl: './history-group.component.html',
  styleUrl: './history-group.component.scss',
})
export class HistoryGroupComponent {
  protected readonly HISTORY_HEADING_LEVEL = HISTORY_HEADING_LEVEL;
  protected readonly titleId = `ui-history-group-${nextGroupId++}`;

  /** Already translated day title. */
  readonly title = input.required<string>();
  /** Level of the title heading. Default 2. */
  readonly headingLevel = input<HistoryHeadingLevel>(HISTORY_HEADING_LEVEL.Two);
}
