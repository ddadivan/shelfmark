/**
 * How a scene moves: `loop` (the default of every scene) repeats one slow movement on the sage
 * detail plus the sparks' twinkle forever; `once` plays one move and holds the end frame (kept for
 * callers that pass it); `none` is the still drawing. Reduced motion (OS and the app setting)
 * shows the still drawing whatever the mode, and a scene off screen or in a hidden tab pauses.
 */
export const ILLUSTRATION_MOTION = {
  Loop: 'loop',
  Once: 'once',
  None: 'none',
} as const;
