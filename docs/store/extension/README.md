# Store materials: Shelfmark extension

Everything the author needs to publish the browser extension (#445) in the Chrome Web Store. The steps are in [`docs/SETUP.md` 5.9](../../SETUP.md).

- [`listing.md`](listing.md): name, summary, description, category, permission justifications, data usage answers, reviewer instructions.
- `screenshot-*.png` (1280 x 800) and `promo-tile-440x280.png`: rendered from the real popup (development build, light theme, mocked data) by `apps/extension/scripts/popup-screenshots.mjs` and `store-images.mjs` (usage in their first lines); re-render them when the popup changes.
- The store icon is `apps/extension/public/icons/icon-128.png` (`node apps/extension/scripts/build-icons.mjs` renders all icons from `docs/design/assets/logos/shelfmark-app-icon.svg`).
