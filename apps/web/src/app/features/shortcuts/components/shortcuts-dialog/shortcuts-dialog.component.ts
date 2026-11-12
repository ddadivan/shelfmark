import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogComponent } from '@shelfmark/ui';
import { SHORTCUT_GROUP_HEADING_PREFIX } from '../../models/shortcut-group-heading-id.const';
import { SHORTCUT_GROUPS } from '../../models/shortcut-groups.const';
import { ShortcutListComponent } from '../shortcut-list/shortcut-list.component';

/** The "?" dialog: every shortcut the app has, grouped (Trash.dc "Keyboard shortcuts"). */
@Component({
  selector: 'app-shortcuts-dialog',
  imports: [TranslocoPipe, DialogComponent, ShortcutListComponent],
  templateUrl: './shortcuts-dialog.component.html',
  styleUrl: './shortcuts-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortcutsDialogComponent {
  protected readonly groups = SHORTCUT_GROUPS;
  protected readonly headingPrefix = SHORTCUT_GROUP_HEADING_PREFIX;
}
