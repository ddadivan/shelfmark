# Chrome Web Store listing: Shelfmark extension

Texts to paste into the Chrome Web Store developer dashboard (#445), as submitted with version 1.1.2 (Nov 19, 2026), updated for 1.3.0 (right-click save, not uploaded yet). The author publishes; agents never do. English is the default listing language; the dashboard can add translated listings later (the extension itself already ships seven languages through `_locales`).

## Store listing tab

**Name** (from the manifest): Shelfmark

**Summary** (from the manifest `extDescription`, at most 132 characters):

> Save the page you are on to your Shelfmark library in one click, with a folder and tags.

**Description:**

> Shelfmark keeps every link you save in one calm place: nested folders, tags, favorites and fast search. This extension is the quickest way in.
>
> Click the Shelfmark button, or press Alt+Shift+S, on any page:
>
> - The page's title and address are already filled in.
> - The folder comes from your domain rules, or pick one of your recent folders, or any folder.
> - Add tags and a short note if you like, then press Save (or just Enter).
> - With AI on in your account, press Fill in with AI: the title, folder and tags are filled in for you, and you can change anything.
> - Already saved it? Shelfmark tells you when, and where, instead of making a copy.
> - Many tabs open? Switch to All tabs, tick the ones you want and save them in one go; with AI on, Sort with AI gives each its own folder and tags. Close the saved tabs afterwards if you like.
> - Right-click a link and choose Save link to Shelfmark, or right-click the page and choose Save page to Shelfmark: it is saved at once to the folder your rules pick, and the Shelfmark button shows a check mark (hover it to see the folder).
>
> The extension reads a tab only when you click its button, press its shortcut or choose one of its two right-click items, never in the background. From the right-click menu it sends the address of that link or page (and the page's title) to your Shelfmark library, checks whether you saved it already and, if not, saves it. It then sends the address of that one tab to your Shelfmark library to check whether you saved it already; the page is saved only when you press Save. If you switch to All tabs, the browser asks once for the optional tabs permission; switching to it checks the addresses of your open tabs (without any #fragment) against your library, to mark the ones you already saved; nothing is saved until you press Save, and only the tabs you tick are saved or sent for AI suggestions. If you click Fill in with AI and AI is on in your account, that address and title (and your note, if AI may read notes) are also sent to Shelfmark for AI suggestions. It can talk to Shelfmark only.
>
> You need a Shelfmark account (free, sign in with Google or GitHub) at https://shelfmark-app.vercel.app. Sign in once in the browser and the extension uses that sign-in.
>
> Works in Chrome, Edge, Brave and Arc. Available in English, French, German, Italian, Spanish, Portuguese and Ukrainian.

**Category:** Productivity → Tools (or "Workflow & Planning", whichever the dashboard offers)

**Language:** English

**Graphic assets** (all in this folder):

| Asset | File | Size |
| --- | --- | --- |
| Store icon | `apps/extension/public/icons/icon-128.png` | 128 x 128 (96 px artwork, 16 px padding) |
| Screenshots (up to 5) | `screenshot-1-save-in-one-click.png`, `screenshot-2-saved.png`, `screenshot-3-already-saved.png`, `screenshot-4-sign-in.png` | 1280 x 800 |
| Small promo tile | `promo-tile-440x280.png` | 440 x 280 |

**Official URL / homepage:** https://shelfmark-app.vercel.app

**Support URL:** https://github.com/ddadivan/shelfmark/issues (or the in-app feedback form)

## Privacy practices tab

**Single purpose:**

> Save the page in the current tab (or a link on it, from the right-click menu), with its title, a folder, tags and a note the user picks, to the user's own Shelfmark library.

**Permission justifications:**

| Permission | Justification to paste |
| --- | --- |
| `activeTab` | The popup calls `chrome.tabs.query({ active: true, currentWindow: true })` to read the address and title of the tab the user is on, only at the moment they click the extension button or press its shortcut, so that page can be saved. Without `activeTab` the tab comes back without its URL and title. No access to other tabs, history or page content through this permission; no content scripts. |
| `tabs` (optional, requested at run time) | Only when the user switches the popup to All tabs, Chrome asks for it once. The popup then calls `chrome.tabs.query({ currentWindow: true })` to list the addresses and titles of the open tabs of that window, so the user can tick the ones to save, and `chrome.tabs.remove` to close exactly the tabs that were saved when the user presses Close saved tabs. On the switch, the addresses of the listed tabs (without the #fragment) go to the user's own library for a duplicate check, the same check the popup makes for one page; titles stay in the browser, and only the ticked tabs are saved or sent for AI, on Save or Sort with AI. It is declined without any loss: the popup keeps saving the current page. |
| `contextMenus` | Adds two items to the browser's right-click menu: "Save link to Shelfmark" on http(s) links and "Save page to Shelfmark" on http(s) pages (`chrome.contextMenus.create` in the background service worker `background.js`, created on install). A click saves that one link or page to the user's own library with the same API calls as the popup (sign-in check, duplicate check, save) and shows the result on the toolbar button (a check mark or "!" badge, the words in its tooltip); signed out, it opens the popup's sign-in screen. Nothing runs until the user clicks one of the items; the service worker reads no tabs, history or page content and has no content scripts. Choosing an item grants `activeTab` for that tab, which gives the page title for "Save page". |
| Host permission `https://shelfmark-app.vercel.app/api/*` | The extension's only server: it loads the user's folders, tags and rules, checks whether the page is already saved and saves it, using the user's existing Shelfmark sign-in in the browser. It cannot reach any other site. |

**Remote code:** No, I am not using remote code. (All scripts are in the package; the Content Security Policy is `script-src 'self'`; the background service worker `background.js` is in the package too.)

**Data usage.** Tick only **Web history**, and nothing else:

- **Web history**: yes. When the user opens the popup, the address of the current tab goes to their own Shelfmark library to check whether it is saved already, and its address and title are stored there when they press Save. If they click Fill in with AI and AI is on in their account, the address and title (and the note, when they let AI read notes) are also sent to Shelfmark for AI suggestions (processed under its AI terms). With All tabs (optional `tabs` permission), the addresses of the listed tabs (without the #fragment) go to their own library for the duplicate check when they switch to it, and the addresses and titles of the ticked tabs, and only those, are saved or sent for AI the same way, on Save or Sort with AI. When they choose Save link / Save page to Shelfmark in the right-click menu, the address of that link or page (and, for a page, its title) goes to their own library for the duplicate check and is saved there. Nothing else of their browsing is read or sent.
- **Website content**: no. The extension never reads the page itself (no content scripts).
- **Personally identifiable information, health, financial, authentication, personal communications, location, user activity**: no.

Then confirm all three statements:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

> Note for a resubmission after the "Purple Potassium" (unused `activeTab`) rejection of 1.0.1: `activeTab` is used. In 1.0.1 the code reached the API through `Reflect.get(globalThis, 'chrome')`, so the scan did not see it; 1.0.2 calls `chrome.tabs.query` directly (in `main.js`) to read the URL and title of the tab the popup was opened on. Permissions are unchanged.

> Note for the 1.3.0 upload: the new `contextMenus` permission and the background service worker (`background.js`, a module) add right-click "Save link / Save page to Shelfmark". Neither adds an install warning; host permissions are unchanged (still only the Shelfmark API), and there is still no content script, `tabs` (except the optional one of 1.2.0), `scripting` or `storage`.

> Note for the reviewer field, if asked: the extension acts only when the user opens it on a tab or chooses one of its right-click items; that tab's URL goes to the user's own library on shelfmark-app.vercel.app (a duplicate check), and its URL and title are stored there only on Save. That is the single purpose, not collection.

**Privacy policy URL:** https://shelfmark-app.vercel.app/privacy (it has a "Browser extension" section).

## Distribution tab

- Visibility: **Unlisted** for the first testers, then **Public**.
- Regions: all.
- Price: free.

## Test instructions for the reviewer (Account → Test instructions)

> Open https://shelfmark-app.vercel.app, choose "Try demo" (no account needed) or sign in with Google or GitHub. Then open any web page and click the Shelfmark toolbar button: the popup shows the page with a folder and tags; press Save. "Open in Shelfmark" shows the saved link in the app.
