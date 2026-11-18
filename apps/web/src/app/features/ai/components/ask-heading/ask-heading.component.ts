import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ICON_SIZE, IconComponent } from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { askAllowanceLine } from '../../utils/ask-allowance-line';

/**
 * The Ask title block (drawer and full-screen page): the spark on an `ai-fill` tile, the title
 * and the allowance line under it. The title is the `h1` of the full-screen page, the `h2` of
 * the panel.
 */
@Component({
  selector: 'app-ask-heading',
  imports: [TranslocoPipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-heading.component.html',
  styleUrl: './ask-heading.component.scss',
})
export class AskHeadingComponent {
  readonly onPage = input(false, { transform: booleanAttribute });

  private readonly settings = inject(AiSettingsStore);
  protected readonly ICON_SIZE = ICON_SIZE;

  protected readonly left = computed(() => {
    const allowance = this.settings.askAllowance();
    return allowance ? askAllowanceLine(allowance) : null;
  });
}
