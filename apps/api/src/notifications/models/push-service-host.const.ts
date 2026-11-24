/**
 * The push services a subscription endpoint may point to (the outbound exception of Web Push,
 * `apps/api/CLAUDE.md`): exact hosts, plus host suffixes for services with regional hosts. Chrome,
 * Edge on Android, Opera, Samsung Internet and Brave use FCM; Firefox Mozilla autopush; Safari
 * Apple's service; Edge on Windows WNS (`*.notify.windows.com`). Anything else is refused.
 */
export const PUSH_SERVICE_HOST = {
  Exact: [
    'fcm.googleapis.com',
    'android.googleapis.com',
    'updates.push.services.mozilla.com',
    'web.push.apple.com',
  ],
  Suffix: ['.notify.windows.com', '.push.apple.com'],
} as const;
