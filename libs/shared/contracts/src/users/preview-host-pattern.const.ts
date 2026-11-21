/**
 * A host in Settings › Library › Sites that open in a new tab (#553): lower-case DNS labels
 * (letters, digits, hyphens, punycode `xn--`), at least one dot, at most 253 characters
 * (checked separately). No scheme, port, path or trailing dot.
 */
export const PREVIEW_HOST_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
