import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { NoticeKind } from './models/notice-kind.type';

/**
 * Inline message in a form or page (duplicate-link warning, preview errors). Always an icon
 * plus words: colour is never the only signal. The text is projected and may contain a link.
 * `warning` is a polite `role="status"`, `danger` an assertive `role="alert"`. The icon is
 * decorative; the default is `warning` / `error` by kind.
 * Encapsulation is off so projected links get the notice's link style (BEM-prefixed selectors).
 */
@Component({
  selector: 'ui-notice',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ui-notice',
    '[class.ui-notice--warning]': "kind() === 'warning'",
    '[class.ui-notice--danger]': "kind() === 'danger'",
    '[attr.role]': "kind() === 'danger' ? 'alert' : 'status'",
  },
  templateUrl: './notice.component.html',
  styleUrl: './notice.component.scss',
})
export class NoticeComponent {
  /** `warning` or `danger`. */
  readonly kind = input<NoticeKind>('warning');
  /** Icon override; defaults to `warning` for a warning and `error` for danger. */
  readonly icon = input<IconName>();

  protected readonly iconName = computed<IconName>(
    () => this.icon() ?? (this.kind() === 'danger' ? 'error' : 'warning'),
  );
}
