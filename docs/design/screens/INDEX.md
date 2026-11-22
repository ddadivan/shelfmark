# Screens — Shelfmark 2027 Refresh

Every screen of the redesign, grouped the way the canvas is. Desktop first, then phone. Open the live canvas to click through interactive ones.

## 1 · Landing and sign in

- `Landing.dc.html` — Landing · desktop · redesigned (desktop)
- `LandingAi.dc.html` — Landing block «Optional AI» (#481): desktop (also placed in `Landing.dc.html`, after «Save once, find in seconds») and phone at 360px; ships with the first AI release
- `SignIn.dc.html` — Sign in · redesigned (desktop)
- `AuthEmail.dc.html` — Email sign in, sign up, reset (desktop)
- `Emails.dc.html` — Emails (desktop)
- `MobileLanding.dc.html` — Landing · phone (phone)
- `MobileSignIn.dc.html` — Sign in · phone (phone)
- `MobileAuth.dc.html` — Create account · phone (phone)
- `MobileAuthSignIn.dc.html` — Sign in with email · phone (phone)
- `MobileAuthInbox.dc.html` — Check your inbox · phone (phone)
- `MobileAuthReset.dc.html` — Reset password · phone (phone)

## 2 · Welcome and getting started

- `Welcome.dc.html` — Welcome dialog (desktop)
- `HowItWorks.dc.html` — How it works video, About (desktop)
- `Import.dc.html` — Import links (desktop)
- `SyncDemo.dc.html` — Tab sync, demo transfer (desktop)
- `MobileWelcome.dc.html` — Welcome · phone (phone)

## 3 · Library

- `Main.dc.html` — Home · desktop · redesigned (desktop)
- `RecentView.dc.html` — Recently opened · desktop (desktop)
- `FolderStyle.dc.html` — Folder colours, icons, pinning, subfolders first (desktop)
- `EmptyStates.dc.html` — Empty states (desktop)
- `LoadingStates.dc.html` — Loading states (desktop)
- `MobileHome.dc.html` — Home · phone · redesigned (phone)
- `MobileMenu.dc.html` — Library and folders · phone · redesigned (phone)
- `MobileRecent.dc.html` — Recently opened sheet · phone (phone)
- `RecentForgotten.dc.html` — Recently opened › Forgotten: the Opened · Forgotten switch, the Rediscover rows, "N forgotten" on the sidebar row (desktop, #512)
- `CardTags.dc.html` — Card footer tags: the first tag (ellipsis in its max width), “+N”, the folder chip right after; the glass “All tags” popover above “+N”; desktop and 360px phone, light and dark (hotfix 2.2.1)
- `MobileLibraryOrder.dc.html` — Library · phone: Pinned, Folders, then the tiles; "N forgotten" on the Recently opened tile (phone, #512)
- `MobileLoading.dc.html` — Loading · phone · redesigned (phone)
- `LinkPreview.dc.html` — Link preview split (#553, approved Nov 21, 2026; interactive): the sidebar folds into a 64px rail, the feed becomes a compact list with the open link highlighted, a resize grip, the preview panel with prev / next, title, favorite, edit, copy, wider, Open and close; site, video player and "doesn't open inside other apps" states. The Site / Reader switch and "Read the copy" wait for Reader (#539) and are not built yet (desktop from 80em)
- `LinkPreviewEntry.dc.html` — Where the preview starts (#553): the eye button next to More on a card and a list row, "Preview here" (Space) and "Open in new tab" (↵) first in the link menu; Settings › Library "Clicking a link" and "Sites that open in a new tab" (desktop)
- `MobileLinkPreview.dc.html` — Link preview below 80em (#553; interactive): a pushed page with Back, title and domain, open in browser and More; the site below; a floating glass bar with favorite and share (the Site / Reader switch waits for #539) (phone, also tablets)

## 4 · Add and edit links

- `AddLink.dc.html` — Add link · duplicate warning · redesigned (desktop)
- `AddLinkStates.dc.html` — Add link · loading and error (desktop)
- `PasteMany.dc.html` — Paste several links (desktop)
- `EditLink.dc.html` — Edit link (desktop)
- `DragDrop.dc.html` — Drag a link to a folder (desktop)
- `MobileAddLink.dc.html` — Add link · phone (phone)
- `ShareTarget.dc.html` — Share to Shelfmark · Android (phone)

## 5 · Search

- `Search.dc.html` — Search ⌘K · redesigned (desktop)
- `MobileSearch.dc.html` — Search · phone · new (phone)

## 6 · Organise: menus, folders, tags, bulk, Trash

- `Menus.dc.html` — Menus and folder dialogs (desktop)
- `DeleteFolder.dc.html` — Delete folder (desktop)
- `Tags.dc.html` — Tags: create, rename, delete (desktop)
- `Bulk.dc.html` — Select and bulk actions (desktop)
- `TrashView.dc.html` — Trash · desktop (desktop)
- `SideBySide.dc.html` — Side by side: two feeds, the folder picker in the right half, drag between halves, Move to the right folder (desktop, from 80em; `state`: picker, half menu, drag one, drag selection, bulk bar, moved)
- `MobileBulk.dc.html` — Select links · phone (phone)
- `MobileTrash.dc.html` — Trash · phone (phone)

## 7 · Reminders

- `Reminders.dc.html` — Reminders (desktop)
- `MobileReminders.dc.html` — Remind me · phone (phone)

## 8 · Sharing

- `Share.dc.html` — Share a folder (desktop)
- `PublicCollection.dc.html` — Public collection for guests (desktop)

## 9 · Settings

- `SetAccount.dc.html` — Settings › Account (desktop)
- `Themes.dc.html` — Settings › Appearance (desktop)
- `SetLibrary.dc.html` — Settings › Library (desktop)
- `SetNotifications.dc.html` — Settings › Notifications and reminders (desktop)
- `SetLanguage.dc.html` — Settings › Language (desktop)
- `SetShortcuts.dc.html` — Settings › Keyboard shortcuts (desktop)
- `SetImport.dc.html` — Settings › Import and export (desktop)
- `SetPrivacy.dc.html` — Settings › Privacy and data (desktop)
- `SetFeedback.dc.html` — Settings › Your feedback (desktop)
- `Languages.dc.html` — Language list and translation checks (desktop)
- `Trash.dc.html` — Keyboard shortcuts dialog (press ?) (desktop)
- `Privacy.dc.html` — Privacy policy page, with the AI section (#476) (desktop)
- `MobileSettings.dc.html` — You (settings) · phone (phone)

## 10 · Feedback: toasts, errors, rating

- `Toasts.dc.html` — Toasts (desktop)
- `Feedback.dc.html` — Toasts, offline, confirmations (desktop)
- `SendFeedback.dc.html` — Send feedback (desktop)
- `Rating.dc.html` — Rating dialogs (desktop)

## 11 · Browser extension

- `Extension.dc.html` — Browser extension popup (Chrome, #445): form and Save, saved, opening, folder picker, already saved, signed out, page that cannot be saved, errors; light and dark
- `ExtensionTabs.dc.html` — Browser extension popup, save open tabs (#569): the This page / All tabs switch, the tab list, Sort with AI per tab and the folder for all, saved and skipped tabs, the opening footer; light and dark
- `ExtensionInstall.dc.html` — Install the extension from the app (#455): library banner and Settings row; desktop Chromium only; light and dark
- `Landing.dc.html` also has the "Save the page you are on" block: a mention of the extension without a link (#455)

## 12 · AI (#476)

AI features F0–F8 (`docs/ai/FEATURES.md`, approved Nov 17, 2026; parent #388). Each board shows its states: off, suggesting / pending, limit reached, not available, empty. Rules: `BRAND.md` › AI; components `AiMark`, `Suggestion`, `AiSummary`, `StreamingAnswer`.

- `AiIntro.dc.html` — First-run AI intro when AI is turned on: what it does, what is sent, no training, the provider, link to Settings › AI; desktop dialog and phone sheet
- `AiSettings.dc.html` — Settings › AI: opt-in switch, Folder and Tags each Suggest / Automatic / Off (default Suggest), Summaries switch, what is sent (notes, summary language), this month's usage, process existing links, delete AI data; variants off, folder set to Automatic, limit reached, provider trouble, processing (desktop)
- `AiTags.dc.html` — Tag and folder suggestions in Add link and Edit link: ready, suggesting, accepted, old link, limit reached, not available, off; chip anatomy; **proposal** rule offer after repeated corrections; you chose the folder (AI never overrides); Automatic mode applied with «Moved by AI» and Undo; **Fill in with AI** (F1c): the button and its shortcut, after the click, with a folder you already chose (desktop)
- `AiSummary.dc.html` — Summaries on cards and rows, pending, kind-aware wording, Edit link written by AI and edited by you (desktop)
- `AiTidy.dc.html` — **Proposal** Tidy Unsorted: entry point, review with everything selected, applied toast with Undo, empty (desktop)
- `MobileAi.dc.html` — Phone at 360px: Add link sheet with suggestions, suggesting and limit states, feed with summaries, You › AI, Tidy Unsorted, the Folder mode sheet, Automatic mode toast with Undo; Fill in with AI in the Add link sheet, before and after (phone)

- `Privacy.dc.html` (section 9) — now has the «AI features (optional)» section: provider as processor, data sent, retention, counts only, turning it off

- `AiSearch.dc.html` — Search by meaning (F3) in ⌘K: word matches first, “Related by meaning” with “why it matched”, nothing matches the words, not ready, off; the Ask entry (desktop)
- `AskShelf.dc.html` — Ask your shelf (F4) side panel, redesign #507: header with spark tile and allowance, top-aligned empty state with starter cards, answer with avatar, citation chips and source cards, one-piece composer (desktop; other states follow the same frame)
- `AiAnnounce.dc.html` — One-time “Shelfmark can now help with AI” dialog (#507): animated spark tile, four feature cards, Turn on AI… opens the AI intro, Not now
- `AiCleanup.dc.html` — Clean-up (F5): report with per-item choice and one Undo, entry card, checking, applied, nothing to clean (desktop)
- `AiConnect.dc.html` — Connect your assistant (F6, MCP): server address, token shown once, connected clients, revoke, empty (desktop)
- `AiDiscover.dc.html` — Related on your shelf in Edit link (F7; since #572 a "Related · N" button with a popover in the link preview instead); “From your shelf” weekly block with and without AI (F8) (desktop)
- `MobileAiMore.dc.html` — Phone at 360px: the Ask tab replaces Tags while Ask is on; search with meaning results and the Ask row; Ask full screen (empty, answered) with Back; Library with the Tags section next to folders; AI off keeps the Tags tab (phone)
