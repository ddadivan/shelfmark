import type { AVATAR_SIZE } from './avatar-size.const';

export type AvatarSize = (typeof AVATAR_SIZE)[keyof typeof AVATAR_SIZE];
