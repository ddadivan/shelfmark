/**
 * Query parameters that only track a click (deny list, matched case-insensitively on the whole
 * name). Removed on save when "Keep the query part of links" is off (#284), next to every name
 * that starts with one of `TRACKING_QUERY_PARAM_PREFIXES`. Any other parameter is never touched:
 * add a name here only when it is known to carry nothing but tracking.
 */
export const TRACKING_QUERY_PARAMS: readonly string[] = [
  // Google Ads, Display & Video 360, Google Analytics cross-domain
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  '_ga',
  '_gl',
  // Meta, Instagram
  'fbclid',
  'igshid',
  // Microsoft Ads, Yandex, X / Twitter, TikTok, LinkedIn
  'msclkid',
  'yclid',
  'twclid',
  'ttclid',
  'li_fat_id',
  // Mailchimp, HubSpot, Marketo, Vero, Omeda
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_id',
  'oly_anon_id',
  'oly_enc_id',
];
