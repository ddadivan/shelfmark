import { _IdGenerator } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { IconName } from '../../icon/models/icon-name.type';

/**
 * A titled group of `ui-command-item`s inside `ui-command-list`. The list draws the heading and
 * the `role="group"` (named by the heading) around the group's items; an empty group is not
 * drawn. This element itself renders nothing.
 *
 * `icon` turns the heading into a divider: the decorative icon in the `ai` colour before the text
 * and a hairline after it ("Related by meaning" with the spark). `lead` is a muted line above the
 * heading, for a word about what came before ("No links with these words").
 */
@Component({
  selector: 'ui-command-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-command-group', hidden: '' },
  template: '<ng-content />',
})
export class CommandGroupComponent {
  /** Visible heading, for example "3 links"; already translated. */
  readonly heading = input.required<string>();
  /** Decorative icon before the heading, drawn as a divider (the spark of AI results). */
  readonly icon = input<IconName>();
  /** Muted line above the heading, already translated; not part of the group's name. */
  readonly lead = input<string>();

  /** Id of the heading element the list renders (`aria-labelledby` of the group). */
  readonly headingId = inject(_IdGenerator).getId('ui-command-group-');
}
