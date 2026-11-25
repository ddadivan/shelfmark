import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parseHelpInline } from '../../utils/parse-help-inline';

/** A line of article text with its `**control names**` and `` `key caps` `` drawn as elements. */
@Component({
  selector: 'app-help-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-text.component.html',
  styleUrl: './help-text.component.scss',
})
export class HelpTextComponent {
  /** The translated text with its markers. */
  readonly text = input.required<string>();

  protected readonly segments = computed(() => parseHelpInline(this.text()));
}
