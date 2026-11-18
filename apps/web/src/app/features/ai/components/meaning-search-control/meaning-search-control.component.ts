import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SwitchComponent } from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { aiResetDate } from '../../utils/ai-reset-date';
import { meaningStatusLine } from '../../utils/meaning-status-line';

/**
 * The control of the "Search by meaning" row in Settings › AI (AI-3): the readiness line ("840 of
 * 1,000 links ready", "Ready", "Paused until …") and the switch. A change saves at once; a failed
 * save puts the switch back (the actions show the toast). Numbers and dates follow the app language.
 */
@Component({
  selector: 'app-meaning-search-control',
  imports: [TranslocoPipe, SwitchComponent],
  templateUrl: './meaning-search-control.component.html',
  styleUrl: './meaning-search-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeaningSearchControlComponent {
  protected readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly locale = inject(LocaleService);
  private readonly injector = inject(Injector);

  /** The readiness line as a key with formatted values, or `null`. */
  protected readonly line = computed(() => {
    const line = meaningStatusLine(
      this.store.meaningSearchOn(),
      this.store.searchStatus(),
      this.store.resetsOn(),
    );
    if (line === null) {
      return null;
    }
    const date = line.date === undefined ? null : aiResetDate(line.date);
    return {
      key: line.key,
      params: {
        ready: this.locale.formatNumber(line.ready ?? 0),
        total: this.locale.formatNumber(line.total ?? 0),
        date: date === null ? '' : this.locale.formatDate(date),
      },
    };
  });

  protected async set(on: boolean, control: SwitchComponent): Promise<void> {
    if (on === this.store.settings().meaningSearch) {
      return;
    }
    if (!(await this.actions.save({ meaningSearch: on }))) {
      // Set after the next render: right away, the switch would still hold what it last drew.
      afterNextRender(() => control.checked.set(this.store.settings().meaningSearch), {
        injector: this.injector,
      });
    }
  }
}
