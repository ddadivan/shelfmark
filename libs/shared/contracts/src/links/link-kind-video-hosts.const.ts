/**
 * Hosts whose pages are videos whatever their `og:type` says (a subdomain matches too). The
 * migration that added `links.kind` backfills with the same list; keep both in step (ADR 0038).
 */
export const LINK_KIND_VIDEO_HOSTS: readonly string[] = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',
  'tiktok.com',
  'loom.com',
];
