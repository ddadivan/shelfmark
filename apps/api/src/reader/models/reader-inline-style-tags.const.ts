/** How an inline tag changes the style of the text under it. */
export const READER_INLINE_STYLE_TAGS: Readonly<
  Record<string, 'code' | 'emphasis' | 'strong' | undefined>
> = {
  code: 'code',
  kbd: 'code',
  samp: 'code',
  tt: 'code',
  var: 'code',
  em: 'emphasis',
  i: 'emphasis',
  cite: 'emphasis',
  dfn: 'emphasis',
  strong: 'strong',
  b: 'strong',
};
