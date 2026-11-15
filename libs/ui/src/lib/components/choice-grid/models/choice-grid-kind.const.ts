/**
 * What the choices look like: round colour swatches, icon tiles, or 16:9 picture thumbnails
 * (#418: the folder cover; an option without a picture shows its icon).
 */
export const CHOICE_GRID_KIND = {
  Swatch: 'swatch',
  Icon: 'icon',
  Image: 'image',
} as const;
