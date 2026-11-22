/**
 * How many tabs are checked against the library when "All tabs" opens: the lookup route allows 30
 * requests a minute and the popup itself used one. The rest are listed without a "Saved" mark; the
 * batch accepts duplicates.
 */
export const TABS_LOOKUP_MAX = 24;
