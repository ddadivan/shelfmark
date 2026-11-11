/**
 * Shops whose pages count as shopping when the page itself does not say `og:type=product` (a
 * subdomain matches too). The migration that added `links.kind` backfills with the same list.
 */
export const LINK_KIND_SHOP_HOSTS: readonly string[] = [
  'amazon.com',
  'amazon.de',
  'amazon.co.uk',
  'amazon.fr',
  'ebay.com',
  'ebay.de',
  'etsy.com',
  'aliexpress.com',
  'zalando.de',
  'ikea.com',
  'walmart.com',
  'bestbuy.com',
];
