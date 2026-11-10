# What changed in the 2027 Refresh

Same brand: graphite, sage, Onest, the same icons and illustrations. The changes are in shape, surfaces, layout and a set of new screens.

## Tokens

| Token | First design | 2027 |
|---|---|---|
| `bg` light / dark | `#F7F7F6` / `#131315` | `#F4F4F1` / `#111113` |
| `surface` dark | `#1C1C1F` | `#1A1A1D` |
| `surface-hover`, `surface-pressed`, `border` | — | slightly warmer light values, deeper dark values (see tokens.json) |
| `border-control` light | `#8A8A8F` | `#85858A` |
| `text-muted` light | `#67676C` | `#636368` |
| `accent-bg` light / dark | `#E5EEE2` / `#22301F` | `#E3EEDF` / `#21301E` |
| `glass`, `glass-line` | — | new: frosted floating layers |
| `folder-<colour>`, `folder-<colour>-bg` | — | new: 8 pairs (graphite, sage, ocean, plum, clay, amber, rose, teal) |
| `radius-sm/md/lg` | 6 / 10 / 14 | 8 / 14 / 22, plus new `radius-xl` 28 |
| `shadow-card`, `shadow-float` | — | new: whisper ring on cards; float for glass and dialogs |
| `display` type | 32/38 | 40/44, −0.03em |

## Components

- **Changed look:** Button (pills; 40px, `--sm` 32, `--lg` 48), Input (44px, 14px corners), Card (no border, `shadow-card`, inset preview with 16px corners), Tree rows (36px, 12px corners), Menu/Listbox (glass), Dialog (28px corners, 28px padding), Sheet, Segmented control, Chip, Toast (rewritten).
- **New:** Switch, Checkbox, Badge, FolderIcon, TabBar, SavedView, Glass, Panel, DatePicker, DropZone, RatingScale, SettingsRow, HistoryRow, Sheet.

## Layout and navigation

- **Desktop sidebar** is an inset card and only navigates: All links, Unsorted, Favorites, Recently opened; Pinned; Folders (subfolders first, coloured icons); Trash pinned at the bottom under a divider. The collapsible «Recently opened» panel is gone: Recently opened and Trash are pages in the content area.
- **Top bar:** pill search with ⌘K, keyboard shortcuts button, theme, «Add link», avatar. Saved views above the feed; subfolders as tiles before links.
- **Phone:** floating glass tab bar (Library, Search, Add, Tags, You) replaces the hamburger menu. Library has tiles for All links, Unsorted, Favorites, Recently opened (opens a bottom sheet), then folders and Trash. Search is only search. You lists the settings sections.
- **Toasts:** centred at the bottom, above any bottom bar; typed lead (link preview, folder tile or icon), second line, Undo with a countdown.

## New screens (beyond stage 1)

Email sign-in, sign-up, confirm, reset, expired link (desktop and phone) · emails · reminders · folder sharing and public collection · Settings with a page per section (Account, Appearance with fixed Light/Dark + Custom, Library, Notifications and reminders, Language, Keyboard shortcuts, Import and export, Privacy and data, Your feedback) · send feedback · rating dialogs · drag to folder · bulk select · paste several links · folder colours, icons, pinning · Trash · Recently opened · import · tab sync and demo transfer · browser extension · How it works video.

The stages in PROJECT.md still decide what gets built when; these screens are the target look when each feature is built.
