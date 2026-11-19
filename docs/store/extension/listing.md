# Chrome Web Store listing: Shelfmark extension

Texts to paste into the Chrome Web Store developer dashboard (#445), as submitted with version 1.1.2 (Nov 19, 2026). The author publishes; agents never do. English is the default listing language; the dashboard can add translated listings later (the extension itself already ships seven languages through `_locales`).

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
>
> The extension reads a tab only when you click its button or press its shortcut, never in the background. It then sends the address of that one tab to your Shelfmark library to check whether you saved it already; the page is saved only when you press Save. If you click Fill in with AI and AI is on in your account, that address and title (and your note, if AI may read notes) are also sent to Shelfmark for AI suggestions. It can talk to Shelfmark only.
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

> Save the page in the current tab, with its title, a folder, tags and a note the user picks, to the user's own Shelfmark library.

**Permission justifications:**

| Permission | Justification to paste |
| --- | --- |
| `activeTab` | The popup calls `chrome.tabs.query({ active: true, currentWindow: true })` to read the address and title of the tab the user is on, only at the moment they click the extension button or press its shortcut, so that page can be saved. Without `activeTab` the tab comes back without its URL and title. No access to other tabs, history or page content; no `tabs` permission, no content scripts. |
| Host permission `https://shelfmark-app.vercel.app/api/*` | The extension's only server: it loads the user's folders, tags and rules, checks whether the page is already saved and saves it, using the user's existing Shelfmark sign-in in the browser. It cannot reach any other site. |

**Remote code:** No, I am not using remote code. (All scripts are in the package; the Content Security Policy is `script-src 'self'`.)

**Data usage.** Tick only **Web history**, and nothing else:

- **Web history**: yes. When the user opens the popup, the address of the current tab goes to their own Shelfmark library to check whether it is saved already, and its address and title are stored there when they press Save. If they click Fill in with AI and AI is on in their account, the address and title (and the note, when they let AI read notes) are also sent to Shelfmark for AI suggestions (processed under its AI terms). Nothing else of their browsing is read or sent.
- **Website content**: no. The extension never reads the page itself (no content scripts).
- **Personally identifiable information, health, financial, authentication, personal communications, location, user activity**: no.

Then confirm all three statements:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

> Note for a resubmission after the "Purple Potassium" (unused `activeTab`) rejection of 1.0.1: `activeTab` is used. In 1.0.1 the code reached the API through `Reflect.get(globalThis, 'chrome')`, so the scan did not see it; 1.0.2 calls `chrome.tabs.query` directly (in `main.js`) to read the URL and title of the tab the popup was opened on. Permissions are unchanged.

> Note for the reviewer field, if asked: the extension acts only when the user opens it on a tab; that tab's URL goes to the user's own library on shelfmark-app.vercel.app (a duplicate check), and its URL and title are stored there only on Save. That is the single purpose, not collection.

**Privacy policy URL:** https://shelfmark-app.vercel.app/privacy (it has a "Browser extension" section).

## Distribution tab

- Visibility: **Unlisted** for the first testers, then **Public**.
- Regions: all.
- Price: free.

## Test instructions for the reviewer (Account → Test instructions)

> Open https://shelfmark-app.vercel.app, choose "Try demo" (no account needed) or sign in with Google or GitHub. Then open any web page and click the Shelfmark toolbar button: the popup shows the page with a folder and tags; press Save. "Open in Shelfmark" shows the saved link in the app.
