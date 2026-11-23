import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AskButtonComponent } from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';

/**
 * The "Ask" pill at the far right of the shell header that opens Ask your shelf (Shelf AskButton:
 * spark, short label, the four-colour hover glow). Its accessible name and
 * tooltip are the long "Ask your shelf"; nothing while Ask is off.
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
    @if (settings.askOn()) {
      <ui-ask-button
        [label]="'ai.ask.button' | transloco"
        [ariaLabel]="'ai.ask.open' | transloco"
        [tooltip]="'ai.ask.open' | transloco"
        ariaHaspopup="dialog"
        (activated)="panel.open()"
      />
    }
  `,
})
export class AskHeaderButtonComponent {
  protected readonly settings = inject(AiSettingsStore);
  protected readonly panel = inject(AskPanelService);
}
