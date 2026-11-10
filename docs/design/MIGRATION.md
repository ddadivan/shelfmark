# Migration to the 2027 Refresh

Plan for bringing what stage 1 already built up to the 2027 Refresh design (`README.md`, `CHANGES.md`). Only existing features are migrated. New screens are built when their feature is built, in the stage `docs/PROJECT.md` gives them.

## How we work

- Branch `design/2027-refresh` starts from `stage` (the stage 2 integration branch, 9.3). All redesign work lands there: one issue at a time, small commits, pushed after each step.
- Each issue ends with `npx nx affected -t lint test build`, plus screenshots of the affected screens in light and dark, desktop and phone, compared with `screens/`.
- When the branch is done: one PR `design/2027-refresh → stage` (squash, `Refs #…` for every issue). CI on PRs into `stage` comes first (item 0). After the merge the cards go to **To release**. A release PR `stage → main` at the end of stage 2 closes the issues. No deployment before that.
- Values come from `tokens.json`. `reference.css` is reference only. Mockups are markup and copy: the template syntax (`{{…}}`, `<sc-if>`, `<sc-for>`, `class Component`) is never copied. Metadata chained with `·` in a mockup is rendered as separate elements (BRAND.md).
- Light and Dark only. No Custom theme and no AI. Motion follows `components/Motion/README.md` with `prefers-reduced-motion`. WCAG 2.1 AA. UI text in English through Transloco keys.
- `docs/design-v1/` is the stage 1 design, for comparison only.

Size: S ≈ up to half a day, M ≈ 1 day, L ≈ 2–3 days.

## 0. Prerequisite: CI for `stage`

| What | Files | Risk | Size |
|---|---|---|---|
| Run CI on PRs into `stage` and on pushes to `stage` (and `nx affected` against the PR base). The `stage` ruleset, the merge commit for release PRs, the To release column and the board workflows are set up by the author (9.3) | `.github/workflows/ci.yml` | low | S |

The ADR and the agent instructions for the release flow are a separate task of stage 2 and not part of this plan.

## 1. Tokens

| What | Files | Risk | Size |
|---|---|---|---|
| New light and dark values (`bg`, `surface` dark, `surface-hover`, `surface-pressed`, `border`, `border-control`, `text-muted`, `accent-bg`). New `glass`, `glass-line`, 8 `folder-<colour>` / `folder-<colour>-bg` pairs, `shadow-card`, `shadow-float`. Radii 8 / 14 / 22 / 28 (`radius-xl` is new). `display` 40/44, −0.03em. All in `rem`, colours tested for contrast in both themes | `libs/ui/src/styles/tokens/_light.scss`, `_dark.scss`, `_scale.scss`, `_typography.scss`, `foundations/*.stories.ts`, `foundations/models/color-groups.const.ts`, token and contrast specs | medium: every screen changes at once, and visual e2e checks and stories may need updates | M |

## 2. Existing components in the new style

One issue per component. Spec: `components/<Name>/README.md`, look: `preview.html`.

| Component | What changes | `libs/ui` | Risk | Size |
|---|---|---|---|---|
| Button | Pills, 40px (`sm` 32, `lg` 48), press 0.97 with spring, width locked while `loading` | `button` | medium (used everywhere) | S |
| Input (+ Textarea, Select, TagInput fields) | 44px, `radius-md`, focus is a border plus a 3px halo instead of an offset outline, `shortcut` hint | `input`, `field`, `textarea`, `select`, `tag-input` | medium | M |
| Card (LinkCard) | No border, `shadow-card`, preview inset 6px with a 16px corner, `radius-lg`, hover shadow spreading out, "Open ↗" bar, dark-theme glow | `card`, `media`, `pointer-shadow`; `apps/web/.../links/link-card` | medium | M |
| LinkRow | New row look, `radius-md` | `list-item`; `.../links/link-row` | low | S |
| Tree | 36px rows, 12px corners, 16px indent, `accent-bg` active | `tree` | medium (keyboard behaviour must stay) | S |
| Menu (+ listbox in Select) | Glass surface (`Glass`), scale from the trigger | `menu`, `select`, `overlay`, `_overlay.scss` | medium | S |
| Dialog | 28px corners, 28px padding, `shadow-float`; on phones a bottom sheet | `dialog`, `_dialog.scss` | medium | S |
| Toast | Rewritten: glass, typed lead (link thumb, folder tile, tinted icon), second line, Undo with countdown, stack of 3, ⌘Z, pause on hover/focus/touch, `role=status` / `alert` | `toast`; call sites in `apps/web` | high: API change across features | L |
| SegmentedControl | Sliding thumb (`sm-seg--slide`), radiogroup semantics kept; cards ↔ list View Transition morph | `segmented-control`; `library` page | medium | M |
| Chip | New tag / neutral looks, "+2" overflow on cards | `chip` | low | S |

