import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import type { SaveStatusState } from './models/save-status-state.type';
import { SAVE_STATUS_STATE } from './models/save-status-state.const';

/**
 * Autosave status, for example in the edit dialog: icon plus words, never colour alone.
 * `saving` shows a small spinner, `saved` a check in sage, `error` a warning in the danger
 * colour. The three texts come from the feature; the one for the current `state` is shown in a
 * polite live region. The icons share one 16px slot, so the text never shifts when the state
 * changes; the old icon leaves in 120 ms while the new one fades and scales in.
 */
@Component({
  selector: 'ui-save-status',
  imports: [IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './save-status.component.html',
  styleUrl: './save-status.component.scss',
})
export class SaveStatusComponent {
  protected readonly SAVE_STATUS_STATE = SAVE_STATUS_STATE;

  readonly state = input.required<SaveStatusState>();
  /** Text for `saving`, for example "Saving…". */
  readonly savingText = input('');
  /** Text for `saved`, for example "Saved". */
  readonly savedText = input('');
  /** Text for `error`, for example "Could not save". */
  readonly errorText = input('');

  protected readonly text = computed(() => {
    switch (this.state()) {
      case SAVE_STATUS_STATE.Saving:
        return this.savingText();
      case SAVE_STATUS_STATE.Saved:
        return this.savedText();
      case SAVE_STATUS_STATE.Error:
        return this.errorText();
    }
  });
}
