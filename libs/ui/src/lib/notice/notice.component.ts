import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import type { NoticeKind } from './models/notice-kind.type';
import { NOTICE_KIND } from './models/notice-kind.const';
import { NOTICE_KIND_ICON } from './models/notice-kind-icon.const';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * Inline message in a form or page (duplicate-link warning, preview errors). Always an icon
 * plus words: colour is never the only signal. The text is projected and may contain a link.
 * `warning` is a polite `role="status"`, `danger` an assertive `role="alert"`. The icon is
 * decorative; the default is `warning` / `error` / `info` by kind. `info` is a polite status in the
 * accent tint. `banner` turns it into a full-width, centred strip (no radius, wraps on a phone)
 * for page-level messages such as the demo banner; the icon is then hidden unless `icon` is set.
 * An optional trailing action (a small button or link) is projected with `uiNoticeAction`.
 * Encapsulation is off so projected links get the notice's link style (BEM-prefixed selectors).
 */
@Component({
  selector: 'ui-notice',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ui-notice',
    '[class.ui-notice--warning]': 'kind() === NOTICE_KIND.Warning',
    '[class.ui-notice--danger]': 'kind() === NOTICE_KIND.Danger',
    '[class.ui-notice--info]': 'kind() === NOTICE_KIND.Info',
    '[class.ui-notice--banner]': 'banner()',
    '[attr.role]': "kind() === NOTICE_KIND.Danger ? 'alert' : 'status'",
  },
  templateUrl: './notice.component.html',
  styleUrl: './notice.component.scss',
})
export class NoticeComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  /** `warning`, `danger` or `info`. */
  readonly kind = input<NoticeKind>(NOTICE_KIND.Warning);
  /** Icon override; defaults to `warning` for a warning and `error` for danger. */
  readonly icon = input<IconName>();

  /** Full-width, centred strip without radius; hides the default icon. */
  readonly banner = input(false, { transform: booleanAttribute });

  protected readonly showIcon = computed(() => !this.banner() || this.icon() !== undefined);

  protected readonly iconName = computed<IconName>(
    () => this.icon() ?? NOTICE_KIND_ICON[this.kind()],
  );
}