Also restyled through tokens only, no separate issue unless screenshots show a gap: Avatar, Breadcrumbs, Checkbox (see 3), EmptyState, Notice, RadioGroup, Skeleton, Steps, Tooltip, Spinner, ProgressBar.

## 3. New base components needed by stage 1 screens

| Component | Why stage 1 needs it | `libs/ui` | Risk | Size |
|---|---|---|---|---|
| Glass | Shared surface mixin for menus, toasts, tab bar, sign-in card | new `_glass.scss` mixin + `sm-glass` utility | low | S |
| Panel | Settings groups, Recently opened list card | new `panel` | low | S |
| Switch | Settings toggles (today checkboxes or buttons) | new `switch` (Angular Aria `role=switch`) | low | S |
| Checkbox | New 22px look; selection mode comes with bulk actions (stage 2) | `checkbox` (exists, restyle) | low | S |
| SettingsRow | Settings page rows; move the app's `settings-row` / `settings-section` into `libs/ui` | new `settings-row`; remove the feature copies | low | S |
| FolderIcon | Folder tiles in the sidebar, subfolder tiles, toasts. All eight colours in the component; the app uses graphite until folder colours are built | new `folder-icon` | low | S |
| Sheet | Phone: Recently opened sheet, dialogs as sheets | `drawer` → `sheet` (CDK Dialog, bottom position, swipe to close) | medium | M |
| TabBar | Phone navigation instead of the hamburger | new `tab-bar` | medium | M |
| HistoryRow | Recently opened page and sheet, grouped by day | new `history-group` + app `link-history-row` | low | M |

## 4. Layout (shell)

| What | Files | Risk | Size |
|---|---|---|---|
| **Desktop sidebar** as an inset card that only navigates: All links, Unsorted, Favorites, Recently opened; Folders (subfolders first, FolderIcon tiles, "New folder" button in the section header). Recently opened becomes its own page `/recent` (a list of HistoryRows grouped by day) and replaces the collapsible right panel. Pinned and Trash come with their features (see Decisions) | `shell/sidebar`, `shell/app-shell.*`, `features/links/recent` → page, `app.routes.ts`, `UiStore` (drop the panel visibility flag), e2e for the recent panel | high: changes story 18 and 5.1 / 7.2 in PROJECT.md, needs a doc update and e2e rewrites | L |
| **Top bar:** pill search with ⌘K (opens the existing search dialog), keyboard shortcuts button, theme, "Add link" (the one primary), avatar | `shell/app-shell.*`, `features/search` | medium | M |
| **Phone:** floating glass TabBar (Library, Search, Add, Tags, You) replaces the hamburger. Library: tiles for All links, Unsorted, Favorites, Recently opened (opens a Sheet), then folders. Search tab = the existing full-screen search. Tags tab = tag list page. You = settings list | `shell/mobile-nav` (removed), new phone library page, tags page, `settings` page, routes, phone e2e | high: phone navigation e2e rewritten | L |
| Toast placement: bottom centre, 24px up, above the tab bar with a 12px gap | `toast`, shell | low | S (with Toast) |

## 5. Stage 1 screens to match the mockups

