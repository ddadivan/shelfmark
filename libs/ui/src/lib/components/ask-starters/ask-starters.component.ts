import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { IconComponent } from '../icon/icon.component';
import type { AskStarterGroup } from './models/ask-starter-group.interface';

/**
 * What Ask your shelf can do, before the first question (Shelf 11-ask "what it can do"): one card
 * per kind of question (`surface` with the `line` hairline, radius 12, 16px padding), a 16px
 * heading with its muted glyph and the example questions as quiet 14px buttons. Two columns when
 * the component is at least 37.5rem wide (a container query), one below. `compact` is the phone
 * start: the first question of every group as a left-aligned `surface-hover` pill, no headings.
 * Pressing a question emits its text (`picked`); the feature asks it.
 */
@Component({
  selector: 'ui-ask-starters',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-ask-starters', '[class.ui-ask-starters--compact]': 'compact()' },
  templateUrl: './ask-starters.component.html',
  styleUrl: './ask-starters.component.scss',
})
export class AskStartersComponent {
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The cards, in order. */
  readonly groups = input.required<readonly AskStarterGroup[]>();
  /** Phone start: one pill per group (its first question), no cards. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Level of the card headings (3 under a page `h1` + section, 2 under a panel title). */
  readonly headingLevel = input<2 | 3>(3);

  /** A question was pressed: its text. */
  readonly picked = output<string>();

  /** The compact pills: the first question of each group. */
  protected readonly firstQuestions = computed(() =>
    this.groups().flatMap((group) => (group.questions.length > 0 ? [group.questions[0]] : [])),
  );
}
