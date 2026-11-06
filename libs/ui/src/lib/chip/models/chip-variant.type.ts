import type { CHIP_VARIANT } from './chip-variant.const';

export type ChipVariant = (typeof CHIP_VARIANT)[keyof typeof CHIP_VARIANT];
