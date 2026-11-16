/**
 * Whether the undated draft of the next release shows on /changelog and in What's new. Off in
 * production, tests and e2e; the development build (`npm start`) replaces this file with
 * `changelog-shows-draft.dev.const.ts`, so the author sees the draft before the release.
 */
export const CHANGELOG_SHOWS_DRAFT = false;
