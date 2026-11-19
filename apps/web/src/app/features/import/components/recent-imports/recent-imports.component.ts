import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ImportSummary } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { RecentImportsStore } from '../../services/recent-imports.store';

/**
 * "Recent imports" (SetImport.dc.html): one row per import of the last 7 days that is not undone,
 * "3 Nov · 212 links, 9 folders, 14 skipped", with Undo import. Not rendered while there is none.
 */
@Component({
  selector: 'app-recent-imports',
  imports: [TranslocoPipe, ButtonComponent, SettingsRowComponent, SettingsSectionComponent],
  templateUrl: './recent-imports.component.html',
  styleUrl: './recent-imports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentImportsComponent {
  protected readonly store = inject(RecentImportsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly viewport = inject(ViewportService);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Md,
  );

  protected readonly rows = computed(() => {
    activeLang();
    return this.store.items().map((item) => ({ item, line: this.line(item) }));
  });

  constructor() {
    void this.store.load();
  }

  protected undo(item: ImportSummary): void {
    void this.store.undo(item.id, item.linksCreated);
  }

  private line(item: ImportSummary): string {
    const parts = [this.plural('import.recent.links', item.linksCreated)];
    if (item.foldersCreated > 0)
      parts.push(this.plural('import.recent.folders', item.foldersCreated));
    if (item.skipped > 0) parts.push(this.count('import.recent.skipped', item.skipped));
    if (item.failed > 0) parts.push(this.count('import.recent.failed', item.failed));
    return `${this.locale.formatDate(item.createdAt)} · ${parts.join(', ')}`;
  }

  private plural(base: string, count: number): string {
    return this.count(pluralKey(base, count), count);
  }

  private count(key: string, count: number): string {
    return this.transloco.translate(key, { count: this.locale.formatNumber(count) });
  }
}
