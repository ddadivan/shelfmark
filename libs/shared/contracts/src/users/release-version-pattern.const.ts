/**
 * A release of Shelfmark as plain SemVer `x.y.z` (#424): the form "What's new" remembers as the
 * last release a user has seen (`whatsNewSeen`). At most 3 digits per part, so it stays short.
 */
export const RELEASE_VERSION_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/u;
