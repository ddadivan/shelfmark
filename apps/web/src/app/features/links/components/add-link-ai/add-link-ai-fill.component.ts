import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BUTTON_SIZE, ButtonComponent, ICON_SIZE, TooltipDirective } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { isMacPlatform } from '../../../search/utils/is-mac-platform';
import { AddLinkAiFillService } from '../../services/add-link-ai-fill.service';
import { AddLinkFormService } from '../../services/add-link-form.service';

/**
 * The "Fill in with AI" button of the link dialog (F1c, `AiTags` 12–14, `MobileAi` 9–10): a footer
 * action left of the primary button (desktop, with the keys in its tooltip) or full width directly
 * above it (phone sheet), shown while something AI proposes can be applied. After a press the
 * button leaves and focus goes to the Folder field; the live region says what happened.
 */
@Component({
  selector: 'app-add-link-ai-fill',
  imports: [ButtonComponent, TooltipDirective, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-link-ai-fill.component.html',
  styleUrl: './add-link-ai-fill.component.scss',
})
export class AddLinkAiFillComponent {
  protected readonly fill = inject(AddLinkAiFillService);
  private readonly form = inject(AddLinkFormService).form;
  private readonly injector = inject(Injector);
  private readonly transloco = inject(TranslocoService);
  protected readonly phone = inject(ViewportService).phone;
  private readonly mac = isMacPlatform();
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;

  /** The keys in the tooltip: ⌥⇧F on Apple devices, Alt+Shift+F elsewhere. */
  protected readonly shortcut = computed(() => {
    activeLang();
    const key = (name: string): string => this.transloco.translate(`ai.fill.keys.${name}`);
    return this.mac ? `${key('option')}${key('shiftMac')}F` : `${key('alt')}+${key('shift')}+F`;
  });

  protected apply(): void {
    if (this.fill.run()) {
      afterNextRender(() => this.form.folderId().focusBoundControl(), {
        injector: this.injector,
      });
    }
  }
}
