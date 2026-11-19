/** A link just saved and what the save (the user or a domain rule) already filled. */
export interface EnqueueTarget {
  linkId: string;
  folderSet: boolean;
  tagsSet: boolean;
  /** The save asked for no summary (`CreateLinkRequest.summary: null`): the job leaves it out. */
  summaryDeclined?: boolean;
}
