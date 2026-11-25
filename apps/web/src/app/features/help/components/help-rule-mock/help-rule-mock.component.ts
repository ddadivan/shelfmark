import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, IconComponent } from '@shelfmark/ui';

/**
 * The picture in the Rules article (Shelf 17-help `.shot`): a small copy of the "New rule" form,
 * drawn with the app's own controls. It is decorative and inert, so it is hidden from assistive
 * technology and takes no focus; the steps above it say the same in words.
 */
@Component({
  selector: 'app-help-rule-mock',
  imports: [ButtonComponent, IconComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-rule-mock.component.html',
  styleUrl: './help-rule-mock.component.scss',
})
export class HelpRuleMockComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
}
