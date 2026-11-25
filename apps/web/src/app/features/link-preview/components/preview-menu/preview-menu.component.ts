import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MenuComponent, MenuItemComponent, MenuSeparatorComponent } from '@shelfmark/ui';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { linkHost } from '../../../links/utils/link-view';
import { LinkPreviewService } from '../../services/link-preview.service';
import { PreviewReaderService } from '../../services/preview-reader.service';

/**
 * The ⋯ menu of the Link page (Shelf `01-library.html`): Open in browser, Edit, favorite, pin to
 * the top of the folder, pin to the sidebar, Move, Remind me, Copy link, the site rule, Details (the phone head) and Delete. The trigger binds `[uiMenuTrigger]="more.menu()"`.
 */
@Component({
  selector: 'app-preview-menu',
  imports: [TranslocoPipe, MenuComponent, MenuItemComponent, MenuSeparatorComponent],
  templateUrl: './preview-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewMenuComponent {
  /** The phone head: offers the Details toggle (its button moved into this menu). */
  readonly details = input(false, { transform: booleanAttribute });

  protected readonly preview = inject(LinkPreviewService);
  protected readonly actions = inject(LinkActionsService);
  protected readonly reader = inject(PreviewReaderService);
  readonly menu = viewChild.required(MenuComponent);

  protected readonly domain = computed(() => {
    const link = this.preview.link();
    return link ? linkHost(link.url) : '';
  });
}
