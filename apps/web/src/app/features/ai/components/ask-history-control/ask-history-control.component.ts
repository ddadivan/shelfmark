import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, SwitchComponent } from '@shelfmark/ui';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskHistoryActions } from '../../services/ask-history-actions.service';

/**
 * The control of the "Keep Ask history" row in Settings › AI (ADR 0055 amendment): the switch (on
 * by default; off stores nothing new) and "Clear Ask history" (asks first; what was stored stays
 * until cleared, also while the switch is off). A failed save puts the switch back.
 */
@Component({
  selector: 'app-ask-history-control',
  imports: [TranslocoPipe, ButtonComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-3);
      align-items: center;
      justify-content: flex-end;
    }
  `,
  template: `
    <ui-button variant="ghost" size="sm" (click)="clear()">
      {{ 'ai.settings.askHistory.clear' | transloco }}
    </ui-button>
    <ui-switch
      #control
      [label]="'ai.settings.askHistory.title' | transloco"
      [checked]="store.settings().askHistory"
      (checkedChange)="set($event, control)"
    />
  `,
})
export class AskHistoryControlComponent {
  protected readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly history = inject(AskHistoryActions);
  private readonly injector = inject(Injector);

  protected async set(on: boolean, control: SwitchComponent): Promise<void> {
    if (on === this.store.settings().askHistory) {
      return;
    }
    if (!(await this.actions.save({ askHistory: on }))) {
      afterNextRender(() => control.checked.set(this.store.settings().askHistory), {
        injector: this.injector,
      });
    }
  }

  protected async clear(): Promise<void> {
    await this.history.clear(
      'ai.settings.askHistory.clearTitle',
      'ai.settings.askHistory.clearMessage',
    );
  }
}
