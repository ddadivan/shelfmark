/**
 * The first-load card stagger (#564, Motion «First load stagger»): on the first list of an app
 * load the first `Items` cards (or rows) rise in one after another (`library.page.scss`), the rest
 * come in with the last of them. `ClearMs` drops the class once all of them have finished
 * (8 steps of 60 ms + 200 ms, with room to spare), so cards added later never wait.
 */
export const FEED_STAGGER = {
  Items: 8,
  ClearMs: 1000,
} as const;