| Screen | Mockups | Main changes | Risk | Size |
|---|---|---|---|---|
| Library (feed) | `Main`, `MobileHome`, `FolderStyle` (subfolder tiles only), `EmptyStates`, `LoadingStates`, `MobileLoading` | Header with breadcrumbs and title, subfolders as tiles before links, sort and view controls, empty and loading states | medium | M |
| Recently opened page | `RecentView`, `MobileRecent` | Day groups with HistoryRow; "Remove from history" and "Clear history" with two new API endpoints | medium | M |
| Add link | `AddLink`, `AddLinkStates`, `MobileAddLink` | New dialog / sheet, duplicate notice, loading and error states; signature "landed" animation kept | medium | M |
| Edit link | `EditLink` | New form layout | low | S |
| Search ⌘K | `Search`, `MobileSearch` | New overlay look; phone search as the Search tab | medium | M |
| Menus and folder dialogs | `Menus`, `DeleteFolder` | Card / row / folder / account menus, new folder, rename, move, delete folder | low | M |
| Tags | `Tags` | Tags section in the sidebar with "+", tag menu, rename in place, delete dialog; tags page for the phone Tags tab | medium | M |
| Settings | `MobileSettings`; desktop sections only for what exists (Appearance with Light / Dark / System, export, privacy and data, delete account, show onboarding again) | Settings built from Panel and SettingsRow; desktop has a page per section with a settings nav | medium | M |
| Welcome (onboarding) | `Welcome`, `MobileWelcome` | New dialog look | low | S |
| Toasts, offline, confirmations | `Toasts`, `Feedback` | All existing toasts moved to the new kinds; confirmation dialogs | medium | M |
| Rating dialog | `Rating` | New look of the existing story 24 dialog | low | S |
| Sign in | `SignIn`, `MobileSignIn` | Glass card, drifting cards on desktop, mosaic on phone (Google and GitHub only; the email form is stage 2) | medium | M |
| Landing | `Landing`, `MobileLanding` | New look; keep the Lighthouse budget (#195) and the deliberate deviations (looping scenes, bigger on wide screens) | high: performance budget | L |
| Share target (Android) | `ShareTarget` | New quick form look | low | S |
| Privacy page | `Privacy` | New look | low | S |
| Keyboard shortcuts dialog | `Trash.dc.html` (it holds the "?" dialog) | New look of the shortcuts help, opened from the top bar | low | S |

## 6. New screens: not now

| Screen(s) | Feature | Stage |
|---|---|---|
| `AuthEmail`, `Emails`, `MobileAuth`, `MobileAuthSignIn`, `MobileAuthInbox`, `MobileAuthReset` | Email and password sign-in | 2 |
| `Reminders`, `MobileReminders`, `SetNotifications` | Reminders | 2 |
| `Share`, `PublicCollection` | Sharing collections | 2 |
| `Themes` (Custom part) | Custom themes | 2 |
| `SendFeedback`, `SetFeedback` | Feedback form | 2 |
| `DragDrop` | Drag & drop into folders | 2 |
| `Bulk`, `MobileBulk` | Selection and bulk actions | 2 |
| `SyncDemo` (tab sync part) | Sync between tabs | 2 |
| `SyncDemo` (demo transfer part) | Carrying demo data into a real account | 3 |
| `Languages`, `SetLanguage` | Interface languages (the long-string samples in the mockups are French; which languages ship is still open) | 2 |
| `HowItWorks` | Promo video and About for signed-in users | 2 |
| `Extension` | Browser extension | 3 |
| `Import`, `SetImport` (import part) | Import (Telegram import is in the backlog) | backlog |
| `TrashView`, `MobileTrash` (and Badge) | Trash | 2, right after the migration |
| `FolderStyle` (colours, icons, pinning) | Folder colours, icons, pinned folders | 2, right after the migration |
| `Main` (saved-view chips, SavedView) | Saved views | 2, right after the migration |
| `PasteMany` | Paste several links | 2, right after the migration |
| `SetAccount`, `SetLibrary`, `SetShortcuts`, `SetPrivacy` | Settings pages beyond what exists | partly stage 1 (see 5), the rest with their features |

## Decisions (author, Nov 10, 2026)

- Everything follows the design: the new layout and screens replace the old ones wherever they differ.
- Trash, pinned folders, folder colours and icons, saved views and "Paste several links" are new features. They are added to stage 2 in `PROJECT.md` and built right after this migration, on the new design. Until then the sidebar has no Trash row or Pinned section, folder tiles are graphite and there are no saved-view chips.
- Settings on desktop: a page per section with a settings nav, as in the mockups, for the sections that exist today.
- Tags on desktop stay in the sidebar under a Tags section with "+" (screen `Tags`); the phone gets the Tags tab.
- Recently opened page: "Remove from history" and "Clear history" are built now, with two API endpoints.
- Story 18 becomes a Recently opened page and a phone sheet; `PROJECT.md` (story 18, 5.1 `UiStore`, 7.2, 7.3) is updated in the layout issue.
- From the design archive only `docs/design` (design system and screens) is taken; its `PROJECT.md` is not.
