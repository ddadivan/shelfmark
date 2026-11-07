import type { SKELETON_SHAPE } from './skeleton-shape.const';

export type SkeletonShape = (typeof SKELETON_SHAPE)[keyof typeof SKELETON_SHAPE];
