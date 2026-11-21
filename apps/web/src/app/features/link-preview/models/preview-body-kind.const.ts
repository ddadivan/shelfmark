/**
 * What the preview body shows (#553, ADR 0059): nothing yet (the link is loading), the site in the
 * sandboxed frame, the `youtube-nocookie` player, or the "doesn't open inside other apps" state.
 */
export const PREVIEW_BODY_KIND = {
  Loading: 'loading',
  Site: 'site',
  Video: 'video',
  Blocked: 'blocked',
} as const;
