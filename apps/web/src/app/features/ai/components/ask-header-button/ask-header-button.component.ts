import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, ICON_SIZE, TooltipDirective } from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskPanelService } from '../../services/ask-panel.service';

/** The spark button in the shell header that opens Ask your shelf; nothing while Ask is off. */
@Component({
  selector: 'app-ask-header-button',
  imports: [TranslocoPipe, ButtonComponent, TooltipDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (settings.askOn()) {
      <ui-button
        variant="ghost"
        iconOnly
        iconLeft="spark"
        ariaHaspopup="dialog"
        [iconSize]="ICON_SIZE.Lg"
        [ariaLabel]="'ai.ask.open' | transloco"
        [uiTooltip]="'ai.ask.open' | transloco"
        (click)="panel.open()"
      />
    }
  `,
})
export class AskHeaderButtonComponent {
  protected readonly settings = inject(AiSettingsStore);
  protected readonly panel = inject(AskPanelService);
  protected readonly ICON_SIZE = ICON_SIZE;
}
