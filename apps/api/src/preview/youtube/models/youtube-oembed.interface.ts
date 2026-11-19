/** The fields of a YouTube oEmbed answer a preview uses, narrowed by `parseYouTubeOembed`. */
export interface YouTubeOembed {
  /** Plain text, whitespace collapsed, at most `PREVIEW_LIMITS.maxTitleLength`. */
  title: string;
  /** The channel name, at most `YOUTUBE_LIMIT.AuthorMax`; `null` when missing. */
  authorName: string | null;
  /** An absolute http(s) URL within `PREVIEW_LIMITS.maxUrlLength`; `null` otherwise. */
  thumbnailUrl: string | null;
}
