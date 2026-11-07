import type { POINTER_TYPE } from './pointer-type.const';

export type PointerType = (typeof POINTER_TYPE)[keyof typeof POINTER_TYPE];
