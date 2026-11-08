import type { IMAGE_FORMAT } from './image-format.const';

export type ImageFormat = (typeof IMAGE_FORMAT)[keyof typeof IMAGE_FORMAT];
