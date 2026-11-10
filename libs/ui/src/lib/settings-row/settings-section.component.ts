import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelComponent } from '../panel/panel.component';

let nextSectionId = 0;

/**
 * A titled group of settings on the panel surface. `title` is the `h2` of the group; the group
 * is named by it. Put `ui-settings-row`s in the default slot. `danger` is the red-ringed group
 * for destructive actions (BRAND.md Settings: only in Account, never next to toggles).
 */
@Component({
  selector: 'ui-settings-section',
  imports: [PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-settings-section',
    role: 'group',
    '[attr.aria-labelledby]': 'titleId',
    '[class.ui-settings-section--danger]': 'danger()',
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

  /** Red ring and red title for the group that holds destructive actions. */
  readonly danger = input(false, { transform: booleanAttribute });

  protected readonly titleId = `ui-settings-section-${nextSectionId++}`;
}
