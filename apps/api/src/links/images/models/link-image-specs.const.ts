import { LINK_IMAGE_KIND, type LinkImageKind } from '@shelfmark/contracts';
import type { LinkImageSpec } from './link-image-spec.interface';

const KIBIBYTE = 1024;

export const LINK_IMAGE_SPECS: Readonly<Record<LinkImageKind, LinkImageSpec>> = {
  [LINK_IMAGE_KIND.Preview]: {
    width: 640,
    height: 360,
    fit: 'cover',
    maxBytes: 64 * KIBIBYTE,
    qualities: [75, 60, 45],
  },
  [LINK_IMAGE_KIND.Favicon]: {
    width: 32,
    height: 32,
    fit: 'contain',
    maxBytes: 8 * KIBIBYTE,
    qualities: [85, 70, 50],
  },
};

/** Decoded pixels a remote image may have (24 MP); a decompression bomb stays below this. */
export const MAX_INPUT_PIXELS = 24_000_000;
