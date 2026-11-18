import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BUTTON_SIZE, ButtonComponent, TooltipDirective } from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { isMacPlatform } from '../../../search/utils/is-mac-platform';
import { AddLinkAiFillService } from '../../services/add-link-ai-fill.service';
import { AddLinkFormService } from '../../services/add-link-form.service';

/**
 * The "Fill in with AI" button of the link dialog (F1c, `AiTags` 12–14, `MobileAi` 9–10, #507): the
 * tinted `ai` button at the start of the footer (desktop, with the keys in its tooltip) or full
 * width directly above the primary button (phone sheet), shown while AI is on. Without an address
 * (Add link) it is `aria-disabled` with "Paste a link first"; while the draft is awaited it shows
 * the busy look ("Filling…", pulsing spark and a light sweep). After a fill focus goes to the Folder
 * field; the live region says what happened.
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
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly hintId = 'add-link-ai-fill-hint';

  /** The keys in the tooltip: ⌥⇧F on Apple devices, Alt+Shift+F elsewhere. */
  protected readonly shortcut = computed(() => {
    activeLang();
    const key = (name: string): string => this.transloco.translate(`ai.fill.keys.${name}`);
    return this.mac ? `${key('option')}${key('shiftMac')}F` : `${key('alt')}+${key('shift')}+F`;
  });

  /** "Paste a link first" while there is no address, else the label (hidden on the phone). */
  protected readonly tooltip = computed(() => {
    activeLang();
    if (this.phone()) {
      return '';
    }
    return this.transloco.translate(this.fill.needsLink() ? 'ai.fill.needLink' : 'ai.fill.button');
  });

  protected apply(): void {
    // Busy: the fields wait for the draft and the fill follows on its own.
    if (this.fill.run() && !this.fill.busy()) {
      afterNextRender(() => this.form.folderId().focusBoundControl(), {
        injector: this.injector,
      });
    }
  }
}
