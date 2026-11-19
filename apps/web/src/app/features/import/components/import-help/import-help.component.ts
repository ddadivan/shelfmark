import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ICON_SIZE, IconComponent, isMacPlatform } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { keyCap } from '../../../shortcuts/utils/key-cap';
import { importHelpSteps } from './import-help-steps';
import type { ImportHelpRow } from './models/import-help-row.interface';

/** Stands in for `{{keys}}` while translating, so the caps can go between the two halves. */
const KEYS_MARK = '';

/**
 * "How to export bookmarks from a browser": one line per browser with its shortcut as `kbd`
 * caps for this platform (Mac glyphs as icons with spoken names, Ctrl / Shift words elsewhere).
 * The translations hold `{{keys}}`, so they never repeat the keys.
 */
@Component({
  selector: 'app-import-help',
  imports: [TranslocoPipe, IconComponent],
  templateUrl: './import-help.component.html',
  styleUrl: './import-help.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportHelpComponent {
  private readonly transloco = inject(TranslocoService);
  protected readonly ICON_SIZE = ICON_SIZE;

  /** Apple keys and the Safari step; detected by default. */
  readonly mac = input(isMacPlatform());

  protected readonly rows = computed<ImportHelpRow[]>(() => {
    activeLang();
    const mac = this.mac();
    return importHelpSteps(mac).map((step) => {
      const [before, after = ''] = this.transloco
        .translate(step.textKey, { keys: KEYS_MARK })
        .split(KEYS_MARK);
      return { id: step.id, before, after, caps: step.keys.map((key) => keyCap(key, mac)) };
    });
  });
}
