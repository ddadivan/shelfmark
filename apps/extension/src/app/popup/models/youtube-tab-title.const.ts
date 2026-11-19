/**
 * YouTube tab titles: "(3) Video title - YouTube" (an unread count in front, the site after), or
 * only "YouTube" while the page is still loading a video. The popup keeps the video title and
 * leaves a generic one to the server, which reads the video's own title (oEmbed).
 */
export const YOUTUBE_TAB_TITLE = {
  /** Hosts without `www.`. */
  Hosts: ['youtube.com', 'm.youtube.com', 'youtu.be'],
  Suffix: /\s+[-–—]\s+YouTube$/u,
  Count: /^\(\d+\+?\)\s+/u,
  Generic: 'youtube',
} as const;
