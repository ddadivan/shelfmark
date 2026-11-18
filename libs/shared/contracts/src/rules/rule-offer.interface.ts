/** "Always put {domain} links in {folder}?": the user's last `count` links of the site are in the folder. */
export interface RuleOffer {
  domain: string;
  folderId: string;
  count: number;
}
