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
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { askAllowanceLine } from '../../utils/ask-allowance-line';

/**
 * The control of the "Ask your shelf" row in Settings › AI (AI-4): questions left today or this
 * month while it is on, and the switch. A change saves at once; a failed save puts it back.
 */
@Component({
  selector: 'app-ask-control',
  imports: [TranslocoPipe, SwitchComponent],
  templateUrl: './ask-control.component.html',
  styleUrl: './ask-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AskControlComponent {
  protected readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly injector = inject(Injector);

  protected readonly line = computed(() => {
    const allowance = this.store.askAllowance();
    return this.store.askOn() && allowance ? askAllowanceLine(allowance) : null;
  });

  protected async set(on: boolean, control: SwitchComponent): Promise<void> {
    if (on === this.store.settings().ask) {
      return;
    }
    if (!(await this.actions.save({ ask: on }))) {
      afterNextRender(() => control.checked.set(this.store.settings().ask), {
        injector: this.injector,
      });
    }
  }
}
