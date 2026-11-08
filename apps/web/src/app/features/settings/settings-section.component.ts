import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A titled card of the settings page. Rows (`app-settings-row` or any content) are projected, so
 * a later feature adds its row to a section, or a new section, without touching this component.
 */
@Component({
  selector: 'app-settings-section',
  templateUrl: './settings-section.component.html',
  styleUrl: './settings-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'settings-section', '[class.settings-section--danger]': 'danger()' },
})
export class SettingsSectionComponent {
  /** Already translated heading. */
  readonly heading = input.required<string>();
  /** Irreversible actions: a danger-coloured border and heading (Settings design). */
  readonly danger = input(false, { transform: booleanAttribute });
}
