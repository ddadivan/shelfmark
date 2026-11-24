import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelComponent } from '../../panel/panel.component';

let nextSectionId = 0;

/**
 * A titled group of settings (Shelf `.group`): the `h2` title above a panel that holds the rows
 * edge to edge; the group is named by the title. Put `ui-settings-row`s in the default slot. `danger` is the red-ringed group
 * for destructive actions (BRAND.md Settings: only in Account, never next to toggles).
 */
@Component({
  selector: 'ui-settings-section',
  imports: [PanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-settings-section',
    role: 'group',
    '[attr.aria-labelledby]': 'title() ? titleId : null',
    '[class.ui-settings-section--danger]': 'danger()',
  },
  template: `
    @if (title()) {
      <h2 class="ui-settings-section__title" [id]="titleId">{{ title() }}</h2>
    }
    <ui-panel class="ui-settings-section__panel">
      <ng-content />
    </ui-panel>
  `,
  styleUrl: './settings-section.component.scss',
})
export class SettingsSectionComponent {
  /** Already translated group title; empty for a lone group with no heading (Settings › AI's main switch). */
  readonly title = input('');

  /** Red ring and red title for the group that holds destructive actions. */
  readonly danger = input(false, { transform: booleanAttribute });

  protected readonly titleId = `ui-settings-section-${nextSectionId++}`;
}
