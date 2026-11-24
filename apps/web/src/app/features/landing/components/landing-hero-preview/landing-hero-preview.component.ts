import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '@shelfmark/ui';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';
import { LANDING_FOLDER_COLOUR } from '../../models/landing-folder-colour.const';
import type { LandingFolder } from '../../models/landing-folder.type';
import { LANDING_PREVIEW_CARDS } from '../../models/landing-preview-cards.const';
import { LANDING_PREVIEW_KIND } from '../../models/landing-preview-kind.const';
import type { LandingPreviewRow } from '../../models/landing-preview-row.interface';
import { LANDING_PREVIEW_ROWS } from '../../models/landing-preview-rows.const';
import { LANDING_PREVIEW_SCOPE } from '../../models/landing-preview-scope.const';
import type { LandingPreviewTab } from '../../models/landing-preview-tab.type';
import { LandingPreviewCycleService } from '../../services/landing-preview-cycle.service';
import { previewShows } from '../../utils/landing-preview';

/** The All links tabs with their counts. */
const TABS: readonly { tab: LandingPreviewTab; count: number }[] = [
  { tab: 'all', count: 17 },
  { tab: LANDING_PREVIEW_KIND.Video, count: 6 },
  { tab: LANDING_PREVIEW_KIND.Shop, count: 4 },
];

/**
 * The live app preview on the first screen (16-landing): the Shelf sidebar, the search field, the
 * title with the view switch, the All links tabs, a masonry feed of real cards with notes and the
 * "Saved to Watch later · Undo" toast. A picture of the app (`role="img"` with its name); the rows
 * and tabs still answer a click by picking that frame of the cycle (`LandingPreviewCycleService`).
 */
@Component({
  selector: 'app-landing-hero-preview',
  imports: [IconComponent, NgOptimizedImage, TranslocoPipe],
  hostDirectives: [LandingLoopGateDirective],
  providers: [LandingPreviewCycleService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-hero-preview.component.html',
  styleUrl: './landing-hero-preview.component.scss',
})
export class LandingHeroPreviewComponent {
  protected readonly cycle = inject(LandingPreviewCycleService);
  protected readonly TABS = TABS;
  protected readonly ALL = LANDING_PREVIEW_SCOPE.All;

  protected readonly libraryRows = LANDING_PREVIEW_ROWS.filter((row) => !row.folder);
  protected readonly folderRows = LANDING_PREVIEW_ROWS.filter((row) => row.folder).map((row) => ({
    row,
    colour: LANDING_FOLDER_COLOUR[row.scope as LandingFolder],
  }));

  /** Every card with whether the current frame shows it (hidden ones stay in the DOM). */
  protected readonly cards = computed(() =>
    LANDING_PREVIEW_CARDS.map((card, index) => ({
      card,
      index,
      shown: previewShows(card, this.cycle.state()),
    })),
  );

  protected readonly titleKey = computed(() => this.rowKey(this.cycle.state().scope));

  /** A library row is `landing.preview.rows.<scope>`, a folder row its folder name. */
  protected rowKey(scope: string): string {
    const folder = LANDING_PREVIEW_ROWS.some((row) => row.scope === scope && row.folder);
    return folder ? `landing.folders.${scope}` : `landing.preview.rows.${scope}`;
  }

  protected folderKey(folder: LandingFolder): string {
    return `landing.folders.${folder}`;
  }

  protected pickRow(row: LandingPreviewRow): void {
    this.cycle.pick(row.scope, 'all');
  }

  protected pickTab(tab: LandingPreviewTab): void {
    this.cycle.pick(LANDING_PREVIEW_SCOPE.All, tab);
  }
}
