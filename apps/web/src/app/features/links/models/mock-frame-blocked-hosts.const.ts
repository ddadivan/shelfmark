/**
 * Hosts whose pages refuse framing in the mock API (#553): the mock frame check answers `blocked`
 * for them and their subdomains, like the server would read their `X-Frame-Options`. YouTube
 * pages other than videos refuse framing too (videos play in the embed player, #555).
 */
export const MOCK_FRAME_BLOCKED_HOSTS: readonly string[] = [
  'github.com',
  'youtube.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'frame-blocked.example',
];
