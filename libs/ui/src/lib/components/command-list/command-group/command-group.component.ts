import { _IdGenerator } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

/**
 * A titled group of `ui-command-item`s inside `ui-command-list`. The list draws the heading and
 * the `role="group"` (named by the heading) around the group's items; an empty group is not
 * drawn. This element itself renders nothing.
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

  /** Id of the heading element the list renders (`aria-labelledby` of the group). */
  readonly headingId = inject(_IdGenerator).getId('ui-command-group-');
}
