import type { LINK_IMAGE_KIND } from './link-image-kind.const';

export type LinkImageKind = (typeof LINK_IMAGE_KIND)[keyof typeof LINK_IMAGE_KIND];
