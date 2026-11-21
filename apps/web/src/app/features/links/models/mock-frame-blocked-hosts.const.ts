/**
 * Hosts whose pages refuse framing in the mock API (#553): the mock frame check answers `blocked`
 * for them and their subdomains, like the server would read their `X-Frame-Options`.
 */
export const MOCK_FRAME_BLOCKED_HOSTS: readonly string[] = [
  'github.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'frame-blocked.example',
];
