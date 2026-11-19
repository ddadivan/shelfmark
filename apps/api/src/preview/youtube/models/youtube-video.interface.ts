import type { YouTubeOembed } from './youtube-oembed.interface';

/** A YouTube video found through oEmbed: its id, the canonical watch URL and the oEmbed fields. */
export interface YouTubeVideo extends YouTubeOembed {
  id: string;
  /** `https://www.youtube.com/watch?v=<id>`. */
  canonicalUrl: string;
}
