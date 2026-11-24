import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PopoverComponent } from '@shelfmark/ui';
import { ReadingSettingsFormComponent } from '../reading-settings-form/reading-settings-form.component';

/**
 * Reading settings as the 320px popover of the Aa button (desktop and tablet; Shelf
 * `01-library.html`). The heading only names the dialog. The phone opens
 * `ReadingSettingsSheetComponent` instead. The trigger binds
 * `[uiPopoverTrigger]="settings.popover()"`.
 */
@Component({
  selector: 'app-reading-settings',
  imports: [TranslocoPipe, PopoverComponent, ReadingSettingsFormComponent],
  templateUrl: './reading-settings.component.html',
  styleUrl: './reading-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingSettingsComponent {
  /** The popover, for the trigger. */
  readonly popover = viewChild.required(PopoverComponent);
}
