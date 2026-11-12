import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
} from '@shelfmark/ui';
import { UiStore } from '../../../../stores/ui.store';
import { SHORTCUT_GROUPS } from '../../../shortcuts/models/shortcut-groups.const';
import { ShortcutsDialogService } from '../../../shortcuts/shortcuts-dialog.service';
import { ShortcutListComponent } from '../../../shortcuts/shortcut-list/shortcut-list.component';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';

/** `/settings/shortcuts`: the same list as the "?" dialog. */
@Component({
  selector: 'app-settings-shortcuts-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    ShortcutListComponent,
    SwitchComponent,
  ],
  templateUrl: './shortcuts.page.html',
  styleUrl: './shortcuts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ShortcutsPage {
  protected readonly shortcuts = inject(ShortcutsDialogService);
  protected readonly ui = inject(UiStore);
  protected readonly groups = SHORTCUT_GROUPS;
}
