/** Where the article screenshots live and how big they are (made by `npm run help-media`). */
export const HELP_MEDIA = {
  /** Folder under the site root; the files are `<slug>-light.webp` and `<slug>-dark.webp`. */
  folder: '/media/help',
  /** Intrinsic size of every screenshot (the crop of 1000 x 625 CSS pixels at scale 2). */
  width: 2000,
  height: 1250,
} as const;
