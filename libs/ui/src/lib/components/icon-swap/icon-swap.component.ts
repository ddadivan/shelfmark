import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  input,
  signal,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { IconSize } from '../icon/models/icon-size.type';

/**
 * An icon that changes with the state of its control (copy link to check, sun to moon): the old
 * icon scales to 0.5, blurs and fades while the new one grows out of the blur (Motion, icon swap).
 * Takes the same inputs as `ui-icon` and sizes itself like it. The first icon is shown at once, only
 * a later change is animated. Reduced motion: a plain cross-fade.
 */
@Component({
  selector: 'ui-icon-swap',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-icon-swap' },
  templateUrl: './icon-swap.component.html',
  styleUrl: './icon-swap.component.scss',
})
export class IconSwapComponent {
  /** Icon name, as for `ui-icon`. */
  readonly name = input.required<IconName>();
  /** Size in design pixels, as for `ui-icon`. */
  readonly size = input<IconSize>(24);
  /** Accessible name. Omit for decorative icons next to a visible label. */
  readonly label = input<string>();

  /** One entry: `@for` tracks the name, so a new name is a new element and the old one leaves. */
  protected readonly icons = computed(() => [this.name()]);
  /** Empty until the first render is done, so the initial icon does not animate in. */
  protected readonly enterClass = signal('');

  constructor() {
    afterNextRender(() => this.enterClass.set('ui-icon-swap__icon--enter'));
  }
}
