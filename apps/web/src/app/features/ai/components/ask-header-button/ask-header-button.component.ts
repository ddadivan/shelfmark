import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, TooltipDirective } from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';

/**
 * The "Ask" pill in the shell header that opens Ask your shelf, after the search field: a tinted
 * `ai` button (spark, short label, `ai-line` edge) as high as the field. Its accessible name and
 * tooltip are the long "Ask your shelf"; nothing while Ask is off.
 */
@Component({
  selector: 'app-ask-header-button',
  imports: [TranslocoPipe, ButtonComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      --ui-button-ai-border: var(--ai-line);
    }
  `,
  template: `
    @if (settings.askOn()) {
      <ui-button
        variant="ai"
        iconLeft="spark"
        ariaHaspopup="dialog"
        [ariaLabel]="'ai.ask.open' | transloco"
        [uiTooltip]="'ai.ask.open' | transloco"
        (click)="panel.open()"
      >
        {{ 'ai.ask.button' | transloco }}
      </ui-button>
    }
  `,
})
export class AskHeaderButtonComponent {
  protected readonly settings = inject(AiSettingsStore);
  protected readonly panel = inject(AskPanelService);
}
