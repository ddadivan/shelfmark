/** Images that are not article pictures: icons, avatars, emoji, tracking pixels and badges. */
export const READER_IMAGE_SKIP = {
  /** Class and id words. */
  Class:
    /(?:^|[\s_-])(?:avatar|emoji|emoticon|icon|icons|logo|badge|spinner|pixel|tracking|favicon|gravatar|profile|sprite|button)(?:[\s_-]|$)/i,
  /** A part of the source address. */
  Source: /(?:\/emoji\/|gravatar\.com|\/avatars?\/|1x1|pixel\.|\/badge|shields\.io|\/icons?\/)/i,
  /** Declared width or height (pixels) under which an image is decoration. */
  SizeMin: 48,
} as const;
