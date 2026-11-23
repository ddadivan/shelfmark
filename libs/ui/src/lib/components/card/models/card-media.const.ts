/**
 * How the preview of a `ui-card` is cut: `natural` keeps the picture's own ratio (masonry),
 * `cover` is 4:3 with the picture cropped (the Cards view), `contain` is 4:3 with the whole
 * picture on `surface-hover` (shops, product shots).
 */
export const CARD_MEDIA = { Natural: 'natural', Cover: 'cover', Contain: 'contain' } as const;
