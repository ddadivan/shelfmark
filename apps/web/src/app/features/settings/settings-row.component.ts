import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One setting: label and hint on the start side, the control (projected) on the end side. */
@Component({
  selector: 'app-settings-row',
  templateUrl: './settings-row.component.html',
  styleUrl: './settings-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'settings-row' },
})
export class SettingsRowComponent {
  /** Already translated label. */
  readonly label = input.required<string>();
  /** Already translated hint under the label. */
  readonly hint = input<string>();
  /** Id of the label, so the control can name itself with `aria-labelledby`. */
  readonly labelId = input.required<string>();
}
