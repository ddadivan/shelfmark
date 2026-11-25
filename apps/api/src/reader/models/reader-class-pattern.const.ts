/**
 * Class and id words that mark page chrome (`Unlikely`) or the content (`Likely`), matched as
 * whole words between separators. An element that is unlikely and not likely is skipped on the
 * first pass; when that pass finds no article the page is read again without this filter (a
 * wrapper such as `class="site has-sidebar"` must not hide the whole page).
 */
export const READER_CLASS_PATTERN = {
  Unlikely:
    /(?:^|[\s_-])(?:comments?|disqus|share|sharing|social|related|recommended|promo|sponsored?|advert|ads?|banner|newsletter|subscribe|signup|cookies?|consent|popup|modal|breadcrumbs?|pagination|pager|menu|navbar|nav|sidebar|footer|masthead|widget|tags|drawers?|off-?canvas|mini-?cart)(?:[\s_-]|$)/i,
  Likely:
    /(?:^|[\s_-])(?:article|body|content|entry|main|post|text|blog|story|prose|markdown)(?:[\s_-]|$)/i,
} as const;
