import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ICON_SIZE, IconComponent } from '@shelfmark/ui';
import { isMacPlatform } from '../../search/is-mac-platform';
import { keyCap } from '../key-cap';
import type { KeyCap } from '../models/key-cap.interface';
import type { ShortcutGroup } from '../models/shortcut-group.interface';

interface ShortcutRow {
  labelKey: string;
  caps: KeyCap[];
}

/**
 * The shortcuts of one group: what each does and its keys as `kbd` caps. Used by the shortcuts
 * dialog and by the settings page, so both always list the same keys.
 */
@Component({
  selector: 'app-shortcut-list',
  imports: [TranslocoPipe, IconComponent],
  templateUrl: './shortcut-list.component.html',
  styleUrl: './shortcut-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortcutListComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  private readonly mac = isMacPlatform();

  readonly group = input.required<ShortcutGroup>();
  /** Names the list (the panel or column title it sits under). */
  readonly ariaLabelledby = input<string>();

  protected readonly rows = computed<ShortcutRow[]>(() =>
    this.group().shortcuts.map((shortcut) => ({
      labelKey: shortcut.labelKey,
      caps: shortcut.keys.map((key) => keyCap(key, this.mac)),
    })),
  );
}
