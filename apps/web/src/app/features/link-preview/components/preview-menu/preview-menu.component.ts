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

/**
 * The ⋯ menu of the Link page (Shelf `01-library.html`): Open in browser, Edit, favorite, pin to
 * the top of the folder, pin to the sidebar, Move, Remind me, Copy link, the site rule, "Wider
 * preview" (desktop) and Delete. The trigger binds `[uiMenuTrigger]="more.menu()"`.
 */
@Component({
  selector: 'app-preview-menu',
  imports: [TranslocoPipe, MenuComponent, MenuItemComponent, MenuSeparatorComponent],
  templateUrl: './preview-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewMenuComponent {
  /** The desktop panel: offers "Wider preview" / "Show the list". */
  readonly wide = input(false, { transform: booleanAttribute });

  protected readonly preview = inject(LinkPreviewService);
  protected readonly actions = inject(LinkActionsService);
  readonly menu = viewChild.required(MenuComponent);

  protected readonly domain = computed(() => {
    const link = this.preview.link();
    return link ? linkHost(link.url) : '';
  });
}
