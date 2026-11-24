import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AskButtonComponent } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { SETTINGS_PATH } from '../../../settings/models/settings-path.const';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';

/**
 * The "Ask" pill at the far right of the shell header (Shelf AskButton: spark, short label, the
 * four-colour hover glow). It is always there, as in the design (author decision, Nov 24, 2026):
 * with Ask on it opens Ask your shelf; with AI off it turns AI on (through the intro the first
 * time) and then opens Ask; with AI on but Ask switched off it opens Settings › AI.
 */
@Component({
  selector: 'app-ask-header-button',
  imports: [TranslocoPipe, AskButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
  `,
  template: `
    <ui-ask-button
      [label]="'ai.ask.button' | transloco"
      [tooltip]="'ai.ask.open' | transloco"
      ariaHaspopup="dialog"
      (activated)="ask()"
    />
  `,
})
export class AskHeaderButtonComponent {
  private readonly settings = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly panel = inject(AskPanelService);
  private readonly router = inject(Router);

  protected async ask(): Promise<void> {
    if (this.settings.askOn()) {
      this.panel.open();
      return;
    }
    if (!this.settings.isOn()) {
      if ((await this.actions.setEnabled(true)) && this.settings.askOn()) {
        this.panel.open();
      }
      return;
    }
    await this.router.navigate(['/', APP_PATH.Settings, SETTINGS_PATH.Ai]);
  }
}
