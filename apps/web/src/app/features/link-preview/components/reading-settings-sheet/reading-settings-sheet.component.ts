import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SheetComponent } from '@shelfmark/ui';
import { ReadingSettingsFormComponent } from '../reading-settings-form/reading-settings-form.component';

/**
 * Reading settings on the phone (Shelf ReaderView): a bottom sheet titled "Reading settings",
 * opened by the Aa button of the phone Link page through `DialogService.open`. Closed by
 * dragging it down, Esc or the scrim; every change already applied.
 */
@Component({
  selector: 'app-reading-settings-sheet',
  imports: [TranslocoPipe, SheetComponent, ReadingSettingsFormComponent],
  templateUrl: './reading-settings-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingSettingsSheetComponent {}
