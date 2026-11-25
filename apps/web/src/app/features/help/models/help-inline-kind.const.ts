/** The kinds of run an article text is split into (`**bold**` and `` `key` `` markers). */
export const HELP_INLINE = {
  Plain: 'plain',
  /** `**Settings › Library**`: the name of a control or a menu path, in 600. */
  Ui: 'ui',
  /** `` `taylorstitch.com` ``: a key cap or a value to type. */
  Key: 'key',
} as const;
