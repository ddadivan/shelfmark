import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelComponent } from '../panel/panel.component';

let nextSectionId = 0;

/**
 * A titled group of settings on the panel surface. `title` is the `h2` of the group; the group
 * is named by it. Put `ui-settings-row`s in the default slot.
 */
@Component({
  selector: 'ui-settings-section',
  imports: [PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-settings-section',
    role: 'group',
    '[attr.aria-labelledby]': 'titleId',
  },
  template: `
    <ui-panel class="ui-settings-section__panel">
      <h2 class="ui-settings-section__title" [id]="titleId">{{ title() }}</h2>
      <ng-content />
    </ui-panel>
  `,
  styleUrl: './settings-section.component.scss',
})
export class SettingsSectionComponent {
  /** Already translated group title. */
  readonly title = input.required<string>();

  protected readonly titleId = `ui-settings-section-${nextSectionId++}`;
}
