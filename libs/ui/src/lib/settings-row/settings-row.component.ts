import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import type { IconName } from '../icon/models/icon-name.type';
import { SETTINGS_ROW_ALIGN } from './models/settings-row-align.const';
import type { SettingsRowAlign } from './models/settings-row-align.type';

let nextRowId = 0;

/**
 * One setting: what it is on the start side, the control (switch, segmented control, select,
 * button) in the default slot on the end side. Rows are separated by a `border` line, the first
 * has none. On narrow screens the control drops under the text. The description says what
 * changes, not how the control works. Give the control its accessible name yourself: bind
 * `titleId` to its `aria-labelledby` (`#row` template reference) or set its `label`.
 */
@Component({
  selector: 'ui-settings-row',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-settings-row',
    '[class.ui-settings-row--top]': 'align() === SETTINGS_ROW_ALIGN.Top',
  },
  templateUrl: './settings-row.component.html',
  styleUrl: './settings-row.component.scss',
})
export class SettingsRowComponent {
  protected readonly SETTINGS_ROW_ALIGN = SETTINGS_ROW_ALIGN;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** Already translated name of the setting. */
  readonly title = input.required<string>();
  /** Already translated line under the title: what changes. */
  readonly description = input<string>();
  /** Tile icon for a row about a device, account or service. */
  readonly icon = input<IconName>();
  /** `top` keeps the control level with the first line of a long description. */
  readonly align = input<SettingsRowAlign>(SETTINGS_ROW_ALIGN.Center);

  /** Unique id of the title, for the control's `aria-labelledby`. */
  readonly titleId = `ui-settings-row-title-${nextRowId++}`;
}
