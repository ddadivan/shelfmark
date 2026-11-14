/** The one-row totals query of the admin stats: overview counts and feature adoption counts. */
export interface AdminStatsTotalsRow {
  realUsers: number;
  demoSandboxes: number;
  onboarded: number;
  active7d: number;
  active30d: number;
  weekBase: number;
  weekReturned: number;
  monthBase: number;
  monthReturned: number;
  folders: number;
  nestedFolders: number;
  tags: number;
  favorites: number;
  notes: number;
  sidebarPins: number;
  folderPins: number;
  savedViews: number;
  trash: number;
  publicCollections: number;
  ownColours: number;
  ownEmoji: number;
  openedRecently: number;
  historyPaused: number;
  previewsOff: number;
}
