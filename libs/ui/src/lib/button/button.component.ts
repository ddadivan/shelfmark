import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  isDevMode,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { ButtonSize } from './models/button-size.type';
import type { ButtonType } from './models/button-type.type';
import type { ButtonVariant } from './models/button-variant.type';

/**
 * Triggers an action. Wraps a native `<button>`, so keyboard, focus and form behaviour are
 * the browser's. Content is the label text. `iconOnly` shows just an icon and requires
 * `ariaLabel`; in dev mode a missing one throws.
 */
@Component({
  selector: 'ui-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly iconLeft = input<IconName>();
  readonly iconRight = input<IconName>();
  /** Shows only an icon (`iconLeft`, else `iconRight`). Requires `ariaLabel`. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  /** Accessible name; required for icon-only buttons. */
  readonly ariaLabel = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly iconSize = computed(() => (this.size() === 'lg' ? 20 : 16));
  protected readonly singleIcon = computed(() => this.iconLeft() ?? this.iconRight());

  constructor() {
    // Developer-error guard, dev mode only: production never throws over a missing label.
    if (isDevMode()) {
      effect(() => {
        if (this.iconOnly() && !this.ariaLabel()) {
          throw new Error('ui-button: iconOnly requires an ariaLabel.');
        }
      });
    }
  }
}
