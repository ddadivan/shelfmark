import { LINK_KIND, type LinkPreview } from '@shelfmark/contracts';
import type { YouTubeVideo } from './models/youtube-video.interface';

const FAVICON_PATH = '/favicon.ico';

/**
 * The preview of a YouTube video from its oEmbed data: the canonical watch URL, the video title,
 * the channel name as description, the thumbnail as the image source (captured like an og:image)
 * and the site icon.
 */
export function youTubePreview(video: YouTubeVideo): LinkPreview {
  return {
    kind: LINK_KIND.Video,
    url: video.canonicalUrl,
    title: video.title,
    description: video.authorName,
    imageUrl: video.thumbnailUrl,
    faviconUrl: new URL(FAVICON_PATH, video.canonicalUrl).href,
  };
}

/**
 * What an AI link job reads for a video whose page cannot be fetched: the title and the channel,
 * as a short plain-text excerpt.
 */
export function youTubeExcerpt(video: YouTubeVideo): string {
  return video.authorName === null
    ? `YouTube video: ${video.title}`
    : `YouTube video: ${video.title} by ${video.authorName}`;
}
