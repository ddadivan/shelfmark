import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { isLinkClickAction, LINK_CLICK_ACTION, type LibrarySettings } from '@shelfmark/contracts';
import {
  ChipComponent,
  RadioGroupComponent,
  SETTINGS_ROW_ALIGN,
  SettingsRowComponent,
  type RadioOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';

/**
 * Settings › Library rows of the link preview (#553, `LinkPreviewEntry.dc.html` 2c): "Clicking a
 * link" (open it, or open the preview on wide screens; ⌘-click does the other one) and "Sites
 * that open in a new tab" (removable chips: blocked sites and the user's own choices). It emits
 * the change; the page saves it with its usual rollback toast.
 */
@Component({
  selector: 'app-preview-settings',
  imports: [TranslocoPipe, ChipComponent, RadioGroupComponent, SettingsRowComponent],
  templateUrl: './preview-settings.component.html',
  styleUrl: './preview-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewSettingsComponent {
  private readonly transloco = inject(TranslocoService);
  readonly library = input.required<LibrarySettings>();
  readonly changed = output<Partial<LibrarySettings>>();
  protected readonly SETTINGS_ROW_ALIGN = SETTINGS_ROW_ALIGN;

  protected readonly clickOptions = computed<RadioOption[]>(() => {
    // Re-runs on a language switch (`translate` itself is not reactive).
    activeLang();
    const t = (key: string): string => this.transloco.translate(key);
    return [
      {
        value: LINK_CLICK_ACTION.Open,
        title: t('settings.library.viewing.click.open'),
        description: t('settings.library.viewing.click.openHint'),
      },
      {
        value: LINK_CLICK_ACTION.Preview,
        title: t('settings.library.viewing.click.preview'),
        description: t('settings.library.viewing.click.previewHint'),
      },
    ];
  });

  protected setClick(value: string): void {
    if (isLinkClickAction(value)) {
      this.changed.emit({ clickAction: value });
    }
  }

  protected removeHost(host: string): void {
    this.changed.emit({
      previewNewTabHosts: this.library().previewNewTabHosts.filter((h) => h !== host),
    });
  }
}
