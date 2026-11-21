import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FOLDER_ICON_SIZE,
  FolderIconComponent,
  IconComponent,
  LOGO_VARIANT,
  LogoComponent,
  ButtonComponent,
  TooltipDirective,
} from '@shelfmark/ui';
import { filter, map } from 'rxjs';
import { APP_PATH } from '../../../../models/app-path.const';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { RAIL_ENTRIES } from '../../models/rail-entries.const';
import { LinkPreviewRoute } from '../../services/link-preview-route.service';

/**
 * The sidebar folded into a 64px icon rail while the desktop link preview is open (#553,
 * `LinkPreview.dc.html`): the logo, All links, Unsorted, Favorites, Recently opened, the top-level
 * folders and "Show sidebar" at the bottom. A rail link leaves the preview (its URL has no
 * `?preview=`); the full sidebar comes back when the preview closes.
 */
@Component({
  selector: 'app-preview-rail',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonComponent,
    FolderIconComponent,
    IconComponent,
    LogoComponent,
    TooltipDirective,
  ],
  templateUrl: './preview-rail.component.html',
  styleUrl: './preview-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewRailComponent {
  private readonly router = inject(Router);
  protected readonly route = inject(LinkPreviewRoute);
  protected readonly settings = inject(UserSettingsStore);
  private readonly folders = inject(FoldersStore);
  protected readonly ENTRIES = RAIL_ENTRIES;
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;
  protected readonly LOGO_VARIANT = LOGO_VARIANT;
  protected readonly HOME = `/${APP_PATH.Links}`;
  protected readonly roots = computed(() => this.folders.tree().map((node) => node.folder));
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.split(/[?#]/)[0] ?? ''),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] ?? '' },
  );

  protected folderPath(id: string): string {
    return `/${APP_PATH.Folders}/${id}`;
  }

  protected isCurrent(path: string): boolean {
    return this.path() === path;
  }
}
