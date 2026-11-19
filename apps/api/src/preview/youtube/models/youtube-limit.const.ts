/**
 * YouTube previews: the official oEmbed endpoint (tests inject their own through
 * `YOUTUBE_OEMBED_ENDPOINT`), the canonical watch URL and caps for the narrowed oEmbed fields.
 */
export const YOUTUBE_LIMIT = {
  OembedEndpoint: 'https://www.youtube.com/oembed',
  WatchUrl: 'https://www.youtube.com/watch?v=',
  /** A video id: exactly 11 characters of the URL-safe base64 alphabet. */
  VideoIdPattern: /^[A-Za-z0-9_-]{11}$/,
  /** Watch hosts; `youtu.be` short links are handled apart. */
  WatchHosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
  ShortHost: 'youtu.be',
  ShortsPath: '/shorts/',
  WatchPath: '/watch',
  AuthorMax: 200,
} as const;
