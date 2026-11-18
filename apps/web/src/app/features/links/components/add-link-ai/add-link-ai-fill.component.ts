import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_SIZE, ButtonComponent, ICON_SIZE } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { isMacPlatform } from '../../../search/utils/is-mac-platform';
import { AddLinkAiFillService } from '../../services/add-link-ai-fill.service';
import { AddLinkFormService } from '../../services/add-link-form.service';

/**
 * The "Fill in with AI" button of the link dialog (F1c, `AiTags` 12–14, `MobileAi` 9–10): under
 * Title while something AI proposes can be applied, with the key hint on desktop. After a press
 * the button leaves and focus goes to the Folder field; the live region says what happened.
 */
@Component({
  selector: 'app-add-link-ai-fill',
  imports: [ButtonComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-link-ai-fill.component.html',
  styleUrl: './add-link-ai-fill.component.scss',
})
export class AddLinkAiFillComponent {
  protected readonly fill = inject(AddLinkAiFillService);
  private readonly form = inject(AddLinkFormService).form;
  private readonly injector = inject(Injector);
  protected readonly phone = inject(ViewportService).phone;
  protected readonly mac = isMacPlatform();
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;

  protected apply(): void {
    if (this.fill.run()) {
      afterNextRender(() => this.form.folderId().focusBoundControl(), {
        injector: this.injector,
      });
    }
  }
}
