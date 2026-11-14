import type { Provider } from '@angular/core';
import { LibraryBulkService } from './library-bulk.service';
import { LibraryDragService } from './library-drag.service';
import { LibraryFeedService } from './library-feed.service';
import { LibraryFilterService } from './library-filter.service';
import { LibraryHeadService } from './library-head.service';
import { LibrarySelectionService } from './library-selection.service';
import { SplitFeedStore } from './split-feed.store';
import { SplitViewService } from './split-view.service';

/**
 * The page-scoped services of one library page (#338). They are `autoProvided: false`, so each
 * page instance gets its own copy and injecting one outside a page fails loudly.
 */
export function provideLibraryPage(): Provider[] {
  return [
    LibraryFilterService,
    LibraryFeedService,
    LibraryHeadService,
    LibrarySelectionService,
    LibraryBulkService,
    LibraryDragService,
    SplitViewService,
    SplitFeedStore,
  ];
}
